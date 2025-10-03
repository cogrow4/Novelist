const { ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const { marked } = require('marked');

// State
const state = {
  currentProject: null,
  currentFile: null,
  currentFileType: null,
  isModified: false,
  autoSaveTimer: null,
  settings: { fontSize: 14, autoSave: true, livePreview: true }
};

const PROJECTS_DIR = path.join(os.homedir(), 'Documents', 'Novelist');

// Initialize
async function init() {
  await fs.mkdir(PROJECTS_DIR, { recursive: true }).catch(() => {});
  loadSettings();
  setupEventListeners();
  setupMenuListeners();
  applySettings();
  if (!state.currentProject) showWelcomeMessage();
}

function loadSettings() {
  try {
    const saved = localStorage.getItem('novelist-settings');
    if (saved) state.settings = { ...state.settings, ...JSON.parse(saved) };
  } catch (e) {}
}

function saveSettings() {
  localStorage.setItem('novelist-settings', JSON.stringify(state.settings));
}

function applySettings() {
  document.getElementById('editor').style.fontSize = state.settings.fontSize + 'pt';
  document.getElementById('font-size').value = state.settings.fontSize;
  if (state.settings.livePreview) document.getElementById('preview-pane').classList.add('show');
}

function setupEventListeners() {
  document.getElementById('btn-new-project').onclick = createNewProject;
  document.getElementById('btn-open-project').onclick = openProject;
  document.getElementById('btn-new-chapter').onclick = () => createNewItem('chapter');
  document.getElementById('btn-new-character').onclick = () => createNewItem('character');
  document.getElementById('btn-new-note').onclick = () => createNewItem('note');
  document.getElementById('btn-bold').onclick = insertBold;
  document.getElementById('btn-italic').onclick = insertItalic;
  document.getElementById('btn-heading').onclick = insertHeading;
  document.getElementById('btn-export').onclick = exportBook;
  document.getElementById('font-size').onchange = changeFontSize;
  
  const editor = document.getElementById('editor');
  editor.oninput = onEditorChange;
  editor.onkeydown = handleKeyDown;
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = switchTab;
  });
  
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.onclick = function() { this.closest('.modal').classList.add('hidden'); };
  });
  
  document.getElementById('btn-save-character').onclick = saveCharacter;
  document.getElementById('btn-save-settings').onclick = saveSettingsDialog;
  document.getElementById('btn-git-commit-submit').onclick = submitGitCommit;
  document.getElementById('btn-prompt-ok').onclick = closePrompt;
  document.getElementById('btn-prompt-cancel').onclick = () => {
    document.getElementById('prompt-modal').classList.add('hidden');
    window.promptResolve(null);
  };
}

function setupMenuListeners() {
  ipcRenderer.on('menu-new-project', createNewProject);
  ipcRenderer.on('menu-open-project', openProject);
  ipcRenderer.on('menu-save', saveCurrentFile);
  ipcRenderer.on('menu-export', exportBook);
  ipcRenderer.on('menu-settings', openSettings);
  ipcRenderer.on('menu-toggle-preview', togglePreview);
  ipcRenderer.on('menu-toggle-sidebar', toggleSidebar);
  ipcRenderer.on('menu-git-init', gitInit);
  ipcRenderer.on('menu-git-add', gitAdd);
  ipcRenderer.on('menu-git-commit', gitCommit);
  ipcRenderer.on('menu-git-push', gitPush);
  ipcRenderer.on('menu-git-pull', gitPull);
  ipcRenderer.on('menu-git-status', gitStatus);
}

function showPrompt(title, message, defaultValue = '') {
  return new Promise((resolve) => {
    const modal = document.getElementById('prompt-modal');
    document.getElementById('prompt-title').textContent = title;
    document.getElementById('prompt-message').textContent = message;
    const input = document.getElementById('prompt-input');
    input.value = defaultValue;
    modal.classList.remove('hidden');
    input.focus();
    input.select();
    window.promptResolve = resolve;
  });
}

function closePrompt() {
  const value = document.getElementById('prompt-input').value.trim();
  document.getElementById('prompt-modal').classList.add('hidden');
  if (window.promptResolve) window.promptResolve(value || null);
}

function switchTab(e) {
  const tab = e.currentTarget.dataset.tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  e.currentTarget.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`.tab-content[data-tab="${tab}"]`).classList.add('active');
}

async function createNewProject() {
  const name = await showPrompt('New Project', 'Enter project name:');
  if (!name) return;
  
  const projectPath = path.join(PROJECTS_DIR, name);
  
  try {
    await fs.access(projectPath);
    alert(`Project "${name}" already exists!`);
    return;
  } catch {}
  
  try {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, 'chapters'));
    await fs.mkdir(path.join(projectPath, 'characters'));
    await fs.mkdir(path.join(projectPath, 'planning'));
    
    await fs.writeFile(path.join(projectPath, 'project.json'), JSON.stringify({
      name, created: new Date().toISOString(), author: '', description: ''
    }, null, 2));
    
    const welcomeContent = `# Welcome to ${name}!\n\nStart writing your story here.\n\n## Tips\n- **Cmd+B** for bold\n- **Cmd+I** for italic\n- Everything auto-saves!\n\nHappy writing! 📝`;
    await fs.writeFile(path.join(projectPath, 'chapters', '01_welcome.md'), welcomeContent);
    
    state.currentProject = projectPath;
    document.getElementById('project-name-text').textContent = name;
    document.getElementById('editor').disabled = false;
    
    await refreshProjectFiles();
    setStatus(`Created: ${name}`);
    
    const welcomeFile = path.join(projectPath, 'chapters', '01_welcome.md');
    await openFile(welcomeFile, 'chapter');
  } catch (error) {
    alert(`Failed to create project: ${error.message}`);
  }
}

async function openProject() {
  const result = await ipcRenderer.invoke('show-open-dialog', {
    title: 'Open Project',
    defaultPath: PROJECTS_DIR,
    properties: ['openDirectory']
  });
  
  if (result.canceled || !result.filePaths.length) return;
  
  try {
    const projectPath = result.filePaths[0];
    const data = await fs.readFile(path.join(projectPath, 'project.json'), 'utf-8');
    const metadata = JSON.parse(data);
    
    state.currentProject = projectPath;
    document.getElementById('project-name-text').textContent = metadata.name;
    document.getElementById('editor').disabled = false;
    
    await refreshProjectFiles();
    setStatus(`Opened: ${metadata.name}`);
  } catch {
    alert('Invalid project directory');
  }
}

async function refreshProjectFiles() {
  if (!state.currentProject) return;
  await refreshChaptersList();
  await refreshCharactersList();
  await refreshPlanningList();
}

async function refreshChaptersList() {
  const list = document.getElementById('chapters-list');
  list.innerHTML = '';
  
  try {
    const chaptersPath = path.join(state.currentProject, 'chapters');
    const files = await fs.readdir(chaptersPath);
    files.filter(f => f.endsWith('.md')).sort().forEach(file => {
      list.appendChild(createFileItem(file, 'chapter', path.join(chaptersPath, file)));
    });
  } catch (e) {}
}

async function refreshCharactersList() {
  const list = document.getElementById('characters-list');
  list.innerHTML = '';
  
  try {
    const charactersPath = path.join(state.currentProject, 'characters');
    const files = await fs.readdir(charactersPath);
    files.filter(f => f.endsWith('.md')).sort().forEach(file => {
      list.appendChild(createFileItem(file, 'character', path.join(charactersPath, file)));
    });
  } catch (e) {}
}

async function refreshPlanningList() {
  const list = document.getElementById('planning-list');
  list.innerHTML = '';
  
  try {
    const planningPath = path.join(state.currentProject, 'planning');
    const files = await fs.readdir(planningPath);
    files.filter(f => f.endsWith('.md')).sort().forEach(file => {
      list.appendChild(createFileItem(file, 'note', path.join(planningPath, file)));
    });
  } catch (e) {}
}

function createFileItem(filename, type, filepath) {
  const div = document.createElement('div');
  div.className = 'file-item';
  div.dataset.filepath = filepath;
  
  const icon = type === 'chapter' ? '📄' : type === 'character' ? '👤' : '📝';
  const displayName = filename.replace(/^\d+_/, '').replace('.md', '').replace(/_/g, ' ');
  
  div.innerHTML = `<span class="icon">${icon}</span> ${displayName}`;
  div.onclick = () => openFile(filepath, type);
  
  return div;
}

async function openFile(filepath, type) {
  if (state.isModified && state.currentFile) await saveCurrentFile();
  
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    
    if (type === 'character' && content.includes('## Basic Info')) {
      openCharacterEditor(filepath, content);
      return;
    }
    
    document.getElementById('editor').value = content;
    state.currentFile = filepath;
    state.currentFileType = type;
    state.isModified = false;
    
    document.querySelectorAll('.file-item').forEach(item => item.classList.remove('active'));
    const activeItem = document.querySelector(`[data-filepath="${filepath}"]`);
    if (activeItem) activeItem.classList.add('active');
    
    const filename = path.basename(filepath).replace('.md', '').replace(/_/g, ' ');
    setStatus(`Opened: ${filename}`);
    updateWordCount();
    updatePreview();
  } catch (error) {
    alert(`Failed to open file: ${error.message}`);
  }
}

function updatePreview() {
  if (!state.settings.livePreview) return;
  
  const content = document.getElementById('editor').value;
  const preview = document.getElementById('preview');
  
  try {
    preview.innerHTML = marked.parse(content);
  } catch (e) {}
}

async function createNewItem(type) {
  if (!state.currentProject) {
    alert('Please open or create a project first!');
    return;
  }
  
  const name = await showPrompt(`New ${type}`, `Enter ${type} name:`);
  if (!name) return;
  
  let dirPath, filename, content;
  
  if (type === 'chapter') {
    dirPath = path.join(state.currentProject, 'chapters');
    const files = await fs.readdir(dirPath);
    const num = files.filter(f => f.endsWith('.md')).length + 1;
    filename = `${String(num).padStart(2, '0')}_${name.toLowerCase().replace(/\s+/g, '_')}.md`;
    content = `# ${name}\n\n`;
  } else if (type === 'character') {
    dirPath = path.join(state.currentProject, 'characters');
    filename = `${name.toLowerCase().replace(/\s+/g, '_')}.md`;
    content = `# ${name}\n\n## Basic Info\n- **Role**: Supporting\n- **Age**: \n\n## Personality\n\n## Appearance\n\n## Background\n\n## Goals & Motivations\n\n## Notes\n\n`;
  } else {
    dirPath = path.join(state.currentProject, 'planning');
    filename = `${name.toLowerCase().replace(/\s+/g, '_')}.md`;
    content = `# ${name}\n\n`;
  }
  
  const filepath = path.join(dirPath, filename);
  
  try {
    await fs.writeFile(filepath, content);
    await refreshProjectFiles();
    await openFile(filepath, type);
    setStatus(`Created ${type}: ${name}`);
  } catch (error) {
    alert(`Failed to create ${type}: ${error.message}`);
  }
}

function openCharacterEditor(filepath, content) {
  const modal = document.getElementById('character-modal');
  const lines = content.split('\n');
  const data = { name: '', role: 'Supporting', age: '', personality: '', appearance: '', background: '', goals: '', notes: '' };
  
  if (lines[0].startsWith('#')) data.name = lines[0].replace('#', '').trim();
  
  let section = '';
  let sectionContent = '';
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('##')) {
      if (section && sectionContent) {
        const key = section.toLowerCase();
        if (key.includes('personality')) data.personality = sectionContent.trim();
        else if (key.includes('appearance')) data.appearance = sectionContent.trim();
        else if (key.includes('background')) data.background = sectionContent.trim();
        else if (key.includes('goals')) data.goals = sectionContent.trim();
        else if (key.includes('notes')) data.notes = sectionContent.trim();
        else if (key.includes('basic')) {
          const roleMatch = sectionContent.match(/Role[:\s*]+(\w+)/i);
          const ageMatch = sectionContent.match(/Age[:\s*]+([^\n]+)/i);
          if (roleMatch) data.role = roleMatch[1];
          if (ageMatch) data.age = ageMatch[1].trim();
        }
      }
      section = line.replace('##', '').trim();
      sectionContent = '';
    } else {
      sectionContent += line + '\n';
    }
  }
  
  if (section && sectionContent) {
    const key = section.toLowerCase();
    if (key.includes('notes')) data.notes = sectionContent.trim();
  }
  
  document.getElementById('char-name').value = data.name;
  document.getElementById('char-role').value = data.role;
  document.getElementById('char-age').value = data.age;
  document.getElementById('char-personality').value = data.personality.replace(/^[-*]\s*/gm, '');
  document.getElementById('char-appearance').value = data.appearance.replace(/^[-*]\s*/gm, '');
  document.getElementById('char-background').value = data.background.replace(/^[-*]\s*/gm, '');
  document.getElementById('char-goals').value = data.goals.replace(/^[-*]\s*/gm, '');
  document.getElementById('char-notes').value = data.notes.replace(/^[-*]\s*/gm, '');
  
  state.currentFile = filepath;
  state.currentFileType = 'character';
  
  modal.classList.remove('hidden');
}

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
  
  const content = `# ${data.name}\n\n## Basic Info\n- **Role**: ${data.role}\n- **Age**: ${data.age}\n\n## Personality\n${data.personality}\n\n## Appearance\n${data.appearance}\n\n## Background\n${data.background}\n\n## Goals & Motivations\n${data.goals}\n\n## Notes\n${data.notes}\n`;
  
  try {
    await fs.writeFile(state.currentFile, content);
    document.getElementById('character-modal').classList.add('hidden');
    await refreshCharactersList();
    setStatus(`Saved character: ${data.name}`);
  } catch (error) {
    alert(`Failed to save character: ${error.message}`);
  }
}

async function saveCurrentFile() {
  if (!state.currentFile || state.currentFileType === 'character') return;
  
  try {
    await fs.writeFile(state.currentFile, document.getElementById('editor').value);
    state.isModified = false;
    setStatus('✓ Saved');
  } catch (error) {
    alert(`Failed to save: ${error.message}`);
  }
}

async function autoSave() {
  if (state.settings.autoSave && state.isModified && state.currentFile) {
    await saveCurrentFile();
  }
}

function insertBold() { insertFormatting('**', '**'); }
function insertItalic() { insertFormatting('*', '*'); }

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
  const selected = editor.value.substring(start, end);
  insertText(before + selected + after);
  editor.setSelectionRange(start + before.length, end + before.length);
}

function insertText(text) {
  const editor = document.getElementById('editor');
  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const value = editor.value;
  
  editor.value = value.substring(0, start) + text + value.substring(end);
  editor.focus();
  editor.setSelectionRange(start + text.length, start + text.length);
  onEditorChange();
}

function handleKeyDown(e) {
  if (e.metaKey || e.ctrlKey) {
    if (e.key === 'b') { e.preventDefault(); insertBold(); }
    else if (e.key === 'i') { e.preventDefault(); insertItalic(); }
    else if (e.key === 's') { e.preventDefault(); saveCurrentFile(); }
  }
}

function onEditorChange() {
  state.isModified = true;
  clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = setTimeout(autoSave, 2000);
  updateWordCount();
  updatePreview();
}

function changeFontSize(e) {
  state.settings.fontSize = parseInt(e.target.value);
  document.getElementById('editor').style.fontSize = state.settings.fontSize + 'pt';
  saveSettings();
}

function updateWordCount() {
  const text = document.getElementById('editor').value;
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  document.getElementById('word-count').textContent = `${words.toLocaleString()} words`;
}

function togglePreview() {
  state.settings.livePreview = !state.settings.livePreview;
  const preview = document.getElementById('preview-pane');
  
  if (state.settings.livePreview) {
    preview.classList.add('show');
    updatePreview();
  } else {
    preview.classList.remove('show');
  }
  
  saveSettings();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.style.display = sidebar.style.display === 'none' ? 'flex' : 'none';
}

async function exportBook() {
  if (!state.currentProject) {
    alert('No project open!');
    return;
  }
  
  const result = await ipcRenderer.invoke('show-save-dialog', {
    title: 'Export Book',
    defaultPath: path.join(os.homedir(), 'Desktop', 'MyNovel.md'),
    filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'Text', extensions: ['txt'] }]
  });
  
  if (result.canceled) return;
  
  try {
    const chaptersPath = path.join(state.currentProject, 'chapters');
    const files = await fs.readdir(chaptersPath);
    const mdFiles = files.filter(f => f.endsWith('.md')).sort();
    
    const projectData = await fs.readFile(path.join(state.currentProject, 'project.json'), 'utf-8');
    const metadata = JSON.parse(projectData);
    
    let book = `# ${metadata.name}\n\n`;
    if (metadata.author) book += `**by ${metadata.author}**\n\n`;
    book += `---\n\n`;
    
    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(chaptersPath, file), 'utf-8');
      book += content + '\n\n---\n\n';
    }
    
    await fs.writeFile(result.filePath, book);
    alert(`Book exported to:\n${result.filePath}`);
    setStatus('✓ Exported');
  } catch (error) {
    alert(`Failed to export: ${error.message}`);
  }
}

function openSettings() {
  const modal = document.getElementById('settings-modal');
  document.getElementById('settings-font-size').value = state.settings.fontSize;
  document.getElementById('settings-auto-save').checked = state.settings.autoSave;
  document.getElementById('settings-live-preview').checked = state.settings.livePreview;
  modal.classList.remove('hidden');
}

function saveSettingsDialog() {
  state.settings.fontSize = parseInt(document.getElementById('settings-font-size').value);
  state.settings.autoSave = document.getElementById('settings-auto-save').checked;
  state.settings.livePreview = document.getElementById('settings-live-preview').checked;
  
  applySettings();
  saveSettings();
  document.getElementById('settings-modal').classList.add('hidden');
  setStatus('Settings saved');
}

async function gitInit() {
  if (!state.currentProject) { alert('No project open!'); return; }
  const result = await ipcRenderer.invoke('git-init', state.currentProject);
  alert(result.success ? result.message : `Failed: ${result.error}`);
}

async function gitAdd() {
  if (!state.currentProject) { alert('No project open!'); return; }
  const result = await ipcRenderer.invoke('git-add', state.currentProject);
  if (result.success) setStatus('✓ Changes staged');
  else alert(`Failed: ${result.error}`);
}

async function gitCommit() {
  if (!state.currentProject) { alert('No project open!'); return; }
  const modal = document.getElementById('git-commit-modal');
  document.getElementById('git-commit-message').value = '';
  modal.classList.remove('hidden');
  document.getElementById('git-commit-message').focus();
}

async function submitGitCommit() {
  const message = document.getElementById('git-commit-message').value.trim();
  if (!message) { alert('Please enter a commit message'); return; }
  
  document.getElementById('git-commit-modal').classList.add('hidden');
  await gitAdd();
  
  const result = await ipcRenderer.invoke('git-commit', state.currentProject, message);
  if (result.success) setStatus('✓ Committed');
  else alert(`Failed: ${result.error}`);
}

async function gitPush() {
  if (!state.currentProject) { alert('No project open!'); return; }
  setStatus('Pushing...');
  const result = await ipcRenderer.invoke('git-push', state.currentProject);
  if (result.success) { alert(result.message); setStatus('✓ Pushed'); }
  else alert(`Failed: ${result.error}`);
}

async function gitPull() {
  if (!state.currentProject) { alert('No project open!'); return; }
  setStatus('Pulling...');
  const result = await ipcRenderer.invoke('git-pull', state.currentProject);
  if (result.success) { alert(result.message); setStatus('✓ Pulled'); }
  else alert(`Failed: ${result.error}`);
}

async function gitStatus() {
  if (!state.currentProject) { alert('No project open!'); return; }
  const result = await ipcRenderer.invoke('git-status', state.currentProject);
  if (result.success) alert(result.status);
  else alert(`Failed: ${result.error}`);
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
  setTimeout(() => { document.getElementById('status').textContent = 'Ready'; }, 3000);
}

function showWelcomeMessage() {
  document.getElementById('editor').value = `# Welcome to Novelist! 📚\n\nClick "📁 New Project" to create your first book project.\n\nOr click "📂 Open Project" to open an existing one.\n\n## Getting Started\n\n1. Create a new project\n2. Add chapters using "+ Chapter"\n3. Start writing!\n4. Everything auto-saves\n\nHappy writing! ✨`;
  document.getElementById('editor').disabled = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
