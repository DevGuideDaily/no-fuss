import { Transformer } from "../types";
import pug from "pug";

export const pugTransformer: Transformer = {
	srcExt: ".pug",
	transform: (absPath, input) => {
		const data = pug.render(input, { filename: absPath });
		return { data, ext: ".html" };
	}
}
