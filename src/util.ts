import * as vscode from 'vscode';

/**
 * Find the nearest ancestor between two paths and the number of folders
 * between them
 * the bigger the parentLevel, the better the match
 */
export function findAncestor(path1: string, path2: string) {
    const parents1 = path1.split("/").reduce((arr, curr) => {
        const previousPath = arr.length === 0 ? "" : arr[arr.length - 1];
        const lastPath = previousPath + "/" + curr;

        return [...arr, lastPath];
    }, [] as string[]);

    const parents2 = path2.split("/").reduce((arr, curr) => {
        const previousPath = arr.length === 0 ? "" : arr[arr.length - 1];
        const lastPath = previousPath + "/" + curr;

        return [...arr, lastPath];
    }, [] as string[]);
  
    if (parents1[0] === parents2[0]) { // roots should be equals
        const length = Math.min(parents1.length, parents2.length);
        let i = 0;
        for (; i < length; i++) {
            // exit once path is different
            if (parents1[i] !== parents2[i]) {
                return {
                    parentLevel: parents1.length === i + 1 ? i + 1 : i,
                    ancestor: parents1[i - 1],
                };
            }
        }
        return {
            parentLevel: i,
            ancestor: parents1[i - 1],
        };
    }
  
    return { parentLevel: 0, ancestor: "/" };
}

export async function hasBuildFile(buildFileGlob: string) {
    const files = await vscode.workspace.findFiles(buildFileGlob);
    return files.length > 0;
}

export async function findNearestFiles(file: vscode.Uri, buildFileGlob: string) {
	const foundBuildFiles = await vscode.workspace.findFiles(buildFileGlob);
	const buildFilesAncestors = foundBuildFiles.map((mk) =>
        ({ parentLevel: findAncestor(mk.path, file.path).parentLevel, path: mk })
    );
	
	const sortedBuildFiles = buildFilesAncestors.sort((a, b) =>
        (a.parentLevel === b.parentLevel) ? 0
			: ((a.parentLevel < b.parentLevel) ? 1
				: -1)
    );

	return sortedBuildFiles.map((entry) => entry.path);
}
