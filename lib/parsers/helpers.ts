import { join as joinPath, parse as parsePath } from "path";
import { ParsedFilePart } from "../types";
import { filePathRegex, urlRegex } from "./constants";

interface ParseFileParams {
	absSrcDirPath: string;
	absFilePath: string;
	data: string;
	splitRegex: RegExp;
}

export const parseFile = ({
	absSrcDirPath,
	absFilePath,
	data,
	splitRegex
}: ParseFileParams) => {
	const strParts = data.split(splitRegex).filter(Boolean);
	if (strParts.length === 1) return { parts: strParts };
	return {
		parts: strParts.map(strPart => getParsedPart({
			absSrcDirPath,
			absParentPath: absFilePath,
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
	if (urlRegex.test(strPart) || !filePathRegex.test(strPart)) {
		return strPart;
	} else {
		const absChildPath = getAbsChildPath(absSrcDirPath, absParentPath, strPart);
		return { absFilePath: absChildPath };
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
