import { lstatSync, outputFileSync, readFileSync, removeSync } from "fs-extra"
import glob from "glob";
import { resolve as resolvePath, join as joinPath } from "path";
import { FileSystem } from "./types"
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
		read: readFileSync,
		write: (path, data) => outputFileSync(path, data),
		remove: path => removeSync(path),
		watch: () => { }
	}
}
