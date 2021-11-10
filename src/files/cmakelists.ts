import * as vscode from 'vscode';
import { dirname, relative } from 'path';
import { findNearestFiles } from '../util';

/**
 * matches each variables with only source files in the cmakelists file in the format "set({KEY}{\n src/file1.c\nsrc/file2.c\n})" (groups are brackets)
 */
export const HELLISH_VARIABLES_FINDER = /set\(([A-Za-z_]+)((?:\s+.*?\.(?:cpp|c|h|hpp))+\s*?)\)/mg;

export function getVariablesPositions(content: string) {
    const matches = [...content.matchAll(HELLISH_VARIABLES_FINDER)];
    return matches.map((match) => ({
        match: match[0],
        key: match[1],
        rawFiles: match[2],
        range: { start: match.index!, end: match.index! + match[0].length }
    }));
}

export async function appendToCMakeLists(file: vscode.Uri, buildFile: vscode.Uri) {
	const doc = await vscode.workspace.openTextDocument(buildFile);
	const text = doc.getText();
	const positions = getVariablesPositions(text);
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
	const pos = doc.positionAt(selection.range.start + lastWhitespaceOffset);
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
		const endPos = doc.positionAt(selection.range.start + lastWhitespaceOffset);
		editor.revealRange(new vscode.Range(endPos, endPos));
		editor.selection = new vscode.Selection(endPos, endPos);
	});
}

export async function appendToCMakeListsCommand() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	const buildFiles = await findNearestFiles(editor.document.uri, "**/CMakeLists.txt");
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
	appendToCMakeLists(editor.document.uri, buildFile);
}

export function getLastWhitespaceStartPos(str: string) {
    for (let i = str.length - 1; i >= 0; i--) {
        if (!/\s/.exec(str[i])) {
            return i + 1;
        }
    }
    return -1;
}