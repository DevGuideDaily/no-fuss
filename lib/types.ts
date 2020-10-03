export type Dictionary<T> = Record<string, T | undefined> & Object;

export interface FileSystem {
	read: (path: string) => string;
	write: (path: string, data: string) => void;
	watch: (dirPath: string, params: WatchFilesParams) => void;
}

interface WatchFilesParams {
	onUpdate: (path: string) => void;
	onRemove: (path: string) => void;
}

export interface Transformer {
	transform: (source: string) => Promise<string> | string;
}

export interface Parser {
	parse: (rootPath: string, filePath: string, source: string) => ParseResult;
}

export interface ParseResult {
	dependencies: string[];
}
