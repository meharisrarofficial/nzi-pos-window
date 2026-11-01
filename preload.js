const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const FILE = 'NZI_Live_Recovery.json';
const TMP = 'NZI_Live_Recovery.json.tmp';
let fd = null;
let dir = null;

function today() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/* One dated copy per day (refreshed at most every 30 minutes), keeps the newest 30 */
function dailyCopy(folder) {
  try {
    const dd = path.join(folder, 'Daily_Backups');
    fs.mkdirSync(dd, { recursive: true });
    const dest = path.join(dd, 'NZI_AUTO_BACKUP_' + today() + '.json');
    let need = true;
    try { need = (Date.now() - fs.statSync(dest).mtimeMs) > 30 * 60 * 1000; } catch (e) { }
    if (need) {
      fs.copyFileSync(path.join(folder, FILE), dest + '.tmp');
      fs.renameSync(dest + '.tmp', dest);
    }
    const names = fs.readdirSync(dd).filter(n => /^NZI_AUTO_BACKUP_\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
    names.slice(0, Math.max(0, names.length - 30)).forEach(n => { try { fs.unlinkSync(path.join(dd, n)); } catch (e) { } });
  } catch (e) { }
}

function closeFd() {
  if (fd !== null) { try { fs.closeSync(fd); } catch (e) { } fd = null; }
}

contextBridge.exposeInMainWorld('NZIStorage', {
  chooseRecoveryFolder: () => ipcRenderer.sendSync('nzi:choose') === true,

  beginRecoveryWrite: () => {
    try {
      closeFd();
      dir = ipcRenderer.sendSync('nzi:folder');
      fs.mkdirSync(dir, { recursive: true });
      fd = fs.openSync(path.join(dir, TMP), 'w');
      return true;
    } catch (e) { fd = null; return false; }
  },

  appendRecoveryChunk: (s) => {
    try { if (fd === null) return false; fs.writeSync(fd, s); return true; }
    catch (e) { return false; }
  },

  endRecoveryWrite: () => {
    try {
      if (fd === null) return false;
      try { fs.fsyncSync(fd); } catch (e) { }
      closeFd();
      fs.renameSync(path.join(dir, TMP), path.join(dir, FILE));
      dailyCopy(dir);
      return true;
    } catch (e) { closeFd(); return false; }
  },

  abortRecoveryWrite: () => {
    closeFd();
    try { if (dir) fs.unlinkSync(path.join(dir, TMP)); } catch (e) { }
  },

  writeRecoveryFile: (json) => {
    try {
      const d = ipcRenderer.sendSync('nzi:folder');
      fs.mkdirSync(d, { recursive: true });
      fs.writeFileSync(path.join(d, TMP), json);
      fs.renameSync(path.join(d, TMP), path.join(d, FILE));
      dailyCopy(d);
      return true;
    } catch (e) { return false; }
  },

  readRecoveryFile: () => {
    try {
      const d = ipcRenderer.sendSync('nzi:folder');
      return fs.readFileSync(path.join(d, FILE), 'utf8');
    } catch (e) { return ''; }
  }
});
