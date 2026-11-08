import i18n from 'i18next';
const t = i18n.t.bind(i18n);

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronLeft, Check } from 'lucide-react';
import { User } from '../../types';

interface UserSelectorProps {
    users: User[];
    selectedUserId: 'ALL' | number;
    onChange: (id: 'ALL' | number) => void;
    placeholder: string;
}

export const UserSelector = ({ users, selectedUserId, onChange, placeholder }: UserSelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredUsers = users.filter(u => u.fullName.includes(search));
    const selectedUser = users.find(u => u.id === selectedUserId);

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-[54px] flex justify-between items-center bg-gray-50 border border-gray-200 rounded-[1.2rem] px-4 text-sm outline-none font-bold text-gray-700 hover:border-[#0e3c63] transition-colors"
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="truncate">{selectedUserId === 'ALL' ? t('batch4.k239') : selectedUser?.fullName || placeholder}</span>
                    {selectedUserId !== 'ALL' && selectedUser?.agentDetails?.type && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black shrink-0 ${selectedUser.agentDetails.type === 'VIP' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-gray-100 text-gray-500'}`}>
                            {selectedUser.agentDetails.type}
                        </span>
                    )}
                </div>
                <ChevronLeft size={16} className={`transform transition-transform ${isOpen ? 'rotate-90' : '-rotate-90'}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <input
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs focus:border-[#0e3c63] outline-none"
                                placeholder={t('batch4.k131')}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoFocus
                            />
                            <Search size={12} className="absolute left-2.5 top-3 text-gray-400" />
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                        <button
                            onClick={() => { onChange('ALL'); setIsOpen(false); }}
                            className={`w-full text-right px-3 py-2.5 rounded-lg text-sm font-bold flex justify-between items-center ${selectedUserId === 'ALL' ? 'bg-blue-50 text-[#0e3c63]' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            {t('batch4.k239')}
                            {selectedUserId === 'ALL' && <Check size={14} />}
                        </button>
                        {filteredUsers.map(u => (
                            <button
                                key={u.id}
                                onClick={() => { onChange(u.id); setIsOpen(false); }}
                                className={`w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium flex justify-between items-center ${selectedUserId === u.id ? 'bg-blue-50 text-[#0e3c63]' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span>{u.fullName}</span>
                                    {u.agentDetails?.type && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${u.agentDetails.type === 'VIP' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-gray-100 text-gray-500'}`}>
                                            {u.agentDetails.type}
                                        </span>
                                    )}
                                </div>
                                {selectedUserId === u.id && <Check size={14} />}
                            </button>
                        ))}
                        {filteredUsers.length === 0 && <p className="text-xs text-gray-400 text-center py-2">{t('batch4.k132')}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};
