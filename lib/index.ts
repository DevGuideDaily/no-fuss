import { pack } from "./pack";
import { pugTransformer } from "./transformers/pug";
import { lessTransformer } from "./transformers/less";
import { createFileSystem } from "./file-system";

pack({
	srcDirPath: "test/src",
	outDirPath: "test/dist",
	transformers: [pugTransformer, lessTransformer],
	fileSystem: createFileSystem({ watch: true })
});
