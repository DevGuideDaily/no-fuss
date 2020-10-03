import { Dictionary, FileSystem, Parser, Transformer } from "./types";
import { parse as parsePath, join as joinPath } from "path";

interface PackParams {
	srcDirPath: string;
	distDirPath: string;
	tmpDirPath: string;
	parsers: Dictionary<Parser>;
	transformers: Dictionary<Transformer>;
	defaultTransformer?: Transformer;
	fileSystem: FileSystem;
}

const noopTransformer: Transformer = {
	transform: source => source
};

export const pack = ({
	srcDirPath,
	tmpDirPath,
	parsers,
	transformers,
	defaultTransformer = noopTransformer,
	fileSystem,
}: PackParams) => {
	const depTree: Dictionary<Dictionary<boolean>> = {};

	const addToDepTree = (rootPath: string, parentPath: string) => {
		getDeps(rootPath, parentPath)
			.filter(childPath => childPath !== parentPath)
			.forEach(childPath => {
				const childDeps = depTree[childPath] ?? {};
				childDeps[parentPath] = true;
				depTree[childPath] = childDeps;
			});
	}

	const getDeps = (rootPath: string, filePath: string) => {
		const { ext } = parsePath(filePath);
		const parser = parsers[ext];
		if (!parser) return [];
		const data = fileSystem.read(filePath);
		if (typeof data === "string") {
			return parser.parse(rootPath, filePath, data).dependencies;
		} else {
			return [];
		}
	}

	const bubbleUp = async (childPath: string, processFile: (path: string) => Promise<void>) => {
		await processFile(childPath);
		const parentPaths = getParentPaths(childPath);
		for (const parentPath of parentPaths) {
			await bubbleUp(parentPath, processFile);
		}
	}

	const getParentPaths = (childPath: string) => {
		return Object.entries(depTree[childPath] ?? {})
			.filter(entry => !!entry[1])
			.map(entry => entry[0]);;
	}

	const transformFile = async (srcFilePath: string) => {
		const { base, ext } = parsePath(srcFilePath);
		const { transform } = transformers[ext] ?? defaultTransformer;
		const tmpFilePath = joinPath(tmpDirPath, base);
		const data = fileSystem.read(srcFilePath);
		if (typeof data === "string") {
			fileSystem.write(tmpFilePath, await transform(data));
		} else {
			fileSystem.write(tmpFilePath, data);
		}
	}

	fileSystem.watch(srcDirPath, {
		onUpdate: (path: string) => {
			addToDepTree(srcDirPath, path);
			bubbleUp(path, transformFile);
		},
		onRemove: (path: string) => {
			delete depTree[path];
			for (const childPath in depTree) {
				const parentPaths = depTree[childPath] ?? {};
				parentPaths[path] = false;
			}
		}
	});
}
