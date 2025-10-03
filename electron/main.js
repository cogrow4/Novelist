import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { checkAndCreateProject, listProjects, loadProject, saveChapter, createChapter, createScene, saveScene, listChapters, listCharacters, saveCharacter, listNotes, saveNote, exportProject, initGitRepo, commitCurrentChanges, ensureProjectStructure, pushToRemote, pullFromRemote, deleteChapter, deleteScene, deleteCharacter, deleteNote } from './project-manager.js';
import Store from 'electron-store';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

let mainWindow;
const store = new Store({ name: 'novelist-preferences' });

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    title: 'Novelist',
    backgroundColor: '#1e1e1e',
    vibrancy: 'under-window',
    trafficLightPosition: { x: 12, y: 16 },
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: true
    }
  });

  const startUrl = join(__dirname, '../renderer/index.html');
  mainWindow.loadFile(startUrl);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  createMenu();
};

const createMenu = () => {
  const recent = (store.get('recentProjects') || []).slice(0, 5);
  const recentItems = recent.length
    ? recent.map((p) => ({
        label: p,
        click: () => mainWindow?.webContents.send('menu:open-recent', p)
      }))
    : [{ label: 'No Recent Projects', enabled: false }];

  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu:new-project')
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:open-project')
        },
        {
          label: 'Open Recent Project',
          submenu: recentItems
        },
        { type: 'separator' },
        {
          label: 'Export Project',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu:export')
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send('menu:toggle-sidebar')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Git',
      submenu: [
        {
          label: 'Commit Changes',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow.webContents.send('menu:git-commit')
        },
        {
          label: 'Initialize Repository',
          click: () => mainWindow.webContents.send('menu:git-init')
        },
        { type: 'separator' },
        {
          label: 'Push',
          click: () => mainWindow.webContents.send('menu:git-push')
        },
        {
          label: 'Pull',
          click: () => mainWindow.webContents.send('menu:git-pull')
        },
        { type: 'separator' },
        {
          label: 'Sign In…',
          click: () => mainWindow.webContents.send('menu:git-sign-in')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Tips & Tutorial',
          click: () => mainWindow.webContents.send('menu:show-tips')
        },
        { type: 'separator' },
        {
          label: 'About Novelist',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Novelist',
              message: 'Novelist',
              detail: 'A distraction-free writing app for novelists.\\nVersion 1.0.0'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('projects:create', async (_event, name) => {
  return checkAndCreateProject(name);
});

ipcMain.handle('projects:list', async () => {
  return listProjects();
});

ipcMain.handle('projects:open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Novelist Project'
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return loadProject(result.filePaths[0]);
});

ipcMain.handle('projects:load', async (_event, projectPath) => {
  return loadProject(projectPath);
});

ipcMain.handle('chapters:list', async (_event, projectPath) => {
  await ensureProjectStructure(projectPath);
  return listChapters(projectPath);
});

ipcMain.handle('chapters:create', async (_event, projectPath, chapterName) => {
  await ensureProjectStructure(projectPath);
  return createChapter(projectPath, chapterName);
});


ipcMain.handle('chapters:save', async (_event, projectPath, chapterId, content) => {
  await ensureProjectStructure(projectPath);
  return saveChapter(projectPath, chapterId, content);
});

ipcMain.handle('chapters:create-scene', async (_event, projectPath, chapterId, sceneName) => {
  await ensureProjectStructure(projectPath);
  return createScene(projectPath, chapterId, sceneName);
});

ipcMain.handle('chapters:save-scene', async (_event, projectPath, chapterId, sceneId, content) => {
  await ensureProjectStructure(projectPath);
  return saveScene(projectPath, chapterId, sceneId, content);
});

ipcMain.handle('chapters:delete', async (_event, projectPath, chapterId) => {
  await ensureProjectStructure(projectPath);
  return deleteChapter(projectPath, chapterId);
});

ipcMain.handle('chapters:delete-scene', async (_event, projectPath, chapterId, sceneId) => {
  await ensureProjectStructure(projectPath);
  return deleteScene(projectPath, chapterId, sceneId);
});


ipcMain.handle('characters:list', async (_event, projectPath) => {
  await ensureProjectStructure(projectPath);
  return listCharacters(projectPath);
});

ipcMain.handle('characters:save', async (_event, projectPath, characterId, content) => {
  await ensureProjectStructure(projectPath);
  return saveCharacter(projectPath, characterId, content);
});

ipcMain.handle('characters:delete', async (_event, projectPath, characterId) => {
  await ensureProjectStructure(projectPath);
  return deleteCharacter(projectPath, characterId);
});


ipcMain.handle('notes:list', async (_event, projectPath) => {
  await ensureProjectStructure(projectPath);
  return listNotes(projectPath);
});

ipcMain.handle('notes:save', async (_event, projectPath, noteId, content) => {
  await ensureProjectStructure(projectPath);
  return saveNote(projectPath, noteId, content);
});

ipcMain.handle('notes:delete', async (_event, projectPath, noteId) => {
  await ensureProjectStructure(projectPath);
  return deleteNote(projectPath, noteId);
});


ipcMain.handle('project:export', async (_event, projectPath) => {
  await ensureProjectStructure(projectPath);
  return exportProject(projectPath);
});

ipcMain.handle('git:init', async (_event, projectPath) => {
  return initGitRepo(projectPath);
});

ipcMain.handle('git:commit', async (_event, projectPath, message) => {
  return commitCurrentChanges(projectPath, message);
});

ipcMain.handle('git:push', async (_event, projectPath) => {
  return pushToRemote(projectPath);
});

ipcMain.handle('git:pull', async (_event, projectPath) => {
  return pullFromRemote(projectPath);
});

ipcMain.handle('preferences:get', () => {
  return store.store;
});

ipcMain.handle('preferences:set', (_event, values) => {
  store.set(values);
  // Rebuild menu to refresh recent projects submenu
  createMenu();
  return store.store;
});
