/**
 * Find the nearest ancestor between two paths and the number of folders
 * between them
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
        for (let i = parents1.length - 1; i >= 0; i--) {
            // exit once path is different
            if (parents1[i] !== parents2[i]) {
                return {
                    parentLevel: parents1.length - i,
                    ancestor: parents1[i - 1],
                };
            }
        }
    }
  
    return { parentLevel: parents1.length, ancestor: "/" };
}