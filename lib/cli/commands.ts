import { createFileSystem } from "../file-system";
import { pack } from "../pack";
import { lessTransformer } from "../transformers/less";
import { pugTransformer } from "../transformers/pug";
import { startServer } from "./server";
import { removeSync } from "fs-extra";
import { Transformer } from "../types";
import { existsSync } from "fs-extra";
import { join } from "path";

interface PackOptions {
	srcDir?: string;
	outDir?: string;
}

interface CustomizablePackParams {
	srcDirPath: string,
	outDirPath: string,
	ignore: RegExp[],
	noHash: RegExp[],
	transformers: Transformer[]
}

interface ServeOptions extends PackOptions {
	port?: string;
}

interface ServeParams extends CustomizablePackParams {
	port: string;
}

const loadConfigFile = () => {
	const path = join(process.cwd(), "no-fuss.config.js");
	if (existsSync(path)) {
		const config = require(path);
		return config as Partial<CustomizablePackParams>;
	}
}

const resolvePartialPackParams = ({ srcDir, outDir }: PackOptions): CustomizablePackParams => {
	return {
		srcDirPath: srcDir ?? "src",
		outDirPath: outDir ?? "dist",
		ignore: [/\.DS_Store/i],
		noHash: [],
		transformers: [pugTransformer, lessTransformer],
		...loadConfigFile()
	}
}

export const runWatch = (passedOptions: PackOptions) => {
	const packParams = resolvePartialPackParams(passedOptions);
	console.log(`✅ Watching files ${packParams.srcDirPath}  ⮕  ${packParams.outDirPath}`);
	removeSync(packParams.outDirPath);
	pack({
		...packParams,
		fileSystem: createFileSystem({ continuouslyWatch: true })
	});
}

export const runBuild = (passedOptions: PackOptions) => {
	const packParams = resolvePartialPackParams(passedOptions);
	removeSync(packParams.outDirPath);
	pack({
		...packParams,
		fileSystem: createFileSystem({})
	});
	console.log(`✅ Done!\n`);
}

const resolveServeOptions = (options: ServeOptions): Required<ServeParams> => {
	return {
		...resolvePartialPackParams(options),
		port: options.port ?? "5000"
	};
}

export const runServe = (passedOptions: ServeOptions) => {
	const params = resolveServeOptions(passedOptions);
	runWatch(passedOptions);
	startServer(params);
}
