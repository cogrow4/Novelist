<div align="center">

# 📚 Novelist

### Distraction-Free Desktop Writing App for Authors

*Your creative companion for crafting long-form fiction with focus and clarity*

[![GitHub stars](https://img.shields.io/github/stars/cogrow4/Novelist?style=for-the-badge&logo=github&color=6366f1)](https://github.com/cogrow4/Novelist/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/cogrow4/Novelist?style=for-the-badge&logo=github&color=6366f1)](https://github.com/cogrow4/Novelist/network)
[![GitHub issues](https://img.shields.io/github/issues/cogrow4/Novelist?style=for-the-badge&logo=github&color=6366f1)](https://github.com/cogrow4/Novelist/issues)
[![License](https://img.shields.io/badge/License-Unlicense-6366f1?style=for-the-badge)](./LICENSE)

[![Built with Electron](https://img.shields.io/badge/Built_with-Electron-47848f?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![Powered by Quill](https://img.shields.io/badge/Powered_by-Quill-1d4ed8?style=for-the-badge)](https://quilljs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)

[🐛 Report Bug](https://github.com/cogrow4/Novelist/issues) • [✨ Request Feature](https://github.com/cogrow4/Novelist/issues)

---

</div>

## 📋 Table of Contents

- [✨ Features](#-features)
- [🎯 What Makes This Special](#-what-makes-this-special)
- [🚀 Quick Start](#-quick-start)
- [📁 Project Storage](#-project-storage)
- [⚙️ Configuration](#️-configuration)
- [💻 Development](#-development)
- [🔧 Troubleshooting](#-troubleshooting)
- [🗺️ Roadmap](#️-roadmap)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [💖 Credits](#-credits)

---

## ✨ Features

<div align="center">

| Feature | Description |
|---------|-------------|
| ✍️ **Clean Writing UI** | Rich-text editor powered by Quill with automatic fallback |
| 📖 **Chapters & Scenes** | Organize your story with nested structure and quick navigation |
| 👥 **Character Sheets** | Keep track of your cast with dedicated character profiles |
| 📝 **Planning Notes** | Categorized notes for worldbuilding, outlines, and research |
| 💾 **Auto-Save** | Never lose your work with automatic saving and manual flush |
| 📊 **Word Counts** | Live tracking for current document and total project words |
| 📤 **Export** | Compile your entire project into a single Markdown file |
| 🔄 **Git Integration** | Built-in version control with init, commit, push, and pull |
| 📂 **Project Management** | Recent projects list and quick-access welcome screen |
| ⚡ **Keyboard Shortcuts** | Toggle sidebar (Cmd/Ctrl+B), commit (Cmd/Ctrl+Shift+C) |
| 🔒 **Privacy First** | All data stays local - no telemetry, no cloud sync |
| 📝 **Markdown Storage** | Portable, diff-friendly format for version control |

</div>

---

## 🎯 What Makes This Special

### 🏗️ Built With Modern Technology

```
Frontend:         Electron + Quill Rich Text Editor
Storage:          Local Markdown Files (~/Documents/Novelist/)
State:            electron-store for preferences
Version Control:  simple-git integration
Architecture:     IPC bridge with secure context isolation
Format:           Markdown-backed content (portable & VCS-friendly)
```

### 🎪 Key Capabilities

- **Project Model**: Each project is a folder with Markdown files for chapters, scenes, characters, and notes
- **Hierarchical Structure**: Chapters contain scenes; scenes are stored as nested files
- **Live Preview**: Rich formatting toolbar with headings, lists, code blocks, and links
- **Contextual UI**: Meta panel adapts to show relevant fields (Note category, save status)
- **Tutorial System**: Built-in tips and tutorial overlay accessible from Help menu
- **Cross-Platform**: Works on macOS, Windows, and Linux

### 📚 Perfect For Writers Who Want

- 🎯 **Focus**: Distraction-free interface that keeps you in the creative flow
- 🗂️ **Organization**: Clear structure for complex stories with multiple plot threads
- 💾 **Safety**: Automatic saving with Git backup for peace of mind
- 🚀 **Simplicity**: No cloud accounts, no subscriptions, just write
- 🔓 **Freedom**: Your files stay yours - portable Markdown format

---

## 🚀 Quick Start

### 📦 Download Pre-Built Binaries (Recommended)

Get the latest release for your platform from the [Releases page](https://github.com/cogrow4/Novelist/releases).

**Available Platforms:**
- **macOS:** Universal DMG (Intel + Apple Silicon)
- **Windows:** MSI (x64) or NSIS Setup (ARM64)
- **Linux:** AppImage, DEB, or RPM packages
  - Supports x64, ARM64, and ARMv7l architectures

Just download, install, and start writing!

---

### 🛠️ Build From Source

For developers or those who want to build from source:

#### Prerequisites

- **Node.js 18+** (recommended)
- **macOS, Windows, or Linux**
- **Git** (optional, for version control features)

#### Installation

```bash
# Clone the repository
git clone https://github.com/cogrow4/Novelist.git

# Navigate to project directory
cd Novelist

# Install dependencies
pnpm i
# or: npm install / yarn
```

### Running the App

```bash
# Start Novelist
npm start

# Development mode (with DevTools)
NODE_ENV=development npm start
```

### First Launch

The welcome screen provides three options:

1. **Create New Project** - Stored automatically in `~/Documents/Novelist/`
2. **Open Existing Project** - Browse to any project folder
3. **Recent Projects** - Quick access to your recent work

---

## 📁 Project Storage

Each project lives under `~/Documents/Novelist/` by default. All content is stored as Markdown files for portability and version control compatibility.

### Project Structure

```
~/Documents/Novelist/
  my-novel-abc123/
    project.json                    # Project metadata
    chapters/
      chapter-1-xxxx.md            # Chapter content
      chapter-1-xxxx-scenes/       # Nested scenes
        scene-intro-yyyy.md
        scene-climax-zzzz.md
      chapter-2-qqqq.md
    characters/
      protagonist-aaaa.md          # Character profiles
      antagonist-bbbb.md
    notes/
      outline-cccc.md              # Planning notes
      worldbuilding-dddd.md
```

### Why Markdown?

- ✅ **Portable**: Open in any text editor
- ✅ **Version Control**: Perfect for Git diffs
- ✅ **Future-Proof**: Plain text will always be readable
- ✅ **Searchable**: Use grep, ripgrep, or any search tool

---

## ⚙️ Configuration

### Preferences

Novelist stores preferences using `electron-store`:

- Font size for the editor
- Last opened project
- Recently used projects list (MRU)

Access via: **Edit → Preferences** (or app menu on macOS)

### Editor Features

```javascript
// Rich-text formatting
- Headings (H1-H6)
- Bold, Italic, Underline
- Bulleted and Numbered Lists
- Code Blocks
- Links
- Blockquotes
```

### Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Toggle Sidebar | `Cmd+B` | `Ctrl+B` |
| Git Commit | `Cmd+Shift+C` | `Ctrl+Shift+C` |
| Save | `Cmd+S` | `Ctrl+S` |
| New Chapter | Menu | Menu |
| Export Project | Menu | Menu |

---

## 💻 Development

### Architecture Overview

```
novelist/
├── electron/
│   ├── main.js              # Main process (ESM)
│   ├── preload.js           # Context bridge (CommonJS)
│   └── project-manager.js   # File system & Git operations
├── renderer/
│   ├── index.html          # UI layout
│   ├── app.js              # Frontend logic
│   └── styles.css          # Styling
└── package.json
```

### IPC Communication

The app uses a secure IPC bridge (`preload → main`):

```typescript
// Projects
window.novelist.projects.create(name)
window.novelist.projects.list()
window.novelist.projects.openDialog()
window.novelist.projects.load(projectPath)

// Chapters & Scenes
window.novelist.chapters.list(projectPath)
window.novelist.chapters.create(projectPath, name)
window.novelist.chapters.save(projectPath, chapterId, payload)
window.novelist.chapters.createScene(projectPath, chapterId, sceneName)
window.novelist.chapters.saveScene(projectPath, chapterId, sceneId, payload)

// Characters & Notes
window.novelist.characters.list(projectPath)
window.novelist.characters.save(projectPath, characterId, payload)
window.novelist.notes.list(projectPath)
window.novelist.notes.save(projectPath, noteId, payload)

// Export & Git
window.novelist.exports.project(projectPath)
window.novelist.git.init(projectPath)
window.novelist.git.commit(projectPath, message)
window.novelist.git.push(projectPath)
window.novelist.git.pull(projectPath)

// Preferences
window.novelist.preferences.get()
window.novelist.preferences.set(values)
```

### Available Scripts

```bash
# Start the app
npm start

# Development mode with DevTools
npm run dev

# Package for distribution
npm run package
```

### Development Tips

- 📝 Editor logic lives in `renderer/app.js`
- 🎨 Styles are in `renderer/styles.css`
- 🔧 Main process entry is `electron/main.js` (ESM)
- 🔒 Preload script is CommonJS for Electron compatibility
- 🐛 Set `NODE_ENV=development` to auto-open DevTools

---

## 🔧 Troubleshooting

### Common Issues

**"Could not open project" error**
- Fixed by guarding missing DOM nodes
- Open DevTools and check console for detailed stack trace
- Ensure `project.json` exists in the project folder

**Recent Projects not showing**
- Novelist scans `~/Documents/Novelist/` on launch
- Projects must contain a valid `project.json` file
- Check that the projects directory exists

**Quill editor not loading**
- App automatically falls back to plain contenteditable editor
- Tries CDN fallback if local Quill asset is missing
- Check network connection and browser console

**Git integration errors**
- Ensure project is initialized (Git → Initialize)
- System Git must be configured with credentials
- SSH keys or HTTPS credentials needed for push/pull
- Check that remote repository exists and is accessible

**Auto-save not working**
- Auto-save triggers after brief idle period
- Manual save on window close is guaranteed
- Check file permissions in project directory

---

## 🗺️ Roadmap

Future features planned for Novelist:

- 📚 **Export to EPUB/PDF** - Publish-ready formats
- 🔍 **Search Across Project** - Find text in all chapters and notes
- 🎯 **Scene Metadata** - Add tags, status, and custom fields
- 🔄 **Scene Reordering** - Drag-and-drop scene organization
- 🎨 **Theming System** - Custom color schemes and fonts
- ⌨️ **Typewriter Mode** - Zen writing with centered cursor
- 📊 **Writing Statistics** - Daily goals and progress tracking
- 🔗 **Internal Links** - Reference characters and notes within text
- 📱 **Mobile Companion** - Read-only mobile app for reviewing

---

## 🤝 Contributing

Contributions are what make the open-source community amazing! Any contributions you make are **greatly appreciated**.

### How to Contribute

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contribution Guidelines

- ✅ Keep features scoped and maintain the local-file model
- ✅ Add clear error handling and UI fallbacks
- ✅ Test on macOS at minimum; Linux/Windows fixes appreciated
- ✅ Follow existing code style and conventions
- ✅ Write meaningful commit messages
- ✅ Update documentation as needed
- ✅ Add comments for complex logic

### Development Standards

- Use ESM in main process, CommonJS in preload
- Maintain IPC security with context isolation
- Preserve Markdown storage format
- Keep UI responsive during file operations
- Test with multiple projects and edge cases

---

## 📄 License

This project is licensed under the **Unlicense** - see the [LICENSE](LICENSE) file for details.

### License Summary

This software is released into the **public domain**. You are free to do whatever you want with it.

✅ **You CAN:**
- Use for any purpose (personal, commercial, etc.)
- Modify and adapt the code however you like
- Distribute and share freely
- Use in proprietary software
- Sell products built with this code
- Remove all attribution and copyright notices
- Relicense under any terms you choose

❌ **You DON'T HAVE TO:**
- Give credit or attribution
- Include the license
- Share your modifications
- Release source code

📜 **No Warranty:**
- Software provided "as is" without warranty of any kind

---

## 💖 Credits

### Created By

**coeng24** - [GitHub](https://github.com/cogrow4)

### Technologies Used

- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework
- [Quill](https://quilljs.com/) - Rich text editor
- [simple-git](https://github.com/steveukx/git-js) - Git integration for Node.js
- [electron-store](https://github.com/sindresorhus/electron-store) - Persistent storage
- [Flaticon](https://www.flaticon.com/) - Application icons

### Inspiration

Built for writers who need a focused, distraction-free environment without sacrificing powerful organizational tools. Inspired by Scrivener, Ulysses, and the simplicity of Markdown.

---

<div align="center">

### ⭐ Star this repository if you find it helpful!

**Made with ❤️ for writers everywhere**

[⬆ Back to Top](#-novelist)

</div>
