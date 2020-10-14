import { lessTransformer } from "./less";

describe("lessTransformer", () => {
	it("returns the correct result", async () => {
		const input = `
			.my-class {
				color: red;
				&:hover {
					color: blue;
				}
			}
		`;
		const { data, ext } = await lessTransformer.transform("/", input);
		expect(ext).toEqual(".css");
		expect(data.replace(/\s/g, "")).toEqual(
			".my-class{color:red;}.my-class:hover{color:blue;}")
	});
});
