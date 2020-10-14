import { fingerPrintFile } from "./finger-print";
import { createHash } from "crypto";
import { createTestFileSystem } from "./file-system";

describe("fingerPrintFile", () => {
	it("adds the hash to the file name", () => {
		const fileSystem = createTestFileSystem({});
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


		const log = fileSystem.getLog();
		expect(log).toEqual([
			{
				operation: "write",
				path: `/out/folder/file.${hexHash}.oe`,
				data: fileData
			}
		]);
	});
});
