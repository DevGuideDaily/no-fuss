export type Dictionary<T> = Record<string, T | undefined> & Object;

export interface Transformer {
	transform: (srcFilePath: string, dstDirPath: string) => Promise<string> | string;
}

export interface Parser {
	getDependencies: (rootPath: string, filePath: string) => string[];
}
