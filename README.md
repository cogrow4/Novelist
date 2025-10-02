# Novelist

An innovative markdown editor for novel writers. Built with Python (Tkinter).

## Features (MVP)
- Dark/Light mode
- Markdown editing with live preview
- Basic formatting (bold, italic, headings, highlight)
- Spell check (pyspellchecker) with inline underlines
- Planning sidebar (outlines, characters, plot) and notes per chapter
- Search & replace, focus highlight
- Simple Git integration (init, status, commit)
- Onboarding tutorial on first run
- JSON storage for settings and project metadata

## Setup
1. Create a virtual environment (recommended):
```bash
python3 -m venv .venv
source .venv/bin/activate
```
2. Install dependencies:
```bash
pip install -r requirements.txt
```
3. Run the app:
```bash
python -m app.main
```

## Packaging
For distribution, consider PyInstaller:
```bash
pip install pyinstaller
pyinstaller --noconfirm --onefile --windowed app/main.py --name Novelist
```

## Notes
- Git integration uses your system `git`.
- Optional sync to GitHub/GitLab can be built on top by adding auth and remote operations.
- Spell checking uses US English by default.
