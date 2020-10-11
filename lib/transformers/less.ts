import less from "less";
import { Transformer } from "../types";
import { dirname as getDirname } from "path";

export const lessTransformer: Transformer = {
	srcExt: ".less",
	transform: async (absPath, input) => {
		const dir = getDirname(absPath);
		const { css: data } = await less.render(input, { paths: [dir] });
		return { data, ext: ".css" };
	}
}
