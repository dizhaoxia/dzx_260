const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  openExternal: (filePath) => ipcRenderer.invoke('open-external', filePath),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  onMenuImportPdf: (callback) => {
    ipcRenderer.on('menu-import-pdf', callback)
    return () => ipcRenderer.removeListener('menu-import-pdf', callback)
  },
  onMenuImportMerge: (callback) => {
    ipcRenderer.on('menu-import-merge', callback)
    return () => ipcRenderer.removeListener('menu-import-merge', callback)
  }
})
