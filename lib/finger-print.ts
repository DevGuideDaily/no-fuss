import { FileData, FileSystem } from "./types";
import { createHash } from "crypto";
import { parse as parsePath, join as joinPath, relative as getRelativePath } from "path";

interface FingerPrintFileParams {
	fileData: FileData;
	absSrcDirPath: string;
	absSrcFilePath: string;
	outExt: string;
	absOutDirPath: string;
	fileSystem: FileSystem;
}

export const fingerPrintFile = ({
	fileData,
	absSrcDirPath,
	absSrcFilePath,
	outExt,
	absOutDirPath,
	fileSystem
}: FingerPrintFileParams) => {
	const hash = hashFileData(fileData);
	const relativePath = getRelativePath(absSrcDirPath, absSrcFilePath);
	const { dir: relativeDir } = parsePath(relativePath);
	const { name } = parsePath(absSrcFilePath);
	const absOutPath = joinPath(absOutDirPath, relativeDir, `${name}.${hash}${outExt}`);
	fileSystem.write(absOutPath, fileData);
	return absOutPath;
}

export const hashFileData = (fileData: FileData) => {
	const hash = createHash("md5");
	if (typeof fileData === "string") {
		return hash.update(fileData).digest("hex");
	} else {
		return hash.update(new DataView(fileData.buffer)).digest("hex");
	}
}
