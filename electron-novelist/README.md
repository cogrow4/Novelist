# Novelist - Electron Edition

A production-quality writing application built with Electron, featuring VSCode Kimbie Dark theming and Notion-like functionality.

## Features

### ✅ **Working Text Input**
- Fully functional text editor with markdown support
- Real-time typing with no lag
- Auto-save every 2 seconds

### 🎨 **VSCode Kimbie Dark Theme**
- Beautiful warm color palette
- Easy on the eyes for long writing sessions
- Professional, modern interface

### 📁 **Fixed Sidebar (No Popout)**
- Always visible on the left
- Three tabs: Chapters, Characters, Planning
- File browser shows all your content
- Click any file to edit it

### ✍️ **Full Text Editing Toolbar**
- **Bold** (Cmd+B)
- *Italic* (Cmd+I)
- # Headings
- Font size selector (12-24pt)
- Word count display

### 👥 **Proper Character Editor**
- Modal dialog with structured fields:
  - Name
  - Role (Protagonist/Antagonist/Supporting/Minor)
  - Age
  - Personality
  - Appearance
  - Background
  - Goals & Motivations
  - Notes
- Saves to markdown format

### 📖 **File Browser System**
- All chapters listed with icons
- All characters listed
- All planning notes listed
- Click to open and edit
- Create new items with + buttons

### 💾 **Folder-Based Storage**
- Projects stored in `~/Documents/Novelist/`
- Each chapter is a separate `.md` file
- Easy to backup and version control
- Compatible with any text editor

### 📤 **Export Functionality**
- Combine all chapters into one file
- Export as Markdown or Text
- Includes title page with author
- Ready for publishing or sharing

## Installation

1. **Install dependencies:**
   ```bash
   cd electron-novelist
   npm install
   ```

2. **Run the app:**
   ```bash
   npm start
   ```

## Usage

### Creating Your First Project

1. Click **📁** button to create new project
2. Enter project name
3. A welcome chapter will be created automatically
4. Start writing!

### Adding Content

**Add a Chapter:**
- Click the "Chapters" tab
- Click "+ Chapter"
- Enter chapter name
- Click the chapter to edit it

**Add a Character:**
- Click the "Characters" tab
- Click "+ Character"
- Enter character name
- Fill in the character profile form
- Click "Save Character"

**Add a Planning Note:**
- Click the "Planning" tab
- Click "+ Note"
- Enter note title
- Start writing your notes

### Text Formatting

**Using the Toolbar:**
- Select text and click **B** for bold
- Select text and click *I* for italic
- Click **# H** to make current line a heading

**Using Keyboard Shortcuts:**
- `Cmd+B` - Bold
- `Cmd+I` - Italic
- `Cmd+S` - Save (though it auto-saves anyway!)

### Exporting Your Book

1. Click **📤 Export** in the toolbar
2. Choose where to save
3. Select format (Markdown or Text)
4. Click Save

Your complete book will be exported as one file!

## Project Structure

```
~/Documents/Novelist/
└── My Novel/
    ├── chapters/
    │   ├── 01_welcome.md
    │   ├── 02_chapter_two.md
    │   └── 03_final_chapter.md
    ├── characters/
    │   ├── protagonist.md
    │   └── villain.md
    ├── planning/
    │   ├── plot_outline.md
    │   └── world_notes.md
    └── project.json
```

## File Format

All files are plain markdown (`.md`) format, making them:
- Easy to read in any text editor
- Compatible with version control (Git)
- Future-proof and portable
- Compatible with other writing tools

## Keyboard Shortcuts

- `Cmd+B` - Bold selected text
- `Cmd+I` - Italic selected text
- `Cmd+S` - Manual save (auto-saves automatically)

## Technical Details

- **Framework**: Electron 28
- **Rendering**: Native HTML/CSS/JavaScript
- **Storage**: File system (markdown files)
- **Theme**: Custom VSCode Kimbie Dark implementation
- **Auto-save**: 2 seconds after last keystroke

## What's Fixed from the Python Version

✅ **Text input works** - No more frozen text boxes
✅ **Sidebar stays put** - Fixed on the left, no popout issues
✅ **Full toolbar** - All editing tools in one place
✅ **Character editor works** - Proper form with all fields
✅ **File browser works** - Click to open, edit, and save
✅ **Auto-save works** - Saves 2 seconds after you stop typing
✅ **Export works** - Combines all chapters correctly
✅ **Performance** - Fast, responsive, no lag

## Development

Run in development mode with DevTools:
```bash
npm run dev
```

## Building for Distribution

To create a distributable app:
```bash
npm install electron-builder --save-dev
npm run build
```

## Troubleshooting

**"App won't start"**
- Make sure you ran `npm install`
- Check that Node.js is installed

**"Can't create project"**
- Make sure ~/Documents/Novelist/ directory exists
- Check file permissions

**"Characters won't save"**
- Make sure the project is open
- Check that the characters folder exists

## License

MIT License - Free to use and modify!

---

**Made with ❤️ for writers everywhere**

This Electron version delivers on all the promises:
- ✅ Works like VSCode
- ✅ Feels like Notion
- ✅ Everything actually functions
- ✅ Beautiful and professional
