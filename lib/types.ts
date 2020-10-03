export type Dictionary<T> = Record<string, T | undefined> & Object;

type FileData = string | ArrayBuffer;

export interface FileSystem {
	read: (path: string) => FileData;
	write: (path: string, data: FileData) => void;
	watch: (dirPath: string, params: WatchFilesParams) => void;
}

interface WatchFilesParams {
	onUpdate: (absPath: string) => void;
	onRemove: (absPath: string) => void;
}

export interface Transformer {
	transform: (data: string) => Promise<string> | string;
}

export interface Parser {
	parse: (rootPath: string, filePath: string, data: string) => ParseResult;
}

export interface ParseResult {
	depsByAbsChildPath: Dictionary<Dependency>;
}

export interface Dependency {
	sources: string[];
}
