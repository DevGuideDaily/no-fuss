import { readFileSync, outputFileSync, removeSync } from "fs-extra";
import glob from "glob";
import { pack } from "./pack";
import { resolve as resolvePath, join as joinPath } from "path";
import { lstatSync } from "fs-extra";
import { htmlParser } from "./parsers/html";
import { cssParser } from "./parsers/css";

pack({
	srcDirPath: "test/src",
	outDirPath: "test/dist",
	parsers: {
		".html": htmlParser,
		".css": cssParser
	},
	transformers: {},
	fileSystem: {
		read: path => readFileSync(path, { encoding: "utf8" }),
		write: (path, data) => outputFileSync(path, data),
		remove: path => removeSync(path),
		watch: (dirPath, { onUpdate }) => {
			glob.sync(joinPath(dirPath, "**", "*"))
				.filter(path => lstatSync(path).isFile())
				.map(path => resolvePath(path))
				.forEach(onUpdate)
		}
	}
});
