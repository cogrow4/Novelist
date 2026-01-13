const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('novelist', {
  projects: {
    create: (name) => invoke('projects:create', name),
    list: () => invoke('projects:list'),
    openDialog: () => invoke('projects:open-dialog'),
    clone: (remoteUrl) => invoke('projects:clone', remoteUrl),
    load: (projectPath) => invoke('projects:load', projectPath)
  },
  chapters: {
    list: (projectPath) => invoke('chapters:list', projectPath),
    create: (projectPath, name) => invoke('chapters:create', projectPath, name),
    save: (projectPath, chapterId, payload) => invoke('chapters:save', projectPath, chapterId, payload),
    createScene: (projectPath, chapterId, sceneName) => invoke('chapters:create-scene', projectPath, chapterId, sceneName),
    saveScene: (projectPath, chapterId, sceneId, payload) => invoke('chapters:save-scene', projectPath, chapterId, sceneId, payload),
    delete: (projectPath, chapterId) => invoke('chapters:delete', projectPath, chapterId),
    deleteScene: (projectPath, chapterId, sceneId) => invoke('chapters:delete-scene', projectPath, chapterId, sceneId),
    reorder: (projectPath, chapterIds) => invoke('chapters:reorder', projectPath, chapterIds),
    reorderScenes: (projectPath, chapterId, sceneIds) => invoke('scenes:reorder', projectPath, chapterId, sceneIds)
  },
  characters: {
    list: (projectPath) => invoke('characters:list', projectPath),
    save: (projectPath, characterId, payload) => invoke('characters:save', projectPath, characterId, payload),
    delete: (projectPath, characterId) => invoke('characters:delete', projectPath, characterId)
  },
  notes: {
    list: (projectPath) => invoke('notes:list', projectPath),
    save: (projectPath, noteId, payload) => invoke('notes:save', projectPath, noteId, payload),
    delete: (projectPath, noteId) => invoke('notes:delete', projectPath, noteId),
    reorder: (projectPath, noteIds) => invoke('notes:reorder', projectPath, noteIds)
  },
  exports: {
    project: (projectPath) => invoke('project:export', projectPath)
  },
  git: {
    init: (projectPath) => invoke('git:init', projectPath),
    commit: (projectPath, message) => invoke('git:commit', projectPath, message),
    push: (projectPath) => invoke('git:push', projectPath),
    pull: (projectPath) => invoke('git:pull', projectPath),
    setRemote: (projectPath, remoteUrl) => invoke('git:set-remote', projectPath, remoteUrl),
    checkInstalled: () => invoke('git:check-installed'),
    configureUser: (projectPath, username, email) => invoke('git:configure-user', projectPath, username, email),
    autoSync: (projectPath) => invoke('git:auto-sync', projectPath),
    status: (projectPath) => invoke('git:status', projectPath)
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
      'menu:open-recent',
      'menu:find',
      'menu:replace',
      'menu:export',
      'menu:settings',
      'menu:toggle-sidebar',
      'menu:git-commit',
      'menu:git-clone',
      'menu:git-init',
      'menu:git-push',
      'menu:git-pull',
      'menu:git-set-remote',
      'menu:git-wizard',
      'menu:show-tips'
    ]);
    if (!allowed.has(channel)) return;
    ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  }
});
