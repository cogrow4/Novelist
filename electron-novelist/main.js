const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { marked } = require('marked');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#221a0f',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 10, y: 10 }
  });

  mainWindow.loadFile('index.html');
  
  // Create menu
  createMenu();
  
  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project...',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new-project')
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-open-project')
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-save')
        },
        { type: 'separator' },
        {
          label: 'Export Book...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu-export')
        },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow.webContents.send('menu-settings')
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
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find...',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('menu-find')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Preview',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.send('menu-toggle-preview')
        },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send('menu-toggle-sidebar')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    },
    {
      label: 'Git',
      submenu: [
        {
          label: 'Initialize Repository',
          click: () => mainWindow.webContents.send('menu-git-init')
        },
        {
          label: 'Stage All Changes',
          click: () => mainWindow.webContents.send('menu-git-add')
        },
        {
          label: 'Commit...',
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow.webContents.send('menu-git-commit')
        },
        { type: 'separator' },
        {
          label: 'Push',
          click: () => mainWindow.webContents.send('menu-git-push')
        },
        {
          label: 'Pull',
          click: () => mainWindow.webContents.send('menu-git-pull')
        },
        { type: 'separator' },
        {
          label: 'Status',
          click: () => mainWindow.webContents.send('menu-git-status')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => mainWindow.webContents.send('menu-help')
        },
        { type: 'separator' },
        {
          label: 'About Novelist',
          click: () => mainWindow.webContents.send('menu-about')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers for file operations
ipcMain.handle('read-file', async (event, filepath) => {
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filepath, content) => {
  try {
    await fs.writeFile(filepath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-directory', async (event, dirpath) => {
  try {
    const entries = await fs.readdir(dirpath, { withFileTypes: true });
    const items = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.join(dirpath, entry.name)
    }));
    return { success: true, items };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-directory', async (event, dirpath) => {
  try {
    await fs.mkdir(dirpath, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-file', async (event, filepath) => {
  try {
    await fs.unlink(filepath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('render-markdown', async (event, markdown) => {
  try {
    const html = marked(markdown);
    return { success: true, html };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// Git operations
ipcMain.handle('git-init', async (event, projectPath) => {
  try {
    await execPromise('git init', { cwd: projectPath });
    return { success: true, message: 'Git repository initialized' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-add', async (event, projectPath) => {
  try {
    await execPromise('git add -A', { cwd: projectPath });
    return { success: true, message: 'All changes staged' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-commit', async (event, projectPath, message) => {
  try {
    await execPromise(`git commit -m "${message}"`, { cwd: projectPath });
    return { success: true, message: 'Changes committed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-push', async (event, projectPath) => {
  try {
    const { stdout, stderr } = await execPromise('git push', { cwd: projectPath });
    return { success: true, message: stdout || 'Pushed to remote', stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-pull', async (event, projectPath) => {
  try {
    const { stdout, stderr } = await execPromise('git pull', { cwd: projectPath });
    return { success: true, message: stdout || 'Pulled from remote', stderr };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('git-status', async (event, projectPath) => {
  try {
    const { stdout } = await execPromise('git status', { cwd: projectPath });
    return { success: true, status: stdout };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Prompt dialog
ipcMain.handle('show-prompt', async (event, options) => {
  // Since Electron doesn't have a built-in prompt, we'll use dialog with input
  return { value: null, canceled: false }; // Will be handled in renderer
});
