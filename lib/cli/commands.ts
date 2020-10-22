import { createFileSystem } from "../file-system";
import { pack } from "../pack";
import { lessTransformer } from "../transformers/less";
import { pugTransformer } from "../transformers/pug";
import { startServer } from "./server";
import { removeSync } from "fs-extra";

interface Options {
	srcDir?: string;
	outDir?: string;
}

const resolveOptions = ({ srcDir, outDir }: Options): Required<Options> => {
	return {
		srcDir: srcDir ?? "src",
		outDir: outDir ?? "dist"
	}
}

export const runWatch = (passedOptions: Options) => {
	const options = resolveOptions(passedOptions);
	console.log(`✅ Watching files ${options.srcDir}  ⮕  ${options.outDir}`);

	removeSync(options.outDir);
	pack({
		srcDirPath: options.srcDir,
		outDirPath: options.outDir,
		transformers: [pugTransformer, lessTransformer],
		fileSystem: createFileSystem({ continuouslyWatch: true })
	});
}

export const runBuild = (passedOptions: Options) => {
	const options = resolveOptions(passedOptions);
	removeSync(options.outDir);
	pack({
		srcDirPath: options.srcDir,
		outDirPath: options.outDir,
		transformers: [pugTransformer, lessTransformer],
		fileSystem: createFileSystem({})
	});
	console.log(`✅ Done!\n`);
}

interface ServeOptions extends Options {
	port?: string;
}


const resolveServeOptions = (options: ServeOptions): Required<ServeOptions> => {
	return {
		...resolveOptions(options),
		port: options.port ?? "5000"
	};
}

export const runServe = (passedOptions: ServeOptions) => {
	const options = resolveServeOptions(passedOptions);
	runWatch(options);
	startServer(options);
}
