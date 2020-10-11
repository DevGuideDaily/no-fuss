import { readFileSync, outputFileSync, removeSync } from "fs-extra";
import glob from "glob";
import { pack } from "./pack";
import { resolve as resolvePath, join as joinPath } from "path";
import { lstatSync } from "fs-extra";
import { pugTransformer } from "./transformers/pug";
import { lessTransformer } from "./transformers/less";

pack({
	srcDirPath: "test/src",
	outDirPath: "test/dist",
	transformers: [pugTransformer, lessTransformer],
	fileSystem: {
		list: dirPath => {
			return glob.sync(joinPath(dirPath, "**", "*"))
				.filter(path => lstatSync(path).isFile())
				.map(path => resolvePath(path))
		},
		read: readFileSync,
		write: (path, data) => outputFileSync(path, data),
		remove: path => removeSync(path),
		watch: () => { }
	}
});
