import { lstatSync, outputFileSync, readFileSync, removeSync } from "fs-extra"
import glob from "glob";
import { resolve as resolvePath, join as joinPath } from "path";
import { Dictionary, FileData, FileSystem, FileSystemLogItem, WatchCallbacks } from "./types"
import chokidar from "chokidar";

interface CreateFileSystemParams {
	watch?: boolean;
}

export const createFileSystem = ({ watch }: CreateFileSystemParams) => {
	let watcher: chokidar.FSWatcher | undefined;
	let watchPath: string | undefined;

	const fileSystem: FileSystem = {
		readText: path => readFileSync(path, { encoding: "utf-8" }),
		readBinary: path => readFileSync(path),
		write: (path, data) => outputFileSync(path, data),
		remove: path => removeSync(path),
		watch: () => { },
		stop: () => {
			if (!watcher || !watchPath) return;
			watcher.unwatch(watchPath);
			watcher.close();
		}
	}

	if (watch) {
		fileSystem.watch = (dirPath, { onUpdate, onRemove }) => {
			watchPath = joinPath(dirPath, "**", "*");
			watcher = chokidar.watch(watchPath);
			watcher.on("add", path => onUpdate(resolvePath(path)))
			watcher.on("change", path => onUpdate(resolvePath(path)))
			watcher.on("unlink", path => onRemove(resolvePath(path)))
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

interface CreateTestFileSystemParams {
	files?: Array<[string, string]>;
	expectedCount: number;
	onFinish: (log: FileSystemLogItem[]) => void;
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
		if (log.length === expectedCount) onFinish(log);
	}

	return {
		readText: path => {
			handleOperation({ read: path });
			return files[path]?.toString() ?? "";
		},
		readBinary: path => {
			handleOperation({ read: path });
			return Buffer.from(files[path] ?? "");
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
		},
		stop: () => { }
	}
}
