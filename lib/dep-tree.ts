import { DepTree, Dictionary, FileSystem, Parser } from "./types";
import { parse as parsePath } from "path";

interface AddToDepTreeParams {
	rootPath: string;
	absParentPath: string;
	depTree: DepTree;
	parsers: Dictionary<Parser>;
	fileSystem: FileSystem;
}

export const addToDepTree = ({
	rootPath,
	absParentPath,
	depTree,
	parsers,
	fileSystem,
}: AddToDepTreeParams) => {
	removeFromDepTree(absParentPath, depTree);
	Object.entries(getDepsByAbsChildPath({ rootPath, absParentPath, parsers, fileSystem }))
		.filter(([absChildPath]) => absChildPath !== absParentPath)
		.forEach(([absChildPath, dependency]) => {
			const childDeps = depTree[absChildPath] ?? {};
			childDeps[absParentPath] = dependency;
			depTree[absChildPath] = childDeps;
		});
}

export const removeFromDepTree = (absPath: string, depTree: DepTree) => {
	delete depTree[absPath];
	for (const childPath in depTree)
		delete depTree[childPath]?.[absPath];
}

interface GetDepsByAbsChildPathParams {
	rootPath: string;
	absParentPath: string;
	parsers: Dictionary<Parser>;
	fileSystem: FileSystem;
}

export const getDepsByAbsChildPath = ({
	rootPath,
	absParentPath,
	parsers,
	fileSystem
}: GetDepsByAbsChildPathParams) => {
	const { ext } = parsePath(absParentPath);
	const parser = parsers[ext];
	if (!parser) return {};
	const data = fileSystem.read(absParentPath);
	if (typeof data === "string") {
		const { depsByAbsChildPath } = parser.parse(rootPath, absParentPath, data);
		return depsByAbsChildPath;
	} else {
		return {};
	}
}

