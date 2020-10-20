import { createTestFileSystem } from "./file-system";
import { pack } from "./pack";
import { pugTransformer } from "./transformers/pug";
import { seq } from "./test-helpers";
import { Transformer } from "./types";

describe("pack", () => {
	describe("with only one file", () => {
		it("simply transforms and writes to output", done => {
			const expectedOperations = [
				{ write: "/src/file.pug", data: "h1 Hello World" },
				{ read: "/src/file.pug" },
				{ write: "/out/file.html", data: "<h1>Hello World</h1>" },
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
				{ write: "/src/file.pug", data: "h1 Hello World" },
				{ read: "/src/file.pug" },
				{ write: "/out/file.html", data: "<h1>Hello World</h1>" },
				{ write: "/src/file.pug", data: "h1 Updated" },
				{ read: "/src/file.pug" },
				{ write: "/out/file.html", data: "<h1>Updated</h1>" },
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
				{ write: "/src/file.pug", data: "h1 Hello World" },
				{ read: "/src/file.pug" },
				{ write: "/out/file.html", data: "<h1>Hello World</h1>" },
				{ remove: "/src/file.pug" },
				{ remove: "/out/file.html" },
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

		const tmpFilePath = "/tmp";
		const tmpFileData = "Temp"

		it("generates correct output when parent is added first", done => {
			const expectedOperations = [
				{ write: pagePath, data: pageData },
				{ read: pagePath },
				{ write: "/out/page.html", data: '<img src="image.jpg"/>' },
				{ write: imagePath, data: imageData },
				{ read: imagePath },
				{ write: "/out/image.hash.jpg", data: Buffer.from(imageData) },
				{ write: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },
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
				{ write: imagePath, data: imageData },
				{ read: imagePath },
				{ write: "/out/image.hash.jpg", data: Buffer.from(imageData) },
				{ write: pagePath, data: pageData },
				{ read: pagePath },
				{ write: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },
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
				{ write: imagePath, data: imageData },
				{ read: imagePath },
				{ write: "/out/image.hash.jpg", data: Buffer.from(imageData) },
				{ write: pagePath, data: pageData },
				{ read: pagePath },
				{ write: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },

				{ write: imagePath, data: updatedImageData },
				{ read: imagePath },
				{ write: "/out/image.hash.jpg", data: Buffer.from(updatedImageData) },
				{ write: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },
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
				{ write: imagePath, data: imageData },
				{ read: imagePath },
				{ write: "/out/image.hash.jpg", data: Buffer.from(imageData) },
				{ write: pagePath, data: pageData },
				{ read: pagePath },
				{ write: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },

				{ remove: imagePath },
				{ remove: "/out/image.hash.jpg" },
				{ write: "/out/page.html", data: '<img src="image.jpg"/>' },
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

		it("doesn't regenerate child when parent is updated", done => {
			const updatedPageData = "p Hello World"

			const expectedOperations = [
				{ write: imagePath, data: imageData },
				{ read: imagePath },
				{ write: "/out/image.hash.jpg", data: Buffer.from(imageData) },
				{ write: pagePath, data: pageData },
				{ read: pagePath },
				{ write: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },

				{ write: pagePath, data: updatedPageData },
				{ read: pagePath },
				{ write: "/out/page.html", data: "<p>Hello World</p>" },

				{ write: pagePath, data: pageData },
				{ read: pagePath },
				{ write: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },

				{ write: tmpFilePath, data: tmpFileData },
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
						() => fileSystem.write(pagePath, updatedPageData),
						() => fileSystem.write(pagePath, pageData),
						() => fileSystem.write(tmpFilePath, tmpFileData),
					)
				}
			});

			fileSystem.write(imagePath, imageData);
		});

		it("doesn't affect child when parent is removed", done => {
			const expectedOperations = [
				{ write: imagePath, data: imageData },
				{ read: imagePath },
				{ write: "/out/image.hash.jpg", data: Buffer.from(imageData) },
				{ write: pagePath, data: pageData },
				{ read: pagePath },
				{ write: "/out/page.html", data: '<img src="/image.hash.jpg"/>' },

				{ remove: pagePath },
				{ remove: "/out/page.html" },

				{ write: tmpFilePath, data: tmpFileData }
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
						() => fileSystem.remove(pagePath),
						() => fileSystem.write(tmpFilePath, tmpFileData),
					)
				}
			});

			fileSystem.write(imagePath, imageData);
		});

		describe("when output is not parsable", () => {
			const parseExtensions = [".pug"];

			it("doesn't regenerate the parent when child is updated", done => {
				const updatedImageData = "Updated Image Data";

				const expectedOperations = [
					{ write: imagePath, data: imageData },
					{ read: imagePath },
					{ write: "/out/image.hash.jpg", data: Buffer.from(imageData) },
					{ write: pagePath, data: pageData },
					{ read: pagePath },
					{ write: "/out/page.html", data: '<img src="image.jpg"/>' },

					{ write: imagePath, data: updatedImageData },
					{ read: imagePath },
					{ write: "/out/image.hash.jpg", data: Buffer.from(updatedImageData) },

					{ write: tmpFilePath, data: tmpFileData },
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
					parseExtensions,
					transformers: [pugTransformer],
					hashFileData: () => "hash",
					callbacks: {
						onBubbleUpFinished: seq(
							() => fileSystem.write(pagePath, pageData),
							() => fileSystem.write(imagePath, updatedImageData),
							() => fileSystem.write(tmpFilePath, tmpFileData)
						)
					}
				});

				fileSystem.write(imagePath, imageData);
			});

			it("doesn't regenerate the parent when child is removed", done => {
				const expectedOperations = [
					{ write: imagePath, data: imageData },
					{ read: imagePath },
					{ write: "/out/image.hash.jpg", data: Buffer.from(imageData) },
					{ write: pagePath, data: pageData },
					{ read: pagePath },
					{ write: "/out/page.html", data: '<img src="image.jpg"/>' },

					{ remove: imagePath },
					{ remove: "/out/image.hash.jpg" },

					{ write: tmpFilePath, data: tmpFileData },
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
					parseExtensions,
					transformers: [pugTransformer],
					hashFileData: () => "hash",
					callbacks: {
						onBubbleUpFinished: seq(
							() => fileSystem.write(pagePath, pageData),
							() => fileSystem.remove(imagePath),
							() => fileSystem.write(tmpFilePath, tmpFileData)
						)
					}
				});

				fileSystem.write(imagePath, imageData);
			});
		});

		describe("when dependency doesn't exist after transform", () => {
			const dummyData = "Dummy Data";

			const dummyTransformer: Transformer = {
				srcExt: ".pug",
				transform: () => ({ ext: ".html", data: dummyData })
			};

			it("regenerates the parent when child is updated", done => {
				const updatedImageData = "Updated Image Data";

				const expectedOperations = [
					{ write: imagePath, data: imageData },
					{ read: imagePath },
					{ write: "/out/image.hash.jpg", data: Buffer.from(imageData) },
					{ write: pagePath, data: pageData },
					{ read: pagePath },
					{ write: "/out/page.html", data: dummyData },

					{ write: imagePath, data: updatedImageData },
					{ read: imagePath },
					{ write: "/out/image.hash.jpg", data: Buffer.from(updatedImageData) },
					{ write: "/out/page.html", data: dummyData },
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
					transformers: [dummyTransformer],
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
					{ write: imagePath, data: imageData },
					{ read: imagePath },
					{ write: "/out/image.hash.jpg", data: Buffer.from(imageData) },
					{ write: pagePath, data: pageData },
					{ read: pagePath },
					{ write: "/out/page.html", data: dummyData },

					{ remove: imagePath },
					{ remove: "/out/image.hash.jpg" },
					{ write: "/out/page.html", data: dummyData },
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
					transformers: [dummyTransformer],
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
		})
	});
});
