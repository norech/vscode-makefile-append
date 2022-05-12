import * as vscode from 'vscode';
import { dirname, join, relative } from 'path';
import { findNearestFiles } from '../util';

/**
 * matches each variables with only source files in the cmakelists file in the format "set({KEY}{\n src/file1.c\nsrc/file2.c\n})" (groups are brackets)
 */
export const HELLISH_VARIABLES_FINDER = /set\(([A-Za-z_]+)((?:\s+.*?\.(?:cpp|c|h|hpp))+\s*?)\)/mg;
export const HELLISH_FILES_FINDER = /file\((GLOB |GLOB_RECURSE |)([A-Za-z_]+)((?:\s+.*?\.(?:cpp|c|h|hpp))+\s*?)\)/mg;

export function getSetPositions(doc: vscode.TextDocument, content: string) {
    const matches = [
        ...content.matchAll(HELLISH_VARIABLES_FINDER),
    ];
    return matches.map((match) => ({
        match: match[0],
        key: match[1],
        glob: false,
        globRecurse: false,
        rawFiles: match[2],
        range: {
            start: {
                index: match.index!,
                pos: doc.positionAt(match.index!)
            },
            end: {
                index: match.index! + match[0].length,
                pos: doc.positionAt(match.index! + match[0].length)
            }
        }
    }));
}

export function getFilesPositions(doc: vscode.TextDocument, content: string) {
    const matches = [
        ...content.matchAll(HELLISH_FILES_FINDER)
    ];
    return matches.map((match) => ({
        match: match[0],
        key: match[2],
        glob: match[1] !== "",
        globRecurse: match[1] === "GLOB_RECURSE ",
        rawFiles: match[3],
        range: {
            start: {
                index: match.index!,
                pos: doc.positionAt(match.index!)
            },
            end: {
                index: match.index! + match[0].length,
                pos: doc.positionAt(match.index! + match[0].length)
            }
        }
    }));
}


export function getVariablesPositions(doc: vscode.TextDocument, content: string) {
    return [
        ...getSetPositions(doc, content),
        ...getFilesPositions(doc, content)
    ];
}

export async function appendToCMakeLists(file: vscode.Uri, buildFile: vscode.Uri) {
    const doc = await vscode.workspace.openTextDocument(buildFile);
    const text = doc.getText();
    const positions = getVariablesPositions(doc, text);
    const selectionKey: string | undefined = await vscode.window.showQuickPick(
        positions.map(p => p.key), { title: "Select the variable to append into" }
    );
    if (selectionKey === undefined) {
        vscode.window.showInformationMessage("Canceled.");
        return;
    }
    const selection = positions.find(p => p.key === selectionKey)!;
    const lastWhitespaceOffset = selection.match.indexOf(selection.rawFiles)
        + getLastWhitespaceStartPos(selection.rawFiles);
    const pos = doc.positionAt(selection.range.start.index + lastWhitespaceOffset);
    const editor = await vscode.window.showTextDocument(doc, 1, true);
    const eol = doc.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
    const newLine = eol;
    const relativePath = relative(dirname(buildFile.fsPath), file.fsPath);
    const lines = selection.rawFiles.split("\n");

    let indentation = "";
    if (lines.length === 1) {
        const rawFilesOffset = selection.match.indexOf(selection.rawFiles);
        indentation = " ".repeat(rawFilesOffset + 1); // repeat until it is aligned
    } else {
        const prevLine = lines[lines.length - 1];
        indentation += /^\s*/.exec(prevLine)![0]; // copy existing indentation
    }
    editor.edit((e) => {
        const content = newLine + indentation + relativePath;

        e.insert(pos, content);

        // move cursor to the end position
        const endPos = doc.positionAt(selection.range.start.index + lastWhitespaceOffset);
        editor.revealRange(new vscode.Range(endPos, endPos));
        editor.selection = new vscode.Selection(endPos, endPos);
    });
}

export async function listCMakeListsRules(makefile: vscode.Uri) {
    const doc = await vscode.workspace.openTextDocument(makefile);
    const text = doc.getText();
    const positions = getVariablesPositions(doc, text);

    const rules = await Promise.all(positions.map(async p => {
        let lines = p.rawFiles.replace("\r\n", "\n").replace(/\s+/g, "\n").replace(/\\$/, "").split("\n");
        lines = lines.filter(l => l.trim().length > 0 && !l.trim().includes("$"));

        const files = await Promise.all(lines.map(async l => {
            const filepath = l.trim();
            const buildDir = dirname(makefile.fsPath);
            const absolutePath = join(buildDir, filepath);
            let relativePath = vscode.workspace.asRelativePath(absolutePath);
            if (p.glob && absolutePath.includes("*")) {
                if (p.globRecurse) {
                    relativePath = relativePath.replace("**", "*").replace("*", "**");
                }
                return (await vscode.workspace.findFiles(relativePath)).map(f => ({
                    name: relative(buildDir, f.fsPath),
                    path: f
                }));
            }
            return [
                {
                    name: filepath,
                    path: vscode.Uri.parse(absolutePath)
                }
            ];
        }));

        return {
            rule: p.key,
            range: p.range,
            files: files.reduce((p, c) => [...p, ...c])
        };
    }));

    return rules.filter(p => p.files.length > 0);
}

export async function listCMakeLists() {
    return (await vscode.workspace.findFiles("**/CMakeLists.txt")).sort((a, b) => {
        const aDir = dirname(a.fsPath);
        const bDir = dirname(b.fsPath);
        return aDir.localeCompare(bDir);
    });
}

export async function appendToCMakeListsCommand(path : string | undefined) {
    if (path === undefined) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        path = editor.document.uri.fsPath;
    }
    const uri = vscode.Uri.parse(path);
    const buildFiles = await findNearestFiles(uri, "**/CMakeLists.txt");
    let buildFilePath: string | undefined = undefined;
    
    if (buildFiles.length === 1) {
        buildFilePath = buildFiles[0].path;
    } else if (buildFiles.length > 1) {
        buildFilePath = await vscode.window.showQuickPick(
            buildFiles.map(m => m.path),
            { title: "Select the CMakeLists.txt file to append into" }
        );
    }
    if (buildFilePath === undefined) {
        vscode.window.showInformationMessage("Canceled.");
        return;
    }
    const buildFile = buildFiles.find((m) => m.path === buildFilePath)!;
    appendToCMakeLists(uri, buildFile);
}

export function getLastWhitespaceStartPos(str: string) {
    for (let i = str.length - 1; i >= 0; i--) {
        if (!/\s/.exec(str[i])) {
            return i + 1;
        }
    }
    return -1;
}
