import { join as joinPath, parse as parsePath } from "path";
import { ParsedFile, ParsedFilePart } from "./types";

const filePathRegex = /([\$\/\.\w-_]+\.[a-z]+)/

export const parsableExtensions = [
	".pug",
	".html",
	".less",
	".css",
	".webmanifest"
];

export const fullyQualifiedPrefix = "$";

export const canParse = (ext: string, parsable: string[]) =>
	parsable.includes(ext);

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
	let slicedChildUrl = childUrl.startsWith(fullyQualifiedPrefix) ?
		childUrl.slice(fullyQualifiedPrefix.length) : childUrl;

	if (slicedChildUrl.startsWith("/")) {
		return joinPath(absSrcDirPath, slicedChildUrl);
	} else {
		const { dir } = parsePath(absParentPath);
		return joinPath(dir, slicedChildUrl)
	}
}
