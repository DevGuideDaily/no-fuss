import { pack } from "./pack";
import { copyFileSync } from "fs-extra";
import glob from "glob";
import { join, basename } from "path";

pack({
	srcDirPath: "test/src",
	tmpDirPath: "test/tmp",
	distDirPath: "test/dist",
	defaultTransformer: {
		transform: (srcFilePath, dstDirPath) => {
			const name = basename(srcFilePath);
			copyFileSync(srcFilePath, join(dstDirPath, name));
			return "";
		}
	},
	parsers: {},
	transformers: {},
	watchFiles: (dirPath, params) => {
		const paths = glob.sync(join(dirPath, "**", "*"));
		paths.forEach(params.onUpdate);
	}
});
