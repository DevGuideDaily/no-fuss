import { Dictionary, FileSystem, Parser, Transformer } from "./types";
import { parse as parsePath, join as joinPath, resolve as resolvePath } from "path";

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
	const absSrcDirPath = resolvePath(srcDirPath);
	const absTmpDirPath = resolvePath(tmpDirPath);

	const depsByAbsChildPath: Dictionary<Set<String>> = {};

	const addToDepTree = (rootPath: string, absParentPath: string) => {
		getDepChildPaths(rootPath, absParentPath)
			.filter(absChildPath => absChildPath !== absParentPath)
			.forEach(absChildPath => {
				const childDeps = depsByAbsChildPath[absChildPath] ?? new Set();
				childDeps.add(absParentPath);
				depsByAbsChildPath[absChildPath] = childDeps;
			});
	}

	const removeFromDepTree = (path: string) => {
		delete depsByAbsChildPath[path];
		for (const childPath in depsByAbsChildPath)
			depsByAbsChildPath[childPath]?.delete(path);
	}

	const getDepChildPaths = (rootPath: string, filePath: string) => {
		const { ext } = parsePath(filePath);
		const parser = parsers[ext];
		if (!parser) return [];
		const data = fileSystem.read(filePath);
		if (typeof data === "string") {
			const { depsByAbsChildPath } = parser.parse(rootPath, filePath, data);
			return Object.keys(depsByAbsChildPath);
		} else {
			return [];
		}
	}

	const bubbleUp = async (absChildPath: string, processFile: (path: string) => Promise<void>) => {
		await processFile(absChildPath);
		const parentPaths = getParentPaths(absChildPath);
		for (const parentPath of parentPaths) {
			await bubbleUp(parentPath, processFile);
		}
	}

	const getParentPaths = (absChildPath: string) => {
		return Object.entries(depsByAbsChildPath[absChildPath] ?? {})
			.filter(entry => !!entry[1])
			.map(entry => entry[0]);;
	}

	const transformFile = async (absFilePath: string) => {
		const { base, ext } = parsePath(absFilePath);
		const { transform } = transformers[ext] ?? defaultTransformer;
		const absTmpFilePath = joinPath(absTmpDirPath, base);
		const data = fileSystem.read(absFilePath);
		if (typeof data === "string") {
			fileSystem.write(absTmpFilePath, await transform(data));
		} else {
			fileSystem.write(absTmpFilePath, data);
		}
	}

	fileSystem.watch(absSrcDirPath, {
		onRemove: removeFromDepTree,
		onUpdate: (absPath: string) => {
			addToDepTree(absSrcDirPath, absPath);
			bubbleUp(absPath, transformFile);
		},
	});
}
