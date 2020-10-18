import { createTestFileSystem } from "./file-system";

describe("TestFileSystem", () => {
	describe("readText", () => {
		it("returns the correct value and logs", done => {
			const fs = createTestFileSystem({
				expectedCount: 4,
				onFinish: log => {
					expect(log).toEqual([
						{ operation: "write", path: "/index.pug", data: "p Hello World" },
						{ operation: "write", path: "/style.less", data: "body { color: red; }" },
						{ operation: "read", path: "/index.pug" },
						{ operation: "read", path: "/style.less" }
					]);
					done();
				}
			});

			fs.write("/index.pug", "p Hello World");
			fs.write("/style.less", "body { color: red; }");

			const indexData = fs.readText("/index.pug");
			expect(indexData).toEqual("p Hello World");

			const styleData = fs.readText("/style.less");
			expect(styleData).toEqual("body { color: red; }");
		});
	});

	describe("readBinary", () => {
		it("returns the correct value and logs", done => {
			const fs = createTestFileSystem({
				expectedCount: 4,
				onFinish: log => {
					expect(log).toEqual([
						{ operation: "write", path: "/image-a.png", data: "Some image data A" },
						{ operation: "write", path: "/image-b.png", data: "Some image data B" },
						{ operation: "read", path: "/image-a.png" },
						{ operation: "read", path: "/image-b.png" }
					]);
					done();
				}
			});

			fs.write("/image-a.png", "Some image data A");
			fs.write("/image-b.png", "Some image data B");

			const imageDataA = fs.readBinary("/image-a.png");
			expect(imageDataA).toEqual(Buffer.from("Some image data A"));

			const imageDataB = fs.readBinary("/image-b.png");
			expect(imageDataB).toEqual(Buffer.from("Some image data B"));
		});
	});

	describe("write", () => {
		it("logs correctly", done => {
			const fs = createTestFileSystem({
				expectedCount: 2,
				onFinish: log => {
					expect(log).toEqual([
						{ operation: "write", path: "/file-1", data: "Data 1" },
						{ operation: "write", path: "/file-2", data: "Data 2" }
					]);
					done();
				}
			});
			fs.write("/file-1", "Data 1");
			fs.write("/file-2", "Data 2");
		});

		it("updates the file data", () => {
			const fs = createTestFileSystem({});

			fs.write("/file", "Data 1");
			expect(fs.readText("/file")).toEqual("Data 1");

			fs.write("/file", "Data 2");
			expect(fs.readText("/file")).toEqual("Data 2");
		});
	});

	describe("remove", () => {
		it("logs correctly", done => {
			const fs = createTestFileSystem({
				expectedCount: 2,
				onFinish: log => {
					expect(log).toEqual([
						{ operation: "remove", path: "/file-1" },
						{ operation: "remove", path: "/file-2" }
					]);
					done();
				}
			});
			fs.remove("/file-1");
			fs.remove("/file-2");
		});

		it("removes file data", () => {
			const fs = createTestFileSystem({});
			fs.write("/file", "Data 1");
			fs.remove("/file");
			expect(fs.readText("/file")).toEqual("");
		});
	});
});
