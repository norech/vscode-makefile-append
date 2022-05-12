import * as vscode from 'vscode';
import { dirname, join, relative } from 'path';
import { hasBuildFile } from '../util';
import { appendToMakefileCommand } from './makefile';
import { appendToCMakeListsCommand } from './cmakelists';

const buildFileTypes = [
    { key: "CMakeLists", filePattern: "**/CMakeLists.txt", append: appendToCMakeListsCommand },
    { key: "Makefile",   filePattern: "**/Makefile",       append: appendToMakefileCommand }
];

export async function appendToBuildFileCommand(path : string | undefined) {
    if (path === undefined) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        path = editor.document.uri.fsPath;
    }
    const uri = vscode.Uri.parse(path);
    const types = [];

    for (const type of buildFileTypes) {
        if (await hasBuildFile(type.filePattern)) {
            types.push(type.key);
        }
    }

    let buildType: string | undefined = undefined;

    if (types.length === 1) {
        buildType = types[0];
    } else if (types.length > 1) {
        buildType = await vscode.window.showQuickPick(
            types,
            { title: "Select the build file to append to" }
        );
    }
    if (buildType === undefined) {
        vscode.window.showInformationMessage("Canceled.");
        return;
    }
    const buildFileType = buildFileTypes.find((t) => t.key === buildType)!;
    buildFileType.append(uri.fsPath);
}
