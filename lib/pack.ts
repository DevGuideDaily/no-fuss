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
	const parsedFilesBeforeTransMap: Dictionary<ParsedFile> = {};
	const parsedFilesAfterTransMap: Dictionary<ParsedFile> = {};

	const transformersMap: Dictionary<Transformer> = {};
	for (const transformer of transformers)
		transformersMap[transformer.srcExt] = transformer;

	const processSrcFile = async (absSrcFilePath: string) => {
		const binaryData = fileSystem.readBinary(absSrcFilePath);
		const parsedFileBeforeTrans = parseSrcFile(absSrcFilePath, binaryData);
		parsedFilesBeforeTransMap[absSrcFilePath] = parsedFileBeforeTrans;

		const transformResult = await transformFile(absSrcFilePath, binaryData);
		const parsedFileAfterTrans = transformResult ?
			parseTransformResult(absSrcFilePath, transformResult) :
			parsedFileBeforeTrans;

		if (parsedFileAfterTrans) {
			parsedFilesAfterTransMap[absSrcFilePath] = parsedFileAfterTrans;
			generateParsedFileOutput(absSrcFilePath);
		} else {
			const { ext } = parsePath(absSrcFilePath);
			const data = fileSystem.readBinary(absSrcFilePath);
			cleanUpAndFingerPrintFile(absSrcFilePath, ext, data);
		}
		await bubbleUp(absSrcFilePath);
	}

	const transformFile = (absSrcFilePath: string, binaryData: Buffer) => {
		const { ext } = parsePath(absSrcFilePath);
		const transformer = transformersMap[ext];
		const data = binaryData.toString();
		return transformer && transformer.transform(absSrcFilePath, data);
	}

	const parseTransformResult = (absSrcFilePath: string, { ext, data }: TransformResult) => {
		if (!canParse(ext)) return;
		return parse({ absSrcDirPath, absSrcFilePath, data, ext })
	}

	const parseSrcFile = (absSrcFilePath: string, binaryData: Buffer) => {
		const { ext } = parsePath(absSrcFilePath);
		if (!canParse(ext)) return;
		const data = binaryData.toString();
		return parse({ absSrcDirPath, absSrcFilePath, data, ext });
	}

	const bubbleUp = async (absSrcChildPath: string, visited = new Set<string>()) => {
		visited.add(absSrcChildPath);

		for (const absSrcParentPath in parsedFilesBeforeTransMap) {
			if (visited.has(absSrcParentPath)) continue;
			const parsedFileBeforeTrans = parsedFilesBeforeTransMap[absSrcParentPath];

			if (hasDependency(parsedFileBeforeTrans, absSrcChildPath)) {
				const binaryData = fileSystem.readBinary(absSrcParentPath);
				const transformResult = await transformFile(absSrcParentPath, binaryData);
				const parsedFileAfterTrans = transformResult ?
					parseTransformResult(absSrcParentPath, transformResult) :
					parsedFileBeforeTrans;

				parsedFilesAfterTransMap[absSrcParentPath] = parsedFileAfterTrans;

				// If the dependency is present even after transforming,
				// generating output and bubbling up will be called in the second loop
				if (!hasDependency(parsedFileAfterTrans, absSrcChildPath)) {
					generateParsedFileOutput(absSrcParentPath);
					bubbleUp(absSrcParentPath, visited);
				}
			}
		}

		for (const absSrcParentPath in parsedFilesAfterTransMap) {
			if (visited.has(absSrcParentPath)) continue;
			const parsedFileAfterTrans = parsedFilesAfterTransMap[absSrcParentPath];
			if (hasDependency(parsedFileAfterTrans, absSrcChildPath)) {
				generateParsedFileOutput(absSrcParentPath);
				bubbleUp(absSrcParentPath, visited);
			}
		}
	}

	const hasDependency = (parsedFile: ParsedFile | undefined, absSrcChildPath: string) => {
		return !!parsedFile && parsedFile.parts.some(part =>
			typeof part !== "string" &&
			part.absFilePath === absSrcChildPath);
	}

	const generateParsedFileOutput = (absSrcFilePath: string) => {
		const parsedFile = parsedFilesAfterTransMap[absSrcFilePath];
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
		delete outFilePathsMap[absSrcFilePath];
	}

	fileSystem.watch(srcDirPath, {
		onUpdate: processSrcFile,
		onRemove: absSrcFilePath => {
			delete parsedFilesBeforeTransMap[absSrcFilePath];
			delete parsedFilesAfterTransMap[absSrcFilePath];
			cleanUpOutFile(absSrcFilePath);
			bubbleUp(absSrcFilePath);
		}
	});
}
