# Novelist 📚

**A beautiful, simple writing app designed for everyone** - even if you find it hard to log into your email!

Novelist is a distraction-free writing application with VSCode Kimbie Dark theming, folder-based projects, and an interactive tutorial. Everything auto-saves, so you can focus on your story.

## ✨ Why Novelist?

- ✅ **SO EASY TO USE** - Interactive tutorial walks you through everything
- ✅ **AUTO-SAVES** - You'll never lose your work (saves every 2 seconds!)
- ✅ **FOLDER-BASED** - Each chapter is a separate file in Documents/Novelist/
- ✅ **BEAUTIFUL** - VSCode Kimbie Dark theme that's easy on the eyes
- ✅ **ORGANIZED** - Sidebar shows all chapters, characters, and planning notes
- ✅ **EXPORT READY** - Combine all chapters into one file when you're done

## 🎨 Features

### 📖 Project Management
- **Create projects** with one click - stored in `~/Documents/Novelist/`
- **Each chapter is a separate file** - easy to manage and backup
- **Add scenes** within chapters for better organization
- **Full chapter visualization** in sidebar - see your entire book structure
- **Export to single markdown file** when finished

### ✍️ Writing Experience
- **Simple, beautiful editor** - just start typing
- **Adjustable font size** - 10pt to 24pt
- **Auto-save** - saves 2 seconds after you stop typing
- **Word count** - track your progress in real-time
- **Distraction-free** - toggle sidebar with Cmd+B

### 👥 Character Management
- **Character profiles** - keep track of everyone in your story
- **Organized in sidebar** - quick access to all characters
- **Markdown-based** - easy to edit and customize

### 📝 Planning Tools
- **Plot outlines** - plan your story structure
- **Story arcs** - track character development
- **World building** - document your universe
- **Ideas & research** - capture inspiration
- **All organized by category** in the sidebar

### 🎓 Tutorial & Help
- **Interactive tutorial** on first run - shows you everything
- **Quick tips** - context-sensitive help when you need it
- **Help menu** - access tutorial anytime

## Installation

### Requirements
- Python 3.9 or higher
- macOS (optimized for macOS interface)

### Setup

1. **Install Python 3.9** (if not already installed):
   ```bash
   brew install python@3.9 python-tk@3.9
   ```

2. **Clone the repository**:
   ```bash
   git clone https://codeberg.org/cogrow4/Novelist.git
   cd Novelist
   ```

3. **Install dependencies**:
   ```bash
   /opt/homebrew/bin/pip3.9 install -r requirements.txt
   ```

## 🚀 Usage

### Starting the App

```bash
/opt/homebrew/bin/python3.9 -m app.main
```

### First Time? Here's What Happens:

1. **Tutorial appears** - walks you through everything (takes 2 minutes)
2. **Create your first project** - just give it a name
3. **Start writing!** - that's it!

### Daily Workflow

1. **Open the app**
2. **Click "Open Project"** - pick your book
3. **Click a chapter in the sidebar** - starts editing
4. **Write!** - your work auto-saves

### Creating Your Book Structure

**To add a chapter:**
1. Click **"+ Chapter"** in the sidebar
2. Give it a name (like "Chapter 1: The Beginning")
3. Start writing!

**To add a scene:**
1. Select a chapter in the sidebar
2. Click **"+ Scene"**
3. Give it a name (like "The Hero Wakes Up")

**To add a character:**
1. Click the **"👥 Characters"** tab
2. Click **"+ Character"**
3. Enter their name and details

### When You're Done Writing

1. Go to **File > Export Book**
2. Choose where to save it
3. You'll get ONE big file with all chapters combined!
4. Share it, publish it, or format it however you want!

### Keyboard Shortcuts

- **Cmd+N** - New project
- **Cmd+O** - Open project
- **Cmd+S** - Save (but it auto-saves anyway!)
- **Cmd+E** - Export book
- **Cmd+B** - Hide/show sidebar
- **Cmd+Z** - Undo
- **Cmd+Q** - Quit

### The Sidebar

The sidebar on the left shows your entire book:

- **📖 Chapters Tab** - All your chapters and scenes
- **👥 Characters Tab** - All your character profiles
- **📝 Planning Tab** - Plot outlines, ideas, research

Click the **⧉** button to pop it out into its own window!

## 📁 Where Are My Files?

Your projects are stored in **`~/Documents/Novelist/`**

Each project has its own folder:
```
~/Documents/Novelist/
└── My Novel/
    ├── chapters/
    │   ├── 01_welcome.md
    │   ├── 02_chapter_two.md
    │   └── 03_chapter_three.md
    ├── characters/
    │   ├── protagonist.md
    │   └── antagonist.md
    ├── planning/
    │   ├── plot/
    │   ├── arcs/
    │   └── world/
    └── project.json
```

**Each chapter is a separate markdown file** - you can:
- Open them in any text editor
- Backup to cloud storage
- Version control with git
- Share individual chapters

## 🎯 Design Philosophy

Novelist is designed to be **SIMPLE**:

1. **No complicated menus** - everything is in the sidebar
2. **No confusing buttons** - labels tell you exactly what they do
3. **Auto-saves always** - you don't need to think about saving
4. **Folder-based** - your files are just files, not locked in a database
5. **Tutorial included** - we teach you everything

**If you can click a button and type, you can use Novelist!**

## 🆘 Getting Help

- **Tutorial** - Click Help > Show Tutorial
- **Quick Tips** - Click Help > Quick Tip for random helpful hints
- **Stuck?** - Click the **❓ Help** button in the toolbar

## 🤝 Contributing

Found a bug or have a suggestion? We'd love to hear from you!
- Open an issue on Codeberg
- Submit a pull request
- Email us your feedback

## 📄 License

MIT License - free to use and modify!

## 🙏 Credits

- **Theme**: Inspired by VSCode's Kimbie Dark
- **Design**: Made for simplicity and beauty
- **Built with**: Python & Tkinter

---

## 💝 Made with Love

Novelist was built to make writing accessible to everyone. We believe that everyone has a story to tell, and technology should help, not hinder.

**Now go write that novel! 📚✨**
