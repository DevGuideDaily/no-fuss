import { pugTransformer } from "./pug";

describe("pugTransformer", () => {
	it("returns the correct data", async () => {
		const input = ".my-class";
		const { data, ext } = await pugTransformer.transform("/", input);
		expect(ext).toEqual(".html");
		expect(data).toEqual('<div class="my-class"></div>');
	})
})
