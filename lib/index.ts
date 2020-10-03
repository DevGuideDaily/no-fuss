import { transformSources } from "./pack";
import { readFileSync, outputFileSync } from "fs-extra";
import glob from "glob";
import { join } from "path";

transformSources({
	srcDirPath: "test/src",
	tmpDirPath: "test/tmp",
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
