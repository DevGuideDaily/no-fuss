import { fingerPrintFile } from "./finger-print";
import { Dictionary, FileData, FileSystem, ParsedFile, ParsedFilePart, Parser, Transformer } from "./types";
import { resolve as resolvePath, parse as parsePath, relative as getRelatvePath, relative } from "path";

interface PackParams {
	srcDirPath: string;
	outDirPath: string;
	parsers: Dictionary<Parser>;
	transformers: Dictionary<Transformer>;
	fileSystem: FileSystem;
}

const defaultTransformer: Transformer = {
	transform: data => data,
	getNewExt: oldExt => oldExt
};

const defaultParser: Parser = {
	parse: (_absSrcDirPath, _absFilePath, data) => ({ parts: [data] })
}

export const pack = ({
	srcDirPath,
	outDirPath,
	parsers,
	transformers,
	fileSystem
}: PackParams) => {
	const absSrcDirPath = resolvePath(srcDirPath);
	const absOutDirPath = resolvePath(outDirPath);
	const outFilePathsMap: Dictionary<string> = {};
	const parsedFilesMap: Dictionary<ParsedFile> = {};

	const processSrcFile = async (absSrcFilePath: string) => {
		const fileData = fileSystem.read(absSrcFilePath);
		const { ext } = parsePath(absSrcFilePath);
		if (typeof fileData === "string") {
			await transformAndParseFile(absSrcFilePath, fileData);
			generateOutputAndBubbleUp(absSrcFilePath);
		} else {
			cleanUpAndFingerPrintFile(absSrcFilePath, ext, fileData);
		}
	}

	const generateOutputAndBubbleUp = (absSrcChildPath: string) => {
		const isGenerated = generateOutputFile(absSrcChildPath);
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
			typeof part !== "string" && part.absFilePath === absSrcChildPath);
	}

	const transformAndParseFile = async (absSrcFilePath: string, data: string) => {
		const { ext } = parsePath(absSrcFilePath);
		const { transform, getNewExt } = transformers[ext] ?? defaultTransformer;
		const transformedData = await transform(data);
		const { parse } = parsers[getNewExt(ext)] ?? defaultParser;
		parsedFilesMap[absSrcFilePath] =
			parse(absSrcDirPath, absSrcFilePath, transformedData);
	}

	const generateOutputFile = (absSrcFilePath: string) => {
		const parsedFile = parsedFilesMap[absSrcFilePath];
		if (!parsedFile) return false;

		const outputData = generateOutputData(parsedFile);
		if (!outputData) return false;

		const { ext } = parsePath(absSrcFilePath);
		const { getNewExt } = transformers[ext] ?? defaultTransformer;
		cleanUpAndFingerPrintFile(absSrcFilePath, getNewExt(ext), outputData);

		return true;
	}

	const generateOutputData = (parsedFile: ParsedFile) => {
		let outputData = "";
		for (let i = 0; i < parsedFile.parts.length; i++) {
			const partValue = getPartValue(parsedFile.parts[i]);
			if (!partValue) return;
			outputData += partValue;
		}
		return outputData;
	}

	const getPartValue = (part: ParsedFilePart) => {
		if (typeof part === "string") {
			return part;
		} else {
			const absOutFilePath = outFilePathsMap[part.absFilePath];
			if (!absOutFilePath) return;
			return getOutFileUrl(absOutFilePath);
		}
	}

	const getOutFileUrl = (absOutFilePath: string) => {
		const relativePath = getRelatvePath(absOutDirPath, absOutFilePath);
		return `/${relativePath}`;
	}

	const cleanUpAndFingerPrintFile = (absSrcFilePath: string, outExt: string, fileData: FileData) => {
		cleanUpOutFile(absSrcFilePath);
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

	fileSystem.watch(srcDirPath, {
		onUpdate: processSrcFile,
		onRemove: absSrcFilePath => {
			delete parsedFilesMap[absSrcFilePath];
			cleanUpOutFile(absSrcFilePath);
		}
	});
}
