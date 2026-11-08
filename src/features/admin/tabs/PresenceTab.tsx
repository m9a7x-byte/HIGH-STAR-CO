import i18n from 'i18next';
const t = i18n.t.bind(i18n);

import React, { useState, useMemo } from 'react';
import { Wifi, Monitor, Smartphone, Tablet, Clock, Search, Filter, Globe, User as UserIcon, Users, ArrowUpRight, RefreshCcw } from 'lucide-react';
import { Badge, Card, UserAvatar } from '../../../components/ui';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { User, UserRole, UserRoleLabels } from '../../../types';
import { db } from '../../../lib/db'; // Import db for refresh
import { formatDate } from '../../../lib/dateUtils';

interface PresenceTabProps {
    users: User[];
    onNavigate?: (user: User) => void;
}

export const PresenceTab: React.FC<PresenceTabProps> = ({ users, onNavigate }) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(12);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
    const [roleFilter, setRoleFilter] = useState<'ALL' | 'STAFF' | 'AGENT'>('ALL');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await db.fetchUsers();
        setTimeout(() => setIsRefreshing(false), 1000); // Keep spinning for at least 1s
    };

    const formatLastSeen = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (seconds > 86400) return formatDate(date);
        let interval = seconds / 3600;
        if (interval > 1) return t('batch4.since') + Math.floor(interval) + t('batch4.hours_suffix');
        interval = seconds / 60;
        if (interval > 1) return t('batch4.since') + Math.floor(interval) + t('batch4.minutes_suffix');
        return t('batch4.just_now');
    };

    const parseDeviceInfo = (deviceStr?: string) => {
        try {
            if (!deviceStr) return { deviceModel: t('batch4.device_unknown'), os: '', browser: '', type: '' };
            // Handle legacy non-JSON strings or valid JSON
            if (deviceStr.startsWith('{')) {
                const parsed = JSON.parse(deviceStr);
                // If deviceModel is just a single letter or very short, use type instead
                let model = parsed.deviceModel || parsed.device || '';
                if (model.length <= 2) {
                    // Try to create a better name from type + os
                    const type = parsed.type || '';
                    const os = parsed.os || '';
                    if (type === 'mobile' || type === 'Mobile') {
                        model = os ? `${t('batch4.device_mobile')} ${os}` : t('batch4.device_mobile');
                    } else if (type === 'tablet' || type === 'Tablet') {
                        model = os ? `${t('batch4.device_tablet')} ${os}` : t('batch4.device_tablet');
                    } else if (type === 'desktop' || type === 'Desktop') {
                        model = os ? `${t('batch4.device_computer')} ${os}` : t('batch4.device_computer');
                    } else {
                        model = t('batch4.device_unknown');
                    }
                }
                return { ...parsed, deviceModel: model };
            }
            return { deviceModel: deviceStr || t('batch4.device_unknown'), os: '', browser: '', type: '' };
        } catch (e) {
            return { deviceModel: deviceStr || t('batch4.device_unknown'), os: '', browser: '', type: '' };
        }
    };

    const getDeviceIcon = (info: any) => {
        const type = info?.type?.toLowerCase() || '';
        const model = info?.deviceModel?.toLowerCase() || '';

        if (type === 'mobile' || model.includes('iphone') || model.includes('android')) return <Smartphone size={14} />;
        if (type === 'tablet' || model.includes('ipad')) return <Tablet size={14} />;
        return <Monitor size={14} />;
    };

    const filteredEntities = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.fullName.toLowerCase().includes(search.toLowerCase()) ||
                (u.presence?.ipAddress || '').includes(search);

            let matchesStatus = true;
            if (filterType === 'ONLINE') matchesStatus = !!u.presence?.isOnline;
            if (filterType === 'OFFLINE') matchesStatus = !u.presence?.isOnline;

            let matchesRole = true;
            if (roleFilter === 'STAFF') matchesRole = (u.role !== UserRole.AGENT);
            if (roleFilter === 'AGENT') matchesRole = u.role === UserRole.AGENT;

            return matchesSearch && matchesStatus && matchesRole;
        }).sort((a, b) => {
            if (a.presence?.isOnline && !b.presence?.isOnline) return -1;
            if (!a.presence?.isOnline && b.presence?.isOnline) return 1;
            return new Date(b.presence?.lastSeen || 0).getTime() - new Date(a.presence?.lastSeen || 0).getTime();
        });
    }, [users, search, filterType, roleFilter]);

    const translatePath = (pathRaw?: string) => {
        if (!pathRaw) return '-';
        if (pathRaw.startsWith('tab:')) {
            const tabId = pathRaw.replace('tab:', '');
            // i18next `exists` method works via i18n instance. We can also just use t() with a fallback.
            // But we already have the `tabs` namespace in translation files now.
            return t(`tabs.${tabId}`, pathRaw);
        }
        
        // Handle legacy Arabic cases that are already in DB before the fix
        const legacyMapping: Record<string, string> = {
            'الصفحة الرئيسية': 'overview',
            'إدارة الإنتاج': 'production',
            'إدارة الطلبات': 'orders',
            'كتالوج المنتجات': 'catalog',
            'شؤون الوكلاء': 'agents',
            'المبيعات': 'sales',
            'التقارير': 'reports',
            'إدارة الموظفين': 'staff',
            'سجل الأحداث': 'activity_log',
            'المتواجدين': 'presence',
            'المصنع': 'factory',
            'الصندوق المالي': 'safe',
            'النظام والإعدادات': 'settings',
            'الملف الشخصي': 'profile',
            'لوحة التحكم': 'dashboard',
            'سجل الطلبات': 'history',
            'جدول الإنتاج': 'queue',
            'كشف الحساب': 'finance'
        };
        
        if (legacyMapping[pathRaw]) {
            return t(`tabs.${legacyMapping[pathRaw]}`);
        }
        
        return pathRaw;
    };

    const currentEntities = filteredEntities.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <Wifi size={20} className="text-[#0e3c63]" />
                    {t('batch4.online_users_system')}
                    <button
                        onClick={handleRefresh}
                        className="mr-2 p-1.5 bg-sky-50 text-[#0e3c63] rounded-lg hover:bg-sky-100 transition-colors"
                        title={t('batch4.k346')}
                    >
                        <div className={`${isRefreshing ? 'animate-spin' : ''}`}>
                            <RefreshCcw size={16} />
                        </div>
                    </button>
                </h3>

                <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <input className="w-full h-[54px] pl-4 pr-10 bg-gray-50 border border-gray-200 rounded-[1.2rem] focus:border-[#0e3c63] outline-none text-sm font-bold" placeholder={t('batch4.k395')} value={search} onChange={e => setSearch(e.target.value)} />
                        <Search className="absolute right-3 top-[18px] text-gray-400" size={16} />
                    </div>

                    <div className="flex h-[54px] bg-gray-50 p-1 rounded-[1.2rem] border border-gray-200">
                        <button onClick={() => setFilterType('ALL')} className={`px-4 h-full rounded-xl text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>{t('batch4.k239')}</button>
                        <button onClick={() => setFilterType('ONLINE')} className={`px-4 h-full rounded-xl text-xs font-bold transition-all ${filterType === 'ONLINE' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-400'}`}>{t('batch4.k396')}</button>
                    </div>

                    <div className="flex h-[54px] bg-gray-50 p-1 rounded-[1.2rem] border border-gray-200">
                        <button onClick={() => setRoleFilter('ALL')} className={`px-4 h-full rounded-xl text-xs font-bold transition-all ${roleFilter === 'ALL' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>{t('batch4.k239')}</button>
                        <button onClick={() => setRoleFilter('STAFF')} className={`px-4 h-full rounded-xl text-xs font-bold transition-all ${roleFilter === 'STAFF' ? 'bg-blue-50 text-blue-700' : 'text-gray-400'}`}>{t('batch4.k397')}</button>
                        <button onClick={() => setRoleFilter('AGENT')} className={`px-4 h-full rounded-xl text-xs font-bold transition-all ${roleFilter === 'AGENT' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-400'}`}>{t('batch4.k398')}</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentEntities.map((u) => {
                    const isOnline = u.presence?.isOnline;
                    const isAgent = u.role === UserRole.AGENT;

                    return (
                        <div key={u.id} className={`bg-white rounded-2xl border p-5 relative overflow-hidden transition-all shadow-sm group ${isOnline ? 'border-sky-100 ring-1 ring-sky-50 shadow-md' : 'opacity-70 grayscale'}`}>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex gap-3 items-center">
                                    <div className="relative">
                                        <UserAvatar
                                            name={u.fullName}
                                            avatarPath={u.avatar_path}
                                            avatarUrl={u.imageUrl}
                                            size="md"
                                            className="border-2 border-white shadow-sm"
                                        />
                                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-black text-gray-800 text-sm truncate">{u.fullName}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{UserRoleLabels[u.role] || u.role}</p>
                                    </div>
                                </div>

                                {onNavigate && (
                                    <button
                                        onClick={() => onNavigate(u)}
                                        className="p-2 text-gray-300 hover:text-[#0e3c63] hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        title={t('batch4.k399')}
                                    >
                                        <ArrowUpRight size={18} />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2 relative z-10">
                                <div className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded-xl border border-gray-100/50">
                                    <span className="text-gray-400 font-bold flex items-center gap-1"><Monitor size={12} />{t('batch4.k400')}</span>
                                    <span className="font-bold text-[#0e3c63]">{translatePath(u.presence?.currentPath)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded-xl border border-gray-100/50">
                                    <span className="text-gray-400 font-bold flex items-center gap-1"><Globe size={12} /> IP</span>
                                    <span className="font-mono font-bold text-gray-700 tracking-widest">{u.presence?.ipAddress || '0.0.0.0'}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 mt-1 font-bold">
                                    <div className="flex items-center gap-1">
                                        {(() => {
                                            const info = parseDeviceInfo(u.presence?.device);
                                            return (
                                                <>
                                                    {getDeviceIcon(info)}
                                                    <span title={`${info.os} - ${info.browser}`}>{info.deviceModel}</span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex items-center gap-1"><Clock size={10} /> {formatLastSeen(u.presence?.lastSeen || '')}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <PaginationControl page={page} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalItems={filteredEntities.length} />
            </div>
        </div>
    );
};
