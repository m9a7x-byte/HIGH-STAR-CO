import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

export const factoryFieldLabel = 'block text-xs font-bold text-slate-600';
export const factoryFieldInput = 'min-h-12 w-full min-w-0 rounded-2xl border-2 border-gray-100 bg-white px-4 text-base font-semibold text-slate-800 outline-none transition-colors placeholder:text-slate-400 hover:border-blue-200 focus:border-[#0e3c63] focus:ring-4 focus:ring-blue-50';

interface FactoryFieldPopoverProps {
    label: string;
    value?: string;
    placeholder: string;
    icon?: LucideIcon;
    disabled?: boolean;
    panelWidth?: number;
    panelHeight?: number;
    onOpen?: () => void;
    children: (close: () => void) => ReactNode;
}

export function FactoryFieldPopover({
    label, value, placeholder, icon: Icon, disabled, panelWidth, panelHeight = 310, onOpen, children,
}: FactoryFieldPopoverProps) {
    const id = useId();
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [hasNativePopover] = useState(() => typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype);

    const position = () => {
        if (!trigger.current || !panel.current) return;
        const bounds = trigger.current.getBoundingClientRect();
        const viewport = window.visualViewport;
        const viewportLeft = viewport?.offsetLeft ?? 0;
        const viewportTop = viewport?.offsetTop ?? 0;
        const viewportWidth = viewport?.width ?? document.documentElement.clientWidth;
        const viewportHeight = viewport?.height ?? window.innerHeight;
        const gap = 8;
        const width = Math.min(panelWidth ?? bounds.width, viewportWidth - 2 * gap);
        const start = getComputedStyle(trigger.current).direction === 'rtl' ? bounds.right - width : bounds.left;
        const left = Math.min(Math.max(start, viewportLeft + gap), viewportLeft + viewportWidth - width - gap);
        const above = bounds.top - viewportTop - 2 * gap;
        const below = viewportTop + viewportHeight - bounds.bottom - 2 * gap;
        const openBelow = below >= panelHeight || below >= above;

        Object.assign(panel.current.style, {
            width: `${width}px`,
            left: `${left}px`,
            top: openBelow ? `${bounds.bottom + gap}px` : 'auto',
            bottom: openBelow ? 'auto' : `${window.innerHeight - bounds.top + gap}px`,
            maxHeight: `${Math.max(0, Math.min(panelHeight, openBelow ? below : above))}px`,
        });
    };

    useEffect(() => {
        const element = panel.current;
        if (!hasNativePopover || !element) return;
        const handleToggle = (event: Event) => setOpen((event as ToggleEvent).newState === 'open');
        element.addEventListener('toggle', handleToggle);
        return () => element.removeEventListener('toggle', handleToggle);
    }, [hasNativePopover]);

    useEffect(() => {
        if (!open) return;
        position();
        const dismiss = (event: PointerEvent) => {
            if (!trigger.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false);
        };
        window.addEventListener('resize', position);
        window.addEventListener('scroll', position, true);
        window.visualViewport?.addEventListener('resize', position);
        window.visualViewport?.addEventListener('scroll', position);
        if (!hasNativePopover) document.addEventListener('pointerdown', dismiss);
        return () => {
            window.removeEventListener('resize', position);
            window.removeEventListener('scroll', position, true);
            window.visualViewport?.removeEventListener('resize', position);
            window.visualViewport?.removeEventListener('scroll', position);
            if (!hasNativePopover) document.removeEventListener('pointerdown', dismiss);
        };
    }, [open, hasNativePopover, panelWidth, panelHeight]);

    const close = () => {
        if (hasNativePopover) panel.current?.hidePopover();
        else setOpen(false);
        trigger.current?.focus({ preventScroll: true });
    };

    return (
        <div className="min-w-0 w-full" onKeyDown={event => {
            if (event.key !== 'Escape' || !open) return;
            event.preventDefault();
            event.stopPropagation();
            close();
        }}>
            <span id={id + '-label'} className={factoryFieldLabel + ' mb-2'}>{label}</span>
            <button ref={trigger} type="button" disabled={disabled} aria-labelledby={`${id}-label ${id}-value`}
                aria-expanded={open} aria-controls={id} popoverTarget={hasNativePopover ? id : undefined}
                onClick={() => {
                    if (!open) {
                        onOpen?.();
                        position();
                    }
                    if (!hasNativePopover) setOpen(!open);
                }}
                className={factoryFieldInput + ' flex items-center justify-between gap-2 py-2 text-start text-sm disabled:cursor-not-allowed disabled:bg-slate-50 aria-expanded:border-[#0e3c63] aria-expanded:ring-4 aria-expanded:ring-blue-50'}>
                {Icon && <Icon size={18} className="shrink-0 text-[#0e3c63]" aria-hidden />}
                <span id={id + '-value'} className={'flex-1 [overflow-wrap:anywhere] ' + (value ? '' : 'text-slate-500')}>{value || placeholder}</span>
                <ChevronDown size={17} className={'shrink-0 text-slate-500 transition-transform ' + (open ? 'rotate-180' : '')} aria-hidden />
            </button>
            <div id={id} ref={panel} popover={hasNativePopover ? 'auto' : undefined} hidden={!hasNativePopover && !open}
                aria-labelledby={id + '-label'} role="group"
                className="custom-scrollbar fixed inset-auto z-[1000] m-0 overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-xl">
                {children(close)}
            </div>
        </div>
    );
}
