import * as vscode from 'vscode';

import { listMakefileRules, listMakefiles } from './files/makefile';
import { dirname, relative } from 'path';
import { listCMakeLists, listCMakeListsRules } from './files/cmakelists';

export class BuildFilesProvider implements vscode.TreeDataProvider<Item> {
    private _onDidChangeTreeData: vscode.EventEmitter<Item | undefined | null | void> = new vscode.EventEmitter<BuildFile | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Item | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    constructor(private workspaceRoot: string) {}

    getTreeItem(element: Item): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: Item): Promise<Item[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No build file in empty workspace');
            return Promise.resolve([]);
        }

        if (element) {
            if (element instanceof BuildFile) {
                return Promise.resolve(
                    this.getRules(element)
                );
            } else if (element instanceof Rule) {
                return Promise.resolve(
                    this.getSourceFiles(element)
                );
            }
            return Promise.resolve([]);
        } else {
            return this.getBuildFiles();
        }
    }

    private async getBuildFiles(): Promise<BuildFile[]> {
        const makefiles = await listMakefiles();
        const cmakelists = await listCMakeLists();
    
        return [
            ...makefiles.map(m => new BuildFile(relative(this.workspaceRoot, m.path), m.path, "Makefile")),
            ...cmakelists.map(m => new BuildFile(relative(this.workspaceRoot, m.path), m.path, "CMakeLists"))
        ].sort((a, b) => {
            const aDir = dirname(a.fsPath);
            const bDir = dirname(b.fsPath);
            return aDir.localeCompare(bDir);
        });
    }

    private async getRules(file: BuildFile): Promise<Rule[]> {
        const rules = file.type === "Makefile"
            ? await listMakefileRules(file.uri)
            : await listCMakeListsRules(file.uri);

        return rules.map(r => new Rule(file, r.range.start.pos, r.rule, r.files));
    }

    private async getSourceFiles(rule: Rule): Promise<SourceFile[]> {
        return rule.sourceFiles.map(f => new SourceFile(f.name, f.path));
    }
}

class Item extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
    }

    // iconPath = {
    //     light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    //     dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    // };
}

class BuildFile extends Item {
    public uri : vscode.Uri;
    constructor(
        public readonly relPath: string,
        public readonly fsPath: string,
        public readonly type: string
    ) {
        super(relPath, vscode.TreeItemCollapsibleState.Expanded);
        this.tooltip = fsPath;
        this.description = type;
        this.uri = vscode.Uri.from({ scheme: "file", path: fsPath });
    }

    command = {
        "title": "Open file",
        "command": "vscode.open",
        "arguments": [this.fsPath]
    };

    // iconPath = {
    //     light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    //     dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    // };
}

class Rule extends Item {
    constructor(
        public readonly buildFile: BuildFile,
        public readonly position: vscode.Position,
        public readonly rule: string,
        public readonly sourceFiles: { name: string, path: vscode.Uri }[]
    ) {
        super(rule, vscode.TreeItemCollapsibleState.Expanded);
        this.tooltip = `${this.label}`;
        this.description = "";
    }

    command = {
        "title": "Open file",
        "command": "vscode.open",
        "arguments": [this.buildFile.fsPath, {
            selection: new vscode.Range(this.position, this.position)
        }]
    };

    // iconPath = {
    //     light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    //     dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    // };
}

class SourceFile extends Item {
    constructor(
        public readonly name: string,
        public readonly path: vscode.Uri
    ) {
        super(name, vscode.TreeItemCollapsibleState.None);
        this.tooltip = path.fsPath;
        this.description = "";
    }

    command = {
        "title": "Open file",
        "command": "vscode.open",
        "arguments": [this.path.fsPath]
    };

    // iconPath = {
    //     light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
    //     dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    // };
}
