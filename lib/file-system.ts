import { lstatSync, outputFileSync, readFileSync, removeSync } from "fs-extra"
import glob from "glob";
import { resolve as resolvePath, join as joinPath } from "path";
import { Dictionary, FileData, FileSystem, TestFileSystem, TestFileSystemLogItem } from "./types"
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
	textFiles?: Dictionary<string>;
	binaryFiles?: Dictionary<Buffer>;
}

export const createTestFileSystem = ({
	textFiles = {},
	binaryFiles = {}
}: CreateTestFileSystemParams): TestFileSystem => {
	const log: TestFileSystemLogItem[] = [];

	return {
		readText: path => {
			log.push({ operation: "read", path });
			return textFiles[path] ?? "";
		},
		readBinary: path => {
			log.push({ operation: "read", path });
			return binaryFiles[path] ?? Buffer.from("");
		},
		watch: (_, { onUpdate }) => {
			const keys = [
				...Object.keys(textFiles),
				...Object.keys(binaryFiles)
			];
			keys.forEach(onUpdate);
		},
		write: (path, data) => log.push({ operation: "write", path, data }),
		remove: path => log.push({ operation: "remove", path }),
		getLog: () => log
	}
}
