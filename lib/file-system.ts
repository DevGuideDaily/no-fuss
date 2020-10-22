import { lstatSync, outputFileSync, readFileSync, removeSync } from "fs-extra"
import glob from "glob";
import { resolve as resolvePath, join as joinPath } from "path";
import { Dictionary, FileData, FileSystem, FileSystemLogItem, WatchCallbacks } from "./types"
import chokidar from "chokidar";

interface CreateFileSystemParams {
	continuouslyWatch?: boolean;
}

type Watch = FileSystem["watch"];

export const createFileSystem = ({
	continuouslyWatch,
}: CreateFileSystemParams): FileSystem => {
	let watcher: chokidar.FSWatcher | undefined;
	let watchPath: string | undefined;

	const continuousWatch: Watch = (dirPath, { onUpdate, onRemove }) => {
		watchPath = joinPath(dirPath, "**", "*");
		watcher = chokidar.watch(watchPath);

		watcher.on("add", path => onUpdate(resolvePath(path)))
		watcher.on("change", path => onUpdate(resolvePath(path)))
		watcher.on("unlink", path => onRemove(resolvePath(path)))
	};

	const listWatch: Watch = (dirPath, { onUpdate }) => {
		return glob.sync(joinPath(dirPath, "**", "*"))
			.filter(path => lstatSync(path).isFile())
			.map(path => resolvePath(path))
			.forEach(onUpdate);
	};

	const fileSystem: FileSystem = {
		readText: path => readFileSync(path, { encoding: "utf-8" }),
		readBinary: path => readFileSync(path),
		write: (path, data) => outputFileSync(path, data),
		remove: path => removeSync(path),
		watch: continuouslyWatch ? continuousWatch : listWatch,
		stop: () => {
			if (!watcher || !watchPath) return;
			watcher.unwatch(watchPath);
			watcher.close();
		}
	}

	return fileSystem;
}

interface CreateTestFileSystemParams {
	files?: Array<[string, string]>;
	expectedCount?: number;
	onFinish?: (log: FileSystemLogItem[]) => void;
}

export const createTestFileSystem = ({
	expectedCount,
	onFinish
}: CreateTestFileSystemParams): FileSystem => {
	const log: FileSystemLogItem[] = [];
	const files: Dictionary<FileData> = {};

	let watchPath: string | undefined;
	let watchCallbacks: WatchCallbacks | undefined;

	const handleOperation = (item: FileSystemLogItem) => {
		log.push(item);
		if (onFinish && log.length === expectedCount) onFinish(log);
	}

	const getFileData = (path: string) => {
		const data = files[path];
		if (data === undefined) {
			throw new Error("File doesn't exist");
		} else {
			return data;
		}
	}

	return {
		readText: path => {
			handleOperation({ read: path });
			return getFileData(path).toString();
		},
		readBinary: path => {
			handleOperation({ read: path });
			return Buffer.from(getFileData(path));
		},
		watch: (path, callbacks) => {
			watchPath = path;
			watchCallbacks = callbacks;
		},
		write: (path, data) => {
			files[path] = data;
			handleOperation({ write: path, data });
			setImmediate(() => {
				if (!!watchPath && !!watchCallbacks && path.startsWith(watchPath)) {
					watchCallbacks.onUpdate(path);
				}
			})
		},
		remove: path => {
			delete files[path];
			handleOperation({ remove: path });
			setImmediate(() => {
				if (!!watchPath && !!watchCallbacks && path.startsWith(watchPath)) {
					watchCallbacks.onRemove(path);
				}
			});
		}
	}
}
