import React from 'react';
import { Package, ShoppingCart, FileText, Truck, Wallet } from 'lucide-react';

export type AgentNavItem = 'catalog' | 'cart' | 'history' | 'queue' | 'finance';
interface MobileBottomNavigationProps {
    activeItem: string;
    cartCount: number;
    canShowHistory: boolean;
    canShowQueue: boolean;
    canShowFinance: boolean;
    onNavigate: (item: AgentNavItem) => void;
}

export const MobileBottomNavigation = ({ activeItem, cartCount, canShowHistory, canShowQueue, canShowFinance, onNavigate }: MobileBottomNavigationProps) => {
    const items = [
        { id: 'catalog' as const, label: 'المنتجات', icon: Package, visible: true },
        { id: 'cart' as const, label: 'السلة', icon: ShoppingCart, visible: true },
        { id: 'history' as const, label: 'طلباتي', icon: FileText, visible: canShowHistory },
        { id: 'queue' as const, label: 'الإنتاج', icon: Truck, visible: canShowQueue },
        { id: 'finance' as const, label: 'حسابي', icon: Wallet, visible: canShowFinance },
    ].filter(item => item.visible);
    return <nav aria-label="تنقل الوكيل" dir="rtl" className="fixed inset-x-0 bottom-0 z-40 lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(14,60,99,0.08)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-xl px-2 py-2 gap-1">
            {items.map(item => {
                const active = activeItem === item.id;
                return <button key={item.id} type="button" aria-current={active ? 'page' : undefined} aria-label={item.id === 'cart' ? `السلة، ${cartCount} أصناف` : item.label} onClick={() => onNavigate(item.id)} className={`relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold transition-colors ${active ? 'bg-blue-50 text-[#0e3c63]' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <span className="relative"><item.icon size={21} strokeWidth={active ? 2.4 : 1.8} />{item.id === 'cart' && cartCount > 0 && <span className="absolute -top-2 -right-3 min-w-4 rounded-full bg-red-500 px-1 text-[9px] leading-4 font-bold text-white">{cartCount > 99 ? '99+' : cartCount}</span>}</span>
                    <span>{item.label}</span>
                </button>;
            })}
        </div>
    </nav>;
};
