import { lstatSync, outputFileSync, readFileSync, removeSync } from "fs-extra"
import glob from "glob";
import { resolve as resolvePath, join as joinPath } from "path";
import { Dictionary, FileData, FileSystem, FileSystemLogItem, WatchCallbacks } from "./types"
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
	expectedCount = 0,
	onFinish
}: CreateTestFileSystemParams): FileSystem => {
	const log: FileSystemLogItem[] = [];
	const files: Dictionary<FileData> = {};

	let watchPath: string | undefined;
	let watchCallbacks: WatchCallbacks | undefined;

	const handleOperation = (item: FileSystemLogItem) => {
		log.push(item);
		if (log.length === expectedCount)
			onFinish?.(log);
	}

	return {
		readText: path => {
			handleOperation({ operation: "read", path });
			return files[path]?.toString() ?? "";
		},
		readBinary: path => {
			handleOperation({ operation: "read", path });
			return Buffer.from(files[path] ?? "");
		},
		watch: (path, callbacks) => {
			watchPath = path;
			watchCallbacks = callbacks;
		},
		write: (path, data) => {
			files[path] = data;
			handleOperation({ operation: "write", path, data });
			if (!!watchPath && path.startsWith(watchPath)) {
				setImmediate(() => watchCallbacks?.onUpdate(path));
			}
		},
		remove: path => {
			delete files[path];
			handleOperation({ operation: "remove", path });
			if (!!watchPath && path.startsWith(watchPath)) {
				setImmediate(() => watchCallbacks?.onRemove(path));
			}
		}
	}
}
