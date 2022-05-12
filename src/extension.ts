import * as vscode from 'vscode';
import { appendToCMakeListsCommand } from './files/cmakelists';
import { appendToMakefileCommand } from './files/makefile';
import { BuildFilesProvider } from './BuildFilesProvider';
import { appendToBuildFileCommand } from './files/buildfile';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand(
	    'makefile-append.appendToMakefile', appendToMakefileCommand
	));
	context.subscriptions.push(vscode.commands.registerCommand(
	    'makefile-append.appendToCMakeLists', appendToCMakeListsCommand
	));

	context.subscriptions.push(vscode.commands.registerCommand(
		'makefile-append.appendToBuildFile', appendToBuildFileCommand
	));
	
	const rootPath =
	vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
	  ? vscode.workspace.workspaceFolders[0].uri.fsPath
	  : undefined;

	if (rootPath) {
		const treeDataProvider = new BuildFilesProvider(rootPath);
	
		vscode.window.createTreeView('buildFiles', {
			treeDataProvider
		});

		context.subscriptions.push(vscode.commands.registerCommand(
			'makefile-append.refreshBuildFilesTree', () => treeDataProvider.refresh()
		));

		vscode.workspace.onDidSaveTextDocument(() => {
			treeDataProvider.refresh();
		});		
	}
}
