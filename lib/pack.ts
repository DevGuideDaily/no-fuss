import { DepTree, Dictionary, FileSystem, Parser, Transformer } from "./types";
import { parse as parsePath, join as joinPath, resolve as resolvePath } from "path";
import { addToDepTree, removeFromDepTree } from "./dep-tree";

interface TransformSourcesParams {
	srcDirPath: string;
	tmpDirPath: string;
	parsers: Dictionary<Parser>;
	transformers: Dictionary<Transformer>;
	defaultTransformer?: Transformer;
	fileSystem: FileSystem;
}

const noopTransformer: Transformer = {
	transform: source => source
};

export const transformSources = ({
	srcDirPath,
	tmpDirPath,
	parsers,
	transformers,
	defaultTransformer = noopTransformer,
	fileSystem,
}: TransformSourcesParams) => {
	const absSrcDirPath = resolvePath(srcDirPath);
	const absTmpDirPath = resolvePath(tmpDirPath);
	const depTree: DepTree = {};

	const addToTree = (absParentPath: string) =>
		addToDepTree({
			rootPath: srcDirPath,
			absParentPath,
			depTree,
			parsers,
			fileSystem,
		});

	fileSystem.list(absSrcDirPath).forEach(absFilePath => {
		addToTree(absFilePath);
		transformFile(absFilePath);
	});

	fileSystem.watch(absSrcDirPath, {
		onRemove: absPath => removeFromDepTree(absPath, depTree),
		onUpdate: absPath => {
			addToTree(absPath);
			bubbleUp(absPath, transformFile);
		},
	});

	const transformFile = async (absFilePath: string) => {
		const { base, ext } = parsePath(absFilePath);
		const absTmpFilePath = joinPath(absTmpDirPath, base);
		const { transform } = transformers[ext] ?? defaultTransformer;
		const data = fileSystem.read(absFilePath);
		if (typeof data === "string") {
			const transformed = await transform(data);
			transformed && fileSystem.write(absTmpFilePath, transformed);
		} else {
			fileSystem.write(absTmpFilePath, data);
		}
	}

	const bubbleUp = async (absChildPath: string, processFile: (path: string) => Promise<void>) => {
		await processFile(absChildPath);
		const parentPaths = getAbsParentPaths(absChildPath);
		for (const parentPath of parentPaths) {
			await bubbleUp(parentPath, processFile);
		}
	}

	const getAbsParentPaths = (absChildPath: string) => {
		return Object.entries(depTree[absChildPath] ?? {})
			.filter(entry => !!entry[1])
			.map(entry => entry[0]);;
	}
}
