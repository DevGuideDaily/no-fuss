import { fingerPrintFile } from "./finger-print";
import { Dictionary, FileData, FileSystem, ParsedFile, ParsedFilePart, Transformer, TransformResult } from "./types";
import { resolve as resolvePath, parse as parsePath, relative as getRelatvePath } from "path";
import { canParse, parse } from "./parse";

interface PackParams {
	srcDirPath: string;
	outDirPath: string;
	transformers: Transformer[];
	fileSystem: FileSystem;
}

export const pack = ({
	srcDirPath,
	outDirPath,
	transformers,
	fileSystem
}: PackParams) => {
	const absSrcDirPath = resolvePath(srcDirPath);
	const absOutDirPath = resolvePath(outDirPath);
	const outFilePathsMap: Dictionary<string> = {};
	const parsedFilesMap: Dictionary<ParsedFile> = {};

	const transformersMap: Dictionary<Transformer> = {};
	for (const transformer of transformers)
		transformersMap[transformer.srcExt] = transformer;

	const processSrcFile = async (absSrcFilePath: string) => {
		const transformResult = await transformFile(absSrcFilePath);
		const parsedFile = parseFile(absSrcFilePath, transformResult);
		if (parsedFile) {
			parsedFilesMap[absSrcFilePath] = parsedFile;
			generateParsedFileOutput(absSrcFilePath);
		} else {
			const { ext } = parsePath(absSrcFilePath);
			const data = fileSystem.read(absSrcFilePath);
			cleanUpAndFingerPrintFile(absSrcFilePath, ext, data);
		}
		bubbleUp(absSrcFilePath);
	}

	const transformFile = (absSrcFilePath: string) => {
		const { ext } = parsePath(absSrcFilePath);
		const transformer = transformersMap[ext];
		const data = fileSystem.read(absSrcFilePath, { encoding: "utf-8" });
		return transformer && transformer.transform(absSrcFilePath, data);
	}

	const parseFile = (absSrcFilePath: string, transformResult?: TransformResult) => {
		if (transformResult) {
			return parseTransformResult(absSrcFilePath, transformResult);
		} else {
			return parseSrcFile(absSrcFilePath);
		}
	}

	const parseTransformResult = (absSrcFilePath: string, { ext, data }: TransformResult) => {
		if (!canParse(ext)) return;
		return parse({ absSrcDirPath, absSrcFilePath, data, ext })
	}

	const parseSrcFile = (absSrcFilePath: string) => {
		const { ext } = parsePath(absSrcFilePath);
		if (!canParse(ext)) return;
		const data = fileSystem.read(absSrcFilePath, { encoding: "utf-8" });
		return parse({ absSrcDirPath, absSrcFilePath, data, ext });
	}

	const bubbleUp = (absSrcChildPath: string) => {
		for (const absSrcParentPath in parsedFilesMap) {
			const parsedFile = parsedFilesMap[absSrcParentPath];
			if (!parsedFile || absSrcChildPath === absSrcParentPath) continue;
			if (shouldGenerateOutput(parsedFile, absSrcChildPath)) {
				generateParsedFileOutput(absSrcParentPath);
				bubbleUp(absSrcParentPath);
			}
		}
	}

	const generateOutputAndBubbleUp = (absSrcChildPath: string) => {
		const isGenerated = generateParsedFileOutput(absSrcChildPath);
		if (!isGenerated) return;
		for (const absSrcParentPath in parsedFilesMap) {
			const parsedFile = parsedFilesMap[absSrcParentPath];
			if (!parsedFile || absSrcChildPath === absSrcParentPath) continue;
			if (shouldGenerateOutput(parsedFile, absSrcChildPath))
				generateOutputAndBubbleUp(absSrcParentPath);
		}
	}

	const shouldGenerateOutput = (parsedFile: ParsedFile, absSrcChildPath: string) => {
		return parsedFile.parts.some(part =>
			typeof part !== "string" &&
			part.absFilePath === absSrcChildPath);
	}

	const generateParsedFileOutput = (absSrcFilePath: string) => {
		const parsedFile = parsedFilesMap[absSrcFilePath];
		if (!parsedFile) return false;

		const outputData = generateOutputData(parsedFile);
		cleanUpAndFingerPrintFile(absSrcFilePath, parsedFile.ext, outputData);

		return true;
	}

	const generateOutputData = ({ parts }: ParsedFile) => {
		return parts.map(getPartValue).join("");
	}

	const getPartValue = (part: ParsedFilePart) => {
		if (typeof part === "string") {
			return part;
		} else {
			const absOutFilePath = outFilePathsMap[part.absFilePath];
			if (!absOutFilePath) return part.originalPath;
			return getOutFileUrl(absOutFilePath);
		}
	}

	const getOutFileUrl = (absOutFilePath: string) => {
		const relativePath = getRelatvePath(absOutDirPath, absOutFilePath);
		return `/${relativePath}`;
	}

	const cleanUpAndFingerPrintFile = (absSrcFilePath: string, outExt: string, fileData: FileData) => {
		cleanUpOutFile(absSrcFilePath);
		if (fileData.length === 0) return;
		outFilePathsMap[absSrcFilePath] = fingerPrintFile({
			fileData,
			absSrcDirPath,
			absSrcFilePath,
			outExt,
			absOutDirPath,
			fileSystem
		});
	}

	const cleanUpOutFile = (absSrcFilePath: string) => {
		const absOutFilePath = outFilePathsMap[absSrcFilePath];
		absOutFilePath && fileSystem.remove(absOutFilePath);
	}

	fileSystem.list(absSrcDirPath)
		.forEach(processSrcFile);

	fileSystem.watch(srcDirPath, {
		onUpdate: processSrcFile,
		onRemove: absSrcFilePath => {
			delete parsedFilesMap[absSrcFilePath];
			cleanUpOutFile(absSrcFilePath);
		}
	});
}
