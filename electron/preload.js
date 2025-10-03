const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('novelist', {
  projects: {
    create: (name) => invoke('projects:create', name),
    list: () => invoke('projects:list'),
    openDialog: () => invoke('projects:open-dialog'),
    load: (projectPath) => invoke('projects:load', projectPath)
  },
  chapters: {
    list: (projectPath) => invoke('chapters:list', projectPath),
    create: (projectPath, name) => invoke('chapters:create', projectPath, name),
    save: (projectPath, chapterId, payload) => invoke('chapters:save', projectPath, chapterId, payload),
    createScene: (projectPath, chapterId, sceneName) => invoke('chapters:create-scene', projectPath, chapterId, sceneName),
    saveScene: (projectPath, chapterId, sceneId, payload) => invoke('chapters:save-scene', projectPath, chapterId, sceneId, payload)
  },
  characters: {
    list: (projectPath) => invoke('characters:list', projectPath),
    save: (projectPath, characterId, payload) => invoke('characters:save', projectPath, characterId, payload)
  },
  notes: {
    list: (projectPath) => invoke('notes:list', projectPath),
    save: (projectPath, noteId, payload) => invoke('notes:save', projectPath, noteId, payload)
  },
  exports: {
    project: (projectPath) => invoke('project:export', projectPath)
  },
  git: {
    init: (projectPath) => invoke('git:init', projectPath),
    commit: (projectPath, message) => invoke('git:commit', projectPath, message),
    push: (projectPath) => invoke('git:push', projectPath),
    pull: (projectPath) => invoke('git:pull', projectPath)
  },
  preferences: {
    get: () => invoke('preferences:get'),
    set: (values) => invoke('preferences:set', values)
  }
});

// Expose a simple menu event bridge
contextBridge.exposeInMainWorld('appMenu', {
  on: (channel, callback) => {
    // Only allow known menu channels for safety
    const allowed = new Set([
      'menu:new-project',
      'menu:open-project',
      'menu:export',
      'menu:toggle-sidebar',
      'menu:git-commit',
      'menu:git-init',
      'menu:git-push',
      'menu:git-pull',
      'menu:git-sign-in',
      'menu:show-tips'
    ]);
    if (!allowed.has(channel)) return;
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  }
});
