import { canParse, parse } from "./parse";

describe("canParse", () => {
	it("returns the correct result", () => {
		const extensions: Array<[string, boolean]> = [
			[".pug", true],
			[".html", true],
			[".less", true],
			[".css", true],
			[".webmanifest", true],
			[".jpg", false],
			[".png", false]
		];

		extensions.forEach(pair =>
			expect(canParse(pair[0])).toBe(pair[1]))
	})
});

describe("parse", () => {
	it("works correctly if there are no paths", () => {
		const data = '<div class="my-class"></div>';
		const { ext, parts } = parse({
			absSrcFilePath: "/src/file.html",
			absSrcDirPath: "/src",
			data,
			ext: ".html"
		});

		expect(ext).toEqual(".html");
		expect(parts).toEqual([data]);
	});

	it("returns correct parts if there are paths", () => {
		const data = '<img src="../assets/rel-image.jpg"><a href="/documents/abs-doc.pdf">PDF</a>';

		const { parts } = parse({
			absSrcFilePath: "/src/file.html",
			absSrcDirPath: "/src",
			data,
			ext: ".html"
		});

		expect(parts).toEqual([
			'<img src="',
			{
				originalPath: "../assets/rel-image.jpg",
				absFilePath: "/assets/rel-image.jpg"
			},
			'"><a href="',
			{
				originalPath: "/documents/abs-doc.pdf",
				absFilePath: "/src/documents/abs-doc.pdf"
			},
			'">PDF</a>'
		]);
	});
});
