const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Auto-Update Configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// IMPORTANT: For private repositories, we must add the authorization header
// (Note: In a robust production app, tokens should be managed via a secure server or .env properly injected)
if (process.env.GH_TOKEN) {
    autoUpdater.requestHeaders = { "Authorization": `token ${process.env.GH_TOKEN}` };
}


// Configure update channel based on app name (set in electron-builder config)
const appName = app.getName(); // Will be 'Voga Admin' or 'Voga Agent'
if (appName.includes('Admin')) {
    autoUpdater.channel = 'admin';
    console.log('Update Channel: admin');
} else if (appName.includes('Agent')) {
    autoUpdater.channel = 'agent';
    console.log('Update Channel: agent');
} else {
    // Default fallback
    console.log('Update Channel: default (latest)');
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    let mainWindow: any = null;
    let splashWindow: any = null;

    // --- Auto Updater Events ---
    autoUpdater.on('checking-for-update', () => {
        console.log('[Updater] Checking for update...');
        if (mainWindow) mainWindow.webContents.send('update-status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info: any) => {
        console.log('[Updater] Update available:', info);
        if (mainWindow) mainWindow.webContents.send('update-status', { status: 'available', info });
    });

    autoUpdater.on('update-not-available', (info: any) => {
        console.log('[Updater] Update not available:', info);
        if (mainWindow) mainWindow.webContents.send('update-status', { status: 'not-available', info });
    });

    autoUpdater.on('error', (err: any) => {
        console.error('[Updater] Error:', err);
        if (mainWindow) mainWindow.webContents.send('update-status', { status: 'error', error: err.message });
    });

    autoUpdater.on('download-progress', (progressObj: any) => {
        console.log(`[Updater] Download progress: ${progressObj.percent}%`);
        if (mainWindow) mainWindow.webContents.send('update-status', { status: 'downloading', progress: progressObj });
    });

    autoUpdater.on('update-downloaded', (info: any) => {
        console.log('[Updater] Update downloaded:', info);
        if (mainWindow) mainWindow.webContents.send('update-status', { status: 'downloaded', info });
    });

    // --- IPC Handlers for Updater ---
    ipcMain.handle('check-for-updates', () => {
        autoUpdater.checkForUpdates();
    });

    ipcMain.handle('download-update', () => {
        autoUpdater.downloadUpdate();
    });

    ipcMain.handle('quit-and-install', () => {
        autoUpdater.quitAndInstall();
    });

    // Register IPC handlers ONCE outside of createWindow
    ipcMain.handle('window-minimize', () => {
        if (mainWindow) mainWindow.minimize();
    });

    ipcMain.handle('window-maximize', () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            } else {
                mainWindow.maximize();
            }
        }
    });

    ipcMain.handle('window-close', () => {
        if (mainWindow) mainWindow.close();
    });

    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    function createSplashWindow() {
        const iconPath = path.join(__dirname, 'icon.ico');

        splashWindow = new BrowserWindow({
            width: 400,
            height: 280,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            resizable: false,
            skipTaskbar: true,
            icon: iconPath,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            }
        });

        splashWindow.loadFile(path.join(__dirname, 'splash.html'));
        splashWindow.center();
    }

    function createWindow() {
        const iconPath = path.join(__dirname, 'icon.ico');
        const icon = nativeImage.createFromPath(iconPath);

        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            frame: false,
            show: false,
            backgroundColor: '#0f172a',
            icon: icon,
            webPreferences: {
                preload: path.join(__dirname, 'preload.cjs'),
                nodeIntegration: false,
                contextIsolation: true,
            },
        });

        const isDev = process.env.NODE_ENV === 'development';

        if (isDev) {
            mainWindow.loadURL('http://localhost:3000');
            mainWindow.webContents.openDevTools();
        } else {
            mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        }

        mainWindow.once('ready-to-show', () => {
            setTimeout(() => {
                if (splashWindow) {
                    splashWindow.close();
                    splashWindow = null;
                }
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                    // Check for updates on startup in prod
                    if (!isDev) {
                        autoUpdater.checkForUpdates();
                    }
                }
            }, 2000);
        });

        mainWindow.on('closed', () => {
            mainWindow = null;
        });
    }

    app.whenReady().then(() => {
        createSplashWindow();
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}
