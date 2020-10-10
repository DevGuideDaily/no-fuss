export type Dictionary<T> = Record<string, T | undefined> & Object;

export type FileData = string | ArrayBuffer;

export interface FileSystem {
	read: (path: string) => FileData;
	write: (path: string, data: FileData) => void;
	remove: (path: string) => void;
	watch: (dirPath: string, params: WatchFilesParams) => void;
}

interface WatchFilesParams {
	onUpdate: (absPath: string) => void;
	onRemove: (absPath: string) => void;
}

export interface Transformer {
	transform: (data: string) => Promise<string> | string;
	getNewExt: (oldExt: string) => string;
}

export interface Parser {
	parse: (absSrcDirPath: string, absFilePath: string, data: string) => ParsedFile;
}

export interface ParsedFile {
	parts: ParsedFilePart[];
}

export type ParsedFilePart = string | {
	absFilePath: string;
}
