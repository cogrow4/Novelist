import fs from 'fs-extra';
import { join, basename } from 'path';
import os from 'os';
import { nanoid } from 'nanoid';
import simpleGit from 'simple-git';
import { dialog } from 'electron';
import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

const NOVELIST_ROOT = join(os.homedir(), 'Documents', 'Novelist');

const defaultProjectFile = (name, id) => ({
  id,
  name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastChapterId: null,
  lastCharacterId: null,
  lastNoteId: null
});

const defaultOrderFile = {
  chapters: [],
  scenes: {},
  notes: []
};

const ensureBaseDirectory = async () => {
  await fs.ensureDir(NOVELIST_ROOT);
};

const sanitizeName = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, '')
    .replace(/\s+/g, '-');

const loadProjectFile = async (projectPath) => {
  const metadataPath = join(projectPath, 'project.json');
  const data = await fs.readJson(metadataPath);
  return data;
};

const writeProjectFile = async (projectPath, project) => {
  const metadataPath = join(projectPath, 'project.json');
  project.updatedAt = new Date().toISOString();
  await fs.writeJson(metadataPath, project, { spaces: 2 });
};

const ensureProjectStructure = async (projectPath) => {
  await fs.ensureDir(projectPath);
  await fs.ensureDir(join(projectPath, 'chapters'));
  await fs.ensureDir(join(projectPath, 'characters'));
  await fs.ensureDir(join(projectPath, 'notes'));
};

const checkAndCreateProject = async (name) => {
  await ensureBaseDirectory();
  if (!name?.trim()) {
    throw new Error('Project name is required');
  }

  const sanitized = sanitizeName(name) || `story-${Date.now()}`;
  const projectId = `${sanitized}-${nanoid(6)}`;
  const projectPath = join(NOVELIST_ROOT, projectId);

  if (await fs.pathExists(projectPath)) {
    throw new Error('A project with this identifier already exists');
  }

  await ensureProjectStructure(projectPath);
  const metadata = defaultProjectFile(name.trim(), projectId);
  await fs.writeJson(join(projectPath, 'project.json'), metadata, { spaces: 2 });
  await fs.writeJson(join(projectPath, 'order.json'), defaultOrderFile, { spaces: 2 });

  const chapterId = await createChapter(projectPath, 'Chapter 1');
  await saveChapter(projectPath, chapterId.id, {
    title: 'Chapter 1',
    content: '# Chapter 1\n\nStart your story here...'
  });

  return loadProject(projectPath);
};

const listProjects = async () => {
  await ensureBaseDirectory();
  const dirs = await fs.readdir(NOVELIST_ROOT);
  const projects = [];

  for (const folder of dirs) {
    const projectPath = join(NOVELIST_ROOT, folder);
    const metadataPath = join(projectPath, 'project.json');
    if (await fs.pathExists(metadataPath)) {
      const metadata = await fs.readJson(metadataPath);
      projects.push({
        path: projectPath,
        ...metadata
      });
    }
  }

  return projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

const getProjectsGitStatus = async () => {
  await ensureBaseDirectory();
  const dirs = await fs.readdir(NOVELIST_ROOT);
  const projects = [];

  for (const folder of dirs) {
    const projectPath = join(NOVELIST_ROOT, folder);
    // basic check if valid project
    if (await fs.pathExists(join(projectPath, 'project.json'))) {
      const git = simpleGit(projectPath);
      let isRepo = false;
      let remoteUrl = '';
      try {
        isRepo = await git.checkIsRepo();
        if (isRepo) {
          const remotes = await git.getRemotes(true);
          remoteUrl = remotes.find(r => r.name === 'origin')?.refs?.fetch || (remotes[0]?.refs?.fetch || '');
        }
      } catch (e) {
        // ignore git errors
      }

      projects.push({
        name: folder,
        path: projectPath,
        isRepo,
        remoteUrl
      });
    }
  }
  return projects;
};

const loadProject = async (projectPath) => {
  await ensureProjectStructure(projectPath);
  const metadata = await loadProjectFile(projectPath);
  const chapters = await listChapters(projectPath);
  const characters = await listCharacters(projectPath);
  const notes = await listNotes(projectPath);

  return {
    path: projectPath,
    metadata,
    chapters,
    characters,
    notes
  };
};

const listChapters = async (projectPath) => {
  const chaptersDir = join(projectPath, 'chapters');
  await fs.ensureDir(chaptersDir);
  const files = await fs.readdir(chaptersDir);
  const chapters = [];
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const filePath = join(chaptersDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const scenesDir = join(chaptersDir, `${basename(file, '.md')}-scenes`);
    const scenes = await listScenes(scenesDir);
    chapters.push({
      id: basename(file, '.md'),
      title: parseChapterTitle(content) || basename(file, '.md'),
      content,
      path: filePath,
      scenes
    });
  }
  const order = await loadOrderFile(projectPath);

  // Sort based on order file
  chapters.sort((a, b) => {
    const indexA = order.chapters.indexOf(a.id);
    const indexB = order.chapters.indexOf(b.id);
    // If both are in the list, sort by index
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    // If a is in list but b isn't, a comes first
    if (indexA !== -1) return -1;
    // If b is in list but a isn't, b comes first
    if (indexB !== -1) return 1;
    // Otherwise alphabetical fallback
    return a.title.localeCompare(b.title, undefined, { numeric: true });
  });

  return chapters;
};

const parseChapterTitle = (content) => {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
};

const listScenes = async (scenesDir) => {
  const items = [];
  if (!(await fs.pathExists(scenesDir))) {
    return items;
  }
  const files = await fs.readdir(scenesDir);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const filePath = join(scenesDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    items.push({
      id: basename(file, '.md'),
      title: parseSceneTitle(content) || basename(file, '.md'),
      content,
      path: filePath
    });
  }
  const projectPath = join(scenesDir, '../..'); // Go up from chapter-scenes -> chapters -> project
  const chapterId = basename(scenesDir).replace('-scenes', '');
  const order = await loadOrderFile(projectPath);
  const sceneOrder = order.scenes[chapterId] || [];

  return items.sort((a, b) => {
    const indexA = sceneOrder.indexOf(a.id);
    const indexB = sceneOrder.indexOf(b.id);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.title.localeCompare(b.title, undefined, { numeric: true });
  });
};

const parseSceneTitle = (content) => {
  const match = content.match(/^##\s+(.+)$/m);
  return match ? match[1].trim() : null;
};

const createChapter = async (projectPath, title) => {
  const chaptersDir = join(projectPath, 'chapters');
  await fs.ensureDir(chaptersDir);
  const chapterId = `${sanitizeName(title) || 'chapter'}-${nanoid(4)}`;
  const chapterPath = join(chaptersDir, `${chapterId}.md`);
  const template = `# ${title}\n\nBegin writing your chapter...`;
  await fs.writeFile(chapterPath, template, 'utf-8');

  // Update order
  const order = await loadOrderFile(projectPath);
  if (!order.chapters.includes(chapterId)) {
    order.chapters.push(chapterId);
    await saveOrderFile(projectPath, order);
  }

  return { id: chapterId, path: chapterPath };
};

const saveChapter = async (projectPath, chapterId, payload) => {
  const { content, title } = payload;
  if (!chapterId) throw new Error('chapterId is required');
  const chapterPath = join(projectPath, 'chapters', `${chapterId}.md`);
  await fs.ensureFile(chapterPath);
  let body = content;
  if (title && !content.startsWith(`# ${title}`)) {
    body = `# ${title}\n\n${content.replace(/^#\s+.*$/m, '').trimStart()}`;
  }
  await fs.writeFile(chapterPath, body, 'utf-8');
  await writeProjectFile(projectPath, await loadProjectFile(projectPath));
  return chapterPath;
};

const createScene = async (projectPath, chapterId, sceneName) => {
  const scenesDir = join(projectPath, 'chapters', `${chapterId}-scenes`);
  await fs.ensureDir(scenesDir);
  const sceneId = `${sanitizeName(sceneName) || 'scene'}-${nanoid(4)}`;
  const scenePath = join(scenesDir, `${sceneId}.md`);
  const template = `## ${sceneName}\n\nDescribe the scene...`;
  await fs.writeFile(scenePath, template, 'utf-8');

  // Update order
  const order = await loadOrderFile(projectPath);
  if (!order.scenes[chapterId]) order.scenes[chapterId] = [];
  if (!order.scenes[chapterId].includes(sceneId)) {
    order.scenes[chapterId].push(sceneId);
    await saveOrderFile(projectPath, order);
  }

  return { id: sceneId, path: scenePath };
};

const saveScene = async (projectPath, chapterId, sceneId, payload) => {
  if (!sceneId) throw new Error('sceneId is required');
  const scenesDir = join(projectPath, 'chapters', `${chapterId}-scenes`);
  await fs.ensureDir(scenesDir);
  const scenePath = join(scenesDir, `${sceneId}.md`);
  const title = payload.title || 'Scene';
  let body = (payload.content || '').replace(/^##\s+.*$/m, '').trimStart();
  let content = `## ${title}\n\n${body}`.trimEnd();
  content += '\n';
  await fs.writeFile(scenePath, content, 'utf-8');
  return scenePath;
};

// Deletions
const deleteChapter = async (projectPath, chapterId) => {
  if (!chapterId) throw new Error('chapterId is required');
  const chapterPath = join(projectPath, 'chapters', `${chapterId}.md`);
  const scenesDir = join(projectPath, 'chapters', `${chapterId}-scenes`);
  // Remove chapter file
  await fs.remove(chapterPath);
  // Remove associated scenes directory if present
  await fs.remove(scenesDir);

  // Update order
  const order = await loadOrderFile(projectPath);
  order.chapters = order.chapters.filter(id => id !== chapterId);
  delete order.scenes[chapterId];
  await saveOrderFile(projectPath, order);

  await writeProjectFile(projectPath, await loadProjectFile(projectPath));
  return true;
};

const deleteScene = async (projectPath, chapterId, sceneId) => {
  if (!chapterId) throw new Error('chapterId is required');
  if (!sceneId) throw new Error('sceneId is required');
  const scenePath = join(projectPath, 'chapters', `${chapterId}-scenes`, `${sceneId}.md`);
  await fs.remove(scenePath);

  // Update order
  const order = await loadOrderFile(projectPath);
  if (order.scenes[chapterId]) {
    order.scenes[chapterId] = order.scenes[chapterId].filter(id => id !== sceneId);
    await saveOrderFile(projectPath, order);
  }

  return true;
};

const listCharacters = async (projectPath) => {
  const charactersDir = join(projectPath, 'characters');
  await fs.ensureDir(charactersDir);
  const files = await fs.readdir(charactersDir);
  const characters = [];
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const filePath = join(charactersDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    characters.push({
      id: basename(file, '.md'),
      name: parseCharacterName(content) || basename(file, '.md'),
      content,
      path: filePath
    });
  }
  return characters.sort((a, b) => a.name.localeCompare(b.name));
};

const parseCharacterName = (content) => {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
};

const saveCharacter = async (projectPath, characterId, payload) => {
  const charactersDir = join(projectPath, 'characters');
  await fs.ensureDir(charactersDir);
  const id = characterId || `${sanitizeName(payload.title || 'character')}-${nanoid(4)}`;
  const filePath = join(charactersDir, `${id}.md`);
  const title = payload.title || 'Unnamed Character';
  let content = payload.content || '';
  if (!content.includes(`# ${title}`)) {
    content = `# ${title}\n\n${content.replace(/^#\s+.*$/m, '').trimStart()}`;
  }
  await fs.writeFile(filePath, content, 'utf-8');
  return { id, path: filePath };
};

const deleteCharacter = async (projectPath, characterId) => {
  if (!characterId) throw new Error('characterId is required');
  const filePath = join(projectPath, 'characters', `${characterId}.md`);
  await fs.remove(filePath);
  return true;
};

const listNotes = async (projectPath) => {
  const notesDir = join(projectPath, 'notes');
  await fs.ensureDir(notesDir);
  const files = await fs.readdir(notesDir);
  const notes = [];
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const filePath = join(notesDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    const category = parseNoteCategory(content);
    notes.push({
      id: basename(file, '.md'),
      title: parseNoteTitle(content) || basename(file, '.md'),
      category,
      content,
      path: filePath
    });
  }
  const order = await loadOrderFile(projectPath);

  return notes.sort((a, b) => {
    const indexA = order.notes.indexOf(a.id);
    const indexB = order.notes.indexOf(b.id);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.title.localeCompare(b.title);
  });
};

const parseNoteTitle = (content) => {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
};

const saveNote = async (projectPath, noteId, payload) => {
  const notesDir = join(projectPath, 'notes');
  await fs.ensureDir(notesDir);
  const id = noteId || `${sanitizeName(payload.title || 'note')}-${nanoid(4)}`;
  const filePath = join(notesDir, `${id}.md`);
  const title = payload.title || 'Story Note';
  const category = payload.category || 'General';
  let body = (payload.content || '').replace(/^#\s+.*$/m, '').trimStart();
  body = body.replace(/^Category:\s.*$/m, '').trimStart();
  let content = `# ${title}\n\nCategory: ${category}\n\n${body}`.trimEnd();
  content += '\n';
  await fs.writeFile(filePath, content, 'utf-8');

  // Update order
  const order = await loadOrderFile(projectPath);
  if (!order.notes.includes(id)) {
    order.notes.push(id);
    await saveOrderFile(projectPath, order);
  }

  return { id, path: filePath, category };
};

const deleteNote = async (projectPath, noteId) => {
  if (!noteId) throw new Error('noteId is required');
  const filePath = join(projectPath, 'notes', `${noteId}.md`);
  await fs.remove(filePath);

  // Update order
  const order = await loadOrderFile(projectPath);
  order.notes = order.notes.filter(id => id !== noteId);
  await saveOrderFile(projectPath, order);

  return true;
};

const parseNoteCategory = (content) => {
  const match = content.match(/^Category:\s*(.+)$/m);
  return match ? match[1].trim() : 'General';
};

const exportProject = async (projectPath) => {
  await ensureProjectStructure(projectPath);

  // Ask user where to save
  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Project',
    defaultPath: join(os.homedir(), `Export-${basename(projectPath)}-${new Date().toISOString().split('T')[0]}.md`),
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'Plain Text', extensions: ['txt'] }
    ]
  });

  if (!filePath) {
    throw new Error('Export cancelled');
  }

  const chapters = await listChapters(projectPath);
  const characters = await listCharacters(projectPath);
  const notes = await listNotes(projectPath);

  const lines = [];
  const projectName = basename(projectPath);

  // Title
  lines.push(`# ${projectName}`);
  lines.push('');
  lines.push(`_Exported on ${new Date().toLocaleString()}_`);
  lines.push('');

  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('');
  chapters.forEach(ch => {
    lines.push(`- [${ch.title}](#${ch.title.toLowerCase().replace(/[^\w]+/g, '-')})`);
  });
  if (characters.length > 0) lines.push('- [Appendix: Characters](#appendix-characters)');
  if (notes.length > 0) lines.push('- [Appendix: Notes](#appendix-notes)');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Helper to process content (remove HTML markers, convert to MD if needed)
  const processContent = (content) => {
    if (!content) return '';
    let body = content;
    // Remove title lines
    body = body.replace(/^#+\s+.*$/m, '').trim();
    // Remove category lines
    body = body.replace(/^Category:\s*.*$/m, '').trim();

    // Check for HTML body
    if (body.includes('<!-- HTML_BODY -->') || (body.includes('<') && body.includes('</'))) {
      body = body.replace('<!-- HTML_BODY -->', '').trim();
      // Convert HTML to Markdown
      return turndownService.turndown(body);
    }
    return body;
  };

  // Content
  for (const chapter of chapters) {
    lines.push(`# ${chapter.title}`);
    lines.push('');
    lines.push(processContent(chapter.content));
    lines.push('');

    for (const scene of chapter.scenes) {
      lines.push(`## ${scene.title}`);
      lines.push('');
      lines.push(processContent(scene.content));
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  // Appendices
  if (characters.length > 0) {
    lines.push('# Appendix: Characters');
    lines.push('');
    for (const char of characters) {
      lines.push(`## ${char.name}`);
      lines.push('');
      lines.push(processContent(char.content));
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  if (notes.length > 0) {
    lines.push('# Appendix: Notes');
    lines.push('');
    for (const note of notes) {
      lines.push(`## ${note.title}`);
      lines.push(`**Category:** ${note.category || 'General'}`);
      lines.push('');
      lines.push(processContent(note.content));
      lines.push('');
    }
  }

  const exportContent = lines.join('\n');
  await fs.writeFile(filePath, exportContent, 'utf-8');
  return filePath;
};

const initGitRepo = async (projectPath) => {
  const git = simpleGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    await git.init();
  }
  await git.add('./*');
  await git.commit('Initial commit', { '--allow-empty': true }).catch(() => null);
  return true;
};

const commitCurrentChanges = async (projectPath, message) => {
  const git = simpleGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) throw new Error('Project is not a Git repository yet');
  await git.add('./*');
  const summary = await git.commit(message || 'Update from Novelist');
  return summary;
};

const pushToRemote = async (projectPath) => {
  const git = simpleGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) throw new Error('Project is not a Git repository yet');

  // Auto-commit if there are changes (Sync behavior)
  const status = await git.status();
  if (status.files.length > 0) {
    await git.add('./*');
    await git.commit(`Manual sync: ${new Date().toLocaleString()}`);
  }

  try {
    await git.push();
  } catch (e) {
    // If push fails due to missing upstream, set it and try again
    if (e.message.includes('no upstream branch') || e.message.includes('current branch') && e.message.includes('no upstream')) {
      const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
      console.log(`Setting upstream for branch ${branch} and pushing...`);
      await git.push(['--set-upstream', 'origin', branch]);
    } else {
      throw e;
    }
  }
  return true;
};

const pullFromRemote = async (projectPath) => {
  const git = simpleGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) throw new Error('Project is not a Git repository yet');
  await git.pull();
  return true;
};

const setGitRemote = async (projectPath, remoteUrl) => {
  if (!remoteUrl || !remoteUrl.trim()) throw new Error('Remote URL is required');
  const git = simpleGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) throw new Error('Project is not a Git repository yet');
  const remotes = await git.getRemotes(true);
  const origin = remotes.find((r) => r.name === 'origin');
  if (!origin) {
    await git.addRemote('origin', remoteUrl.trim());
  } else {
    await git.remote(['set-url', 'origin', remoteUrl.trim()]);
  }
  return true;
};

// --- Order Management ---
const loadOrderFile = async (projectPath) => {
  const orderPath = join(projectPath, 'order.json');
  if (!(await fs.pathExists(orderPath))) {
    return { ...defaultOrderFile };
  }
  return await fs.readJson(orderPath);
};

const saveOrderFile = async (projectPath, order) => {
  const orderPath = join(projectPath, 'order.json');
  await fs.writeJson(orderPath, order, { spaces: 2 });
};

const reorderChapters = async (projectPath, chapterIds) => {
  const order = await loadOrderFile(projectPath);
  order.chapters = chapterIds;
  await saveOrderFile(projectPath, order);
  return true;
};

const reorderScenes = async (projectPath, chapterId, sceneIds) => {
  const order = await loadOrderFile(projectPath);
  order.scenes[chapterId] = sceneIds;
  await saveOrderFile(projectPath, order);
  return true;
};

const reorderNotes = async (projectPath, noteIds) => {
  const order = await loadOrderFile(projectPath);
  order.notes = noteIds;
  await saveOrderFile(projectPath, order);
  return true;
};

// --- Advanced Git Operations ---

const checkGitInstalled = async () => {
  try {
    const git = simpleGit();
    const version = await git.version();
    return !!version.installed;
  } catch (e) {
    return false;
  }
};

const cloneProject = async (remoteUrl, targetName) => {
  await ensureBaseDirectory();
  const name = targetName || basename(remoteUrl, '.git');
  const projectPath = join(NOVELIST_ROOT, name);

  if (await fs.pathExists(projectPath)) {
    throw new Error('Directory already exists');
  }

  const git = simpleGit();
  await git.clone(remoteUrl, projectPath);

  // Ensure structure exists after clone (in case it's a raw repo)
  await ensureProjectStructure(projectPath);
  return loadProject(projectPath);
};

const configureGitUser = async (projectPath, username, email) => {
  const git = simpleGit(projectPath);
  await git.addConfig('user.name', username);
  await git.addConfig('user.email', email);
};

const autoSync = async (projectPath) => {
  const git = simpleGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) return false;

  const status = await git.status();
  if (status.files.length > 0) {
    await git.add('./*');
    await git.commit(`Auto-save: ${new Date().toLocaleString()}`);
    try {
      await git.push();
    } catch (e) {
      if (e.message.includes('no upstream branch') || e.message.includes('current branch') && e.message.includes('no upstream')) {
        const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
        await git.push(['--set-upstream', 'origin', branch]);
      } else {
        console.error('Auto-sync push failed:', e);
      }
    }
    return true; // Synced
  }
  return false; // Nothing to sync
};

const getGitStatus = async (projectPath) => {
  const git = simpleGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) return { isRepo: false };

  try {
    const status = await git.status();
    const remotes = await git.getRemotes(true);
    return {
      isRepo: true,
      hasChanges: status.files.length > 0,
      hasRemote: remotes.length > 0,
      remoteUrl: remotes.find(r => r.name === 'origin')?.refs?.fetch || (remotes[0]?.refs?.fetch || '')
    };
  } catch (e) {
    return { isRepo: false, error: e.message };
  }
};

export {
  NOVELIST_ROOT,
  ensureProjectStructure,
  checkAndCreateProject,
  listProjects,
  loadProject,
  saveChapter,
  createChapter,
  createScene,
  saveScene,
  deleteChapter,
  deleteScene,
  listChapters,
  listCharacters,
  saveCharacter,
  deleteCharacter,
  listNotes,
  saveNote,
  deleteNote,
  exportProject,
  initGitRepo,
  commitCurrentChanges,
  pushToRemote,
  pullFromRemote,
  setGitRemote,
  reorderChapters,
  reorderScenes,
  reorderNotes,
  checkGitInstalled,
  cloneProject,
  configureGitUser,
  cloneProject,
  configureGitUser,
  autoSync,
  getGitStatus,
  getProjectsGitStatus
};
