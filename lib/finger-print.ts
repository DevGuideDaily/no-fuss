import { FileData, FileSystem, HashFileData } from "./types";
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
	hashFileData?: HashFileData,
	skip?: RegExp[];
}

export const fingerPrintFile = ({
	fileData,
	absSrcDirPath,
	absSrcFilePath,
	outExt,
	absOutDirPath,
	fileSystem,
	hashFileData = hashFileDataMD5,
	skip = defaultSkip
}: FingerPrintFileParams) => {
	const hash = getFileHash({ absSrcFilePath, skip, fileData, hashFileData });
	const relativePath = getRelativePath(absSrcDirPath, absSrcFilePath);
	const { dir: relativeDir } = parsePath(relativePath);
	const { name } = parsePath(absSrcFilePath);
	const absOutPath = joinPath(absOutDirPath, relativeDir, `${name}${hash}${outExt}`);
	fileSystem.write(absOutPath, fileData);
	return absOutPath;
}

interface GetFileHashParams {
	absSrcFilePath: string;
	skip: RegExp[];
	fileData: FileData;
	hashFileData: HashFileData;
}

const getFileHash = ({
	absSrcFilePath,
	skip,
	fileData,
	hashFileData
}: GetFileHashParams) => {
	const shouldSkip = skip.some(regex => regex.test(absSrcFilePath));
	return shouldSkip ? "" : `.${hashFileData(fileData).slice(0, hashLength)}`;
}

const hashFileDataMD5 = (fileData: FileData) => {
	const hash = createHash("md5");
	return hash.update(fileData).digest("hex");
}
