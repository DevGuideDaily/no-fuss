import { lstatSync, outputFileSync, readFileSync, removeSync } from "fs-extra"
import glob from "glob";
import { resolve as resolvePath, join as joinPath } from "path";
import { FileSystem, FileSystemLogItem } from "./types"
import chokidar from "chokidar";

interface CreateFileSystemParams {
	watch?: boolean;
}

export const createFileSystem = ({ watch }: CreateFileSystemParams) => {
	const fileSystem = createBasicFileSystem();

	if (watch) {
		fileSystem.watch = (dirPath, { onUpdate, onRemove }) => {
			chokidar.watch(joinPath(dirPath, "**", "*"))
				.on("add", path => onUpdate(resolvePath(path)))
				.on("change", path => onUpdate(resolvePath(path)))
				.on("unlink", path => onRemove(resolvePath(path)))
		};
	} else {
		fileSystem.watch = (dirPath, { onUpdate }) => {
			return glob.sync(joinPath(dirPath, "**", "*"))
				.filter(path => lstatSync(path).isFile())
				.map(path => resolvePath(path))
				.forEach(onUpdate);
		};
	}

	return fileSystem;
}

const createBasicFileSystem = (): FileSystem => {
	return {
		readText: path => readFileSync(path, { encoding: "utf-8" }),
		readBinary: path => readFileSync(path),
		write: (path, data) => outputFileSync(path, data),
		remove: path => removeSync(path),
		watch: () => { }
	}
}

interface CreateTestFileSystemParams {
	files?: Array<[string, string]>;
	expectedCount?: number;
	onFinish?: (log: FileSystemLogItem[]) => void;
}

export const createTestFileSystem = ({
	files = [],
	expectedCount = 0,
	onFinish
}: CreateTestFileSystemParams): FileSystem => {
	const log: FileSystemLogItem[] = [];

	const getFileData = (path: string) =>
		files.find(pair => pair[0] === path)?.[1];

	const handleOperation = (item: FileSystemLogItem) => {
		log.push(item);
		if (log.length === expectedCount)
			onFinish?.(log);
	}

	return {
		readText: path => {
			handleOperation({ operation: "read", path });
			return getFileData(path) ?? "";
		},
		readBinary: path => {
			handleOperation({ operation: "read", path });
			return Buffer.from(getFileData(path) ?? "");
		},
		watch: (_, { onUpdate }) => files.forEach(pair => onUpdate(pair[0])),
		write: (path, data) => handleOperation({ operation: "write", path, data }),
		remove: path => handleOperation({ operation: "remove", path })
	}
}
