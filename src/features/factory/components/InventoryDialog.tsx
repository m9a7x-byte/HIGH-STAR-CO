import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ModalHeader } from './SharedFactoryComponents';

export function InventoryDialog({ title, busy, onClose, children }: {
    title: string;
    busy: boolean;
    onClose: () => void;
    children: ReactNode;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        element?.querySelector<HTMLElement>('[data-initial-focus]')?.focus({ preventScroll: true });
        return () => element?.close();
    }, []);

    return (
        <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => {
            event.preventDefault();
            if (!busy) onClose();
        }} className="custom-scrollbar m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[1.75rem] bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-[#0e3c63]/45 backdrop:backdrop-blur-sm">
            <ModalHeader title={title} titleId={titleId} busy={busy} onClose={onClose} />
            {children}
        </dialog>
    );
}
