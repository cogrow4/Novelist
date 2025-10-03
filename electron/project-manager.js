import fs from 'fs-extra';
import { join, basename } from 'path';
import os from 'os';
import { nanoid } from 'nanoid';
import simpleGit from 'simple-git';

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
  return chapters.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
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
  return items.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
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
  await writeProjectFile(projectPath, await loadProjectFile(projectPath));
  return true;
};

const deleteScene = async (projectPath, chapterId, sceneId) => {
  if (!chapterId) throw new Error('chapterId is required');
  if (!sceneId) throw new Error('sceneId is required');
  const scenePath = join(projectPath, 'chapters', `${chapterId}-scenes`, `${sceneId}.md`);
  await fs.remove(scenePath);
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
  return notes.sort((a, b) => a.title.localeCompare(b.title));
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
  return { id, path: filePath, category };
};

const deleteNote = async (projectPath, noteId) => {
  if (!noteId) throw new Error('noteId is required');
  const filePath = join(projectPath, 'notes', `${noteId}.md`);
  await fs.remove(filePath);
  return true;
};

const parseNoteCategory = (content) => {
  const match = content.match(/^Category:\s*(.+)$/m);
  return match ? match[1].trim() : 'General';
};

const exportProject = async (projectPath) => {
  await ensureProjectStructure(projectPath);
  const chapters = await listChapters(projectPath);
  const lines = [];
  lines.push(`# ${basename(projectPath)}`);
  lines.push('');
  for (const chapter of chapters) {
    lines.push(chapter.content.trim());
    lines.push('');
    for (const scene of chapter.scenes) {
      lines.push(scene.content.trim());
      lines.push('');
    }
  }
  const exportContent = lines.join('\n');
  const exportPath = join(projectPath, `${basename(projectPath)}-export.md`);
  await fs.writeFile(exportPath, exportContent, 'utf-8');
  return exportPath;
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
  await git.push();
  return true;
};

const pullFromRemote = async (projectPath) => {
  const git = simpleGit(projectPath);
  const isRepo = await git.checkIsRepo();
  if (!isRepo) throw new Error('Project is not a Git repository yet');
  await git.pull();
  return true;
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
  pullFromRemote
};
