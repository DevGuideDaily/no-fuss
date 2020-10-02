import { Dictionary, Parser, Transformer } from "./types";
import { extname } from "path";

interface PackParams {
	srcDirPath: string;
	distDirPath: string;
	tmpDirPath: string;
	parsers: Dictionary<Parser>;
	transformers: Dictionary<Transformer>;
	defaultTransformer: Transformer;
	watchFiles: (dirPath: string, params: WatchFilesParams) => void;
}

interface WatchFilesParams {
	onUpdate: (path: string) => void;
	onRemove: (path: string) => void;
}

export const pack = ({
	srcDirPath,
	tmpDirPath,
	parsers,
	transformers,
	defaultTransformer,
	watchFiles,
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
		const ext = extname(filePath);
		const parser = parsers[ext];
		if (!parser) return [];
		return parser.getDependencies(rootPath, filePath);
	}

	const bubbleUp = async (childPath: string, processFile: (path: string) => Promise<string> | string) => {
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
		const ext = extname(srcFilePath);
		const { transform } = transformers[ext] ?? defaultTransformer;
		return transform(srcFilePath, tmpDirPath);
	}

	watchFiles(srcDirPath, {
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
