const { ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

// Application State
const state = {
  currentProject: null,
  currentFile: null,
  currentFileType: null,
  projects: [],
  isModified: false,
  autoSaveTimer: null
};

// Get projects directory
const PROJECTS_DIR = path.join(os.homedir(), 'Documents', 'Novelist');

// Initialize app
async function init() {
  // Ensure projects directory exists
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create projects directory:', error);
  }
  
  setupEventListeners();
  await loadProjects();
  
  // Show welcome message if no project
  if (!state.currentProject) {
    showWelcomeMessage();
  }
}

// Setup all event listeners
function setupEventListeners() {
  // Project buttons
  document.getElementById('btn-new-project').addEventListener('click', createNewProject);
  document.getElementById('btn-open-project').addEventListener('click', openProject);
  
  // Chapter, character, note buttons
  document.getElementById('btn-new-chapter').addEventListener('click', () => createNewItem('chapter'));
  document.getElementById('btn-new-character').addEventListener('click', () => createNewItem('character'));
  document.getElementById('btn-new-note').addEventListener('click', () => createNewItem('note'));
  
  // Toolbar buttons
  document.getElementById('btn-bold').addEventListener('click', insertBold);
  document.getElementById('btn-italic').addEventListener('click', insertItalic);
  document.getElementById('btn-heading').addEventListener('click', insertHeading);
  document.getElementById('btn-export').addEventListener('click', exportBook);
  
  // Font size
  document.getElementById('font-size').addEventListener('change', changeFontSize);
  
  // Editor
  const editor = document.getElementById('editor');
  editor.addEventListener('input', onEditorChange);
  editor.addEventListener('keydown', handleKeyDown);
  
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', switchTab);
  });
  
  // Character modal
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeCharacterModal);
  });
  document.getElementById('btn-save-character').addEventListener('click', saveCharacter);
  
  // Auto-save every 2 seconds after changes
  editor.addEventListener('input', () => {
    state.isModified = true;
    clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = setTimeout(autoSave, 2000);
  });
}

// Tab switching
function switchTab(e) {
  const tabName = e.currentTarget.dataset.tab;
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  e.currentTarget.classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.querySelector(`.tab-content[data-tab="${tabName}"]`).classList.add('active');
}

// Create new project
async function createNewProject() {
  const name = prompt('Project name:');
  if (!name) return;
  
  const projectPath = path.join(PROJECTS_DIR, name);
  
  try {
    // Create project structure
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, 'chapters'));
    await fs.mkdir(path.join(projectPath, 'characters'));
    await fs.mkdir(path.join(projectPath, 'planning'));
    
    // Create project metadata
    const metadata = {
      name,
      created: new Date().toISOString(),
      author: '',
      description: ''
    };
    await fs.writeFile(
      path.join(projectPath, 'project.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    // Create welcome chapter
    const welcomeContent = `# Welcome to Your Novel!

Start writing your story here. This is your first chapter.

## Tips

- Press Cmd+B for bold text
- Press Cmd+I for italic text
- Use # for headings
- Everything auto-saves!

Happy writing! 📝`;
    
    await fs.writeFile(
      path.join(projectPath, 'chapters', '01_welcome.md'),
      welcomeContent
    );
    
    // Open the new project
    state.currentProject = projectPath;
    document.getElementById('project-name-text').textContent = name;
    
    await refreshProjectFiles();
    setStatus(`Created project: ${name}`);
    
  } catch (error) {
    alert(`Failed to create project: ${error.message}`);
  }
}

// Open project
async function openProject() {
  const result = await ipcRenderer.invoke('show-open-dialog', {
    title: 'Open Project',
    defaultPath: PROJECTS_DIR,
    properties: ['openDirectory']
  });
  
  if (result.canceled || !result.filePaths.length) return;
  
  const projectPath = result.filePaths[0];
  
  // Check if it's a valid project
  try {
    const projectFile = path.join(projectPath, 'project.json');
    const data = await fs.readFile(projectFile, 'utf-8');
    const metadata = JSON.parse(data);
    
    state.currentProject = projectPath;
    document.getElementById('project-name-text').textContent = metadata.name;
    
    await refreshProjectFiles();
    setStatus(`Opened project: ${metadata.name}`);
    
  } catch (error) {
    alert('Invalid project directory');
  }
}

// Load projects list
async function loadProjects() {
  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    state.projects = entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
}

// Refresh project files
async function refreshProjectFiles() {
  if (!state.currentProject) return;
  
  await refreshChaptersList();
  await refreshCharactersList();
  await refreshPlanningList();
}

// Refresh chapters list
async function refreshChaptersList() {
  const list = document.getElementById('chapters-list');
  list.innerHTML = '';
  
  try {
    const chaptersPath = path.join(state.currentProject, 'chapters');
    const files = await fs.readdir(chaptersPath);
    const mdFiles = files.filter(f => f.endsWith('.md')).sort();
    
    for (const file of mdFiles) {
      const item = createFileItem(file, 'chapter', path.join(chaptersPath, file));
      list.appendChild(item);
    }
  } catch (error) {
    console.error('Failed to load chapters:', error);
  }
}

// Refresh characters list
async function refreshCharactersList() {
  const list = document.getElementById('characters-list');
  list.innerHTML = '';
  
  try {
    const charactersPath = path.join(state.currentProject, 'characters');
    const files = await fs.readdir(charactersPath);
    const mdFiles = files.filter(f => f.endsWith('.md')).sort();
    
    for (const file of mdFiles) {
      const item = createFileItem(file, 'character', path.join(charactersPath, file));
      list.appendChild(item);
    }
  } catch (error) {
    console.error('Failed to load characters:', error);
  }
}

// Refresh planning list
async function refreshPlanningList() {
  const list = document.getElementById('planning-list');
  list.innerHTML = '';
  
  try {
    const planningPath = path.join(state.currentProject, 'planning');
    const files = await fs.readdir(planningPath);
    const mdFiles = files.filter(f => f.endsWith('.md')).sort();
    
    for (const file of mdFiles) {
      const item = createFileItem(file, 'note', path.join(planningPath, file));
      list.appendChild(item);
    }
  } catch (error) {
    console.error('Failed to load planning notes:', error);
  }
}

// Create file list item
function createFileItem(filename, type, filepath) {
  const div = document.createElement('div');
  div.className = 'file-item';
  
  const icon = type === 'chapter' ? '📄' : type === 'character' ? '👤' : '📝';
  const displayName = filename.replace(/^\d+_/, '').replace('.md', '').replace(/_/g, ' ');
  
  div.innerHTML = `<span class="icon">${icon}</span> ${displayName}`;
  div.addEventListener('click', () => openFile(filepath, type));
  
  return div;
}

// Open file in editor
async function openFile(filepath, type) {
  // Save current file if modified
  if (state.isModified && state.currentFile) {
    await saveCurrentFile();
  }
  
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    
    // Check if it's a character file (structured)
    if (type === 'character' && content.includes('## Basic Info')) {
      openCharacterEditor(filepath, content);
      return;
    }
    
    // Open in text editor
    document.getElementById('editor').value = content;
    state.currentFile = filepath;
    state.currentFileType = type;
    state.isModified = false;
    
    // Update UI
    document.querySelectorAll('.file-item').forEach(item => item.classList.remove('active'));
    event.currentTarget?.classList.add('active');
    
    const filename = path.basename(filepath).replace('.md', '').replace(/_/g, ' ');
    setStatus(`Opened: ${filename}`);
    updateWordCount();
    
  } catch (error) {
    alert(`Failed to open file: ${error.message}`);
  }
}

// Create new item (chapter/character/note)
async function createNewItem(type) {
  if (!state.currentProject) {
    alert('Please open or create a project first!');
    return;
  }
  
  const name = prompt(`${type.charAt(0).toUpperCase() + type.slice(1)} name:`);
  if (!name) return;
  
  let dirPath, filename, content;
  
  if (type === 'chapter') {
    dirPath = path.join(state.currentProject, 'chapters');
    const files = await fs.readdir(dirPath);
    const chapterNum = files.filter(f => f.endsWith('.md')).length + 1;
    filename = `${String(chapterNum).padStart(2, '0')}_${name.toLowerCase().replace(/\s+/g, '_')}.md`;
    content = `# ${name}\n\n`;
  } else if (type === 'character') {
    dirPath = path.join(state.currentProject, 'characters');
    filename = `${name.toLowerCase().replace(/\s+/g, '_')}.md`;
    content = `# ${name}\n\n## Basic Info\n\n## Personality\n\n## Appearance\n\n## Background\n\n## Goals & Motivations\n\n## Notes\n\n`;
  } else {
    dirPath = path.join(state.currentProject, 'planning');
    filename = `${name.toLowerCase().replace(/\s+/g, '_')}.md`;
    content = `# ${name}\n\n`;
  }
  
  const filepath = path.join(dirPath, filename);
  
  try {
    await fs.writeFile(filepath, content);
    await refreshProjectFiles();
    openFile(filepath, type);
    setStatus(`Created ${type}: ${name}`);
  } catch (error) {
    alert(`Failed to create ${type}: ${error.message}`);
  }
}

// Open character editor modal
function openCharacterEditor(filepath, content) {
  const modal = document.getElementById('character-modal');
  
  // Parse character data
  const lines = content.split('\n');
  const data = {
    name: '',
    role: 'Supporting',
    age: '',
    personality: '',
    appearance: '',
    background: '',
    goals: '',
    notes: ''
  };
  
  // Extract name from first line
  if (lines[0].startsWith('#')) {
    data.name = lines[0].replace('#', '').trim();
  }
  
  // Simple parsing (can be improved)
  let currentSection = '';
  let sectionContent = '';
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('##')) {
      if (currentSection) {
        const key = currentSection.toLowerCase().replace(/\s+/g, '_').replace('&', 'and');
        if (key.includes('personality')) data.personality = sectionContent.trim();
        else if (key.includes('appearance')) data.appearance = sectionContent.trim();
        else if (key.includes('background')) data.background = sectionContent.trim();
        else if (key.includes('goals')) data.goals = sectionContent.trim();
        else if (key.includes('notes')) data.notes = sectionContent.trim();
      }
      currentSection = line.replace('##', '').trim();
      sectionContent = '';
    } else {
      sectionContent += line + '\n';
    }
  }
  
  // Set last section
  if (currentSection && sectionContent) {
    const key = currentSection.toLowerCase().replace(/\s+/g, '_');
    if (key.includes('notes')) data.notes = sectionContent.trim();
  }
  
  // Fill form
  document.getElementById('char-name').value = data.name;
  document.getElementById('char-role').value = data.role;
  document.getElementById('char-age').value = data.age;
  document.getElementById('char-personality').value = data.personality;
  document.getElementById('char-appearance').value = data.appearance;
  document.getElementById('char-background').value = data.background;
  document.getElementById('char-goals').value = data.goals;
  document.getElementById('char-notes').value = data.notes;
  
  state.currentFile = filepath;
  state.currentFileType = 'character';
  
  modal.classList.remove('hidden');
}

// Close character modal
function closeCharacterModal() {
  document.getElementById('character-modal').classList.add('hidden');
}

// Save character
async function saveCharacter() {
  const data = {
    name: document.getElementById('char-name').value,
    role: document.getElementById('char-role').value,
    age: document.getElementById('char-age').value,
    personality: document.getElementById('char-personality').value,
    appearance: document.getElementById('char-appearance').value,
    background: document.getElementById('char-background').value,
    goals: document.getElementById('char-goals').value,
    notes: document.getElementById('char-notes').value
  };
  
  const content = `# ${data.name}

## Basic Info
- **Role**: ${data.role}
- **Age**: ${data.age}

## Personality
${data.personality}

## Appearance
${data.appearance}

## Background
${data.background}

## Goals & Motivations
${data.goals}

## Notes
${data.notes}
`;
  
  try {
    await fs.writeFile(state.currentFile, content);
    closeCharacterModal();
    await refreshCharactersList();
    setStatus(`Saved character: ${data.name}`);
  } catch (error) {
    alert(`Failed to save character: ${error.message}`);
  }
}

// Save current file
async function saveCurrentFile() {
  if (!state.currentFile || state.currentFileType === 'character') return;
  
  const content = document.getElementById('editor').value;
  
  try {
    await fs.writeFile(state.currentFile, content);
    state.isModified = false;
    setStatus('✓ Saved');
  } catch (error) {
    console.error('Failed to save:', error);
  }
}

// Auto-save
async function autoSave() {
  if (state.isModified && state.currentFile) {
    await saveCurrentFile();
  }
}

// Text formatting functions
function insertBold() {
  insertFormatting('**', '**');
}

function insertItalic() {
  insertFormatting('*', '*');
}

function insertHeading() {
  const editor = document.getElementById('editor');
  const start = editor.selectionStart;
  const lineStart = editor.value.lastIndexOf('\n', start - 1) + 1;
  editor.setSelectionRange(lineStart, lineStart);
  insertText('# ');
}

function insertFormatting(before, after) {
  const editor = document.getElementById('editor');
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const selectedText = editor.value.substring(start, end);
  const replacement = before + selectedText + after;
  
  insertText(replacement);
  editor.setSelectionRange(start + before.length, end + before.length);
}

function insertText(text) {
  const editor = document.getElementById('editor');
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const value = editor.value;
  
  editor.value = value.substring(0, start) + text + value.substring(end);
  editor.focus();
  
  const newPos = start + text.length;
  editor.setSelectionRange(newPos, newPos);
  
  onEditorChange();
}

// Handle keyboard shortcuts
function handleKeyDown(e) {
  if (e.metaKey || e.ctrlKey) {
    if (e.key === 'b') {
      e.preventDefault();
      insertBold();
    } else if (e.key === 'i') {
      e.preventDefault();
      insertItalic();
    } else if (e.key === 's') {
      e.preventDefault();
      saveCurrentFile();
    }
  }
}

// Editor change handler
function onEditorChange() {
  updateWordCount();
}

// Change font size
function changeFontSize(e) {
  const size = e.target.value;
  document.getElementById('editor').style.fontSize = size + 'pt';
}

// Update word count
function updateWordCount() {
  const text = document.getElementById('editor').value;
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  document.getElementById('word-count').textContent = `${words} words`;
}

// Export book
async function exportBook() {
  if (!state.currentProject) {
    alert('No project open!');
    return;
  }
  
  const result = await ipcRenderer.invoke('show-save-dialog', {
    title: 'Export Book',
    defaultPath: path.join(os.homedir(), 'Desktop', 'MyNovel.md'),
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'Text', extensions: ['txt'] }
    ]
  });
  
  if (result.canceled) return;
  
  try {
    // Read all chapters
    const chaptersPath = path.join(state.currentProject, 'chapters');
    const files = await fs.readdir(chaptersPath);
    const mdFiles = files.filter(f => f.endsWith('.md')).sort();
    
    // Read project metadata
    const projectData = await fs.readFile(
      path.join(state.currentProject, 'project.json'),
      'utf-8'
    );
    const metadata = JSON.parse(projectData);
    
    // Build complete book
    let book = `# ${metadata.name}\n\n`;
    if (metadata.author) {
      book += `**by ${metadata.author}**\n\n`;
    }
    book += `---\n\n`;
    
    // Add each chapter
    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(chaptersPath, file), 'utf-8');
      book += content + '\n\n---\n\n';
    }
    
    // Write to file
    await fs.writeFile(result.filePath, book);
    
    alert(`Book exported successfully to:\n${result.filePath}`);
    setStatus('✓ Exported');
    
  } catch (error) {
    alert(`Failed to export: ${error.message}`);
  }
}

// Set status message
function setStatus(message) {
  document.getElementById('status').textContent = message;
  setTimeout(() => {
    document.getElementById('status').textContent = 'Ready';
  }, 3000);
}

// Show welcome message
function showWelcomeMessage() {
  document.getElementById('editor').value = `# Welcome to Novelist! 📚

Click "📁 New Project" to create your first book project.

Or click "📂 Open Project" to open an existing one.

## Getting Started

1. Create a new project
2. Add chapters using the "+ Chapter" button
3. Start writing!
4. Everything auto-saves

Happy writing! ✨`;
  
  document.getElementById('editor').disabled = true;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
