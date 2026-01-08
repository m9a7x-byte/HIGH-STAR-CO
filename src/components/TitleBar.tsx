import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import logo from '../assets/logo/voga-logo.svg';

export const TitleBar: React.FC = () => {
    const handleMinimize = () => {
        window.electronAPI?.minimize();
    };

    const handleMaximize = () => {
        window.electronAPI?.maximize();
    };

    const handleClose = () => {
        window.electronAPI?.close();
    };

    // If not running in Electron (no electronAPI exposed), do not render the custom title bar
    if (!window.electronAPI) {
        return null;
    }

    const [version, setVersion] = React.useState<string>('');

    React.useEffect(() => {
        window.electronAPI?.getVersion().then(setVersion);
    }, []);

    return (
        <div className="h-8 bg-slate-900 flex justify-between items-center select-none" style={{ WebkitAppRegion: 'drag' } as any}>
            <div className="flex items-center gap-2 px-3">
                <img src={logo} alt="Voga" className="w-4 h-4" />
                <span className="text-xs text-slate-300 font-medium">
                    <span style={{ color: '#dd5b30', fontFamily: '"Times New Roman", serif', fontWeight: 'bold' }}>VOGA</span>
                    <span className="text-slate-400"> System</span>
                    {version && <span className="text-slate-500 text-[10px] ml-2 font-mono">v{version}</span>}
                </span>
            </div>

            <div className="flex" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <button
                    onClick={handleMinimize}
                    className="h-8 w-10 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-8 w-10 flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                    <Square size={12} />
                </button>
                <button
                    onClick={handleClose}
                    className="h-8 w-10 flex items-center justify-center hover:bg-red-500 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};


