import { createTestFileSystem } from "./file-system";

describe("TestFileSystem", () => {
	const textFiles: Array<[string, string]> = [
		["/index.pug", "p Hello World"],
		["/style.less", "body { color: red; }"]
	]

	const binaryFiles: Array<[string, string]> = [
		["/image-a.png", "Some image data A"],
		["/image-b.png", "Some image data B"]
	];

	describe("readText", () => {
		it("returns the correct value and logs", () => {
			const fs = createTestFileSystem({ files: textFiles });

			const indexData = fs.readText("/index.pug");
			expect(indexData).toEqual("p Hello World");

			const styleData = fs.readText("/style.less");
			expect(styleData).toEqual("body { color: red; }");

			const log = fs.getLog();
			expect(log).toEqual([
				{ operation: "read", path: "/index.pug" },
				{ operation: "read", path: "/style.less" }
			]);
		});
	});

	describe("readBinary", () => {
		it("returns the correct value and logs", () => {
			const fs = createTestFileSystem({ files: binaryFiles });

			const imageDataA = fs.readBinary("/image-a.png");
			expect(imageDataA).toEqual(Buffer.from("Some image data A"));

			const imageDataB = fs.readBinary("/image-b.png");
			expect(imageDataB).toEqual(Buffer.from("Some image data B"));

			const log = fs.getLog();
			expect(log).toEqual([
				{ operation: "read", path: "/image-a.png" },
				{ operation: "read", path: "/image-b.png" }
			]);
		});
	});

	describe("watch", () => {
		it("calls onUpdate for every path once", () => {
			const fs = createTestFileSystem({ files: [...textFiles, ...binaryFiles] });
			const paths: string[] = [];
			fs.watch("", {
				onUpdate: path => paths.push(path),
				onRemove: () => { }
			});

			expect(paths).toHaveLength(4);
			expect(paths).toContain("/index.pug");
			expect(paths).toContain("/style.less");
			expect(paths).toContain("/image-a.png");
			expect(paths).toContain("/image-b.png");
		});
	});

	describe("write", () => {
		it("logs correctly", () => {
			const fs = createTestFileSystem({});
			fs.write("/file-1", "Data 1");
			fs.write("/file-2", "Data 2");
			expect(fs.getLog()).toEqual([
				{ operation: "write", path: "/file-1", data: "Data 1" },
				{ operation: "write", path: "/file-2", data: "Data 2" }
			]);
		});
	});

	describe("remove", () => {
		it("logs correctly", () => {
			const fs = createTestFileSystem({});
			fs.remove("/file-1");
			fs.remove("/file-2");
			expect(fs.getLog()).toEqual([
				{ operation: "remove", path: "/file-1" },
				{ operation: "remove", path: "/file-2" }
			]);
		});
	});
});
