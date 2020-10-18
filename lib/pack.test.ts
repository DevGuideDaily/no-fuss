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

		describe("when parent is added first", () => {
			it("generates correct output", done => {
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
		});

		describe("when child is added first", () => {
			it("generates correct output", done => {
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
		});
	});
});
