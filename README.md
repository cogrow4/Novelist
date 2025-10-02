# Novelist

A modern, professional WYSIWYG writing application for novelists and creative writers. Built with a beautiful Notion-inspired dark theme and macOS Pages-like interface.

## Features

### Beautiful, Modern Interface
- **Notion-inspired dark theme** with professional color palette
- **WYSIWYG editor** - what you see is what you get (no separate preview needed)
- **Clean, distraction-free** writing environment
- **Popout sidebar** for planning, project management, and characters

### Rich Text Editing
- **Font selection** - choose from any system font
- **Font size control** - adjust size from 8pt to 72pt
- **Text formatting** - Bold, Italic, Underline
- **Text alignment** - Left, Center, Right
- **Real-time spell check** with suggestions
- **Find & Replace** functionality
- **Undo/Redo** support

### Project Management
- **Chapter & Scene organization** - structure your novel
- **Character profiles** - detailed character management with roles, ages, descriptions, and notes
- **Planning tools** - Outlines, plot development, and general notes
- **Auto-save** - never lose your work

### Professional Features
- **Git integration** - version control for your writing
- **Settings panel** - customize fonts, themes, and preferences
- **Keyboard shortcuts** - efficient workflow
- **File management** - open, save, and manage multiple documents

### Themes
- **Dark mode** (default) - Notion-inspired dark theme
- **Light mode** - Clean, professional light theme
- Seamless theme switching

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

## Usage

### Running the App

```bash
/opt/homebrew/bin/python3.9 -m app.main
```

### Keyboard Shortcuts

- **Cmd+N** - New file
- **Cmd+O** - Open file
- **Cmd+S** - Save file
- **Cmd+Shift+S** - Save as
- **Cmd+F** - Find/Replace
- **Cmd+B** - Toggle sidebar
- **Cmd+Z** - Undo
- **Cmd+Shift+Z** - Redo
- **Cmd+X/C/V** - Cut/Copy/Paste
- **Cmd+Q** - Quit

### Using the Sidebar

Press **Cmd+B** or go to **View > Toggle Sidebar** to open the popout sidebar with:

1. **Planning Tab**
   - Create outlines, character notes, plot development
   - Organize your ideas and research
   - Double-click to open in editor

2. **Project Tab**
   - Manage chapters and scenes
   - Structure your novel
   - Quick navigation between sections

3. **Characters Tab**
   - Create character profiles
   - Track character details (name, role, age)
   - Add descriptions and notes
   - Double-click to edit character

### Formatting Your Text

Use the toolbar at the top of the editor to:
- **Select font** - Choose from any installed system font
- **Adjust size** - Pick font size (8-72pt)
- **Format text** - Bold (B), Italic (I), Underline (U)
- **Align text** - Left, Center, Right alignment

### Settings

Access **File > Settings** to customize:
- **Theme** - Dark or Light mode
- **Default font** - Set your preferred font
- **Default font size** - Set your preferred size
- **Spell check** - Enable/disable spell checking
- **Auto-save** - Enable/disable auto-save (every 2 minutes)

### Git Integration

Manage version control through the **Git menu**:
- **Init Repository** - Initialize git in your project folder
- **Status** - Check repository status
- **Commit** - Commit your changes
- **Set Remote** - Configure remote repository
- **Push/Pull** - Sync with remote

## Project Structure

```
Novelist/
├── app/
│   ├── main.py              # Main application
│   ├── rich_editor.py       # WYSIWYG rich text editor
│   ├── themes.py            # Notion-inspired theming
│   ├── settings.py          # Settings dialog
│   ├── characters.py        # Character management
│   ├── planning.py          # Planning & notes
│   ├── project.py           # Chapter/scene management
│   ├── storage.py           # Data persistence
│   ├── git_integration.py   # Git operations
│   └── onboarding.py        # First-run experience
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Data Storage

All data is automatically saved to `~/.novelist/`:
- **settings.json** - Application settings and preferences
- **notes.json** - Planning notes, outlines, and ideas
- **project.json** - Project structure, chapters, scenes, and characters

## Design Philosophy

Novelist is designed to be:
- **Distraction-free** - Clean interface that gets out of your way
- **Professional** - Polished UI inspired by Notion and macOS Pages
- **Powerful** - All the features you need without complexity
- **Beautiful** - Carefully crafted dark theme with perfect contrast
- **Efficient** - Keyboard shortcuts and smart workflows

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## License

MIT License - feel free to use and modify for your own projects.

## Acknowledgments

- inspired by Notion's beautiful dark theme
- Interface design influenced by macOS Pages
- Built with Python and Tkinter

---

**Happy Writing! 📝**
