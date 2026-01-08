
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    className?: string; // To allow passing custom classes (like scrollbar-hide)
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children, className = '' }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPulling, setIsPulling] = useState(false);
    const [pullHeight, setPullHeight] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const startY = useRef(0);

    // Minimal pull distance to trigger refresh
    const TRIGGER_THRESHOLD = 80;
    // Maximum visual pull distance
    const MAX_PULL = 120;

    const handleTouchStart = (e: React.TouchEvent) => {
        if (containerRef.current?.scrollTop === 0 && !isLoading) {
            startY.current = e.touches[0].clientY;
            // We don't set isPulling yet, only if we move enough
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isLoading) return;

        // Check if we are at the top
        if (containerRef.current && containerRef.current.scrollTop <= 0) {
            const currentY = e.touches[0].clientY;
            const diff = currentY - startY.current;

            if (diff > 0) {
                // Pulling down
                // Apply resistance
                const newHeight = Math.min(diff * 0.4, MAX_PULL);
                setPullHeight(newHeight);

                if (newHeight > 10) {
                    setIsPulling(true);
                    // Prevent default to stop browser overscroll effects
                    if (e.cancelable) e.preventDefault();
                }
            }
        }
    };

    const handleTouchEnd = async () => {
        if (!isPulling || isLoading) return;

        if (pullHeight > TRIGGER_THRESHOLD) {
            // Trigger Refresh
            setIsLoading(true);
            setPullHeight(60); // Snap to loading position

            try {
                await onRefresh();
            } finally {
                setIsLoading(false);
                setPullHeight(0);
                setIsPulling(false);
            }
        } else {
            // Return to 0
            setPullHeight(0);
            setIsPulling(false);
        }
    };

    // Mouse Wheel Support (for Desktop 'Pull' feel if they have efficient trackpads)
    const [offsetY, setOffsetY] = useState(0);

    // Note: Standard 'wheel' event doesn't easily map to 'pull' on all devices without potential bugs.
    // For this implementation, we focused on touch. 
    // If the user wants desktop mouse pull, it's usually via trackpad 'wheel' with negative deltaY at scrollTop 0.

    const handleWheel = (e: React.WheelEvent) => {
        // Simple implementation for trackpad overscroll
        if (isLoading) return;

        if (containerRef.current && containerRef.current.scrollTop <= 0) {
            if (e.deltaY < 0) {
                // Scrolling UP (pulling down)
                // This is tricky because wheel events are continuous.
                // We can't easily blocking scroll chaining.
            }
        }
    };

    return (
        <div
            ref={containerRef}
            className={`relative h-full overflow-y-auto ${className}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        // onWheel={handleWheel} // Disabled for now to prevent interference with normal scroll
        >
            {/* Loading Indicator / Pull Area */}
            <div
                className="absolute top-0 left-0 w-full flex items-center justify-center p-4 transition-all duration-200 pointer-events-none z-10"
                style={{
                    height: `${pullHeight}px`,
                    opacity: pullHeight > 0 ? 1 : 0,
                    transform: `translateY(${pullHeight > 0 ? 0 : -100}%)`
                }}
            >
                <div className={`p-2 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center ${isLoading ? 'animate-spin' : ''} ${pullHeight > TRIGGER_THRESHOLD ? 'text-sky-500' : 'text-slate-400'}`}>
                    <Loader2 size={20} className={isLoading ? 'animate-spin' : (pullHeight > TRIGGER_THRESHOLD ? 'rotate-180 transition-transform duration-300' : 'transition-transform duration-300')} />
                </div>
            </div>

            {/* Content pushes down */}
            <div
                style={{
                    transform: `translateY(${pullHeight}px)`,
                    transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {children}
            </div>
        </div>
    );
};
