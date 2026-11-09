import { useTranslation } from 'react-i18next';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, MoreHorizontal, ChevronDown, Check } from 'lucide-react';

interface PaginationControlProps {
    page: number;
    rowsPerPage: number;
    setPage: (page: number) => void;
    setRowsPerPage: (rows: number) => void;
    totalItems: number;
}

export const PaginationControl = ({ page, rowsPerPage, setPage, setRowsPerPage, totalItems }: PaginationControlProps) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const totalPages = Math.ceil(totalItems / rowsPerPage);

    const updateMenuPosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceAbove = rect.top - 16;
        const spaceBelow = window.innerHeight - rect.bottom - 16;
        const opensAbove = spaceAbove >= 200 || spaceAbove >= spaceBelow;
        setMenuStyle({
            left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
            width: rect.width,
            ...(opensAbove
                ? { bottom: window.innerHeight - rect.top + 8 }
                : { top: rect.bottom + 8 }),
            maxHeight: Math.max(0, opensAbove ? spaceAbove : spaceBelow)
        });
    };

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('scroll', updateMenuPosition, true);
        window.addEventListener('resize', updateMenuPosition);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('scroll', updateMenuPosition, true);
            window.removeEventListener('resize', updateMenuPosition);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen]);

    useEffect(() => {
        if (totalItems === 0) setIsOpen(false);
    }, [totalItems]);

    // توليد أرقام الصفحات للعرض
    const getPageNumbers = () => {
        const pages = [];
        const delta = 1; // عدد الصفحات قبل وبعد الصفحة الحالية

        for (let i = 0; i < totalPages; i++) {
            if (
                i === 0 || // الصفحة الأولى
                i === totalPages - 1 || // الصفحة الأخيرة
                (i >= page - delta && i <= page + delta) // الصفحات القريبة من الحالية
            ) {
                pages.push(i);
            } else if (
                pages[pages.length - 1] !== '...'
            ) {
                pages.push('...');
            }
        }
        return pages;
    };

    if (totalItems === 0) return null;

    return (
        <div className="p-5 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50 backdrop-blur-sm">
            <div className="flex items-center gap-4 text-xs font-black text-gray-400 uppercase tracking-widest">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                    <span className="hidden sm:inline">{t('pagination.show')}</span>
                    <div className="relative">
                        <button
                            ref={triggerRef}
                            type="button"
                            aria-expanded={isOpen}
                            onClick={() => { updateMenuPosition(); setIsOpen(!isOpen); }}
                            className={`min-w-[120px] h-10 flex items-center justify-between px-4 bg-white border-2 rounded-xl transition-all duration-300 ${isOpen ? 'border-[#0e3c63] ring-4 ring-blue-50/50 shadow-lg' : 'border-gray-200 hover:border-blue-300'}`}
                        >
                            <span className="text-[#0e3c63] font-black">{rowsPerPage} {t('pagination.rows')}</span>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isOpen && createPortal(
                            <>
                                <div className="fixed inset-0 z-[1000]" onClick={() => setIsOpen(false)}></div>
                                <div style={menuStyle} className="fixed bg-white rounded-xl shadow-xl border border-gray-100 z-[1001] overflow-y-auto animate-fade-in">
                                    {[10, 25, 50, 100].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => { setRowsPerPage(val); setPage(0); setIsOpen(false); }}
                                            className={`w-full text-right px-4 py-3 text-xs font-black flex justify-between items-center transition-all ${rowsPerPage === val
                                                ? 'bg-[#0e3c63] text-white'
                                                : 'hover:bg-blue-50 text-gray-600 hover:text-[#0e3c63]'
                                                }`}
                                        >
                                            {val} {t('pagination.rows')}
                                            {rowsPerPage === val && <Check size={14} />}
                                        </button>
                                    ))}
                                </div>
                            </>,
                            document.body
                        )}
                    </div>
                </div>
                <span className="hidden md:inline">
                    {t('pagination.total_results')} <span className="text-gray-700">{totalItems}</span>
                </span>
            </div>

            <div className="flex items-center gap-1.5">
                {/* زر الصفحة السابقة */}
                <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="p-2 hover:bg-[#0e3c63] hover:text-white rounded-xl disabled:opacity-20 transition-all border border-transparent disabled:hover:bg-transparent disabled:hover:text-gray-400"
                >
                    <ChevronRight size={18} />
                </button>

                {/* أرقام الصفحات */}
                <div className="flex items-center gap-1">
                    {getPageNumbers().map((p, idx) => (
                        p === '...' ? (
                            <div key={`dots-${idx}`} className="w-9 h-9 flex items-center justify-center text-gray-300">
                                <MoreHorizontal size={14} />
                            </div>
                        ) : (
                            <button
                                key={p}
                                onClick={() => setPage(Number(p))}
                                className={`w-9 h-9 rounded-xl text-xs font-black transition-all border ${page === p
                                    ? 'bg-[#0e3c63] text-white border-[#0e3c63] shadow-lg scale-110'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-[#0e3c63]'
                                    }`}
                            >
                                {Number(p) + 1}
                            </button>
                        )
                    ))}
                </div>

                {/* زر الصفحة التالية */}
                <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-2 hover:bg-[#0e3c63] hover:text-white rounded-xl disabled:opacity-20 transition-all border border-transparent disabled:hover:bg-transparent disabled:hover:text-gray-400"
                >
                    <ChevronLeft size={18} />
                </button>
            </div>
        </div>
    );
};
