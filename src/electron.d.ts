export { };

declare global {
    interface Window {
        electronAPI: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
            onUpdateStatus: (callback: (status: any) => void) => void;
            downloadUpdate: () => void;
            quitAndInstall: () => void;
            getVersion: () => Promise<string>;
        };
    }
}
