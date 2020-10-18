import { createTestFileSystem } from "./file-system";
import { pack } from "./pack";
import { pugTransformer } from "./transformers/pug";

describe("pack", () => {
	describe("with only one file", () => {
		it("simply transforms and writes to output", () => {
			const fileSystem = createTestFileSystem({
				files: [["/src/file.pug", "h1 Hello World"]],
				expectedCount: 2,
				onFinish: log => {
					expect(log).toEqual([
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
		});

	});
});
