# How It Works

This part of the documentation aims to explain how this tiny project works.

## Basic Flow

Whenever a file is added or updated in the source directory, the following flow is triggered:

1. Read and parse the source file to determine the list of dependencies
1. Transform the source file, for example: `pug` to `html`
1. Parse the transform result to determine the list of dependencies
1. Generate the out file data
1. Compute the fingerprint of the file
1. Save the output file to disk with the fingerprinted file name
1. Save the mapping between the output file path and the source file path
1. Look for other already parsed files to see if they have the current file as dependency. If yes, regenerate those files, and for each of them check other files that might have them as dependency. This phase is called `bubble up`.

## Parsing

The parsing algorithm is very naive, but it gets the job done for the most common use cases.

The way it works is:

1. It looks for anything that looks like a file path using the following regex: `/([\/\.\w-_]+\.[a-z]+)/`
1. It resolves the path it finds based on the path of the current file, and the root path of the source folder.
	- If the found path is absolute, it is resolved as relative to the root path of the source folder.
	- If the found path is relative, it is resolved as relative to the directory of the current file.

At the end of the parsing process, the output is a structure called `ParsedFile`. Most notably, it has the field called `parts` which is an array of `strings` and `objects` like this:

```typescript
export interface ParsedFile {
	ext: string; // extension of the file
	parts: ParsedFilePart[];
}

export type ParsedFilePart = string | {
	originalPath: string; // path found using the regex
	absFilePath: string;  // resolved path as described above
}
```

## Generating Output File Data

The algorithm for generating the output file data takes the `ParsedFile` structure and generates a single string based on `parts`.

1. Start from an empty `string` and call it *result*.
1. If the current part is a `string`, simply append it to the result.
1. If the current part is an object, take the `absFilePath` and look to see if we have a mapping between that `absFilePath` (which is supposed to point to some file in our source directory) and some output file. If the mapping exists, use the path from the mapping. If the mapping doesn't exist, simply use the `originalPath`.

This basically means that we only fingerprint paths in the output file, for which we know for sure that they point to one of the source files we have. This allows the parsing algorithm to be very naive.
