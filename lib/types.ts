import { readFileSync } from "fs-extra";

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

export interface TestFileSystem extends FileSystem {
	getLog: () => TestFileSystemLogItem[];
}

interface TestFileSystemReadLogItem {
	operation: "read";
	path: string;
}

interface TestFileSystemWriteLogItem {
	operation: "write";
	path: string;
	data: FileData;
}

interface TestFileSystemRemoveLogItem {
	operation: "remove";
	path: string;
}

export type TestFileSystemLogItem =
	TestFileSystemReadLogItem |
	TestFileSystemWriteLogItem |
	TestFileSystemRemoveLogItem;

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
