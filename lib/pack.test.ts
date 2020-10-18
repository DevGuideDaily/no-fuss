import { createTestFileSystem } from "./file-system";
import { pack } from "./pack";
import { pugTransformer } from "./transformers/pug";

describe("pack", () => {
	describe("with only one file", () => {
		it("simply transforms and writes to output", () => {
			const fileSystem = createTestFileSystem({
				expectedCount: 3,
				onFinish: log => {
					expect(log).toEqual([
						{ operation: "write", path: "/src/file.pug", data: "h1 Hello World" },
						{ operation: "read", path: "/src/file.pug" },
						{ operation: "write", path: "/out/file.html", data: "<h1>Hello World</h1>" },
					]);
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
			const fileSystem = createTestFileSystem({
				expectedCount: 7,
				onFinish: log => {
					expect(log).toEqual([
						{ operation: "write", path: "/src/file.pug", data: "h1 Hello World" },
						{ operation: "read", path: "/src/file.pug" },
						{ operation: "write", path: "/out/file.html", data: "<h1>Hello World</h1>" },
						{ operation: "write", path: "/src/file.pug", data: "h1 Updated" },
						{ operation: "read", path: "/src/file.pug" },
						{ operation: "remove", path: "/out/file.html" },
						{ operation: "write", path: "/out/file.html", data: "<h1>Updated</h1>" },
					]);
					done();
				}
			});

			let bubbleCount = 0;

			pack({
				fileSystem,
				outDirPath: "/out",
				srcDirPath: "/src",
				transformers: [pugTransformer],
				callbacks: {
					onBubbleUpFinished: () => {
						if (bubbleCount === 0) {
							fileSystem.write("/src/file.pug", "h1 Updated");
							bubbleCount += 1;
						}
					}
				}
			});

			fileSystem.write("/src/file.pug", "h1 Hello World")
		});
	});
});
