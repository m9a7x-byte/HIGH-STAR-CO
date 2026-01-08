const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),
    // Auto Update Methods
    onUpdateStatus: (callback: any) => ipcRenderer.on('update-status', (_event: any, value: any) => callback(value)),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
    getVersion: () => ipcRenderer.invoke('get-app-version')
});
