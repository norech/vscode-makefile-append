import * as vscode from 'vscode';
import { dirname, join, relative } from 'path';
import { findNearestFiles } from '../util';

/**
 * matches each variables with only source files in the makefile in the format "{KEY} ={ src/file1.c\\\nsrc/file2.c}" (groups are brackets)
 */
export const HELLISH_VARIABLES_FINDER = /([a-zA-Z_]+?)(?:\t| )*?=((?:(?:\t| )+.+?\.(?:c|cpp|h|hpp)(?:\t| )*?(?:\\(?:\r\n|\n))+)*(?:(?:\t| )*?.+?\.(?:c|cpp|h|hpp)(?:(?:\t| )\\)?))/mg;

export function getVariablesPositions(doc: vscode.TextDocument, content: string) {
    const matches = [...content.matchAll(HELLISH_VARIABLES_FINDER)];
    return matches.map((match) => ({
        match: match[0],
        key: match[1],
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

export async function appendToMakefile(file: vscode.Uri, makefile: vscode.Uri) {
    const doc = await vscode.workspace.openTextDocument(makefile);
    const text = doc.getText();
    const positions = getVariablesPositions(doc, text);
    const selectionKey = await vscode.window.showQuickPick(
        positions.map(p => p.key),
        { title: "Select the variable to append into" }
    );
    if (selectionKey === undefined) {
        vscode.window.showInformationMessage("Canceled.");
        return;
    }
    const selection = positions.find(p => p.key === selectionKey)!;
    const pos = selection.range.end.pos;
    const eol = doc.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
    const newLine = selection.rawFiles.endsWith("\\") ? eol : " \\" + eol;
    const relativePath = relative(dirname(makefile.fsPath), file.fsPath);
    const suffix = selection.rawFiles.endsWith(" \\") ? " \\"
        : (selection.rawFiles.endsWith("\\") ? "\\"
            : "");
    const lines = selection.rawFiles.split("\\\n");

    let indentation = "";
    if (lines.length === 1) {
        const rawFilesOffset = selection.match.indexOf(selection.rawFiles);
        indentation = " ".repeat(rawFilesOffset + 1); // repeat until it is aligned
    } else {
        const prevLine = lines[lines.length - 1];
        indentation += /^\s*/.exec(prevLine)![0]; // copy existing indentation
    }

    const editor = await vscode.window.showTextDocument(doc, 1, true);
    editor.edit((e) => {
        const content = newLine + indentation + relativePath + suffix;

        e.insert(pos, content);

        // move cursor to the end position
        const endPos = doc.positionAt(selection.range.end.index + content.length);
        editor.revealRange(new vscode.Range(endPos, endPos));
        editor.selection = new vscode.Selection(endPos, endPos);
    });
}

export async function listMakefileRules(makefile: vscode.Uri) {
    const doc = await vscode.workspace.openTextDocument(makefile);
    const text = doc.getText();
    const positions = getVariablesPositions(doc, text);
    return positions.map(p => {
        let lines = p.rawFiles.replace("\r\n", "\n").replace(/\\$/, "").split("\\\n");
        lines = lines.filter(l => l.trim().length > 0 && !l.trim().includes("$"));
        return {
            rule: p.key,
            range: p.range,
            files: lines.map(l => {
                const filepath = l.trim();
                const makefileDir = dirname(makefile.fsPath);
                const absolutePath = join(makefileDir, filepath);
                return {
                    name: filepath,
                    path: vscode.Uri.parse(absolutePath)
                };
            })
        };
    }).filter(p => p.files.length > 0);
}

export async function listMakefiles() {
    return (await vscode.workspace.findFiles("**/Makefile")).sort((a, b) => {
        const aDir = dirname(a.fsPath);
        const bDir = dirname(b.fsPath);
        return aDir.localeCompare(bDir);
    });
}

export async function appendToMakefileCommand(path : string | undefined) {
    if (path === undefined) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        path = editor.document.uri.fsPath;
    }
    const uri = vscode.Uri.parse(path);
    
    const makefiles = await findNearestFiles(uri, "**/Makefile");
    let makefilePath: string | undefined = undefined;

    if (makefiles.length === 1) {
        makefilePath = makefiles[0].path;
    } else if (makefiles.length > 1) {
        makefilePath = await vscode.window.showQuickPick(
            makefiles.map(m => m.path),
            { title: "Select the Makefile to append into" }
        );
    }
    if (makefilePath === undefined) {
        vscode.window.showInformationMessage("Canceled.");
        return;
    }
    const makefile = makefiles.find((m) => m.path === makefilePath)!;
    appendToMakefile(uri, makefile);
}
