import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export const Tooltip = ({ children, content, side = 'top' }: { children: React.ReactNode, content: string, side?: 'top' | 'bottom' | 'left' | 'right' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Basic positioning logic
            let top = 0;
            let left = 0;
            const gap = 8; // space between trigger and tooltip

            // We need to assume the tooltip height/width approximately or measure it. 
            // For simplicity in this fix, we'll estimate or center generic logic. 
            // Better to measure after render, but let's try simple calculation first.

            if (side === 'top') {
                top = rect.top - gap;
                left = rect.left + rect.width / 2;
            } else if (side === 'bottom') {
                top = rect.bottom + gap;
                left = rect.left + rect.width / 2;
            } else if (side === 'left') {
                top = rect.top + rect.height / 2;
                left = rect.left - gap;
            } else if (side === 'right') {
                top = rect.top + rect.height / 2;
                left = rect.right + gap;
            }

            setCoords({ top, left });
        }
    };

    const handleMouseEnter = () => {
        updatePosition();
        setIsVisible(true);
    };

    // Recalculate on scroll/resize if visible
    useEffect(() => {
        if (isVisible) {
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isVisible]);

    return (
        <>
            <div
                ref={triggerRef}
                className="inline-flex"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>
            {isVisible && createPortal(
                <div
                    className="fixed z-[99999] pointer-events-none transition-opacity duration-200"
                    style={{
                        top: coords.top,
                        left: coords.left,
                        transform:
                            side === 'top' ? 'translate(-50%, -100%)' :
                                side === 'bottom' ? 'translate(-50%, 0)' :
                                    side === 'left' ? 'translate(-100%, -50%)' :
                                        'translate(0, -50%)'
                    }}
                >
                    <div className="bg-[#0e3c63] text-white text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap shadow-xl relative">
                        {content}
                        <div className={`absolute w-2 h-2 bg-[#0e3c63] transform rotate-45 
                            ${side === 'top' ? 'top-full left-1/2 -ml-1 -mt-1' : ''}
                            ${side === 'bottom' ? 'bottom-full left-1/2 -ml-1 -mb-1' : ''}
                            ${side === 'left' ? 'left-full top-1/2 -mt-1 -ml-1' : ''}
                            ${side === 'right' ? 'right-full top-1/2 -mt-1 -mr-1' : ''}
                        `}></div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
