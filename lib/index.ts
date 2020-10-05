import { transformSources } from "./pack";
import { readFileSync, outputFileSync } from "fs-extra";
import glob from "glob";
import { join, resolve } from "path";

transformSources({
	srcDirPath: "test/src",
	tmpDirPath: "test/tmp",
	parsers: {},
	transformers: {},
	fileSystem: {
		list: dirPath => {
			const paths = glob.sync(join(dirPath, "**", "*"));
			return paths.map(path => resolve(path));
		},
		read: path => readFileSync(path, { encoding: "utf8" }),
		write: (path, data) => outputFileSync(path, data),
		watch: _ => { }
	}
});
