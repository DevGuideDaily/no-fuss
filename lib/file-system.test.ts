import { createFileSystem, createTestFileSystem } from "./file-system";
import { writeFileSync, unlinkSync, readFileSync, existsSync, } from "fs";
import { join as joinPath } from "path";
import chokidar from "chokidar";

describe("createFileSystem", () => {
	const integrationTestsFolder = joinPath(__dirname, "../integration-tests/file-system");
	const file1Path = joinPath(integrationTestsFolder, "file-1.txt");
	const file2Path = joinPath(integrationTestsFolder, "file-2.txt");
	const tmpFilePath = joinPath(integrationTestsFolder, "tmp.txt");

	it("returns correct data for readText", () => {
		const tmpFileData = "Some text";
		writeFileSync(tmpFilePath, tmpFileData);
		const fs = createFileSystem({});
		const text = fs.readText(tmpFilePath);
		unlinkSync(tmpFilePath);
		expect(text).toEqual(tmpFileData);
	});

	it("returns correct data for readBinary", () => {
		const tmpFileData = Buffer.from("Some text");
		writeFileSync(tmpFilePath, tmpFileData);
		const fs = createFileSystem({});
		const binary = fs.readBinary(tmpFilePath);
		unlinkSync(tmpFilePath);
		expect(binary).toEqual(tmpFileData);
	});

	it("writes correct data", () => {
		const fs = createFileSystem({});
		const tmpFileData = Buffer.from("Some text");
		fs.write(tmpFilePath, tmpFileData);
		const binary = readFileSync(tmpFilePath);
		unlinkSync(tmpFilePath);
		expect(binary).toEqual(tmpFileData);
	});

	it("removes file correctly", () => {
		const tmpFileData = Buffer.from("Some text");
		writeFileSync(tmpFilePath, tmpFileData);
		const fs = createFileSystem({});
		fs.remove(tmpFilePath);
		expect(existsSync(tmpFilePath)).toEqual(false);
	});

	it("calls the onUpdate callback for existing files when not watching", done => {
		const fs = createFileSystem({});
		const updatedPaths: string[] = [];

		fs.watch(integrationTestsFolder, {
			onUpdate: path => updatedPaths.push(path),
			onRemove: () => { }
		});

		setTimeout(() => {
			updatedPaths.sort();
			expect(updatedPaths).toEqual([file1Path, file2Path]);
			done();
		}, 1000);
	});

	it("calls onUpdate and onRemove callback correctly", () => {
		const fs = createFileSystem({ continuouslyWatch: true });
		const updatedPaths: string[] = [];
		const removedPaths: string[] = [];

		fs.watch(integrationTestsFolder, {
			onUpdate: path => updatedPaths.push(path),
			onRemove: path => removedPaths.push(path)
		});

		//@ts-ignore
		chokidar.trigger("add", "/added-file.txt");

		//@ts-ignore
		chokidar.trigger("change", "/changed-file.txt");

		//@ts-ignore
		chokidar.trigger("unlink", "/removed-file.txt");

		expect(updatedPaths).toEqual(["/added-file.txt", "/changed-file.txt"]);
		expect(removedPaths).toEqual(["/removed-file.txt"]);
	});
});

describe("createTestFileSystem", () => {
	describe("readText", () => {
		it("returns the correct value and logs", done => {
			const fs = createTestFileSystem({
				expectedCount: 4,
				onFinish: log => {
					expect(log).toEqual([
						{ write: "/index.pug", data: "p Hello World" },
						{ write: "/style.less", data: "body { color: red; }" },
						{ read: "/index.pug" },
						{ read: "/style.less" }
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
						{ write: "/image-a.png", data: "Some image data A" },
						{ write: "/image-b.png", data: "Some image data B" },
						{ read: "/image-a.png" },
						{ read: "/image-b.png" }
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

		it("throws if the file doesn't exist", () => {
			const fs = createTestFileSystem({});
			expect(() => fs.readBinary("/wrong")).toThrow();
		});
	});

	describe("write", () => {
		it("logs correctly", done => {
			const fs = createTestFileSystem({
				expectedCount: 2,
				onFinish: log => {
					expect(log).toEqual([
						{ write: "/file-1", data: "Data 1" },
						{ write: "/file-2", data: "Data 2" }
					]);
					done();
				}
			});
			fs.write("/file-1", "Data 1");
			fs.write("/file-2", "Data 2");
		});

		it("updates the file data", done => {
			const fs = createTestFileSystem({
				expectedCount: 4,
				onFinish: () => done()
			});

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
						{ remove: "/file-1" },
						{ remove: "/file-2" }
					]);
					done();
				}
			});
			fs.remove("/file-1");
			fs.remove("/file-2");
		});

		it("removes file data", done => {
			const fs = createTestFileSystem({
				expectedCount: 2,
				onFinish: () => done()
			});

			fs.write("/file", "Data 1");
			fs.remove("/file");
			expect(() => fs.readText("/file")).toThrow();
		});
	});
});
