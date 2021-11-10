import * as vscode from 'vscode';
import { appendToMakefileCommand } from './files/makefile';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand(
		'makefile-append.appendToMakefile', appendToMakefileCommand
	));
}