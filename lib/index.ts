import { pack } from "./pack";
import { readFileSync, outputFileSync } from "fs-extra";
import glob from "glob";
import { join } from "path";

pack({
	srcDirPath: "test/src",
	tmpDirPath: "test/tmp",
	distDirPath: "test/dist",
	parsers: {},
	transformers: {},
	fileSystem: {
		read: path => readFileSync(path, { encoding: "utf8" }),
		write: (path, data) => outputFileSync(path, data),
		watch: (dirPath, params) => {
			const paths = glob.sync(join(dirPath, "**", "*"));
			paths.forEach(params.onUpdate);
		}
	}
});
