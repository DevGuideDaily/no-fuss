import { join as joinPath, parse as parsePath } from "path";
import { ParsedFile, ParsedFilePart } from "./types";

const filePathRegex = /([\/\.\w-_]+\.[a-z]+)/
const parsableExt = [
	".pug",
	".html",
	".less",
	".css",
	".webmanifest"
];

export const canParse = (ext: string) =>
	parsableExt.includes(ext);

interface ParseParams {
	absSrcDirPath: string;
	absSrcFilePath: string;
	data: string;
	ext: string;
}

export const parse = ({
	absSrcDirPath,
	absSrcFilePath,
	data,
	ext,
}: ParseParams): ParsedFile => {
	const strParts = data.split(filePathRegex).filter(Boolean);
	if (strParts.length === 1) return { ext, parts: strParts };
	return {
		ext,
		parts: strParts.map(strPart => getParsedPart({
			absSrcDirPath,
			absParentPath: absSrcFilePath,
			strPart
		}))
	};
}

interface GetParsedPartParams {
	absSrcDirPath: string;
	absParentPath: string;
	strPart: string;
}

const getParsedPart = ({
	absSrcDirPath,
	absParentPath,
	strPart,
}: GetParsedPartParams): ParsedFilePart => {
	if (filePathRegex.test(strPart)) {
		const absChildPath = getAbsChildPath(absSrcDirPath, absParentPath, strPart);
		return {
			originalPath: strPart,
			absFilePath: absChildPath
		};
	} else {
		return strPart;
	}
}

const getAbsChildPath = (absSrcDirPath: string, absParentPath: string, childUrl: string) => {
	if (childUrl.startsWith("/")) {
		return joinPath(absSrcDirPath, childUrl);
	} else {
		const { dir } = parsePath(absParentPath);
		return joinPath(dir, childUrl)
	}
}
