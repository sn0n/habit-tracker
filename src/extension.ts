// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
// Import Node.js modules for file system and path operations
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

    let panel: vscode.WebviewPanel | undefined;

    const showTrackerCommand = vscode.commands.registerCommand('habit-tracker.show', async () => {
        if (panel) {
            panel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        panel = vscode.window.createWebviewPanel(
            'habitTracker', 'Habit Tracker', vscode.ViewColumn.Beside,
            { enableScripts: true, retainContextWhenHidden: true }
        );
        
        panel.webview.html = await getWebviewContent(context.extensionPath);
        
        const updateWebview = () => {
            if (!panel) { return; }

            // SIMPLIFIED LOGIC: Always check for an open workspace folder
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                const rootPathToScan = vscode.workspace.workspaceFolders[0].uri.fsPath;
                const aggregatedHabits = scanAndParseHabits(rootPathToScan);
                panel.webview.postMessage({ command: 'updateData', data: aggregatedHabits });
            } else {
                // If no folder is open, show a message.
                panel.webview.postMessage({ command: 'showError', message: 'Please open a folder to track habits.' });
            }
        };

        updateWebview();

        panel.webview.onDidReceiveMessage(
            message => {
                if (!panel) {
                    return;
                }
                switch (message.command) {
                    case 'dayClicked':
                        panel.webview.postMessage({ command: 'showDayDetails', data: message.data });
                        return;
                }
            },
            undefined,
            context.subscriptions
        );

        panel.onDidChangeViewState(e => {
            if (e.webviewPanel.visible) { updateWebview(); }
        }, null, context.subscriptions);

        panel.onDidDispose(() => {
            panel = undefined;
        }, null, context.subscriptions);
    });

    const fileSaveListener = vscode.workspace.onDidSaveTextDocument(document => {
        if (!panel || !vscode.workspace.workspaceFolders) { return; }
        
        const notesFolderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        if (document.uri.fsPath.startsWith(notesFolderPath) && document.uri.fsPath.endsWith('.md')) {
            const aggregatedHabits = scanAndParseHabits(notesFolderPath);
            panel.webview.postMessage({ command: 'updateData', data: aggregatedHabits });
        }
    });

    context.subscriptions.push(showTrackerCommand, fileSaveListener);
}
// This method is called when your extension is deactivated
export function deactivate() {}

/**
 * Recursively finds all markdown files in a given directory.
 * @param dirPath The directory to search in.
 * @param arrayOfFiles An array to store the file paths.
 * @returns An array of full file paths to markdown files.
 */
function getAllMarkdownFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    try {
        const files = fs.readdirSync(dirPath);

        files.forEach(file => {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                getAllMarkdownFiles(fullPath, arrayOfFiles); // Recurse into subdirectory
            } else if (file.endsWith('.md')) {
                arrayOfFiles.push(fullPath); // Add file path to array
            }
        });
    } catch (err) {
        // Silently ignore errors like permission denied
    }
    
    return arrayOfFiles;
}


/**
 * Scans a directory RECURSIVELY for markdown files, parses them for habits, and returns aggregated data.
 * @param folderPath The absolute path to the root folder to start scanning from.
 * @returns An object where keys are dates (YYYY-MM-DD) and values are Maps of habit counts.
 */
function scanAndParseHabits(folderPath: string): { [date: string]: { [habit: string]: number } } {
    const aggregatedData: { [date:string]: { [habit: string]: number } } = {};
    
    // Get all files recursively from the specified folder path
    const allMarkdownFiles = getAllMarkdownFiles(folderPath);

    for (const filePath of allMarkdownFiles) {
        const filename = path.basename(filePath);
        
        // Use a flexible regex to find 'YYYY-MM-DD' at the beginning of the filename.
        const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);

        if (dateMatch && dateMatch[1]) {
            const dateStr = dateMatch[1]; // The captured date part, e.g., "2025-09-13"
            const content = fs.readFileSync(filePath, 'utf-8');
            const habitsInFile = parseHabitsFromContent(content);
            
            // Convert Map to a plain object for postMessage, as Maps don't serialize well
            const habitsObject: { [habit: string]: number } = {};
            habitsInFile.forEach((value, key) => {
                habitsObject[key] = value;
            });
            
            if (Object.keys(habitsObject).length > 0) {
               aggregatedData[dateStr] = habitsObject;
            }
        }
    }
    
    return aggregatedData;
}

/**
 * Parses a string of content and extracts habit data using regex.
 * @param content The text content of a note file.
 * @returns A Map where keys are habit names and values are their counts.
 */
function parseHabitsFromContent(content: string): Map<string, number> {
  const habits = new Map<string, number>();
  const regex = /&(\w+)(?:\((\d+)(?:\/(\d+))?\))?/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const habitName = match[1];
    const valueStr = match[2];
    const goalStr = match[3];

    let fraction = 1.0; // Default to 1.0 for solid habits like &exercise

    if (valueStr && goalStr) {
      // Fractional habit like &water(3/8)
      const value = parseInt(valueStr, 10);
      const goal = parseInt(goalStr, 10);
      if (goal > 0) {
        fraction = value / goal;
      }
    } else if (valueStr) {
      // Old format like &water(4) - treat as solid
      fraction = 1.0;
    }

    // If the habit is tracked multiple times, we take the highest value.
    const currentFraction = habits.get(habitName) || 0;
    habits.set(habitName, Math.max(currentFraction, fraction));
  }

  return habits;
}

async function getWebviewContent(extensionPath: string): Promise<string> {
    const webviewHtmlPath = path.join(extensionPath, 'src', 'webview.html');
    const webviewHtml = await fs.promises.readFile(webviewHtmlPath, 'utf-8');
    return webviewHtml;
}