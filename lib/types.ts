export type Dictionary<T> = Record<string, T | undefined> & Object;

export type FileData = string | Buffer;

export interface FileSystem {
	readText: (path: string) => string;
	readBinary: (path: string) => Buffer;
	write: (path: string, data: FileData) => void;
	remove: (path: string) => void;
	watch: (dirPath: string, params: WatchFilesParams) => void;
}

interface WatchFilesParams {
	onUpdate: (absPath: string) => void;
	onRemove: (absPath: string) => void;
}

interface FileSystemReadLogItem {
	operation: "read";
	path: string;
}

interface FileSystemWriteLogItem {
	operation: "write";
	path: string;
	data: FileData;
}

interface FileSystemRemoveLogItem {
	operation: "remove";
	path: string;
}

export type FileSystemLogItem =
	FileSystemReadLogItem |
	FileSystemWriteLogItem |
	FileSystemRemoveLogItem;

export interface Transformer {
	srcExt: string;
	transform: (absPath: string, input: string) => Promise<TransformResult> | TransformResult;
}

export interface TransformResult {
	ext: string;
	data: string;
}

export interface ParsedFile {
	ext: string;
	parts: ParsedFilePart[];
}

export type ParsedFilePart = string | {
	originalPath: string;
	absFilePath: string;
}
