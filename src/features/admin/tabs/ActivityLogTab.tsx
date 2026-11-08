import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Clock, Check, Layers, Search, History, ExternalLink, ChevronDown, Eye, User, FileText, ArrowLeftRight, ArrowRight, CornerDownLeft, Activity } from 'lucide-react';
import { Badge, DateRangePicker, UserAvatar } from '../../../components/ui';
import { UserSelector } from '../../../components/shared/UserSelector';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { db } from '../../../lib/db';
import { LogContext, User as UserType, UserRole } from '../../../types';
import { formatDate, formatTime } from '../../../lib/dateUtils';

// FIX: Added 'SAFE' to the context mapping to fix missing property
// Removed external getContextLabel to avoid reactive translation issues

interface ActivityLogTabProps {
    employees: UserType[];
    agents: UserType[];
    onNavigateUser?: (user: UserType) => void;
    onNavigateOrder?: (orderId: number) => void;
}

export const ActivityLogTab: React.FC<ActivityLogTabProps> = ({ employees, agents, onNavigateUser, onNavigateOrder }) => {
    const { t } = useTranslation();

    const getContextLabel = (context: string): string => {
        const map: Record<string, string> = {
            ORDERS: t('activity.orders'),
            PRODUCTION: t('activity.production'),
            CATALOG: t('activity.catalog'),
            AGENTS: t('activity.agents'),
            STAFF: t('activity.staff'),
            FINANCE: t('activity.finance'),
            SYSTEM: t('activity.system'),
            AUTH: t('activity.auth'),
            FACTORY: t('activity.factory'),
            SAFE: t('activity.safe'),
            INVENTORY: t('activity.inventory'),
            EXPENSES: t('activity.expenses'),
            SUPPLIERS: t('activity.suppliers'),
            LOGISTICS: t('activity.logistics')
        };
        return map[context] || context;
    };

    // Translate DB-stored Arabic action strings to current language
    const translateAction = (action: string): string => {
        const actionMap: Record<string, string> = {
            'تسجيل دخول': t('actions.login'),
            'تسجيل خروج': t('actions.logout'),
            'إنشاء طلب': t('actions.create_order'),
            'تعديل طلب': t('actions.edit_order'),
            'تحديث حالة': t('actions.update_status'),
            'تعديل الإعدادات': t('actions.edit_settings'),
            'تحديث بيانات دخول': t('actions.update_credentials'),
            'تحديث بروفايل': t('actions.update_profile'),
            'إضافة مورد': t('actions.add_supplier'),
            'تعديل مورد': t('actions.edit_supplier'),
            'حذف مورد': t('actions.delete_supplier'),
            'إضافة حركة': t('actions.add_transaction'),
            'تعديل حركة': t('actions.edit_transaction'),
            'حذف حركة': t('actions.delete_transaction'),
            'قفل حركة': t('actions.lock_transaction'),
            'إضافة موظف': t('actions.add_staff'),
            'تعديل وكيل': t('actions.edit_agent'),
            'تعديل رصيد': t('actions.edit_balance'),
        };
        return actionMap[action] || action;
    };
    const [logPage, setLogPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    const [logUserCategory, setLogUserCategory] = useState<'ALL' | 'STAFF' | 'AGENT'>('ALL');
    const [logFilterUser, setLogFilterUser] = useState<'ALL' | number>('ALL');
    const [logFilterContext, setLogFilterContext] = useState<'ALL' | LogContext>('ALL');
    const [logFromDate, setLogFromDate] = useState('');
    const [logToDate, setLogToDate] = useState('');

    const [isContextOpen, setIsContextOpen] = useState(false);
    const contextRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsLoadingLogs(true);
        const timer = setTimeout(() => setIsLoadingLogs(false), 400);
        return () => clearTimeout(timer);
    }, [logPage, rowsPerPage, logFilterUser, logFilterContext, logFromDate, logToDate, logUserCategory]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (contextRef.current && !contextRef.current.contains(event.target as Node)) {
                setIsContextOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const contextOptions: LogContext[] = ['ORDERS', 'PRODUCTION', 'CATALOG', 'AGENTS', 'STAFF', 'FINANCE', 'AUTH', 'SYSTEM', 'FACTORY'];

    const allFilteredLogs = useMemo(() => {
        let logs = db.getLogs(logFilterUser, logFilterContext, logFromDate, logToDate);
        if (logFilterUser === 'ALL' && logUserCategory !== 'ALL') {
            logs = logs.filter(log => {
                const logUser = [...employees, ...agents].find(u => u.id === log.userId);
                if (!logUser) return false;
                if (logUserCategory === 'STAFF') return logUser.role !== UserRole.AGENT;
                if (logUserCategory === 'AGENT') return logUser.role === UserRole.AGENT;
                return true;
            });
        }
        return logs;
    }, [logFilterUser, logFilterContext, logFromDate, logToDate, logUserCategory, employees, agents]);

    // FIX: Changed 'page' to 'logPage' as 'page' was not defined in this scope
    const currentLogs = allFilteredLogs.slice(logPage * rowsPerPage, (logPage + 1) * rowsPerPage);

    const handleQuickView = (log: any) => {
        if (log.context === 'ORDERS') {
            const match = log.details.match(/#(\d+)/);
            if (match && onNavigateOrder) onNavigateOrder(parseInt(match[1]));
        } else if (log.context === 'AGENTS' || log.context === 'STAFF') {
            const nameMatch = log.details.match(/(?:جديد:|وكيل:|الموظف:) (.*)/);
            const name = nameMatch ? nameMatch[1].trim() : null;
            const foundUser = [...employees, ...agents].find(u => u.fullName === name || log.details.includes(u.fullName));
            if (foundUser && onNavigateUser) onNavigateUser(foundUser);
        }
    };

    const formatLogValue = (val: string | undefined) => {
        if (!val || val === '-' || val === t('activity.deleted')) return val;
        const isNumeric = /^-?\d+(\.\d+)?$/.test(val);
        if (isNumeric) {
            const num = Number(val);
            return (
                <span className="flex items-center gap-1">
                    <span className="opacity-60 text-[8px] font-black bg-gray-200/50 px-1 rounded">{t('batch4.k235')}</span>
                    <span dir="ltr">${num.toLocaleString()}</span>
                </span>
            );
        }
        return val;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="px-2">
                    <h2 className="text-2xl font-black text-gray-800">{t('batch4.k236')}</h2>
                    <p className="text-gray-500 text-sm font-bold">{t('batch4.k237')}</p>
                </div>

                <div className="bg-white p-3 md:p-4 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col lg:flex-row items-end gap-3">

                    <div className="w-full lg:w-64 shrink-0">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block mr-1">{t('batch4.k238')}</label>
                        <div className="flex h-[54px] bg-gray-50 p-1.5 rounded-[1.2rem] border border-gray-200 shadow-inner">
                            <button onClick={() => { setLogUserCategory('ALL'); setLogFilterUser('ALL'); setLogPage(0); }} className={`flex-1 h-full rounded-xl text-[11px] font-black transition-all ${logUserCategory === 'ALL' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>{t('batch4.k239')}</button>
                            <button onClick={() => { setLogUserCategory('STAFF'); setLogFilterUser('ALL'); setLogPage(0); }} className={`flex-1 h-full rounded-xl text-[11px] font-black transition-all ${logUserCategory === 'STAFF' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>{t('batch4.k240')}</button>
                            <button onClick={() => { setLogUserCategory('AGENT'); setLogFilterUser('ALL'); setLogPage(0); }} className={`flex-1 h-full rounded-xl text-[11px] font-black transition-all ${logUserCategory === 'AGENT' ? 'bg-white text-emerald-600 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>{t('batch4.k241')}</button>
                        </div>
                    </div>

                    <div className="w-full lg:flex-1 min-w-[200px]">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block mr-1">{t('batch4.k242')}</label>
                        <UserSelector users={logUserCategory === 'ALL' ? [...employees, ...agents] : (logUserCategory === 'STAFF' ? employees : agents)} selectedUserId={logFilterUser} onChange={(id) => { setLogFilterUser(id); setLogPage(0); }} placeholder={t('batch4.k243')} />
                    </div>

                    <div className="w-full lg:w-96 relative" ref={contextRef}>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block mr-1">{t('batch4.k244')}</label>
                        <button onClick={() => setIsContextOpen(!isContextOpen)} className={`w-full h-[54px] flex justify-between items-center bg-gray-50 border border-gray-200 rounded-[1.2rem] px-4 text-sm font-bold text-gray-700 transition-all ${isContextOpen ? 'border-[#0e3c63] bg-white ring-4 ring-blue-50' : 'hover:border-blue-300'}`}>
                            <span className="truncate flex items-center gap-2">
                                <Layers size={16} className={isContextOpen ? 'text-[#0e3c63]' : 'text-gray-400'} />
                                {logFilterContext === 'ALL' ? t('activity.all_sections') : getContextLabel(logFilterContext)}
                            </span>
                            <ChevronDown size={16} className={`text-gray-400 transition-transform ${isContextOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isContextOpen && (
                            <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden max-h-72 overflow-y-auto p-1.5 animate-fade-in origin-top">
                                <button onClick={() => { setLogFilterContext('ALL'); setIsContextOpen(false); setLogPage(0); }} className={`w-full text-right px-4 py-3 rounded-xl text-sm font-black flex justify-between items-center ${logFilterContext === 'ALL' ? 'bg-blue-50 text-[#0e3c63]' : 'text-gray-600 hover:bg-gray-50'}`}>{t('activity.all_sections')} {logFilterContext === 'ALL' && <Check size={16} />}</button>
                                {contextOptions.map(ctx => (
                                    <button key={ctx} onClick={() => { setLogFilterContext(ctx); setIsContextOpen(false); setLogPage(0); }} className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center ${logFilterContext === ctx ? 'bg-blue-50 text-[#0e3c63]' : 'text-gray-600 hover:bg-gray-50'}`}>{getContextLabel(ctx)} {logFilterContext === ctx && <Check size={16} />}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-full lg:w-auto lg:mr-auto shrink-0">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block mr-1 text-left lg:text-right">{t('batch4.k136')}</label>
                        <DateRangePicker from={logFromDate} to={logToDate} onChangeFrom={(d) => { setLogFromDate(d); setLogPage(0); }} onChangeTo={(d) => { setLogToDate(d); setLogPage(0); }} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
                {isLoadingLogs ? (
                    <div className="flex-1 p-8 space-y-6">
                        {[1, 2, 3, 4, 5].map(i => <div key={i} className="animate-pulse flex gap-6"><div className="h-14 w-14 bg-gray-100 rounded-2xl"></div><div className="flex-1 space-y-3 pt-2"><div className="h-4 bg-gray-100 rounded w-1/4"></div><div className="h-3 bg-gray-50 rounded w-1/2"></div></div></div>)}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-right text-sm border-separate border-spacing-0">
                                <thead className="bg-gray-50/80 backdrop-blur text-gray-500 font-black uppercase text-[10px] tracking-widest sticky top-0 z-10">
                                    <tr>
                                        <th className="p-6 pr-10 w-48 border-b border-gray-100">{t('batch4.k245')}</th>
                                        <th className="p-6 w-64 border-b border-gray-100">{t('batch4.k246')}</th>
                                        <th className="p-6 w-28 text-center border-b border-gray-100">{t('batch4.k247')}</th>
                                        <th className="p-6 border-b border-gray-100">{t('batch4.k248')}</th>
                                        <th className="p-6 w-[24rem] border-b border-gray-100">{t('batch4.k249')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {currentLogs.map((log: any) => {
                                        const logUser = [...employees, ...agents].find(u => u.id === log.userId);
                                        const isAddition = log.action.includes('إضافة') || log.action.includes('تسجيل') || log.action.includes('إنشاء');
                                        const hasQuickView = isAddition && (log.context === 'ORDERS' || log.context === 'AGENTS' || log.context === 'STAFF');

                                        // Creating a cleaner Title/Subtitle from details
                                        // Helper for Role Translation
                                        const getRoleName = (role?: string) => {
                                            if (!role) return t('activity.former_user');
                                            const map: Record<string, string> = {
                                                'AGENT': t('activity.role_agent'),
                                                'STAFF': t('activity.role_staff'),
                                                'ADMIN': t('activity.role_admin'),
                                                'SUPERADMIN': t('activity.role_super_admin'),
                                                'SUPER_ADMIN': t('activity.role_super_admin2'),
                                                'MANAGER': t('activity.role_manager'),
                                                'SUPERVISOR': t('activity.role_supervisor'),
                                                'ACCOUNTANT': t('activity.role_accountant'),
                                                'WAREHOUSE': t('activity.role_warehouse'),
                                                'system': t('activity.system'),
                                                'System': t('activity.system')
                                            };
                                            return map[role] || role;
                                        };

                                        // Advanced Parsing Logic with Audit Fallback
                                        const detailsHasAgent = log.details.includes('لصالح الوكيل:');
                                        let title = log.details;
                                        let subtitle = '';

                                        // Fallback values for Audit column if DB fields are empty
                                        let parsedPrev = log.previousValue;
                                        let parsedNew = log.newValue;

                                        // Helper Translation Map
                                        const translateMap: Record<string, string> = {
                                            'production': t('activity.production'),
                                            'payment': t('activity.finance'),
                                            'WAITING': t('activity.status_waiting'),
                                            'IN_PROGRESS': t('activity.status_in_progress'),
                                            'COMPLETED': t('activity.status_completed'),
                                            'PENDING_TRANSFER': t('activity.status_pending_transfer'),
                                            'PENDING_PAYMENT': t('activity.status_pending_payment'),
                                            'PAID': t('activity.status_paid'),
                                            'PARTIALLY_PAID': t('activity.status_partially_paid'),
                                            'PENDING': t('activity.status_unpaid')
                                        };

                                        const translate = (txt: string) => translateMap[txt] || txt;

                                        if (detailsHasAgent) {
                                            const parts = log.details.split('لصالح الوكيل:');
                                            title = parts[0].replace('تم ', '').trim();
                                            subtitle = `${t('activity.for_agent')} ${parts[1].trim()}`;
                                        }
                                        // Case: Update Status (Legacy String: "تحديث حالة X لطلب #Y إلى Z")
                                        else if (log.details.includes('تحديث حالة')) {
                                            const match = log.details.match(/تحديث حالة (.*) لطلب #(\d+)(?: إلى (.*))?/);
                                            if (match) {
                                                const type = translate(match[1]);
                                                const id = match[2];
                                                const toVal = match[3] ? translate(match[3]) : '';
                                                title = `${t('activity.update_order_status')} #${id}`;
                                                subtitle = type; // Keep subtitle simple

                                                // If real audit values are missing, use parsed ones
                                                if (!parsedNew && toVal) {
                                                    parsedNew = toVal;
                                                    // Try to guess previous if it's a simple toggle, otherwise leave null
                                                }
                                            }
                                        }
                                        // Case: Edit Order (Legacy String: "تعديل الطلب #Y - الفرق: Z")
                                        else if (log.details.includes('تعديل الطلب') || log.details.includes('تعديل طلب')) {
                                            const match = log.details.match(/تعديل .*#(\d+)(?: - الفرق: (.*))?/);
                                            if (match) {
                                                title = `${t('activity.edit_order_items')} #${match[1]}`;
                                                if (match[2]) {
                                                    // We treat the "Difference" as a value to show in After col for context
                                                    if (!parsedNew) parsedNew = `${t('activity.difference')} ${match[2]}`;
                                                }
                                            }
                                        }
                                        else if (log.details.includes('#')) {
                                            const match = log.details.match(/(.*)(#\d+)(.*)/);
                                            if (match) {
                                                title = `${match[1].replace('تم ', '').trim()} ${match[2]}`;
                                                subtitle = match[3].trim();
                                            }
                                        }

                                        // Fallback cleaning
                                        title = title.replace('تم ', '');

                                        return (
                                            <tr key={log.id} className="hover:bg-blue-50/30 transition-all group">
                                                <td className="p-6 pr-10 align-top">
                                                    <div className="flex flex-col font-mono">
                                                        <span className="font-black text-gray-800 text-xs">{formatDate(log.timestamp)}</span>
                                                        <span className="text-[10px] text-gray-400 mt-1 font-bold flex items-center gap-1">
                                                            <Clock size={10} /> {formatTime(log.timestamp)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-6 align-top">
                                                    <button
                                                        onClick={() => logUser && onNavigateUser?.(logUser)}
                                                        className="flex items-start gap-3 group/user text-right hover:bg-white p-2 rounded-2xl transition-all shadow-sm border border-transparent hover:border-gray-100 disabled:cursor-default disabled:hover:bg-transparent disabled:shadow-none disabled:hover:border-transparent w-full"
                                                        disabled={!logUser}
                                                    >
                                                        <UserAvatar
                                                            name={log.userName || t('activity.the_system')}
                                                            avatarPath={logUser?.avatar_path}
                                                            avatarUrl={logUser?.imageUrl}
                                                            size="md"
                                                            className={`mt-0.5 border-2 border-white shadow-sm transition-transform group-hover/user:scale-110 ${logUser?.role === UserRole.AGENT ? 'bg-emerald-50 text-emerald-600' : 'bg-[#0e3c63] text-white'}`}
                                                        />
                                                        <div className="flex flex-col items-start min-w-0 flex-1">
                                                            <span className="font-black text-gray-800 group-hover/user:text-[#0e3c63] transition-colors truncate w-full text-right">{log.userName || t('activity.the_system')}</span>
                                                            <span className="text-[9px] font-bold text-gray-400 group-hover/user:text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md mt-1">{getRoleName(logUser?.role || 'system')}</span>
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="p-6 text-center align-top pt-8">
                                                    <Badge color="gray" className="bg-white border-2 border-gray-100 text-gray-500 font-black px-3 py-1.5 rounded-xl text-[10px] whitespace-nowrap shadow-sm group-hover:border-blue-200 transition-colors">{getContextLabel(log.context)}</Badge>
                                                </td>
                                                <td className="p-6 align-top">
                                                    <div className="flex flex-col gap-1.5 min-w-[200px]">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-[#0e3c63] text-sm">{title}</span>
                                                            {hasQuickView && (
                                                                <button onClick={() => handleQuickView(log)} className="text-blue-400 hover:text-blue-600 transition-colors"><ExternalLink size={12} /></button>
                                                            )}
                                                        </div>
                                                        {subtitle && <span className="text-gray-400 text-xs font-bold">{subtitle}</span>}

                                                        <div className="flex items-center gap-1 mt-1">
                                                            <span className="text-[10px] bg-gray-50 text-gray-400 px-2 py-0.5 rounded border border-gray-100">{translateAction(log.action)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 align-top">
                                                    {(parsedPrev || parsedNew) ? (
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                {parsedPrev && (
                                                                    <>
                                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">{t('batch4.k250')}</span>
                                                                        <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-100 text-xs font-mono font-bold text-red-800 min-h-[3rem] flex items-center">
                                                                            {formatLogValue(parsedPrev)}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className="space-y-1">
                                                                {parsedNew && (
                                                                    <>
                                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">{t('batch4.k251')}</span>
                                                                        <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-xs font-mono font-bold text-emerald-800 min-h-[3rem] flex items-center">
                                                                            {formatLogValue(parsedNew)}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center p-4">
                                                            <span className="text-[10px] font-bold text-gray-300 flex items-center gap-2">
                                                                <ArrowRight size={12} />
                                                                -
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-gray-50/50 border-t border-gray-100">
                            <PaginationControl page={logPage} rowsPerPage={rowsPerPage} setPage={setLogPage} setRowsPerPage={setRowsPerPage} totalItems={allFilteredLogs.length} />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
