import { fingerPrintFile } from "./finger-print";
import { createHash } from "crypto";
import { createTestFileSystem } from "./file-system";

describe("fingerPrintFile", () => {
	it("adds the hash to the file name", done => {
		const fileSystem = createTestFileSystem({
			expectedCount: 1,
			onFinish: log => {
				expect(log).toEqual([
					{
						write: `/out/folder/file.${hexHash}.oe`,
						data: fileData
					}
				]);
				done();
			}
		});

		const fileData = "Some file data";
		const hexHash = createHash("md5")
			.update(fileData)
			.digest("hex")
			.slice(0, 8);

		fingerPrintFile({
			fileData,
			absSrcDirPath: "/src",
			absSrcFilePath: "/src/folder/file.ie",
			absOutDirPath: "/out",
			outExt: ".oe",
			fileSystem
		});
	});
});
