import { fingerPrintFile } from "./finger-print";
import { Dictionary, FileData, FileSystem, HashFileData, ParsedFile, ParsedFilePart, Transformer, TransformResult } from "./types";
import { resolve as resolvePath, parse as parsePath, relative as getRelatvePath } from "path";
import { canParse, parse, parsableExtensions } from "./parse";

interface PackParams {
	srcDirPath: string;
	outDirPath: string;
	fileSystem: FileSystem;
	transformers: Transformer[];
	ignore?: RegExp[];
	noHash?: RegExp[];
	parseExtensions?: string[];
	hashFileData?: HashFileData;
	callbacks?: {
		onBubbleUpFinished?: () => void;
	};
}

export const pack = ({
	srcDirPath,
	outDirPath,
	fileSystem,
	ignore = [],
	noHash,
	parseExtensions = parsableExtensions,
	transformers,
	hashFileData,
	callbacks = {}
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
		if (ignore.some(regex => regex.test(absSrcFilePath))) return;
		await transformAndOutput(absSrcFilePath);
		await bubbleUp(absSrcFilePath);
	}

	const transformAndOutput = async (absSrcFilePath: string) => {
		const binaryData = fileSystem.readBinary(absSrcFilePath);
		const parsedFileBeforeTrans = parseSrcFile(absSrcFilePath, binaryData);
		parsedFilesBeforeTransMap[absSrcFilePath] = parsedFileBeforeTrans;

		const transformResult = await transformFile(absSrcFilePath, binaryData);
		const parsedFileAfterTrans = transformResult ?
			parseTransformResult(absSrcFilePath, transformResult) :
			parsedFileBeforeTrans;

		if (parsedFileAfterTrans) {
			parsedFilesAfterTransMap[absSrcFilePath] = parsedFileAfterTrans;
			generateParsedFileOutput(absSrcFilePath, parsedFileAfterTrans);
		} else if (transformResult) {
			const { ext, data } = transformResult;
			fingerPrint(absSrcFilePath, ext, data);
		} else {
			const { ext } = parsePath(absSrcFilePath);
			fingerPrint(absSrcFilePath, ext, binaryData);
		}
	}

	const transformFile = (absSrcFilePath: string, binaryData: Buffer) => {
		const { ext } = parsePath(absSrcFilePath);
		const transformer = transformersMap[ext];
		const data = binaryData.toString();
		return transformer && transformer.transform(absSrcFilePath, data);
	}

	const parseTransformResult = (absSrcFilePath: string, { ext, data }: TransformResult) => {
		if (!canParse(ext, parseExtensions)) return;
		return parse({ absSrcDirPath, absSrcFilePath, data, ext })
	}

	const parseSrcFile = (absSrcFilePath: string, binaryData: Buffer) => {
		const { ext } = parsePath(absSrcFilePath);
		if (!canParse(ext, parseExtensions)) return;
		const data = binaryData.toString();
		return parse({ absSrcDirPath, absSrcFilePath, data, ext });
	}

	const bubbleUp = async (absSrcChildPath: string, visited = new Set<string>(), level = 1) => {
		visited.add(absSrcChildPath);

		const allParsedPaths = new Set([
			...Object.keys(parsedFilesBeforeTransMap),
			...Object.keys(parsedFilesAfterTransMap)
		]);

		for (const absSrcParentPath of allParsedPaths) {
			if (visited.has(absSrcParentPath)) continue;
			const beforeDep = hasDependency(parsedFilesBeforeTransMap[absSrcParentPath], absSrcChildPath);
			const afterDep = hasDependency(parsedFilesAfterTransMap[absSrcParentPath], absSrcChildPath);
			if (beforeDep || afterDep) {
				await transformAndOutput(absSrcParentPath);
				await bubbleUp(absSrcParentPath, visited, level + 1);
			}
		}

		if (level === 1) {
			callbacks.onBubbleUpFinished?.();
		}
	}

	const hasDependency = (parsedFile: ParsedFile | undefined, absSrcChildPath: string) => {
		return !!parsedFile && parsedFile.parts.some(part =>
			typeof part !== "string" &&
			part.absFilePath === absSrcChildPath);
	}

	const generateParsedFileOutput = (absSrcFilePath: string, parsedFile: ParsedFile) => {
		const outputData = generateOutputData(parsedFile);
		fingerPrint(absSrcFilePath, parsedFile.ext, outputData);

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

	const fingerPrint = (absSrcFilePath: string, outExt: string, fileData: FileData) => {
		if (fileData.length === 0) return;
		outFilePathsMap[absSrcFilePath] = fingerPrintFile({
			fileData,
			absSrcDirPath,
			absSrcFilePath,
			outExt,
			absOutDirPath,
			noHash,
			hashFileData,
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
