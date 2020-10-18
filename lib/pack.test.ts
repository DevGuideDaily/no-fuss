import { createTestFileSystem } from "./file-system";
import { pack } from "./pack";
import { pugTransformer } from "./transformers/pug";
import { seq } from "./test-helpers";

describe("pack", () => {
	describe("with only one file", () => {
		it("simply transforms and writes to output", done => {
			const expectedOperations = [
				{ operation: "write", path: "/src/file.pug", data: "h1 Hello World" },
				{ operation: "read", path: "/src/file.pug" },
				{ operation: "write", path: "/out/file.html", data: "<h1>Hello World</h1>" },
			];

			const fileSystem = createTestFileSystem({
				expectedCount: expectedOperations.length,
				onFinish: log => {
					expect(log).toEqual(expectedOperations);
					done();
				}
			});

			pack({
				fileSystem,
				outDirPath: "/out",
				srcDirPath: "/src",
				transformers: [pugTransformer]
			});

			fileSystem.write("/src/file.pug", "h1 Hello World")
		});

		it("updates the output if source is updated", done => {
			const expectedOperations = [
				{ operation: "write", path: "/src/file.pug", data: "h1 Hello World" },
				{ operation: "read", path: "/src/file.pug" },
				{ operation: "write", path: "/out/file.html", data: "<h1>Hello World</h1>" },
				{ operation: "write", path: "/src/file.pug", data: "h1 Updated" },
				{ operation: "read", path: "/src/file.pug" },
				{ operation: "write", path: "/out/file.html", data: "<h1>Updated</h1>" },
			];

			const fileSystem = createTestFileSystem({
				expectedCount: expectedOperations.length,
				onFinish: log => {
					expect(log).toEqual(expectedOperations);
					done();
				}
			});

			pack({
				fileSystem,
				outDirPath: "/out",
				srcDirPath: "/src",
				transformers: [pugTransformer],
				callbacks: {
					onBubbleUpFinished: seq(
						() => fileSystem.write("/src/file.pug", "h1 Updated")
					)
				}
			});

			fileSystem.write("/src/file.pug", "h1 Hello World")
		});

		it("removes the output if source is removed", done => {
			const expectedOperations = [
				{ operation: "write", path: "/src/file.pug", data: "h1 Hello World" },
				{ operation: "read", path: "/src/file.pug" },
				{ operation: "write", path: "/out/file.html", data: "<h1>Hello World</h1>" },
				{ operation: "remove", path: "/src/file.pug" },
				{ operation: "remove", path: "/out/file.html" },
			];

			const fileSystem = createTestFileSystem({
				expectedCount: expectedOperations.length,
				onFinish: log => {
					expect(log).toEqual(expectedOperations);
					done();
				}
			});

			pack({
				fileSystem,
				outDirPath: "/out",
				srcDirPath: "/src",
				transformers: [pugTransformer],
				callbacks: {
					onBubbleUpFinished: seq(
						() => fileSystem.remove("/src/file.pug")
					)
				}
			});

			fileSystem.write("/src/file.pug", "h1 Hello World");
		});
	});

	describe("with two dependent files", () => {
		const pagePath = "/src/page.pug";
		const pageData = 'img(src="image.jpg")';

		const imagePath = "/src/image.jpg";
		const imageData = "Image Data";

		it("generates correct output when parent is added first", done => {
			const expectedOperations = [
				{ operation: "write", path: pagePath, data: pageData },
				{ operation: "read", path: pagePath },
				{ operation: "write", path: "/out/page.html", data: '<img src="image.jpg"/>' },
				{ operation: "write", path: imagePath, data: imageData },
				{ operation: "read", path: imagePath },
				{ operation: "write", path: "/out/image.hash.jpg", data: Buffer.from(imageData) },
				{ operation: "write", path: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },
			];

			const fileSystem = createTestFileSystem({
				expectedCount: expectedOperations.length,
				onFinish: log => {
					expect(log).toEqual(expectedOperations);
					done();
				}
			});

			pack({
				fileSystem,
				outDirPath: "/out",
				srcDirPath: "/src",
				transformers: [pugTransformer],
				hashFileData: () => "hash",
				callbacks: {
					onBubbleUpFinished: seq(
						() => fileSystem.write(imagePath, imageData)
					)
				}
			});

			fileSystem.write(pagePath, pageData);
		});

		it("generates correct output when child is added first", done => {
			const expectedOperations = [
				{ operation: "write", path: imagePath, data: imageData },
				{ operation: "read", path: imagePath },
				{ operation: "write", path: "/out/image.hash.jpg", data: Buffer.from(imageData) },
				{ operation: "write", path: pagePath, data: pageData },
				{ operation: "read", path: pagePath },
				{ operation: "write", path: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },
			];

			const fileSystem = createTestFileSystem({
				expectedCount: expectedOperations.length,
				onFinish: log => {
					expect(log).toEqual(expectedOperations);
					done();
				}
			});

			pack({
				fileSystem,
				outDirPath: "/out",
				srcDirPath: "/src",
				transformers: [pugTransformer],
				hashFileData: () => "hash",
				callbacks: {
					onBubbleUpFinished: seq(
						() => fileSystem.write(pagePath, pageData)
					)
				}
			});

			fileSystem.write(imagePath, imageData);
		});

		it("regenerates the parent when child is updated", done => {
			const updatedImageData = "Updated Image Data";

			const expectedOperations = [
				{ operation: "write", path: imagePath, data: imageData },
				{ operation: "read", path: imagePath },
				{ operation: "write", path: "/out/image.hash.jpg", data: Buffer.from(imageData) },
				{ operation: "write", path: pagePath, data: pageData },
				{ operation: "read", path: pagePath },
				{ operation: "write", path: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },
				{ operation: "write", path: imagePath, data: updatedImageData },
				{ operation: "read", path: imagePath },
				{ operation: "write", path: "/out/image.hash.jpg", data: Buffer.from(updatedImageData) },
				{ operation: "write", path: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },
			];

			const fileSystem = createTestFileSystem({
				expectedCount: expectedOperations.length,
				onFinish: log => {
					expect(log).toEqual(expectedOperations);
					done();
				}
			});

			pack({
				fileSystem,
				outDirPath: "/out",
				srcDirPath: "/src",
				transformers: [pugTransformer],
				hashFileData: () => "hash",
				callbacks: {
					onBubbleUpFinished: seq(
						() => fileSystem.write(pagePath, pageData),
						() => fileSystem.write(imagePath, updatedImageData)
					)
				}
			});

			fileSystem.write(imagePath, imageData);
		});

		it("regenerates the parent when child is removed", done => {
			const expectedOperations = [
				{ operation: "write", path: imagePath, data: imageData },
				{ operation: "read", path: imagePath },
				{ operation: "write", path: "/out/image.hash.jpg", data: Buffer.from(imageData) },
				{ operation: "write", path: pagePath, data: pageData },
				{ operation: "read", path: pagePath },
				{ operation: "write", path: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },
				{ operation: "remove", path: imagePath },
				{ operation: "remove", path: "/out/image.hash.jpg" },
				{ operation: "write", path: "/out/page.html", data: '<img src="image.jpg"/>' },
			];

			const fileSystem = createTestFileSystem({
				expectedCount: expectedOperations.length,
				onFinish: log => {
					expect(log).toEqual(expectedOperations);
					done();
				}
			});

			pack({
				fileSystem,
				outDirPath: "/out",
				srcDirPath: "/src",
				transformers: [pugTransformer],
				hashFileData: () => "hash",
				callbacks: {
					onBubbleUpFinished: seq(
						() => fileSystem.write(pagePath, pageData),
						() => fileSystem.remove(imagePath)
					)
				}
			});

			fileSystem.write(imagePath, imageData);
		});
	});
});
