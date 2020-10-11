import { FileData, FileSystem } from "./types";
import { createHash } from "crypto";
import { parse as parsePath, join as joinPath, relative as getRelativePath } from "path";

const defaultSkip = [
	/\.html/,
	/\.pug/
];

const hashLength = 8;

interface FingerPrintFileParams {
	fileData: FileData;
	absSrcDirPath: string;
	absSrcFilePath: string;
	outExt: string;
	absOutDirPath: string;
	fileSystem: FileSystem;
	skip?: RegExp[];
}

export const fingerPrintFile = ({
	fileData,
	absSrcDirPath,
	absSrcFilePath,
	outExt,
	absOutDirPath,
	fileSystem,
	skip = defaultSkip
}: FingerPrintFileParams) => {
	const hash = getFileHash(absSrcFilePath, skip, fileData);
	const relativePath = getRelativePath(absSrcDirPath, absSrcFilePath);
	const { dir: relativeDir } = parsePath(relativePath);
	const { name } = parsePath(absSrcFilePath);
	const absOutPath = joinPath(absOutDirPath, relativeDir, `${name}${hash}${outExt}`);
	fileSystem.write(absOutPath, fileData);
	return absOutPath;
}

const getFileHash = (absSrcFilePath: string, skip: RegExp[], fileData: FileData) => {
	const shouldSkip = skip.some(regex => regex.test(absSrcFilePath));
	return shouldSkip ? "" : `.${hashFileData(fileData).slice(0, hashLength)}`;
}

const hashFileData = (fileData: FileData) => {
	const hash = createHash("md5");
	if (typeof fileData === "string") {
		return hash.update(fileData).digest("hex");
	} else {
		return hash.update(new DataView(fileData.buffer)).digest("hex");
	}
}
