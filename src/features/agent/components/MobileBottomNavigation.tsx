import React from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const items = [
        { id: 'catalog' as const, label: t('agent_dashboard.mobile_products'), icon: Package, visible: true },
        { id: 'cart' as const, label: t('agent_dashboard.cart'), icon: ShoppingCart, visible: true },
        { id: 'history' as const, label: t('agent_dashboard.mobile_orders'), icon: FileText, visible: canShowHistory },
        { id: 'queue' as const, label: t('agent_dashboard.mobile_production'), icon: Truck, visible: canShowQueue },
        { id: 'finance' as const, label: t('agent_dashboard.mobile_account'), icon: Wallet, visible: canShowFinance },
    ].filter(item => item.visible);
    return <nav aria-label={t('agent_dashboard.mobile_navigation')} className="fixed inset-x-0 bottom-0 z-40 lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(14,60,99,0.08)] print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-xl gap-0.5 px-2 py-1.5">
            {items.map(item => {
                const active = activeItem === item.id;
                return <button key={item.id} type="button" aria-current={active ? 'page' : undefined} aria-label={item.id === 'cart' ? t('agent_dashboard.mobile_cart_count', { total: cartCount }) : item.label} onClick={() => onNavigate(item.id)} className={`relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[11px] font-bold focus-visible:outline-2 focus-visible:outline-[#0e3c63] ${active ? 'bg-blue-50 text-[#0e3c63]' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <span className="relative" aria-hidden="true"><item.icon size={21} strokeWidth={active ? 2.4 : 1.8} />{item.id === 'cart' && cartCount > 0 && <span className="absolute -top-1.5 -end-3 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] leading-4 font-bold text-white tabular-nums">{cartCount > 99 ? '99+' : cartCount}</span>}</span>
                    <span>{item.label}</span>
                </button>;
            })}
        </div>
    </nav>;
};
