import { Parser } from "../types";
import { filePathPattern } from "./constants";
import { parseFile } from "./helpers";

const splitRegex = new RegExp(`(url\\("?)(${filePathPattern})("?\\))`);

export const cssParser: Parser = {
	parse: (absSrcDirPath: string, absFilePath: string, data: string) => {
		return parseFile({ absSrcDirPath, absFilePath, data, splitRegex })
	}
}
