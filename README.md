# Novelist

A distraction‑free desktop writing app for long‑form fiction. Organize chapters and scenes, keep character sheets and planning notes, and write in a focused editor with automatic saving. Built with Electron and a rich‑text editor backed by Markdown.

## Highlights

- **Clean writing UI** powered by Quill with a plain contenteditable fallback.
- **Project model** stored as Markdown in `~/Documents/Novelist/<project-id>/`.
  - `chapters/*.md` and per‑chapter `*-scenes/*.md`
  - `characters/*.md` and `notes/*.md`
  - `project.json` metadata (name, timestamps).
- **Chapters & Scenes** sidebar with quick navigation and counts.
- **Characters & Notes** tabs. Notes are grouped by category.
- **Auto‑save** after brief idle and manual flush on window close.
- **Export** to a single Markdown file that concatenates chapters and scenes.
- **Recent Projects** list at the welcome screen (MRU + on‑disk scan).
- **Preferences** (font size, last opened project) stored via `electron-store`.
- **Git integration** (init, commit, push, pull) using `simple-git`.
- **Keyboard**: Toggle sidebar (Cmd/Ctrl+B), commit (Cmd/Ctrl+Shift+C), plus native editing.

## Quick start

```bash
# Requirements: Node 18+ (recommended), macOS/Windows/Linux
pnpm i   # or: npm install / yarn
npm start
```

The welcome screen lets you:
- Create a new project (stored in `~/Documents/Novelist/`).
- Open an existing project folder.
- Reopen a recent project from the list.

## Project storage

Each project lives under `~/Documents/Novelist/` by default. Example layout:

```
Novelist/
  my-story-abc123/
    project.json
    chapters/
      chapter-1-xxxx.md
      chapter-1-xxxx-scenes/
        scene-intro-yyyy.md
    characters/
      protagonist-zzzz.md
    notes/
      outline-qqqq.md
```

All content is Markdown so it remains portable and diff‑friendly.

## Features in the UI

- **Editor**: Rich formatting toolbar (headings, lists, code, links). If Quill fails to load, a plain editor is used automatically.
- **Word counts**: Live count for the editor and total words across chapters.
- **Meta panel**: Contextual fields like Note category and save status.
- **Tutorial tips**: Lightweight overlay accessible from Help → Tips & Tutorial.

## Git integration

From the menu: Git → Initialize/Commit/Push/Pull. Credentials are handled by your system Git; there is no in‑app sign‑in. Under the hood, the main process invokes `simple-git` against the project path.

## Export

File → Export Project writes `<project-name>-export.md` into the project folder, combining all chapters followed by their scenes.

## Architecture

- **Renderer** (`renderer/`)
  - `index.html` — layout and assets
  - `app.js` — UI, editor logic, rendering, auto‑save, MRU recents
- **Main** (`electron/`)
  - `main.js` — window creation, app menu, IPC handlers, preferences
  - `preload.js` — secure context bridge exposing `window.novelist` and menu events
  - `project-manager.js` — filesystem model, project CRUD, chapters/scenes/characters/notes, export, git helpers

### IPC surface (preload → main)

```ts
// projects
projects.create(name)
projects.list()
projects.openDialog()
projects.load(projectPath)

// chapters
chapters.list(projectPath)
chapters.create(projectPath, name)
chapters.save(projectPath, chapterId, payload)
chapters.createScene(projectPath, chapterId, sceneName)
chapters.saveScene(projectPath, chapterId, sceneId, payload)

// characters
characters.list(projectPath)
characters.save(projectPath, characterId, payload)

// notes
notes.list(projectPath)
notes.save(projectPath, noteId, payload)

// export
exports.project(projectPath)

// git
git.init(projectPath)
git.commit(projectPath, message)
git.push(projectPath)
git.pull(projectPath)

// preferences
preferences.get()
preferences.set(values)
```

## Development

- Code entry: `electron/main.js` (ESM) with a CommonJS preload (`electron/preload.js`) for compatibility with Electron’s preload environment.
- Styling is in `renderer/styles.css`. The editor toolbar and content live under `#editor-toolbar` and `#editor`.
- Run with DevTools auto‑open in development mode by setting `NODE_ENV=development`.

### Scripts

```jsonc
{
  "start": "electron .",
  "dev": "electron .",
  "package": "electron-builder"
}
```

Packaging is wired for `electron-builder`; add a config or run it in a CI/CD workflow as needed.

## Troubleshooting

- "Could not open project: Cannot set properties of null (setting 'textContent')":
  - Fixed by guarding missing DOM nodes; if you see it again, open DevTools and share the stack trace.
- Recent Projects not showing:
  - The app scans `~/Documents/Novelist/` and merges MRU from preferences. Ensure your projects contain a `project.json`.
- Quill not loading:
  - The app falls back to a plain editor and tries a CDN if the local asset is missing.
- Git errors:
  - Ensure the project folder is a repo (Git → Initialize) and your system Git is configured (ssh/https credentials).

## Privacy and data

Your writing stays on your machine. Projects are local Markdown files. No telemetry.

## Roadmap

- Export to EPUB/PDF
- Search across chapters/notes
- Per‑scene metadata and reordering
- Theming and typewriter mode

## Contributing

PRs welcome! Please:
- Keep features scoped and maintain the local‑file model.
- Add clear error handling and UI fallbacks.
- Test on macOS at minimum; Linux/Windows fixes are appreciated.

## License

MIT © 2025

## Credits

Icon attribution:
<a href="https://www.flaticon.com/free-icons/books" title="books icons">Books icons created by Freepik - Flaticon</a>
