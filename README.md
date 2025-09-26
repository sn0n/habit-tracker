# Habit Tracker Extension

A VS Code extension to graph your habits from daily notes.

This extension was tested with the [Foam](https://github.com/foambubble/foam) extension for VS Code, but it should work with any system where you create daily notes in Markdown.

The extension scans your workspace for Markdown files (`.md`) that are named with a date prefix in the format `YYYY-MM-DD` (e.g., `2025-09-25-daily-note.md`). It then looks for habit tracking syntax within those files in the following formats:

-   `&habit` (for a completed habit)
-   `&habit(value/goal)` (for a fractional habit, like `&water(3/8)`)


## Features

*   **Visualize Your Habits:** See your progress with a beautiful graph.
*   **Workspace-Wide Scanning:** Automatically finds and processes your habit notes from anywhere in your open workspace.
*   **Markdown-Friendly:** Integrates with your existing Markdown-based note-taking workflow.

## Usage

1.  **Open the Habit Tracker:**
    *   Open the Command Palette (Ctrl+Shift+P).
    *   Run the `Habit Tracker: Show` command.
    *   Alternatively, when viewing a Markdown file, click the calendar icon in the editor title bar.

## Release Notes

### 0.3.16

- Automated the VSIX extension file generation as part of the `npm run package` script.

### 0.3.15

- Updated `README.md` to be more accurate and descriptive.
- Removed unused dependencies (`@types/mocha`, `@vscode/test-electron`).
- Removed the unimplemented `habitTracker.notesFolder` setting.

### 0.3.14

- Renamed the default branch from `master` to `main`.
- Added a `Usage` section to the `README.md`.

### 0.0.1

Initial release of the Habit Tracker extension.