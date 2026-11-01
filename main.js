const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;
const cfgPath = () => path.join(app.getPath('userData'), 'nzi-config.json');

function readCfg() {
  try { return JSON.parse(fs.readFileSync(cfgPath(), 'utf8')); } catch (e) { return {}; }
}
function writeCfg(c) {
  try { fs.writeFileSync(cfgPath(), JSON.stringify(c)); } catch (e) { }
}
function recoveryFolder() {
  const c = readCfg();
  const dir = c.folder || path.join(app.getPath('documents'), 'NZI_Backup');
  try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { }
  return dir;
}

ipcMain.on('nzi:folder', (e) => { e.returnValue = recoveryFolder(); });
ipcMain.on('nzi:choose', (e) => {
  try {
    const r = dialog.showOpenDialogSync(win, {
      title: 'Select Recovery Folder',
      properties: ['openDirectory', 'createDirectory']
    });
    if (r && r[0]) {
      const c = readCfg(); c.folder = r[0]; writeCfg(c);
      e.returnValue = true;
    } else { e.returnValue = false; }
  } catch (err) { e.returnValue = false; }
});

function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1366, height: 800, show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.maximize();
  win.show();
  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
