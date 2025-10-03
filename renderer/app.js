function subscribeToMenuEvents() {
  if (!window.appMenu || typeof window.appMenu.on !== 'function') return;
  window.appMenu.on('menu:new-project', openNewProjectModal);
  window.appMenu.on('menu:open-project', handleOpenProject);
  window.appMenu.on('menu:open-recent', (path) => { if (path) openProjectByPath(path); });
  window.appMenu.on('menu:export', handleExport);
  window.appMenu.on('menu:toggle-sidebar', toggleSidebar);
  window.appMenu.on('menu:git-commit', async () => { if (state.project) await handleCommit(); });
  window.appMenu.on('menu:git-set-remote', async () => { if (state.project) await handleSetRemote(); });
  window.appMenu.on('menu:find', async () => { await handleFind(); });
  window.appMenu.on('menu:replace', async () => { await handleReplace(); });
  window.appMenu.on('menu:git-init', async () => {
    if (!state.project) return;
    try {
      await window.novelist.git.init(state.project.path);
      showToast('Git repository initialized');
    } catch (e) {
      console.error('Git init failed', e);
      showToast(`Git init failed: ${e.message}`, { type: 'error' });
    }
  });
  window.appMenu.on('menu:git-push', async () => {
    if (!state.project) return;
    try {
      await window.novelist.git.push(state.project.path);
      showToast('Pushed to remote');
    } catch (e) {
      console.error('Push failed', e);
      const msg = e?.message || '';
      if (/no configured push destination|set the remote|no upstream/i.test(msg)) {
        const set = window.confirm('No remote configured for this project. Set origin now?');
        if (set) await handleSetRemote();
      } else {
        showToast(`Push failed: ${msg}`, { type: 'error' });
      }
    }
  });
  window.appMenu.on('menu:git-pull', async () => {
    if (!state.project) return;
    try {
      await window.novelist.git.pull(state.project.path);
      showToast('Pulled latest changes');
    } catch (e) {
      console.error('Pull failed', e);
      showToast(`Pull failed: ${e.message}`, { type: 'error' });
    }
  });
  window.appMenu.on('menu:git-sign-in', () => {
    showToast('Sign-in not implemented. Configure Git credentials on your system.', { type: 'error' });
  });
  window.appMenu.on('menu:show-tips', () => {
    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    renderTutorialStep();
  });
}

async function handleSetRemote() {
  if (!state.project) return;
  const url = await promptInput({
    title: 'Set Git Remote URL',
    placeholder: 'https://codeberg.org/youruser/yourrepo.git'
  });
  if (!url) return;
  try {
    await window.novelist.git.setRemote(state.project.path, url.trim());
    showToast('Git remote set to origin');
  } catch (e) {
    console.error('Set remote failed', e);
    showToast(`Set remote failed: ${e.message}`, { type: 'error' });
  }
}
/* global Quill, TurndownService */

let markedInstance;
let turndownInstance;
let preferencesApi;
let ui;
let quill;

const state = {
  project: null,
  currentEntry: null,
  autoSaveTimer: null,
  dirty: false,
  lastSavedMarkdown: '',
  suppressEditorChange: false,
  suppressTitleChange: false,
  preferences: {},
  tutorialStep: 0,
  tutorialSeen: false,
  loadingEntry: false,
  creatingProject: false,
  openingProject: false
};

const TUTORIAL_STEPS = [
  {
    title: 'Create Your First Project',
    description:
      'Click "Create New Project" on the welcome screen. Projects are stored safely in `~/Documents/Novelist/` so you can access them anytime.'
  },
  {
    title: 'Explore the Sidebar',
    description:
      'Use the Chapters tab to jump between chapters and scenes. Characters and Planning tabs keep your cast and world organized.'
  },
  {
    title: 'Write in the Focused Editor',
    description:
      'Type in the editor with rich formatting. Auto-save runs 2 seconds after you pause, so you never lose progress.'
  },
  {
    title: 'Plan with Notes & Characters',
    description:
      'Switch tabs to update character sheets or planning notes. Notes are grouped by category to keep ideas tidy.'
  },
  {
    title: 'Version Control & Export',
    description:
      'Use the Commit button to snapshot your work with Git. Export combines all chapters into a single Markdown file when you are ready to share.'
  }
];

const NOTE_CATEGORIES = ['General', 'Plot Outline', 'Story Arc', 'World Building', 'Ideas & Research'];

// Utility: dynamically load scripts and styles if local assets fail
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function loadStyle(href) {
  return new Promise((resolve, reject) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.onload = resolve;
    l.onerror = reject;
    document.head.appendChild(l);
  });
}

// Simple in-app input prompt modal (replaces window.prompt)
function promptInput({ title = 'Enter value', placeholder = '', defaultValue = '' } = {}) {
  return new Promise((resolve) => {
    if (!ui.inputModal || !ui.inputModalTitle || !ui.inputModalField || !ui.inputModalOk || !ui.inputModalCancel) {
      // Fallback: return null if modal is missing
      console.warn('Input modal elements missing; returning null');
      resolve(null);
      return;
    }

    const onOk = () => {
      const value = ui.inputModalField.value.trim();
      cleanup();
      resolve(value || '');
    };
    const onCancel = () => {
      cleanup();
      resolve(null);
    };
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); onOk(); }
      else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    };
    function cleanup() {
      ui.inputModal.classList.add('hidden');
      ui.inputModalOk.removeEventListener('click', onOk);
      ui.inputModalCancel.removeEventListener('click', onCancel);
      ui.inputModalField.removeEventListener('keydown', onKey);
    }

    ui.inputModalTitle.textContent = title;
    ui.inputModalField.value = defaultValue || '';
    ui.inputModalField.placeholder = placeholder || '';
    ui.inputModal.classList.remove('hidden');
    ui.inputModalOk.addEventListener('click', onOk);
    ui.inputModalCancel.addEventListener('click', onCancel);
    ui.inputModalField.addEventListener('keydown', onKey);
    setTimeout(() => ui.inputModalField.focus(), 0);
  });
}

async function loadQuillFromCdn() {
  const cssUrl = 'https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css';
  const jsUrl = 'https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.min.js';
  try {
    await loadStyle(cssUrl);
  } catch (_) { /* ignore */ }
  await loadScript(jsUrl);
}

// Plain contenteditable fallback if Quill is unavailable
function initPlainEditor() {
  const host = document.getElementById('editor');
  if (!host) return false;
  host.innerHTML = '';
  const div = document.createElement('div');
  div.id = 'plain-editor';
  div.contentEditable = 'true';
  div.style.minHeight = '60vh';
  div.style.outline = 'none';
  div.style.padding = '20px 28px 40px';
  div.style.fontSize = '18px';
  host.appendChild(div);

  const toolbar = document.getElementById('editor-toolbar');
  if (toolbar) {
    toolbar.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const cls = btn.className;
      document.execCommand('styleWithCSS', false, true);
      if (cls.includes('ql-bold')) document.execCommand('bold');
      else if (cls.includes('ql-italic')) document.execCommand('italic');
      else if (cls.includes('ql-underline')) document.execCommand('underline');
      else if (cls.includes('ql-list') && btn.value === 'ordered') document.execCommand('insertOrderedList');
      else if (cls.includes('ql-list') && btn.value === 'bullet') document.execCommand('insertUnorderedList');
      else if (cls.includes('ql-blockquote')) document.execCommand('formatBlock', false, 'blockquote');
      else if (cls.includes('ql-code-block')) document.execCommand('formatBlock', false, 'pre');
      else if (cls.includes('ql-link')) {
        const url = await promptInput({ title: 'Insert link', placeholder: 'https://example.com' });
        if (url) document.execCommand('createLink', false, url);
      }
    });
  }

  // Minimal Quill-like facade so rest of code works
  quill = {
    root: div,
    getText: () => div.innerText || '',
    setContents: () => {},
    clipboard: { dangerouslyPasteHTML: (html) => { div.innerHTML = html || ''; } },
    setSelection: () => {},
    on: (evt, cb) => { if (evt === 'text-change') div.addEventListener('input', cb); }
  };
  return true;
}

window.addEventListener('DOMContentLoaded', async () => {
  preferencesApi = window.novelist?.preferences;
  markedInstance = window.marked;

  // Ensure Quill is available
  try {
    if (typeof Quill === 'undefined') {
      console.warn('Quill not found from local path, loading CDN...');
      await loadQuillFromCdn();
    }
  } catch (e) {
    console.error('Failed to load Quill', e);
  }

  // Markdown libs are optional for initial editing; add safe fallbacks if missing
  if (!markedInstance || typeof markedInstance.parse !== 'function') {
    console.warn('Marked not available; using minimal fallback parser.');
    markedInstance = { parse: (md) => `<p>${(md || '').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>` };
  } else {
    markedInstance.setOptions({ breaks: true, gfm: true });
  }
  if (typeof TurndownService !== 'function') {
    console.warn('Turndown not available; using minimal fallback turndown.');
    turndownInstance = { turndown: (html) => (html || '').replace(/<\/?p>/g, '\n\n').replace(/<br\s*\/?>(\n)?/g, '\n').replace(/<[^>]+>/g, '').trim() };
  } else {
    turndownInstance = new TurndownService({ headingStyle: 'atx' });
    turndownInstance.keep(['code', 'pre']);
  }

  ui = {
    welcome: document.getElementById('welcome-screen'),
    app: document.getElementById('app'),
    recentProjects: document.getElementById('recent-projects'),
    createProject: document.getElementById('create-project'),
    openProject: document.getElementById('open-project'),
    projectName: document.getElementById('project-name'),
    wordCount: document.getElementById('word-count'),
    totalWordCount: document.getElementById('total-word-count'),
    entryTitle: document.getElementById('entry-title'),
    saveStatus: document.getElementById('save-status'),
    fontSize: document.getElementById('font-size'),
    metaFields: document.getElementById('meta-fields'),
    toast: document.getElementById('toast'),
    sidebar: document.getElementById('sidebar'),
    appContainer: document.querySelector('.app-container'),
    tabButtons: document.querySelectorAll('.tab-button'),
    sidebarSections: document.querySelectorAll('.sidebar-section'),
    chaptersSection: document.querySelector('.sidebar-section[data-section="chapters"]'),
    charactersSection: document.querySelector('.sidebar-section[data-section="characters"]'),
    notesSection: document.querySelector('.sidebar-section[data-section="notes"]'),
    btnNewChapter: document.getElementById('btn-new-chapter'),
    btnExport: document.getElementById('btn-export'),
    tutorialOverlay: document.getElementById('tutorial-overlay'),
    tutorialSteps: document.getElementById('tutorial-steps'),
    tutorialPrev: document.getElementById('tutorial-prev'),
    tutorialNext: document.getElementById('tutorial-next'),
    tutorialClose: document.getElementById('tutorial-close'),
    newProjectModal: document.getElementById('new-project-modal'),
    newProjectName: document.getElementById('new-project-name'),
    newProjectError: document.getElementById('new-project-error'),
    newProjectCreate: document.getElementById('new-project-create'),
    newProjectCancel: document.getElementById('new-project-cancel'),
    // Generic input modal controls
    inputModal: document.getElementById('input-modal'),
    inputModalTitle: document.getElementById('input-modal-title'),
    inputModalField: document.getElementById('input-modal-field'),
    inputModalError: document.getElementById('input-modal-error'),
    inputModalOk: document.getElementById('input-modal-ok'),
    inputModalCancel: document.getElementById('input-modal-cancel')
  };

  const editorEl = document.getElementById('editor');
  if (!editorEl) {
    console.error('Editor element #editor not found');
    return;
  }

  const toolbarEl = document.getElementById('editor-toolbar');
  if (!toolbarEl) {
    console.error('Toolbar element #editor-toolbar not found');
    return;
  }

  console.log('Initializing Quill editor...');
  let quillOk = false;
  try {
    if (typeof Quill === 'function') {
      quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
          toolbar: '#editor-toolbar',
          history: { delay: 400, maxStack: 200, userOnly: true }
        },
        placeholder: 'Compose an epic...'
      });
      quill.root.setAttribute('spellcheck', 'true');
      quillOk = true;
      console.log('Quill editor initialized successfully');
    }
  } catch (e) {
    console.error('Quill failed to initialize', e);
  }

  if (!quillOk) {
    quillOk = initPlainEditor();
  }

  if (!quillOk) {
    console.error('No editor initialized. Aborting.');
    return;
  }

  // Attach Quill change listener
  quill.on('text-change', () => {
    if (!state.suppressEditorChange) {
      markDirty();
      updateWordCount();
    }
  });

  init();
});

function getEditorElement() {
  // Quill root in rich mode or plain editor div fallback
  return document.getElementById('plain-editor') || (quill && quill.root);
}

async function handleFind() {
  const needle = await promptInput({ title: 'Find', placeholder: 'Search text' });
  if (!needle) return;
  const root = getEditorElement();
  if (!root) return;
  const idx = (root.innerText || '').indexOf(needle);
  if (idx < 0) {
    showToast('Not found', { type: 'error' });
    return;
  }
  // Highlight by selecting in Quill; plain editor uses selection ranges
  if (quill && quill.getText) {
    // Map innerText index to Quill delta index by scanning text
    const text = quill.getText();
    const start = text.indexOf(needle);
    if (start >= 0) quill.setSelection(start, needle.length, 'api');
  } else {
    const selection = window.getSelection();
    selection.removeAllRanges();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let pos = 0; let node;
    while ((node = walker.nextNode())) {
      const next = pos + node.nodeValue.length;
      if (idx >= pos && idx < next) {
        const range = document.createRange();
        range.setStart(node, idx - pos);
        range.setEnd(node, Math.min(idx - pos + needle.length, node.nodeValue.length));
        selection.addRange(range);
        break;
      }
      pos = next;
    }
  }
}

async function handleReplace() {
  const needle = await promptInput({ title: 'Find', placeholder: 'Search text' });
  if (!needle) return;
  const replacement = await promptInput({ title: 'Replace with', placeholder: '' });
  if (replacement === null) return;

  if (quill && quill.getText) {
    const text = quill.getText();
    const idx = text.indexOf(needle);
    if (idx < 0) { showToast('Not found', { type: 'error' }); return; }
    quill.deleteText(idx, needle.length, 'api');
    quill.insertText(idx, replacement, 'api');
    quill.setSelection(idx, replacement.length, 'api');
  } else {
    const root = getEditorElement();
    if (!root) return;
    const html = root.innerHTML;
    if (!html.includes(needle)) { showToast('Not found', { type: 'error' }); return; }
    // Simple text replacement within HTML text nodes
    function replaceInNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue = node.nodeValue.replace(needle, replacement);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        node.childNodes.forEach(replaceInNode);
      }
    }
    replaceInNode(root);
  }
  markDirty();
}

function showToast(message, options = {}) {
  if (!ui.toast) return;
  ui.toast.textContent = message;
  ui.toast.classList.remove('hidden');
  ui.toast.classList.add('visible');
  if (options.type === 'error') {
    ui.toast.style.background = 'rgba(255, 82, 82, 0.92)';
  } else {
    ui.toast.style.background = 'rgba(20, 24, 28, 0.92)';
  }
  setTimeout(() => {
    ui.toast.classList.remove('visible');
    setTimeout(() => ui.toast.classList.add('hidden'), 300);
  }, options.duration ?? 3000);
}

function setSaveStatus(text) {
  if (ui.saveStatus) ui.saveStatus.textContent = text;
}

function updateWordCount() {
  const text = quill.getText().trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  if (ui.wordCount) ui.wordCount.textContent = `${words.toLocaleString()} words`;
}

// Helper: crude markdown -> word count
function countWordsFromMarkdown(md = '') {
  if (!md) return 0;
  // strip code fences, html tags, links/images, md punctuation, headings
  let s = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^\)]+\)/g, ' ')
    .replace(/\[[^\]]*\]\([^\)]+\)/g, ' ')
    .replace(/^#+\s+/gm, ' ')
    .replace(/[>*`*_#~-]/g, ' ');
  const tokens = s.trim().split(/\s+/).filter(Boolean);
  return tokens.length;
}

function updateTotalWordCount() {
  if (!state.project || !Array.isArray(state.project.chapters)) {
    if (ui.totalWordCount) ui.totalWordCount.textContent = '0 total';
    return;
  }
  const total = state.project.chapters.reduce((sum, ch) => sum + countWordsFromMarkdown(ch?.content || ''), 0);
  if (ui.totalWordCount) ui.totalWordCount.textContent = `${total.toLocaleString()} total`;
}

function updateFontSize(fontSize) {
  quill.root.style.fontSize = `${fontSize}px`;
  document.documentElement.style.setProperty('--editor-font-size', `${fontSize}px`);
}

async function loadPreferences() {
  try {
    if (!preferencesApi) return;
    const stored = await preferencesApi.get();
    state.preferences = stored || {};
    const font = state.preferences.fontSize || '16';
    ui.fontSize.value = String(font);
    updateFontSize(font);
  } catch (error) {
    console.error('Failed to load preferences', error);
  }
}

// Persist user preferences and merge with current state
async function savePreferences(patch = {}) {
  try {
    if (!preferencesApi) return;
    const next = { ...(state.preferences || {}), ...(patch || {}) };
    await preferencesApi.set(next);
    state.preferences = next;
  } catch (error) {
    console.error('Failed to save preferences', error);
  }
}

function renderRecentProjects(projects) {
  const recentList = document.getElementById('recent-projects');
  if (!recentList) return;

  recentList.innerHTML = '';

  if (!projects?.length) {
    return;
  }

  projects.forEach(project => {
    const li = document.createElement('li');
    li.className = 'recent-project-item';
    li.innerHTML = `
      <div class="recent-project-name">${project.name}</div>
      <div class="recent-project-date">Updated ${new Date(project.updatedAt).toLocaleDateString()}</div>
    `;
    li.addEventListener('click', () => openProjectByPath(project.path));
    recentList.appendChild(li);
  });
}

function clearAutoSaveTimer() {
  if (state.autoSaveTimer) {
    clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = null;
  }
}

async function flushPendingSave() {
  clearAutoSaveTimer();
  if (state.dirty && state.currentEntry) {
    await performSave();
  }
}

function scheduleAutoSave() {
  clearAutoSaveTimer();
  if (!state.currentEntry) return;
  state.autoSaveTimer = setTimeout(() => {
    performSave();
  }, 2000);
}

function buildChapterMarkdown(title, body) {
  const cleanBody = body.trim();
  return cleanBody ? `# ${title}\n\n${cleanBody}` : `# ${title}`;
}

function buildSceneMarkdown(title, body) {
  const cleanBody = body.trim();
  return cleanBody ? `## ${title}\n\n${cleanBody}` : `## ${title}`;
}

function buildCharacterMarkdown(title, body) {
  const cleanBody = body.trim();
  const placeholder = cleanBody || `- Background\n- Goals\n- Conflicts`;
  return `# ${title}\n\n${placeholder}`;
}

function buildNoteMarkdown(title, category, body) {
  const cleanBody = body.trim();
  if (cleanBody) {
    return `# ${title}\n\nCategory: ${category}\n\n${cleanBody}`;
  }
  return `# ${title}\n\nCategory: ${category}`;
}

function parseChapterContent(content) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled Chapter';
  const body = content.replace(/^#\s+.*$/m, '').trim();
  return { title, body };
}

function parseSceneContent(content) {
  const titleMatch = content.match(/^##\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Scene';
  const body = content.replace(/^##\s+.*$/m, '').trim();
  return { title, body };
}

function parseCharacterContent(content) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Character';
  const body = content.replace(/^#\s+.*$/m, '').trim();
  return { title, body };
}

function parseNoteContent(content) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const categoryMatch = content.match(/^Category:\s*(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Story Note';
  const category = categoryMatch ? categoryMatch[1].trim() : 'General';
  const body = content
    .replace(/^#\s+.*$/m, '')
    .replace(/^Category:\s*.*$/m, '')
    .trim();
  return { title, category, body };
}

function setEditorContent(markdownBody) {
  state.suppressEditorChange = true;
  const html = markdownBody ? markedInstance.parse(markdownBody) : '<p><br></p>';
  quill.setContents([]);
  quill.clipboard.dangerouslyPasteHTML(html);
  quill.setSelection(quill.getLength(), 0);
  state.suppressEditorChange = false;
  updateWordCount();
}

function setTitleInput(value) {
  state.suppressTitleChange = true;
  if (ui.entryTitle) {
    ui.entryTitle.value = value;
  }
  state.suppressTitleChange = false;
}

function renderMetaFieldsForEntry(entry) {
  ui.metaFields.innerHTML = '';
  if (!entry) return;

  if (entry.type === 'note') {
    const label = document.createElement('label');
    label.className = 'meta-field';
    label.textContent = 'Category';

    const select = document.createElement('select');
    NOTE_CATEGORIES.forEach((cat) => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      if (cat === entry.category) option.selected = true;
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      entry.category = select.value;
      markDirty();
    });
    label.appendChild(select);
    ui.metaFields.appendChild(label);
  }

  const tip = document.createElement('span');
  tip.className = 'meta-tip';
  if (entry.type === 'chapter') {
    tip.textContent = 'Tip: Press Cmd+Shift+B to hide the sidebar and focus on writing.';
  } else if (entry.type === 'scene') {
    tip.textContent = 'Tip: Use scenes to break chapters into smaller beats.';
  } else if (entry.type === 'character') {
    tip.textContent = 'Tip: Keep personality, goals, and conflicts handy here.';
  } else if (entry.type === 'note') {
    tip.textContent = 'Tip: Organize ideas by category to stay on track.';
  }
  ui.metaFields.appendChild(tip);
}

function getQuillMarkdownBody() {
  const html = quill.root.innerHTML;
  return turndownInstance.turndown(html).trim();
}

async function performSave() {
  if (!state.currentEntry) return;
  const entry = state.currentEntry;
  const title = ui.entryTitle.value.trim() || entry.fallbackTitle;
  const bodyMarkdown = getQuillMarkdownBody();
  let markdown;
  try {
    if (entry.type === 'chapter') {
      markdown = buildChapterMarkdown(title, bodyMarkdown);
      await window.novelist.chapters.save(state.project.path, entry.id, {
        title,
        content: markdown
      });
      entry.dataRef.title = title;
      entry.dataRef.content = markdown;
      updateTotalWordCount();
    } else if (entry.type === 'scene') {
      markdown = buildSceneMarkdown(title, bodyMarkdown);
      await window.novelist.chapters.saveScene(state.project.path, entry.chapterId, entry.id, {
        title,
        content: markdown
      });
      entry.dataRef.title = title;
      entry.dataRef.content = markdown;
    } else if (entry.type === 'character') {
      markdown = buildCharacterMarkdown(title, bodyMarkdown);
      const result = await window.novelist.characters.save(state.project.path, entry.id, {
        title,
        content: markdown
      });
      if (!entry.id && result?.id) entry.id = result.id;
      entry.dataRef.name = title;
      entry.dataRef.content = markdown;
    } else if (entry.type === 'note') {
      const category = entry.category || 'General';
      markdown = buildNoteMarkdown(title, category, bodyMarkdown);
      const result = await window.novelist.notes.save(state.project.path, entry.id, {
        title,
        category,
        content: markdown
      });
      if (!entry.id && result?.id) entry.id = result.id;
      entry.dataRef.title = title;
      entry.dataRef.category = category;
      entry.dataRef.content = markdown;
    }
    state.dirty = false;
    state.lastSavedMarkdown = markdown;
    setSaveStatus('Saved');
    await refreshSidebarEntry(entry.type);
  } catch (error) {
    console.error('Failed to save entry', error);
    showToast(`Failed to save: ${error.message}`, { type: 'error' });
  }
}

async function refreshSidebarEntry(type) {
  if (!state.project) return;
  if (type === 'chapter' || type === 'scene') {
    state.project.chapters = await window.novelist.chapters.list(state.project.path);
    renderChapters();
    if (type === 'chapter') updateTotalWordCount();
  } else if (type === 'character') {
    state.project.characters = await window.novelist.characters.list(state.project.path);
    renderCharacters();
  } else if (type === 'note') {
    state.project.notes = await window.novelist.notes.list(state.project.path);
    renderNotes();
  }
  updateActiveSidebar();
}

function markDirty() {
  if (!state.currentEntry) return;
  state.dirty = true;
  setSaveStatus('Saving…');
  scheduleAutoSave();
}

function updateActiveSidebar() {
  const items = document.querySelectorAll('.sidebar-item, .sidebar-scene');
  items.forEach((element) => {
    const type = element.dataset.entryType;
    const id = element.dataset.entryId;
    const chapterId = element.dataset.chapterId;
    let active = false;
    if (state.currentEntry) {
      if (state.currentEntry.type === 'chapter' && type === 'chapter' && id === state.currentEntry.id) {
        active = true;
      } else if (
        state.currentEntry.type === 'scene' &&
        type === 'scene' &&
        id === state.currentEntry.id &&
        chapterId === state.currentEntry.chapterId
      ) {
        active = true;
      } else if (state.currentEntry.type === 'character' && type === 'character' && id === state.currentEntry.id) {
        active = true;
      } else if (state.currentEntry.type === 'note' && type === 'note' && id === state.currentEntry.id) {
        active = true;
      }
    }
    element.classList.toggle('active', active);
  });
}

function renderChapters() {
  const container = ui.chaptersSection;
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'sidebar-header';
  const title = document.createElement('h3');
  title.textContent = 'Chapters';
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Chapter';
  addBtn.className = 'ghost';
  addBtn.addEventListener('click', createChapter);
  header.appendChild(title);
  header.appendChild(addBtn);
  container.appendChild(header);

  state.project.chapters?.forEach((chapter) => {
    const item = document.createElement('div');
    item.className = 'sidebar-item';
    item.dataset.entryType = 'chapter';
    item.dataset.entryId = chapter.id;
    const titleWrap = document.createElement('div');
    titleWrap.className = 'row';
    const strong = document.createElement('strong');
    strong.textContent = chapter.title;
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = `${chapter.scenes?.length || 0} scenes`;
    const del = document.createElement('button');
    del.className = 'ghost icon-bin';
    del.title = 'Delete chapter';
    del.textContent = '🗑️';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = window.confirm(`Delete chapter "${chapter.title}" and its scenes?`);
      if (!ok) return;
      try {
        await window.novelist.chapters.delete(state.project.path, chapter.id);
        state.project.chapters = await window.novelist.chapters.list(state.project.path);
        renderChapters();
        updateTotalWordCount();
        // If current entry was in this chapter, reset selection
        if (state.currentEntry && (state.currentEntry.id === chapter.id || state.currentEntry.chapterId === chapter.id)) {
          state.currentEntry = null;
          setTitleInput('');
          setEditorContent('');
          if (state.project.chapters[0]) await selectEntry('chapter', state.project.chapters[0].id);
        }
      } catch (err) {
        console.error('Delete chapter failed', err);
        showToast(`Could not delete chapter: ${err.message}`, { type: 'error' });
      }
    });
    titleWrap.appendChild(strong);
    titleWrap.appendChild(meta);
    titleWrap.appendChild(del);
    item.appendChild(titleWrap);
    item.addEventListener('click', () => selectEntry('chapter', chapter.id));

    const scenesContainer = document.createElement('div');
    scenesContainer.className = 'sidebar-scenes';

    chapter.scenes.forEach((scene) => {
      const sceneEl = document.createElement('div');
      sceneEl.className = 'sidebar-scene';
      sceneEl.dataset.entryType = 'scene';
      sceneEl.dataset.entryId = scene.id;
      sceneEl.dataset.chapterId = chapter.id;
      const label = document.createElement('span');
      label.textContent = scene.title;
      const delScene = document.createElement('button');
      delScene.className = 'ghost icon-bin';
      delScene.title = 'Delete scene';
      delScene.textContent = '🗑️';
      delScene.addEventListener('click', async (event) => {
        event.stopPropagation();
        const ok = window.confirm(`Delete scene "${scene.title}"?`);
        if (!ok) return;
        try {
          await window.novelist.chapters.deleteScene(state.project.path, chapter.id, scene.id);
          state.project.chapters = await window.novelist.chapters.list(state.project.path);
          renderChapters();
          if (state.currentEntry && state.currentEntry.type === 'scene' && state.currentEntry.id === scene.id) {
            state.currentEntry = null;
            setTitleInput('');
            setEditorContent('');
            await selectEntry('chapter', chapter.id);
          }
        } catch (err) {
          console.error('Delete scene failed', err);
          showToast(`Could not delete scene: ${err.message}`, { type: 'error' });
        }
      });
      sceneEl.appendChild(label);
      sceneEl.appendChild(delScene);
      sceneEl.addEventListener('click', (event) => {
        event.stopPropagation();
        selectEntry('scene', scene.id, { chapterId: chapter.id });
      });
      scenesContainer.appendChild(sceneEl);
    });

    const addSceneBtn = document.createElement('button');
    addSceneBtn.textContent = 'Add Scene';
    addSceneBtn.className = 'ghost add-scene';
    addSceneBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      showNewScenePrompt(chapter.id);
    });
    scenesContainer.appendChild(addSceneBtn);

    item.appendChild(scenesContainer);
    container.appendChild(item);
  });
}

function renderCharacters() {
  const container = ui.charactersSection;
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'sidebar-header';
  const title = document.createElement('h3');
  title.textContent = 'Characters';
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Character';
  addBtn.className = 'ghost';
  addBtn.addEventListener('click', createCharacter);
  header.appendChild(title);
  header.appendChild(addBtn);
  container.appendChild(header);

  state.project.characters?.forEach((character) => {
    const item = document.createElement('div');
    item.className = 'sidebar-item';
    item.dataset.entryType = 'character';
    item.dataset.entryId = character.id;
    const strong = document.createElement('strong');
    strong.textContent = character.name;
    const meta = document.createElement('span');
    meta.className = 'meta';
    meta.textContent = 'Profile';
    const del = document.createElement('button');
    del.className = 'ghost icon-bin';
    del.title = 'Delete character';
    del.textContent = '🗑️';
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = window.confirm(`Delete character "${character.name}"?`);
      if (!ok) return;
      try {
        await window.novelist.characters.delete(state.project.path, character.id);
        state.project.characters = await window.novelist.characters.list(state.project.path);
        renderCharacters();
        if (state.currentEntry && state.currentEntry.type === 'character' && state.currentEntry.id === character.id) {
          state.currentEntry = null;
          setTitleInput('');
          setEditorContent('');
        }
      } catch (err) {
        console.error('Delete character failed', err);
        showToast(`Could not delete character: ${err.message}`, { type: 'error' });
      }
    });
    item.appendChild(strong);
    item.appendChild(meta);
    item.appendChild(del);
    item.addEventListener('click', () => selectEntry('character', character.id));
    container.appendChild(item);
  });
}

function renderNotes() {
  const container = ui.notesSection;
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'sidebar-header';
  const title = document.createElement('h3');
  title.textContent = 'Planning Notes';
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Note';
  addBtn.className = 'ghost';
  addBtn.addEventListener('click', createNote);
  header.appendChild(title);
  header.appendChild(addBtn);
  container.appendChild(header);

  const grouped = state.project.notes?.reduce((map, note) => {
    const key = note.category || 'General';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(note);
    return map;
  }, new Map());

  grouped?.forEach((notes, category) => {
    const group = document.createElement('div');
    group.className = 'sidebar-group';
    const heading = document.createElement('h4');
    heading.textContent = category;
    heading.className = 'group-title';
    group.appendChild(heading);

    notes.forEach((note) => {
      const item = document.createElement('div');
      item.className = 'sidebar-item';
      item.dataset.entryType = 'note';
      item.dataset.entryId = note.id;
      const strong = document.createElement('strong');
      strong.textContent = note.title;
      const meta = document.createElement('span');
      meta.className = 'meta';
      meta.textContent = category;
      const del = document.createElement('button');
      del.className = 'ghost icon-bin';
      del.title = 'Delete note';
      del.textContent = '🗑️';
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = window.confirm(`Delete note "${note.title}"?`);
        if (!ok) return;
        try {
          await window.novelist.notes.delete(state.project.path, note.id);
          state.project.notes = await window.novelist.notes.list(state.project.path);
          renderNotes();
          if (state.currentEntry && state.currentEntry.type === 'note' && state.currentEntry.id === note.id) {
            state.currentEntry = null;
            setTitleInput('');
            setEditorContent('');
          }
        } catch (err) {
          console.error('Delete note failed', err);
          showToast(`Could not delete note: ${err.message}`, { type: 'error' });
        }
      });
      item.appendChild(strong);
      item.appendChild(meta);
      item.appendChild(del);
      item.addEventListener('click', () => selectEntry('note', note.id));
      group.appendChild(item);
    });
    container.appendChild(group);
  });
}

async function selectEntry(type, id, extra = {}) {
  if (state.loadingEntry) return;
  state.loadingEntry = true;
  try {
    await flushPendingSave();
    if (type === 'chapter') {
      const chapter = state.project.chapters.find((c) => c.id === id);
      if (!chapter) return;
      const parsed = parseChapterContent(chapter.content);
      setTitleInput(parsed.title);
      setEditorContent(parsed.body);
      state.currentEntry = {
        type,
        id,
        chapterId: id,
        dataRef: chapter,
        fallbackTitle: 'Chapter'
      };
      state.lastSavedMarkdown = chapter.content;
      renderMetaFieldsForEntry({ type, category: null });
    } else if (type === 'scene') {
      const chapter = state.project.chapters.find((c) => c.id === extra.chapterId);
      if (!chapter) return;
      const scene = chapter.scenes.find((s) => s.id === id);
      if (!scene) return;
      const parsed = parseSceneContent(scene.content);
      setTitleInput(parsed.title);
      setEditorContent(parsed.body);
      state.currentEntry = {
        type,
        id,
        chapterId: chapter.id,
        dataRef: scene,
        fallbackTitle: 'Scene'
      };
      state.lastSavedMarkdown = scene.content;
      renderMetaFieldsForEntry({ type });
    } else if (type === 'character') {
      const character = state.project.characters.find((c) => c.id === id);
      if (!character) return;
      const parsed = parseCharacterContent(character.content);
      setTitleInput(parsed.title);
      setEditorContent(parsed.body);
      state.currentEntry = {
        type,
        id,
        dataRef: character,
        fallbackTitle: 'Character'
      };
      state.lastSavedMarkdown = character.content;
      renderMetaFieldsForEntry({ type });
    } else if (type === 'note') {
      const note = state.project.notes.find((n) => n.id === id);
      if (!note) return;
      const parsed = parseNoteContent(note.content);
      setTitleInput(parsed.title);
      setEditorContent(parsed.body);
      state.currentEntry = {
        type,
        id,
        dataRef: note,
        category: parsed.category,
        fallbackTitle: 'Story Note'
      };
      state.lastSavedMarkdown = note.content;
      renderMetaFieldsForEntry({ type, category: parsed.category });
    }
    state.dirty = false;
    setSaveStatus('Saved');
    updateActiveSidebar();
  } finally {
    state.loadingEntry = false;
  }
}

async function loadProject(project) {
  // Load project data (chapters, characters, notes) from project.path
  // For now, set empty arrays and render empty UI
  state.chapters = [];
  state.characters = [];
  state.notes = [];
  renderChapters();
  renderCharacters();
  renderNotes();
  // Set view to edit mode
  state.currentView = 'edit';
}

async function enterProject(project) {
  state.project = project;
  const projectNameEl = document.getElementById('project-name');
  const welcomeEl = document.getElementById('welcome-screen');
  const appEl = document.getElementById('app');
  if (projectNameEl) projectNameEl.textContent = project.metadata?.name || project.metadata?.id || 'Project';
  if (welcomeEl) {
    welcomeEl.classList.add('hidden');
    welcomeEl.style.display = 'none';
  }
  if (appEl) {
    appEl.classList.remove('hidden');
    appEl.style.display = '';
  }

  // Persist last path and maintain a small MRU list for Recent Projects UI
  const existing = Array.isArray(state.preferences?.recentProjects) ? state.preferences.recentProjects : [];
  const nextRecent = [project.path, ...existing.filter((p) => p !== project.path)].slice(0, 10);
  await savePreferences({ lastProjectPath: project.path, recentProjects: nextRecent });

  try {
    state.project.chapters = await window.novelist.chapters.list(project.path);
  } catch (error) {
    console.warn('Failed to load chapters:', error);
    state.project.chapters = [];
  }

  try {
    state.project.characters = await window.novelist.characters.list(project.path);
  } catch (error) {
    console.warn('Failed to load characters:', error);
    state.project.characters = [];
  }

  try {
    state.project.notes = await window.novelist.notes.list(project.path);
  } catch (error) {
    console.warn('Failed to load notes:', error);
    state.project.notes = [];
  }

  // Populate state for rendering
  state.chapters = state.project.chapters || [];
  state.characters = state.project.characters || [];
  state.notes = state.project.notes || [];

  renderChapters();
  renderCharacters();
  renderNotes();
  updateTotalWordCount();
  updateActiveSidebar();

  if (state.project.chapters?.length) {
    await selectEntry('chapter', state.project.chapters[0].id);
  }

  // Do not auto-start tutorial on project open; it can block interactions
  // if (!state.preferences.tutorialCompleted && !state.tutorialSeen) {
  //   startTutorial();
  // }

  // Focus the title input to indicate edit mode
  const titleInput = document.getElementById('entry-title');
  if (titleInput) titleInput.focus();
}

async function openProjectByPath(path) {
  try {
    const project = await window.novelist.projects.load(path);
    await enterProject(project);
  } catch (error) {
    console.error('Failed to load project', error);
    showToast(`Could not open project: ${error.message}`, { type: 'error' });
  }
}

function openNewProjectModal() {
  if (state.creatingProject) return;

  const modal = document.getElementById('new-project-modal');
  if (!modal) {
    const name = window.prompt('Enter project name');
    if (name && name.trim()) {
      createProjectFromModal(name.trim());
    }
    return;
  }

  modal.classList.remove('hidden');

  const nameInput = document.getElementById('new-project-name');
  const errorEl = document.getElementById('new-project-error');
  const createBtn = document.getElementById('new-project-create');
  const cancelBtn = document.getElementById('new-project-cancel');

  if (nameInput) nameInput.value = '';
  if (errorEl) errorEl.classList.add('hidden');
  if (nameInput) setTimeout(() => nameInput.focus(), 0);

  // Attach event listeners after modal is shown
  if (createBtn) createBtn.addEventListener('click', createProjectFromModal);
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    state.creatingProject = false;
  });
  if (nameInput) nameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      createProjectFromModal();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      modal.classList.add('hidden');
      state.creatingProject = false;
    }
  });
}

function closeNewProjectModal() {
  const modal = document.getElementById('new-project-modal');
  if (modal) modal.classList.add('hidden');
}

function validateProjectName(name) {
  if (!name || !name.trim()) {
    return 'Project name is required.';
  }
  if (name.length > 60) {
    return 'Please choose a shorter name (max 60 characters).';
  }
  return null;
}

async function createProjectFromModal() {
  if (state.creatingProject) return;
  const nameInput = document.getElementById('new-project-name');
  const errorEl = document.getElementById('new-project-error');
  const name = nameInput ? nameInput.value.trim() : '';
  const validationError = validateProjectName(name);
  if (validationError) {
    if (errorEl) {
      errorEl.textContent = validationError;
      errorEl.classList.remove('hidden');
      if (nameInput) nameInput.focus();
    }
    return;
  }

  if (!window.novelist || !window.novelist.projects) {
    if (errorEl) {
      errorEl.textContent = 'Application not fully loaded. Please refresh and try again.';
      errorEl.classList.remove('hidden');
    }
    return;
  }

  state.creatingProject = true;
  const createBtn = document.getElementById('new-project-create');
  const cancelBtn = document.getElementById('new-project-cancel');
  if (createBtn) createBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;
  if (errorEl) errorEl.classList.add('hidden');

  try {
    const project = await window.novelist.projects.create(name);
    try {
      await window.novelist.git.init(project.path);
    } catch (gitError) {
      console.warn('Git init failed, continuing without Git:', gitError);
    }
    closeNewProjectModal();
    await enterProject(project);
    await refreshRecentProjects();
  } catch (error) {
    console.error('Failed to create project', error);
    if (errorEl) {
      errorEl.textContent = error.message || 'Failed to create project.';
      errorEl.classList.remove('hidden');
    }
  } finally {
    state.creatingProject = false;
    if (createBtn) createBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
  }
}

async function handleOpenProject() {
  if (state.openingProject) return;
  state.openingProject = true;
  try {
    const project = await window.novelist.projects.openDialog();
    if (!project) return;
    await enterProject(project);
    await refreshRecentProjects();
  } catch (error) {
    console.error('Failed to open project', error);
    showToast(`Could not open project: ${error.message}`, { type: 'error' });
  } finally {
    state.openingProject = false;
  }
}

async function refreshRecentProjects() {
  try {
    const scanned = await window.novelist.projects.list();
    const byPath = new Map(scanned.map((p) => [p.path, p]));
    const recents = Array.isArray(state.preferences?.recentProjects) ? state.preferences.recentProjects : [];
    // Try to enrich MRU items that are outside the default folder
    for (const path of recents) {
      if (!byPath.has(path)) {
        try {
          const loaded = await window.novelist.projects.load(path);
          if (loaded && loaded.metadata) {
            byPath.set(path, { path, ...loaded.metadata });
          }
        } catch (_) {
          // Skip paths that no longer exist
        }
      }
    }
    // Sort by updatedAt desc if available, otherwise keep MRU order
    const merged = Array.from(byPath.values()).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    renderRecentProjects(merged);
    const last = state.preferences.lastProjectPath;
    if (!state.project && last && byPath.has(last)) {
      await openProjectByPath(last);
    }
  } catch (error) {
    console.error('Failed to list projects', error);
  }
}

async function createChapter() {
  if (!state.project) return;
  const title = await promptInput({ title: 'New chapter title', placeholder: 'Chapter title' });
  if (!title) return;
  try {
    const chapter = await window.novelist.chapters.create(state.project.path, title);
    showToast('Chapter created');
    state.project.chapters = await window.novelist.chapters.list(state.project.path);
    renderChapters();
    updateTotalWordCount();
    await selectEntry('chapter', chapter.id);
  } catch (error) {
    console.error('Failed to create chapter', error);
    showToast(`Could not create chapter: ${error.message}`, { type: 'error' });
  }
}

async function showNewScenePrompt(chapterId) {
  const name = await promptInput({ title: 'New scene title', placeholder: 'Scene title' });
  if (!name) return;
  try {
    const scene = await window.novelist.chapters.createScene(state.project.path, chapterId, name);
    showToast('Scene created');
    state.project.chapters = await window.novelist.chapters.list(state.project.path);
    renderChapters();
    await selectEntry('scene', scene.id, { chapterId });
  } catch (error) {
    console.error('Failed to create scene', error);
    showToast(`Could not create scene: ${error.message}`, { type: 'error' });
  }
}

async function createCharacter() {
  if (!state.project) return;
  const name = await promptInput({ title: 'New character name', placeholder: 'Character name' });
  if (!name) return;
  const role = await promptInput({ title: 'Role', placeholder: 'e.g., Protagonist, Mentor' });
  if (role === null) return;
  const personality = await promptInput({ title: 'Personality', placeholder: 'e.g., Brave, Analytical, Stubborn' });
  if (personality === null) return;
  try {
    const sections = [
      `# ${name}`,
      '',
      role ? `## Role\n${role}` : null,
      personality ? `\n## Personality\n${personality}` : null,
      '\n## Notes',
      '- Background',
      '- Goals',
      '- Conflicts'
    ].filter(Boolean).join('\n');
    const markdown = sections;
    const result = await window.novelist.characters.save(state.project.path, null, {
      title: name,
      content: markdown
    });
    showToast('Character created');
    state.project.characters = await window.novelist.characters.list(state.project.path);
    renderCharacters();
    await selectEntry('character', result.id);
  } catch (error) {
    console.error('Failed to create character', error);
    showToast(`Could not create character: ${error.message}`, { type: 'error' });
  }
}

async function createNote() {
  if (!state.project) return;
  const title = await promptInput({ title: 'New note title', placeholder: 'Note title' });
  if (!title) return;
  try {
    const categoryInput = await promptInput({
      title: 'Note category',
      placeholder: `Choose: ${NOTE_CATEGORIES.join(', ')}`,
      defaultValue: NOTE_CATEGORIES[0]
    });
    const category = (categoryInput && categoryInput.trim()) || NOTE_CATEGORIES[0];
    const markdown = buildNoteMarkdown(title, category, '');
    const result = await window.novelist.notes.save(state.project.path, null, {
      title,
      category,
      content: markdown
    });
    showToast('Note created');
    state.project.notes = await window.novelist.notes.list(state.project.path);
    renderNotes();
    await selectEntry('note', result.id);
  } catch (error) {
    console.error('Failed to create note', error);
    showToast(`Could not create note: ${error.message}`, { type: 'error' });
  }
}

async function handleExport() {
  if (!state.project) return;
  await flushPendingSave();
  try {
    const exportPath = await window.novelist.exports.project(state.project.path);
    showToast(`Export ready at ${exportPath}`);
  } catch (error) {
    console.error('Failed to export project', error);
    showToast(`Export failed: ${error.message}`, { type: 'error' });
  }
}

async function handleCommit() {
  if (!state.project) return;
  await flushPendingSave();
  const message = await promptInput({ title: 'Commit message', defaultValue: 'Update from Novelist', placeholder: 'Describe your changes' });
  if (message === null) return;
  try {
    const result = await window.novelist.git.commit(state.project.path, message);
    showToast(`Committed: ${result.summary?.changes || 0} changes`);
  } catch (error) {
    if (/not a Git repository/i.test(error.message)) {
      const confirmInit = window.confirm('Git is not initialized. Initialize now?');
      if (confirmInit) {
        await window.novelist.git.init(state.project.path);
        showToast('Git repository initialized. Try committing again.');
      }
    } else {
      console.error('Commit failed', error);
      showToast(`Commit failed: ${error.message}`, { type: 'error' });
    }
  }
}

function toggleSidebar() {
  if (window.innerWidth <= 960) {
    ui.sidebar.classList.toggle('open');
  } else {
    ui.appContainer.classList.toggle('sidebar-hidden');
  }
}

function startTutorial() {
  state.tutorialSeen = true;
  state.tutorialStep = 0;
  ui.tutorialOverlay.classList.remove('hidden');
  renderTutorialStep();
}

function closeTutorial(completed = false) {
  ui.tutorialOverlay.classList.add('hidden');
  if (completed) {
    savePreferences({ tutorialCompleted: true });
  }
}

function renderTutorialStep() {
  if (!ui.tutorialSteps || !ui.tutorialNext || !ui.tutorialPrev) {
    // Elements not found; bail safely
    return;
  }
  ui.tutorialSteps.innerHTML = '';
  TUTORIAL_STEPS.forEach((step, index) => {
    const li = document.createElement('li');
    li.textContent = `${step.title} — ${step.description}`;
    if (index === state.tutorialStep) li.classList.add('active');
    ui.tutorialSteps.appendChild(li);
  });
  ui.tutorialPrev.disabled = state.tutorialStep === 0;
  ui.tutorialNext.textContent = state.tutorialStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next';
}

function initEventListeners() {
  console.log('Initializing event listeners...');
  
  // Top bar buttons
  if (ui.btnNewChapter) {
    console.log('Attaching New Chapter button listener');
    ui.btnNewChapter.addEventListener('click', async () => {
      console.log('[UI] New Chapter clicked');
      if (!state.project) {
        showToast('Open or create a project first', { type: 'error' });
        return;
      }
      try {
        await createChapter();
      } catch (e) {
        console.error('New Chapter failed', e);
        showToast(`Could not create chapter: ${e.message}`, { type: 'error' });
      }
    });
  } else {
    console.warn('New Chapter button not found');
  }
  
  if (ui.btnExport) {
    console.log('Attaching Export button listener');
    ui.btnExport.addEventListener('click', handleExport);
  } else {
    console.warn('Export button not found');
  }

  // Font size selector
  if (ui.fontSize) {
    console.log('Attaching Font Size listener');
    ui.fontSize.addEventListener('change', (event) => {
      const value = Number(event.target.value);
      updateFontSize(value);
      savePreferences({ fontSize: value });
    });
  } else {
    console.warn('Font size selector not found');
  }

  // Title input
  if (ui.entryTitle) {
    console.log('Attaching Title input listener');
    ui.entryTitle.addEventListener('input', () => {
      if (state.suppressTitleChange) return;
      if (state.currentEntry) {
        markDirty();
      }
    });
  } else {
    console.warn('Title input not found');
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      toggleSidebar();
    }
  });

  // Sidebar tab buttons
  console.log('Tab buttons found:', ui.tabButtons ? ui.tabButtons.length : 0);
  if (ui.tabButtons && ui.tabButtons.length > 0) {
    ui.tabButtons.forEach((button, index) => {
      console.log(`Attaching listener to tab button ${index}:`, button.dataset.tab);
      button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        console.log('Tab clicked:', tab);
        
        // Update active tab button
        ui.tabButtons.forEach((btn) => {
          btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Show/hide sections
        if (ui.sidebarSections && ui.sidebarSections.length > 0) {
          ui.sidebarSections.forEach((section) => {
            if (section.dataset.section === tab) {
              console.log('Showing section:', tab);
              section.classList.remove('hidden');
            } else {
              section.classList.add('hidden');
            }
          });
        }

        // Ensure content is rendered for the chosen tab
        if (tab === 'chapters') {
          if (!state.project || !Array.isArray(state.project.chapters)) return;
          if (!ui.chaptersSection || ui.chaptersSection.children.length === 0) {
            renderChapters();
          }
        } else if (tab === 'characters') {
          if (!state.project || !Array.isArray(state.project.characters)) return;
          if (!ui.charactersSection || ui.charactersSection.children.length === 0) {
            renderCharacters();
          }
        } else if (tab === 'notes') {
          if (!state.project || !Array.isArray(state.project.notes)) return;
          if (!ui.notesSection || ui.notesSection.children.length === 0) {
            renderNotes();
          }
        }
      });
    });
  } else {
    console.warn('No tab buttons found');
  }

  // Tutorial buttons
  if (ui.tutorialPrev) {
    ui.tutorialPrev.addEventListener('click', () => {
      if (state.tutorialStep > 0) {
        state.tutorialStep -= 1;
        renderTutorialStep();
      }
    });
  }

  if (ui.tutorialNext) {
    ui.tutorialNext.addEventListener('click', () => {
      if (state.tutorialStep < TUTORIAL_STEPS.length - 1) {
        state.tutorialStep += 1;
        renderTutorialStep();
      } else {
        closeTutorial(true);
      }
    });
  }

  if (ui.tutorialClose) {
    ui.tutorialClose.addEventListener('click', () => closeTutorial(false));
  }

  // Save before closing
  window.addEventListener('beforeunload', () => {
    flushPendingSave();
  });
  
  console.log('Event listeners initialized');
}

async function init() {
  // Set up basic UI event listeners first
  function attachEventListeners() {
    const createButton = document.getElementById('create-project');
    if (createButton) {
      createButton.addEventListener('click', openNewProjectModal);
    } else {
      setTimeout(attachEventListeners, 100); // Retry after 100ms
    }
  }
  attachEventListeners();

  function attachOpenProjectListener() {
    const openProjectBtn = document.getElementById('open-project');
    if (openProjectBtn) {
      openProjectBtn.addEventListener('click', handleOpenProject);
    } else {
      setTimeout(attachOpenProjectListener, 100); // Retry after 100ms
    }
  }
  attachOpenProjectListener();

  if (!window.novelist || !window.novelist.projects) {
    console.error('Novelist APIs not available. Check preload script.');
    showToast('Error: Unable to load application. Check console for details.', { type: 'error', duration: 5000 });
    return;
  }

  await loadPreferences();
  updateWordCount();
  await refreshRecentProjects();
  initEventListeners();
  subscribeToMenuEvents();
}

init();
