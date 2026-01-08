import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Plus, MapPin, Wallet, ArrowRight, Settings, TrendingUp, TrendingDown,
    FileText, Search, Filter, Eye, Globe, History, UserPlus, X, Info,
    ShieldAlert, Landmark, Snowflake, ListOrdered, Save, ArrowUpRight, ArrowDownLeft,
    Check, ChevronDown, Award, User, Trash2, AlertOctagon, XCircle, Copy, Hash, Fingerprint, Activity, Clock, Monitor, Shield, Edit3, Smartphone, Laptop, CreditCard, UserCheck, CheckCircle,
    Users, Sparkles, Phone, Key, Lock, Mail, AlertCircle, ShieldX
} from 'lucide-react';
import { UserAvatar, Badge, Button, Card, Input, PhoneInput } from '../../../components/ui';
import { AvatarUploader } from '../../../components/profile/AvatarUploader';
import { formatDate, formatTime } from '../../../lib/dateUtils';
import { supabase } from '../../../lib/supabase';
import { AgentType, UserRole, User as UserType, ProductionStatus, PaymentStatus, UserRoleLabels } from '../../../types';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { PROVINCES_IRAQ } from '../../../lib/constants';
import { db } from '../../../lib/db';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import carbonFibre from '../../../assets/patterns/carbon-fibre.png';

// --- MODERN PROVINCE SELECTOR WITH SEARCH ---
const ModernProvinceSelector = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filtered = PROVINCES_IRAQ.filter(p => p.includes(search));

    return (
        <div className="relative w-full" ref={containerRef}>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">المحافظة</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[60px] flex items-center justify-between px-5 bg-white border-2 rounded-2xl transition-all duration-300 ${isOpen ? 'border-[#0e3c63] ring-4 ring-blue-50 shadow-lg' : 'border-gray-100 hover:border-blue-200'}`}
            >
                <div className="flex items-center gap-3">
                    <MapPin size={20} className={isOpen ? 'text-[#0e3c63]' : 'text-gray-400'} />
                    <span className={`font-bold ${value ? 'text-gray-800' : 'text-gray-400'}`}>{value || 'اختر المحافظة...'}</span>
                </div>
                <ChevronDown size={18} className={`text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-3xl shadow-2xl border border-gray-100 z-[500] overflow-hidden animate-fade-in">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                            <input
                                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:border-[#0e3c63]"
                                placeholder="بحث عن محافظة..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                autoFocus
                            />
                            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5">
                        {filtered.map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => { onChange(p); setIsOpen(false); setSearch(''); }}
                                className={`w-full text-right px-4 py-3 rounded-xl text-sm font-bold flex justify-between items-center transition-all ${value === p ? 'bg-blue-50 text-[#0e3c63]' : 'hover:bg-gray-50 text-gray-600'}`}
                            >
                                {p}
                                {value === p && <Check size={16} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MODERN TYPE SELECTOR (CARD STYLE) ---
const ModernTypeSelector = ({ value, onChange }: { value: AgentType, onChange: (v: AgentType) => void }) => {
    return (
        <div className="space-y-2 w-full">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">فئة الوكيل</label>
            <div className="grid grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => onChange(AgentType.NORMAL)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${value === AgentType.NORMAL ? 'bg-white border-[#0e3c63] shadow-md ring-1 ring-[#0e3c63]/10' : 'bg-gray-50 border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-gray-200'}`}
                >
                    <div className={`p-2 rounded-xl ${value === AgentType.NORMAL ? 'bg-blue-50 text-[#0e3c63]' : 'bg-white text-gray-400'}`}>
                        <User size={20} />
                    </div>
                    <span className="text-xs font-black">وكيل عادي</span>
                </button>

                <button
                    type="button"
                    onClick={() => onChange(AgentType.VIP)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${value === AgentType.VIP ? 'bg-white border-amber-500 shadow-md ring-1 ring-amber-500/10' : 'bg-gray-50 border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-gray-200'}`}
                >
                    <div className={`p-2 rounded-xl ${value === AgentType.VIP ? 'bg-amber text-amber-600' : 'bg-white text-gray-400'}`}>
                        <Award size={20} />
                    </div>
                    <span className="text-xs font-black">وكيل VIP</span>
                </button>
            </div>
        </div>
    );
};

export const AgentsTab = ({ agents, selectedAgent, agentTransactions, canEdit, isSuperAdmin, onSelectAgent, onViewOrder }: any) => {
    // --- STATE MANAGEMENT ---
    const { user: currentUser } = useAuth();
    const { success, error, info } = useToast();

    // Pagination & Search
    const [listPage, setListPage] = useState(0);
    const [listRowsPerPage, setListRowsPerPage] = useState(12);
    const [agentTypeFilter, setAgentTypeFilter] = useState<'ALL' | AgentType>('ALL');
    const [listSearch, setListSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');

    // --- REAL-TIME DATA SYNC ---
    // Ensure the detailed view always shows the freshest data from the 'agents' prop (which comes from db.users)
    const [currentAgent, setCurrentAgent] = useState(selectedAgent);

    useEffect(() => {
        if (selectedAgent) {
            const freshData = agents.find((a: any) => a.id === selectedAgent.id);
            if (freshData) {
                setCurrentAgent(freshData);
            }
        } else {
            setCurrentAgent(null);
        }
    }, [agents, selectedAgent]);

    // Use currentAgent for display instead of selectedAgent prop directly
    const displayAgent = currentAgent || selectedAgent;

    // Modal Visibility & Editing
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState<UserType | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'security'>('general');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [authMethod, setAuthMethod] = useState<'manual' | 'invite'>('manual');
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [phone, setPhone] = useState('');
    const [province, setProvince] = useState('');
    const [address, setAddress] = useState('');
    const [agentType, setAgentType] = useState<AgentType>(AgentType.NORMAL);
    const [internalNotes, setInternalNotes] = useState('');
    const [freezeMessage, setFreezeMessage] = useState('');
    const [isFrozen, setIsFrozen] = useState(false);
    const [avatarPath, setAvatarPath] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    const [allowCredit, setAllowCredit] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [allowSpecial, setAllowSpecial] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Validation State
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
    const [validationButtonFlip, setValidationButtonFlip] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);


    // Wallet & Action Modals
    const [walletModal, setWalletModal] = useState<{ isOpen: boolean, agent: UserType | null, mode: 'deposit' | 'withdraw', amount: string, notes: string }>({
        isOpen: false, agent: null, mode: 'deposit', amount: '', notes: ''
    });
    const [deleteSafetyModal, setDeleteSafetyModal] = useState<{ isOpen: boolean, agent: UserType | null, balance: number }>({
        isOpen: false, agent: null, balance: 0
    });
    const [agentSuspendConfirm, setAgentSuspendConfirm] = useState<UserType | null>(null);
    const [activeOrdersModal, setActiveOrdersModal] = useState<{ isOpen: boolean, agentName: string, orderIds: number[] }>({
        isOpen: false, agentName: '', orderIds: []
    });
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean, agent: UserType | null }>({
        isOpen: false, agent: null
    });

    // --- EFFECTS ---
    useEffect(() => {
        setPage(0);
        setSearchTerm('');
    }, [selectedAgent]);

    // Reset Form when Modal Opens/Closes or Editing Changes
    useEffect(() => {
        if (showAgentModal) {
            setActiveTab('general');
            setFieldErrors({}); // Clear errors on modal open
            setValidationError(null); // Clear validation error message
            if (editingAgent) {
                // Populate existing data
                setFullName(editingAgent.fullName);
                setEmail(editingAgent.email);
                setPhone((editingAgent as any).phone || editingAgent.agentDetails?.phone || '');
                setAddress((editingAgent as any).address || editingAgent.agentDetails?.address || '');
                setProvince((editingAgent as any).province || editingAgent.agentDetails?.province || '');
                setAvatarPath(editingAgent.avatar_path || '');
                setAvatarUrl(editingAgent.imageUrl || '');

                setAgentType(editingAgent.agentDetails?.type || AgentType.NORMAL);
                setAllowCredit(editingAgent.agentDetails?.permissions?.allowCreditOrders || false);
                setShowQueue(editingAgent.agentDetails?.permissions?.showProductionQueue || false);
                setAllowSpecial(editingAgent.agentDetails?.permissions?.allowSpecialRequests || false);
                setInternalNotes(editingAgent.agentDetails?.internalNotes || '');

                setIsFrozen(editingAgent.agentDetails?.isFrozen || false);
                setFreezeMessage(editingAgent.agentDetails?.freezeMessage || '');

                setPassword('');
                setConfirmPassword('');
                setIsEditingPassword(false);
                setAuthMethod('manual'); // Reset auth method

            } else {
                // Reset for new agent
                setFullName('');
                setEmail('');
                setPhone('');
                setAddress('');
                setProvince('');
                setAvatarPath('');
                setAvatarUrl('');

                setAgentType(AgentType.NORMAL);
                setAllowCredit(false);
                setShowQueue(false);
                setAllowSpecial(false);
                setInternalNotes('');

                setIsFrozen(false);
                setFreezeMessage('');

                setPassword('');
                setConfirmPassword('');
                setIsEditingPassword(false); // Default to false so authMethod logic controls visibility
                setAuthMethod('manual'); // Default to manual for new agents

            }
        }
    }, [showAgentModal, editingAgent]);

    // --- HELPERS ---
    const checkPhoneUniqueness = (phoneToCheck: string, excludeUserId?: number | string) => {
        if (!phoneToCheck) return true;

        // Check against ALL users (Staff & Agents)
        const duplicate = db.users.find(u => {
            const userPhone = (u as any).phone;
            if (!userPhone) return false;

            // Exclude current user if editing
            if (excludeUserId && String(u.id) === String(excludeUserId)) return false;

            return userPhone === phoneToCheck;
        });

        return !duplicate;
    };

    const handleSaveAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Reset previous errors
        setFieldErrors({});
        setValidationError(null);

        // Validation
        const errors: Record<string, boolean> = {};
        const missingFields: string[] = [];

        if (!fullName.trim()) { errors.fullName = true; missingFields.push('الاسم'); }
        if (!province) { errors.province = true; missingFields.push('المحافظة'); }
        if (!phone.trim()) { errors.phone = true; missingFields.push('رقم الهاتف'); }
        if (!email.trim()) { errors.email = true; missingFields.push('البريد الإلكتروني'); }

        // Password validation (only if manual and creating NEW or explicitly setting for existing)
        if (authMethod === 'manual') {
            if (!editingAgent && !password) { errors.password = true; missingFields.push('كلمة المرور'); }
            if (editingAgent && isEditingPassword && !password) { errors.password = true; missingFields.push('كلمة المرور'); }

            if (password && password.length < 6) {
                error('كلمة المرور قصيرة', 'يجب أن تكون 6 رموز على الأقل');
                errors.password = true;
            }
            if (password !== confirmPassword) {
                error('خطأ', 'كلمات المرور غير متطابقة');
                errors.confirmPassword = true;
            }
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setValidationButtonFlip(true);

            if (missingFields.length > 0) {
                setValidationError(`بيانات ناقصة: ${missingFields.join('، ')}`);
            } else {
                setValidationError(null);
            }

            setTimeout(() => {
                setValidationButtonFlip(false);
                setValidationError(null);
            }, 3000); // Reset after 3s

            // Switch tabs to show error
            if (errors.email || errors.password || errors.confirmPassword) {
                setActiveTab('security');
            } else {
                setActiveTab('general');
            }

            return;
        }

        // Phone Uniqueness Check
        if (!checkPhoneUniqueness(phone, editingAgent?.id)) {
            error('رقم الهاتف مستخدم', 'هذا الرقم مرتبط بحساب آخر (موظف أو وكيل). يرجى استخدام رقم مختلف.');
            return;
        }

        setIsSubmitting(true);

        // Prepare payload for both create and edit operations
        const agentPayload: any = {
            fullName,
            email,
            // phone is stored inside agentDetails
            imageUrl: avatarUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${fullName}`,
            avatar_path: avatarPath,
            province, // Also at top level for profiles update
            address, // Also at top level for profiles update
            phone,  // Also at top level for profiles update
            agentDetails: {
                type: agentType,
                // province, address, phone removed from here as they are now in profiles
                internalNotes,
                isFrozen,
                freezeMessage,
                permissions: {
                    allowCreditOrders: allowCredit,
                    showProductionQueue: showQueue,
                    showFinance: true,
                    showHistory: true,
                    allowSpecialRequests: allowSpecial,
                }
            }
        };

        try {
            if (editingAgent) {
                // Update Existing
                const authUpdates: any = {};
                if (password && isEditingPassword) authUpdates.password = password;
                if (email !== editingAgent.email) authUpdates.email = email;

                if (Object.keys(authUpdates).length > 0) {
                    await db.updateUserCredentials(currentUser!.id, editingAgent.id, authUpdates);
                }

                if (password && isEditingPassword) agentPayload.password = password;

                await db.updateAgent(currentUser!.id, { ...editingAgent, ...agentPayload, id: editingAgent.id });

                if (password) info('تم تحديث كلمة المرور');
                success('تم الحفظ', 'تم تحديث بيانات الوكيل بنجاح');

                // IMMIDIATE UI UPDATE: Update selectedAgent if it matches the one we just edited
                if (selectedAgent && selectedAgent.id === editingAgent.id) {
                    const updatedAgent = { ...editingAgent, ...agentPayload, id: editingAgent.id };
                    // Ensure nested structure matches internal usage if needed, though mostly flat now
                    // We need to construct a full object similar to what fetchUsers returns
                    const mergedDetails = {
                        ...selectedAgent.agentDetails,
                        ...agentPayload.agentDetails
                    };
                    const freshAgent = {
                        ...updatedAgent,
                        agentDetails: mergedDetails,
                        phone: agentPayload.phone, // Top level
                        province: agentPayload.province, // Top level
                        address: agentPayload.address // Top level
                    };
                    onSelectAgent(freshAgent);
                }
            } else {
                // Create New
                const createPayload = {
                    ...agentPayload,
                    password: authMethod === 'manual' ? password : undefined, // Only send password if manual
                    role: UserRole.AGENT
                };


                await db.registerEmployee(currentUser!.id, createPayload);
                success('تم الإضافة', 'تم تسجيل حساب الوكيل الجديد بنجاح');
            }
            setShowAgentModal(false);
            setEditingAgent(null);
        } catch (err: any) {
            console.error('Error saving agent:', err);
            error('خطأ في الحفظ', err.message || 'حدث خطأ أثناء حفظ بيانات الوكيل');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- LOGIC HELPERS ---
    const filteredAgents = useMemo(() => {
        return agents.filter((a: any) => {
            const matchesSearch = a.fullName.toLowerCase().includes(listSearch.toLowerCase()) ||
                (a.province && a.province.includes(listSearch)) ||
                (a.phone && a.phone.includes(listSearch));
            const matchesType = agentTypeFilter === 'ALL' || a.agentDetails?.type === agentTypeFilter;
            return matchesSearch && matchesType;
        });
    }, [agents, listSearch, agentTypeFilter]);

    const currentAgents = useMemo(() => {
        return filteredAgents.slice(listPage * listRowsPerPage, (listPage + 1) * listRowsPerPage);
    }, [filteredAgents, listPage, listRowsPerPage]);

    const filteredTransactions = useMemo(() => {
        if (!agentTransactions) return [];
        return agentTransactions.filter((t: any) =>
            t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.amount.toString().includes(searchTerm)
        );
    }, [agentTransactions, searchTerm]);

    const currentTransactions = useMemo(() => {
        return filteredTransactions.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    }, [filteredTransactions, page, rowsPerPage]);

    const stats = useMemo(() => {
        if (!agentTransactions) return { sales: 0, received: 0 };
        const sales = agentTransactions.filter((t: any) => t.amount < 0).reduce((acc: number, t: any) => acc + Math.abs(t.amount), 0);
        const received = agentTransactions.filter((t: any) => t.amount > 0).reduce((acc: number, t: any) => acc + t.amount, 0);
        return { sales, received };
    }, [agentTransactions]);

    const handleInitiateDelete = (e: React.MouseEvent, agent: UserType) => {
        e.stopPropagation();
        if (!agent || !agent.agentDetails) return;

        const activeOrders = db.orders.filter(o =>
            Number(o.agentId) === Number(agent.id) &&
            o.productionStatus !== ProductionStatus.COMPLETED &&
            o.paymentStatus !== PaymentStatus.CANCELLED
        );

        if (activeOrders.length > 0) {
            setActiveOrdersModal({
                isOpen: true,
                agentName: agent.fullName,
                orderIds: activeOrders.map(o => o.id)
            });
            return;
        }

        const balance = agent.agentDetails.currentBalance || 0;
        if (balance !== 0) {
            setDeleteSafetyModal({ isOpen: true, agent, balance });
            return;
        }

        setDeleteConfirmModal({ isOpen: true, agent });
    };

    const executeDeleteAgent = () => {
        if (deleteConfirmModal.agent && currentUser) {
            db.deleteAgent(currentUser.id, deleteConfirmModal.agent.id);
            success('تم حذف الوكيل نهائياً من النظام');
            setDeleteConfirmModal({ isOpen: false, agent: null });
            onSelectAgent(null);
        }
    };

    const executeSuspendAgent = async () => {
        if (agentSuspendConfirm && currentUser) {
            const isFrozen = agentSuspendConfirm.agentDetails?.isFrozen;
            try {
                await db.updateAgent(currentUser.id, {
                    id: agentSuspendConfirm.id,
                    agentDetails: {
                        isFrozen: !isFrozen,
                        freezeMessage: isFrozen ? '' : 'تم تجميد الحساب مؤقتاً من قبل الإدارة'
                    }
                });
                success(isFrozen ? 'تم تنشيط الحساب' : 'تم تجميد الحساب');
                setAgentSuspendConfirm(null);
            } catch (e) {
                error('فشل تحديث الحالة');
            }
        }
    };

    const handleWalletSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!walletModal.agent) return;

        const amount = Number(walletModal.amount);
        if (isNaN(amount) || amount <= 0) { error('يرجى إدخال مبلغ صحيح'); return; }

        setIsSubmitting(true);
        try {
            const cleanAmount = walletModal.mode === 'deposit' ? amount : -amount;
            await db.addBalance(currentUser!.id, walletModal.agent.id, cleanAmount, walletModal.notes || (walletModal.mode === 'deposit' ? 'تسديد رصيد يدوي' : 'سحب رصيد يدوي'));
            success(walletModal.mode === 'deposit' ? 'تم تسجيل التسديد بنجاح' : 'تم تسجيل السحب بنجاح');

            // Re-select the agent to update the view instantly
            // We use db.users because 'agents' prop might be stale in this closure
            const updatedAgent = db.users.find((a: any) => a.id === walletModal.agent!.id);
            if (updatedAgent) onSelectAgent(updatedAgent);

            setWalletModal({ ...walletModal, isOpen: false, amount: '', notes: '' });
        } catch (err: any) {
            console.error('Wallet Error:', err);
            error('خطأ', 'فشل تحديث الرصيد');
        } finally {
            setIsSubmitting(false);
        }
    };

    const expectedBalance = useMemo(() => {
        if (!walletModal.isOpen || !walletModal.agent?.agentDetails) return 0;
        const current = walletModal.agent.agentDetails.currentBalance || 0;
        const change = Number(walletModal.amount) || 0;
        return walletModal.mode === 'deposit' ? current + change : current - change;
    }, [walletModal]);

    return (
        <div className="space-y-6">
            {!selectedAgent ? (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100">
                        <h3 className="font-black text-xl text-gray-800 flex items-center gap-3 px-2">
                            <Users size={24} className="text-[#0e3c63]" />
                            قائمة الوكلاء المعتمدين
                        </h3>

                        <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <input
                                    className="w-full h-[54px] pl-4 pr-11 bg-gray-50 border border-gray-200 rounded-2xl focus:border-[#0e3c63] outline-none text-sm font-bold shadow-inner"
                                    placeholder="بحث بالاسم أو الهاتف..."
                                    value={listSearch}
                                    onChange={e => { setListSearch(e.target.value); setListPage(0); }}
                                />
                                <Search className="absolute right-4 top-[18px] text-gray-400" size={18} />
                            </div>
                            {isSuperAdmin && <Button onClick={() => { setEditingAgent(null); setShowAgentModal(true); }} className="h-[54px] text-sm rounded-2xl px-6 shadow-xl shadow-blue-900/10"><Plus size={16} /> وكيل جديد</Button>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentAgents.map((a: any) => {
                            const balance = a.agentDetails?.currentBalance || 0;
                            const isDebt = balance < 0;
                            return (
                                <div key={a.id} onClick={() => onSelectAgent(a)} className={`bg-white rounded-[2.5rem] border border-gray-100 hover:shadow-2xl transition-all cursor-pointer relative group overflow-hidden shadow-sm ${a.agentDetails?.isFrozen ? 'grayscale opacity-75' : ''}`}>
                                    {a.agentDetails?.isFrozen && (
                                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/5 pointer-events-none data-[frozen=true]:block">
                                            <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-lg shadow-lg rotate-[-12deg] border-2 border-white">
                                                حساب مجمد
                                            </span>
                                        </div>
                                    )}

                                    <div className="h-24 bg-gradient-to-br from-[#0e3c63] to-[#164e7d] relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-xl"></div>
                                    </div>

                                    <div className="pt-0 flex flex-col items-center flex-1">
                                        <div className="-mt-12 mb-3 relative z-10 px-6">
                                            <div className="relative inline-block">
                                                <UserAvatar
                                                    name={a.fullName}
                                                    avatarPath={a.avatar_path}
                                                    avatarUrl={a.imageUrl}
                                                    size="xl"
                                                    className="border-[5px] border-white shadow-lg"
                                                />
                                                <div className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-2 border-white ${a.presence?.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mb-4 justify-center w-full px-6">
                                            <h3 className="font-black text-gray-800 text-lg text-center leading-snug">{a.fullName}</h3>
                                            {a.agentDetails?.type === 'VIP' && (
                                                <span className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                                                    VIP
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-center gap-3 mb-6 w-full px-4">
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                                                <MapPin size={12} className="text-red-500" />
                                                {(a as any).province || a.agentDetails?.province || 'غير محدد'}
                                            </span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dir-ltr font-mono">
                                                {(a as any).phone || a.agentDetails?.phone || 'لا يوجد رقم'}
                                                <Phone size={12} className="text-blue-500" />
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`mt-auto p-5 flex justify-between items-center border-t transition-colors ${!isDebt ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'
                                        }`}>
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${!isDebt ? 'text-emerald-500' : 'text-red-500'}`}>{isDebt ? 'المبلغ المطلوب' : 'الرصيد المتوفر'}</p>
                                            <p className={`font-mono font-black text-2xl ${!isDebt ? 'text-emerald-700' : 'text-red-700'}`} dir="ltr">{isDebt ? '-' : ''}${Math.abs(balance).toLocaleString()}</p>
                                        </div>
                                        <div className={`p-3 rounded-2xl shadow-sm ${!isDebt ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                            <Wallet size={20} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in space-y-8 pb-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/70 backdrop-blur-md p-4 rounded-[2rem] border border-white shadow-xl">
                        <button onClick={() => onSelectAgent(null)} className="flex items-center gap-3 text-gray-500 hover:text-[#0e3c63] font-black transition-all group px-3">
                            <div className="p-2 bg-white rounded-2xl shadow-md border border-gray-100 group-hover:bg-[#0e3c63] group-hover:text-white transition-all transform group-hover:translate-x-1"><ArrowRight size={20} /></div>
                            رجوع للقائمة
                        </button>

                        {canEdit && (
                            <div className="flex gap-2">
                                {(displayAgent.agentDetails?.isFrozen || isSuperAdmin) && (
                                    <Button
                                        onClick={() => setAgentSuspendConfirm(displayAgent)}
                                        variant="secondary"
                                        className={`py-3 px-4 text-sm border-gray-200 shadow-md font-black ${displayAgent.agentDetails?.isFrozen ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                                    >
                                        {displayAgent.agentDetails?.isFrozen ? <CheckCircle size={18} /> : <Snowflake size={18} />}
                                        <span className="hidden lg:inline mr-2">{displayAgent.agentDetails?.isFrozen ? 'تنشيط الحساب' : 'تجميد الحساب'}</span>
                                    </Button>
                                )}
                                <Button onClick={() => { setEditingAgent(displayAgent); setShowAgentModal(true); }} variant="secondary" className="py-3 px-6 text-sm bg-white border-gray-200 shadow-md font-black">
                                    <Settings size={18} /> إدارة الملف الشخصي
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-4 space-y-6">
                            <Card className="p-0 overflow-hidden border-0 shadow-2xl rounded-[2.5rem]">
                                <div className="h-32 bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] relative">
                                    <div className="absolute top-0 left-0 w-full h-full bg-contain opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                                </div>
                                <div className="px-8 pb-10 text-center -mt-16 relative z-10">
                                    <div className="relative inline-block mb-6">
                                        <UserAvatar
                                            name={displayAgent.fullName}
                                            avatarPath={displayAgent.avatar_path}
                                            avatarUrl={displayAgent.imageUrl}
                                            size="xl"
                                            className="w-32 h-32 rounded-full mx-auto shadow-2xl border-4 border-white"
                                        />
                                        <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white shadow-lg ${displayAgent.presence?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                    </div>
                                    <h2 className="font-black text-3xl text-gray-800 tracking-tight">{displayAgent.fullName}</h2>
                                    <div className="flex flex-col gap-1 items-center mt-2">
                                        <p className="text-gray-400 text-sm font-bold font-mono">{displayAgent.email}</p>
                                        <p className="text-gray-500 text-sm font-bold font-mono flex items-center gap-1.5" dir="ltr"><Phone size={12} /> {(displayAgent as any).phone || displayAgent.agentDetails?.phone || '-'}</p>
                                    </div>

                                    <div className="mt-6 flex justify-center gap-3">
                                        <Badge color={displayAgent.agentDetails?.type === AgentType.VIP ? 'yellow' : 'gray'} className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest">{displayAgent.agentDetails?.type}</Badge>
                                        <Badge color="blue" className="px-5 py-2 rounded-xl text-xs font-black">{(displayAgent as any).province || displayAgent.agentDetails?.province || 'غير محدد'}</Badge>
                                    </div>
                                </div>
                            </Card>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-2">
                                    <Fingerprint size={18} className="text-[#0e3c63]" />
                                    <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-[0.2em]">بصمة الوصول الرقمي</h4>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {/* Main Digital ID Card */}
                                    <div className="bg-[#0e3c63] rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                                        <div className="relative z-10 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/5">
                                                    <Shield size={22} className="text-blue-200" />
                                                </div>
                                                <div className="text-left">
                                                    <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest block mb-1 opacity-80">رمز تعريف الوكيل</span>
                                                    <span className="text-2xl font-black font-mono tracking-tighter text-white">
                                                        AGT-{String(displayAgent.id).split('-')[0].toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-[9px] font-bold text-blue-300 uppercase tracking-widest">VOGA SECURITY ACCESS</span>
                                                <span className="text-[10px] font-bold text-blue-200">نظام التحقق النشط</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:border-blue-100 transition-all">
                                            <div className="flex items-center gap-2 text-indigo-500">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">جهاز الدخول</span>
                                                <Monitor size={16} />
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-black text-gray-800 dir-ltr">
                                                    {(() => {
                                                        try {
                                                            const info = displayAgent.device_info ? JSON.parse(displayAgent.device_info) : null;
                                                            return info ? info.type : 'غير معروف';
                                                        } catch { return 'غير معروف'; }
                                                    })()}
                                                </span>
                                                <span className="text-[9px] font-bold text-gray-400 dir-ltr">
                                                    {(() => {
                                                        try {
                                                            const info = displayAgent.device_info ? JSON.parse(displayAgent.device_info) : null;
                                                            return info ? `${info.os} - ${info.browser}` : '';
                                                        } catch { return displayAgent.device_info || ''; }
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:border-blue-100 transition-all">
                                            <div className="flex items-center gap-2 text-blue-500">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">عنوان الشبكة (IP)</span>
                                                <Globe size={16} />
                                            </div>
                                            <span className="text-sm font-black text-gray-800 font-mono tracking-tight dir-ltr">
                                                {displayAgent.last_ip || 'غير متوفر'}
                                            </span>
                                        </div>
                                        <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:border-blue-100 transition-all">
                                            <div className="flex items-center gap-2 text-emerald-500">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">سجل العمليات</span>
                                                <Activity size={16} />
                                            </div>
                                            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black">{agentTransactions.length}</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:border-blue-100 transition-all">
                                            <div className="flex items-center gap-2 text-amber-500">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">آخر مزامنة</span>
                                                <Clock size={16} />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-700 leading-tight dir-ltr">
                                                {displayAgent.last_active_at ? (
                                                    <>
                                                        {formatDate(displayAgent.last_active_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                        <br />
                                                        {formatTime(displayAgent.last_active_at)}
                                                    </>
                                                ) : 'غير متوفر'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Delete Action */}
                                    {isSuperAdmin && (
                                        <button
                                            onClick={(e) => handleInitiateDelete(e, displayAgent)}
                                            className="w-full h-14 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 transition-all mt-2 border border-rose-100 hover:border-rose-200"
                                        >
                                            <Trash2 size={18} />
                                            إلغاء اعتماد الوكيل نهائياً
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-white to-emerald-50 flex items-center gap-5">
                                    <div className="p-4 bg-emerald-100 text-emerald-600 rounded-2xl shadow-inner"><TrendingUp size={28} /></div>
                                    <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">المسدد (واصل)</p><p className="text-2xl font-mono font-black text-emerald-600">${stats.received.toLocaleString()}</p></div>
                                </Card>
                                <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-white to-red-50 flex items-center gap-5">
                                    <div className="p-4 bg-red-100 text-red-600 rounded-2xl shadow-inner"><TrendingDown size={28} /></div>
                                    <div><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">المشتريات (دين)</p><p className="text-2xl font-mono font-black text-red-600">${stats.sales.toLocaleString()}</p></div>
                                </Card>
                                <div className={`p-6 rounded-[2rem] border-0 shadow-xl flex items-center gap-5 transition-all duration-500 ${(displayAgent.agentDetails?.currentBalance || 0) < 0 ? 'bg-red-600 text-white' : 'bg-[#0e3c63] text-white'}`}>
                                    <div className="p-4 bg-white/20 rounded-2xl shadow-xl backdrop-blur-md border border-white/10"><CreditCard size={28} /></div>
                                    <div>
                                        <p className="text-[10px] opacity-70 font-black uppercase tracking-widest mb-1">الموقف المالي الحالي</p>
                                        <p className="text-2xl font-mono font-black tracking-tighter" dir="ltr">
                                            {(displayAgent.agentDetails?.currentBalance || 0) < 0 ? '-' : ''}${Math.abs(displayAgent.agentDetails?.currentBalance || 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Card className="p-0 overflow-hidden border border-gray-100 shadow-2xl rounded-[3rem]">
                                <div className="p-8 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className="bg-white p-4 rounded-2xl border border-gray-200 text-[#0e3c63] shadow-lg"><FileText size={28} /></div>
                                        <div>
                                            <h3 className="font-black text-2xl text-gray-800">كشف حساب التفصيلي</h3>
                                            <p className="text-sm text-gray-500 font-bold">عرض تاريخي لجميع الحركات المالية والطلبات والديون</p>
                                        </div>
                                    </div>
                                    {canEdit && (
                                        <div className="flex gap-3">
                                            <Button onClick={() => setWalletModal({ isOpen: true, agent: selectedAgent, mode: 'deposit', amount: '', notes: '' })} className="bg-emerald-500 hover:bg-emerald-600 h-14 px-8 rounded-2xl shadow-lg font-black"><TrendingUp size={20} /> تسديد (واصل)</Button>
                                            <Button onClick={() => setWalletModal({ isOpen: true, agent: selectedAgent, mode: 'withdraw', amount: '', notes: '' })} className="bg-red-500 hover:bg-red-600 h-14 px-8 rounded-2xl shadow-lg font-black"><TrendingDown size={20} /> سحب (قيد)</Button>
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-x-auto min-h-[400px]">
                                    <table className="w-full text-right text-sm">
                                        <thead className="bg-white text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] border-b">
                                            <tr>
                                                <th className="p-6 pr-10">تاريخ العملية</th>
                                                <th className="p-6">نوع الحركة</th>
                                                <th className="p-6">البيان والسبب</th>
                                                <th className="p-6 text-left">المبلغ ($)</th>
                                                <th className="p-6 text-center">الإجراء</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 bg-white">
                                            {currentTransactions.map((t: any) => (
                                                <tr key={t.id} className="hover:bg-blue-50/30 transition-all group">
                                                    <td className="p-6 pr-10">
                                                        <div className="flex flex-col font-mono">
                                                            <span className="font-black text-gray-800 text-sm">{formatDate(t.createdAt)}</span>
                                                            <span className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1.5"><Clock size={12} /> {formatTime(t.createdAt)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${t.amount >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                            {t.amount >= 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                                            {t.amount >= 0 ? 'إيداع / واصل' : 'سحب / شراء'}
                                                        </span>
                                                    </td>
                                                    <td className="p-6 text-gray-700 font-bold text-sm leading-relaxed max-w-[300px]">{t.description}</td>
                                                    <td className={`p-6 text-left font-mono font-black text-2xl ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                                                        {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <button onClick={() => { const ord = db.orders.find(o => t.description.includes(o.id.toString())); if (ord) onViewOrder(ord); }} className="text-gray-300 hover:text-[#0e3c63] p-3 rounded-xl hover:bg-white hover:shadow-md transition-all active:scale-90 disabled:opacity-20" disabled={!t.description.includes('#')}><Eye size={22} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                            {/* Pagination Control */}
                            <div className="mt-4">
                                <PaginationControl
                                    page={page}
                                    rowsPerPage={rowsPerPage}
                                    setPage={setPage}
                                    setRowsPerPage={setRowsPerPage}
                                    totalItems={agentTransactions.filter((t: any) => t.description.toLowerCase().includes(searchTerm) || t.amount.toString().includes(searchTerm)).length}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- NEW TABBED AGENT MODAL --- */}
            {showAgentModal && (
                <div className="fixed inset-0 bg-[#0e3c63]/40 backdrop-blur-md z-[600] flex items-center justify-center p-4 !mt-0">
                    <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-fade-in border border-white/20">
                        {/* Header */}
                        <div className="p-8 pb-0 bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] text-white shrink-0">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-5">
                                    <div className="p-4 bg-white/10 rounded-3xl shadow-inner"><UserPlus size={32} /></div>
                                    <div>
                                        <h3 className="font-black text-2xl">{editingAgent ? `تعديل بيانات الوكيل` : 'تسجيل وكيل جديد'}</h3>
                                        <p className="text-blue-200 text-xs font-bold opacity-70 uppercase tracking-widest mt-1">
                                            {editingAgent ? editingAgent.fullName : 'إنشاء حساب وكالة جديد'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowAgentModal(false)} className="bg-white/10 hover:bg-red-500 p-3 rounded-2xl transition-all shadow-inner"><X size={24} /></button>
                            </div>

                            {/* Tabs Navigation Removed from Header */}
                        </div>

                        {/* TAB NAVIGATOR - MOVED HERE (Pill Style) */}
                        <div className="flex bg-gray-100 p-1.5 mx-8 mt-6 rounded-2xl shrink-0">
                            {[
                                { id: 'general', label: 'المعلومات العامة', icon: Info },
                                { id: 'permissions', label: 'النوع والمميزات', icon: Shield },
                                { id: 'security', label: 'الأمان والدخول', icon: Lock },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-black transition-all ${activeTab === tab.id ? 'bg-white text-[#0e3c63] shadow-md' : 'text-gray-400 hover:bg-white/50'}`}
                                >
                                    <tab.icon size={16} /> {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 bg-[#f8fafc] overflow-y-auto custom-scrollbar p-8">
                            <form onSubmit={handleSaveAgent} className="max-w-3xl mx-auto space-y-8">
                                {activeTab === 'general' && (
                                    <div className="space-y-8 animate-fade-in">
                                        <div className="flex justify-center mb-6">
                                            <AvatarUploader
                                                currentAvatarUrl={avatarUrl}
                                                currentAvatarPath={avatarPath}
                                                userName={fullName || 'وكيل جديد'}
                                                targetUserId={(editingAgent?.id as any) || undefined}
                                                onUploadSuccess={(path) => {
                                                    setAvatarPath(path);
                                                    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
                                                    setAvatarUrl(data.publicUrl);
                                                }}
                                            />
                                        </div>

                                        <div className="w-full relative">
                                            <Input
                                                label="اسم الوكالة / الوكيل"
                                                value={fullName}
                                                onChange={e => { setFullName(e.target.value); setFieldErrors(prev => ({ ...prev, fullName: false })); }}
                                                placeholder="مثلاً: مكتب دجلة للتجارة"
                                                required
                                                className={fieldErrors.fullName ? '!border-rose-400 !bg-rose-50/50 text-rose-900 focus:!ring-rose-200 !shadow-[0_0_0_4px_rgba(251,113,133,0.1)]' : ''}
                                            />
                                            {fieldErrors.fullName && <div className="absolute left-4 top-[44px] text-rose-500 animate-pulse"><AlertCircle size={20} /></div>}
                                        </div>


                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                            <div className="relative">
                                                <ModernProvinceSelector
                                                    value={province}
                                                    onChange={(val) => { setProvince(val); setFieldErrors(prev => ({ ...prev, province: false })); }}
                                                />
                                                {fieldErrors.province && <div className="absolute left-12 top-[44px] text-rose-500 animate-pulse pointer-events-none z-10"><AlertCircle size={20} /></div>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">رقم الهاتف</label>
                                                <div className="relative">
                                                    <PhoneInput
                                                        value={phone}
                                                        onChange={(val) => { setPhone(val); setFieldErrors(prev => ({ ...prev, phone: false })); }}
                                                        placeholder="770 123 4567"
                                                        className={fieldErrors.phone ? '!border-rose-400 !bg-rose-50/50 text-rose-900' : ''}
                                                    />
                                                    {fieldErrors.phone && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 animate-pulse"><AlertCircle size={20} /></div>}
                                                </div>
                                            </div>
                                        </div>

                                        <Input label="العنوان التفصيلي" value={address} onChange={e => setAddress(e.target.value)} placeholder="المنطقة، الشارع، أقرب نقطة دالة..." />
                                    </div>
                                )}

                                {activeTab === 'permissions' && (
                                    <div className="space-y-8 animate-fade-in">
                                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                                            <ModernTypeSelector value={agentType} onChange={setAgentType} />
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">صلاحيات وقيود الحساب</h4>

                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-xl ${allowCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}><TrendingDown size={20} /></div>
                                                        <div>
                                                            <p className="font-bold text-gray-800 text-sm">السماح بالطلب الآجل (الدين)</p>
                                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">يمكن للوكيل إرسال طلبات حتى في حالة عدم توفر رصيد كافي</p>
                                                        </div>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" checked={allowCredit} onChange={e => setAllowCredit(e.target.checked)} />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0e3c63]"></div>
                                                    </label>
                                                </div>

                                                <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-xl ${showQueue ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}><ListOrdered size={20} /></div>
                                                        <div>
                                                            <p className="font-bold text-gray-800 text-sm">مشاهدة طابور الإنتاج</p>
                                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">السماح للوكيل بمتابعة حالة طلباته في خط الإنتاج مباشرة</p>
                                                        </div>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" checked={showQueue} onChange={e => setShowQueue(e.target.checked)} />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0e3c63]"></div>
                                                    </label>
                                                </div>

                                                <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-xl ${allowSpecial ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}><Sparkles size={20} /></div>
                                                        <div>
                                                            <p className="font-bold text-gray-800 text-sm">السماح بالطلبات الخاصة</p>
                                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">تفعيل خيار "طلب خاص" عند إرسال الطلبات للتخصيص الكامل</p>
                                                        </div>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" checked={allowSpecial} onChange={e => setAllowSpecial(e.target.checked)} />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0e3c63]"></div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-gray-200">
                                            <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest px-2">الإجراءات العقابية وتجميد الحساب</h4>
                                            <div className={`p-6 rounded-[2rem] border-2 transition-all ${isFrozen ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${isFrozen ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-400'}`}><Snowflake size={20} /></div>
                                                        <span className={`font-black text-sm ${isFrozen ? 'text-red-700' : 'text-gray-500'}`}>تجميد الحساب مؤقتاً</span>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" checked={isFrozen} onChange={e => setIsFrozen(e.target.checked)} />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                                    </label>
                                                </div>
                                                {isFrozen && (
                                                    <div className="mt-4 animate-fade-in">
                                                        <label className="block text-xs font-black text-red-400 mb-2 mr-1">رسالة التجميد (تظهر عند محاولة الدخول)</label>
                                                        <input
                                                            value={freezeMessage}
                                                            onChange={e => setFreezeMessage(e.target.value)}
                                                            className="w-full h-12 bg-white border border-red-200 rounded-xl px-4 text-sm font-bold text-red-700 placeholder:text-red-300 outline-none focus:ring-2 focus:ring-red-100"
                                                            placeholder="مثلاً: يرجى التواصل مع الإدارة لتسوية الديون..."
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">ملاحظات إدارية (داخلية فقط)</label>
                                            <textarea
                                                value={internalNotes}
                                                onChange={e => setInternalNotes(e.target.value)}
                                                className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-600 focus:border-[#0e3c63] outline-none min-h-[100px]"
                                                placeholder="ملاحظات وسجلات خاصة بالإدارة لا يراها الوكيل..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'security' && (
                                    <div className="space-y-8 animate-fade-in">
                                        <div className="bg-amber-50/50 p-6 rounded-[2.5rem] border border-amber-100 text-amber-800 text-sm font-bold leading-relaxed flex gap-4">
                                            <ShieldAlert className="shrink-0" />
                                            <p>تغيير إعدادات الأمان وكلمة المرور هو إجراء حساس. تأكد من هوية الشخص الذي تمنحه صلاحيات الدخول، حيث أن جميع العمليات التي ستتم من خلال هذا الحساب ستكون مسجلة باسمه.</p>
                                        </div>

                                        <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-gray-100 space-y-6">
                                            {/* Email Field - Moved Here */}
                                            <div className="space-y-2 relative">
                                                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                                    <Monitor size={16} className="text-[#0e3c63]" /> البريد الإلكتروني (للدخول)
                                                </h4>
                                                <Input
                                                    value={email}
                                                    onChange={e => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: false })); }}
                                                    placeholder="agent@example.com"
                                                    required
                                                    dir="ltr"
                                                    className={fieldErrors.email ? '!border-rose-400 !bg-rose-50/50 text-rose-900 focus:!ring-rose-200 !shadow-[0_0_0_4px_rgba(251,113,133,0.1)]' : ''}
                                                />
                                                {fieldErrors.email && <div className="absolute left-3 top-[38px] text-rose-500 animate-pulse"><AlertCircle size={18} /></div>}
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                                <h4 className="font-black text-gray-800 flex items-center gap-2"><Key size={20} className="text-[#0e3c63]" /> إعدادات الدخول</h4>
                                                {editingAgent && (
                                                    <button type="button" onClick={() => setIsEditingPassword(!isEditingPassword)} className="text-xs font-black text-[#0e3c63] hover:underline">
                                                        {isEditingPassword ? 'إلغاء التعيين' : 'تعيين كلمة مرور جديدة'}
                                                    </button>
                                                )}
                                            </div>

                                            {/* New Agent Auth Method Toggle */}
                                            {!editingAgent && (
                                                <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAuthMethod('manual')}
                                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-black transition-all ${authMethod === 'manual' ? 'bg-white text-[#0e3c63] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        تعيين كلمة مرور
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAuthMethod('invite')}
                                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-black transition-all ${authMethod === 'invite' ? 'bg-white text-[#0e3c63] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        إرسال دعوة
                                                    </button>
                                                </div>
                                            )}

                                            {(isEditingPassword || (!editingAgent && authMethod === 'manual')) && (
                                                <div className="animate-fade-in space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="relative">
                                                            <input
                                                                type="password"
                                                                value={password}
                                                                onChange={e => setPassword(e.target.value)}
                                                                className="w-full h-14 bg-gray-50 border-2 border-gray-200 rounded-xl px-5 pl-12 font-bold text-lg focus:border-[#0e3c63] outline-none transition-all placeholder:text-gray-300 placeholder:font-normal placeholder:text-sm"
                                                                placeholder="أدخل كلمة المرور الجديدة..."
                                                            />
                                                            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        </div>
                                                        <div className="relative">
                                                            <input
                                                                type="password"
                                                                value={confirmPassword}
                                                                onChange={e => setConfirmPassword(e.target.value)}
                                                                className={`w-full h-14 bg-gray-50 border-2 rounded-xl px-5 pl-12 font-bold text-lg focus:border-[#0e3c63] outline-none transition-all placeholder:text-gray-300 placeholder:font-normal placeholder:text-sm ${confirmPassword && password !== confirmPassword ? 'border-red-300 focus:border-red-500' : 'border-gray-200'}`}
                                                                placeholder="تأكيد كلمة المرور..."
                                                            />
                                                            <Check size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${confirmPassword && password === confirmPassword ? 'text-emerald-500' : 'text-gray-300'}`} />
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold px-2"> يجب أن تكون كلمة المرور قوية وتتكون من 6 أرقام أو حروف على الأقل.</p>
                                                </div>
                                            )}

                                            {!editingAgent && authMethod === 'invite' && (
                                                <div className="p-4 bg-blue-50 text-[#0e3c63] rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                                                    <Info size={16} />
                                                    سيتم إرسال رابط تعيين كلمة المرور إلى البريد الإلكتروني المدخل.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.05)] z-20 flex gap-4">
                            <Button
                                onClick={(e) => handleSaveAgent(e as any)}
                                disabled={isSubmitting}
                                className={`flex-1 h-16 text-lg font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 overflow-hidden relative ${validationButtonFlip
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white scale-[1.02] ring-4 ring-rose-200'
                                    : (
                                        authMethod === 'invite'
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-2xl hover:from-blue-700 hover:to-indigo-700 text-white'
                                            : 'bg-[#0e3c63] hover:bg-indigo-600 text-white hover:shadow-2xl'
                                    )
                                    } ${isSubmitting ? 'cursor-wait opacity-80' : 'active:scale-95'}`}
                            >
                                <div className={`flex items-center justify-center gap-2 transition-all duration-500 absolute w-full ${validationButtonFlip || isSubmitting ? '-translate-y-12 opacity-0' : 'translate-y-0 opacity-100'}`}>
                                    {authMethod === 'invite' && !editingAgent ? <Mail size={24} className="ml-2" /> : <Save size={24} className="ml-2" />}
                                    {authMethod === 'invite' && !editingAgent
                                        ? 'إرسال دعوة وإضافة الوكيل'
                                        : (editingAgent ? 'حفظ التغييرات' : 'إضافة وكيل جديد')
                                    }
                                </div>

                                {/* Error State */}
                                <div className={`flex items-center justify-center gap-2 transition-all duration-500 absolute w-full text-white ${validationButtonFlip ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                                    <AlertCircle size={20} className="ml-2" /> {validationError || 'يرجى إكمال الحقول المطلوبة'}
                                </div>

                                {/* Loading State */}
                                <div className={`flex items-center justify-center gap-2 transition-all duration-500 absolute w-full ${isSubmitting ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> {authMethod === 'invite' ? 'جاري الإرسال...' : 'جاري الحفظ...'}
                                </div>
                            </Button>
                            <button
                                onClick={() => setShowAgentModal(false)}
                                className="px-8 h-16 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Wallet Modal */}
            {
                walletModal.isOpen && walletModal.agent && (
                    <div className="fixed inset-0 bg-[#0e3c63]/40 z-[700] flex items-center justify-center p-4 backdrop-blur-md !mt-0">
                        <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-fade-in border-t-[12px] border-[#0e3c63]">
                            <div className="p-10 text-center space-y-6">
                                <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-2 shadow-2xl ${walletModal.mode === 'deposit' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {walletModal.mode === 'deposit' ? <TrendingUp size={48} /> : <TrendingDown size={48} />}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800">{walletModal.mode === 'deposit' ? 'تسجيل واصل جديد' : 'تسجيل قيد مالي'}</h3>
                                    <p className="text-sm font-bold text-gray-500 mt-1">تعديل رصيد الوكيل: {walletModal.agent.fullName}</p>
                                </div>
                            </div>
                            <form onSubmit={handleWalletSubmit} className="p-10 pt-0 space-y-8">
                                <div className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                                    <label className="block text-xs font-black text-gray-400 uppercase text-center mb-4 tracking-widest">المبلغ المدخل ($)</label>
                                    <div className="relative">
                                        <input type="number" className="w-full text-5xl font-black font-mono text-center bg-transparent outline-none text-[#0e3c63] placeholder:text-gray-200" placeholder="0" value={walletModal.amount} onChange={e => setWalletModal({ ...walletModal, amount: e.target.value })} autoFocus required />
                                    </div>
                                </div>

                                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-3">
                                    <div className="flex justify-between text-xs font-bold text-gray-400">
                                        <span>الرصيد قبل العملية:</span>
                                        <span dir="ltr">${(walletModal.agent.agentDetails?.currentBalance || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-black text-gray-800 pt-3 border-t border-blue-100">
                                        <span>الرصيد بعد العملية:</span>
                                        <span className={expectedBalance < 0 ? 'text-red-600' : 'text-emerald-600'} dir="ltr">${expectedBalance.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">بيان العملية (ملاحظات)</label>
                                    <textarea className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-sm focus:border-[#0e3c63] outline-none min-h-[80px]" placeholder="مثلاً: دفعة نقدية، تسوية حساب..." value={walletModal.notes} onChange={(e: any) => setWalletModal({ ...walletModal, notes: e.target.value })} />
                                </div>

                                <div className="flex gap-4">
                                    <Button type="submit" disabled={isSubmitting} className={`flex-1 h-16 font-black text-white text-lg rounded-2xl shadow-xl ${walletModal.mode === 'deposit' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'} active:scale-95 transition-all`}>
                                        {isSubmitting ? 'جاري التنفيذ...' : 'تأكيد وحفظ العملية'}
                                    </Button>
                                    <button type="button" onClick={() => setWalletModal({ ...walletModal, isOpen: false })} className="px-8 h-16 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all">إلغاء</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirm Modal */}
            {
                deleteConfirmModal.isOpen && deleteConfirmModal.agent && (
                    <div className="fixed inset-0 bg-[#0e3c63]/70 backdrop-blur-md z-[700] flex items-center justify-center p-4 animate-fade-in !mt-0">
                        <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
                            <div className="bg-gradient-to-br from-red-600 to-red-800 p-10 text-white text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-contain opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                                <div className="relative z-10">
                                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">
                                        <AlertOctagon size={42} className="text-white animate-pulse" />
                                    </div>
                                    <h3 className="text-2xl font-black mb-2">إلغاء اعتماد وكيل</h3>
                                    <p className="text-red-100 text-sm font-bold opacity-80">أنت على وشك حذف حساب الوكيل نهائياً من النظام</p>
                                </div>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-red-600 font-black text-xl shadow-sm border border-gray-100">
                                        {deleteConfirmModal.agent.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">اسم الوكالة:</span>
                                        <span className="font-black text-gray-800 text-lg">{deleteConfirmModal.agent.fullName}</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-400 block mt-1">Agent ID: AGT-000{deleteConfirmModal.agent.id}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        onClick={executeDeleteAgent}
                                        className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 border-b-4 border-red-800"
                                    >
                                        <Trash2 size={20} /> تأكيد الحذف النهائي
                                    </Button>

                                    <button
                                        onClick={() => setDeleteConfirmModal({ isOpen: false, agent: null })}
                                        className="w-full h-14 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm transition-all border border-gray-200"
                                    >
                                        إلغاء التراجع
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Active Orders Warning Modal */}
            {
                activeOrdersModal.isOpen && (
                    <div className="fixed inset-0 bg-[#0e3c63]/60 backdrop-blur-md z-[700] flex items-center justify-center p-4 !mt-0">
                        <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in border-t-[12px] border-amber-500">
                            <div className="p-10 text-center space-y-6">
                                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl ring-8 ring-amber-50"><ShieldAlert size={42} /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800 mb-2">لا يمكن حذف الوكيل!</h3>
                                    <p className="text-gray-500 font-bold leading-relaxed px-4">وكالة <span className="text-[#0e3c63] font-black">"{activeOrdersModal.agentName}"</span> لديها طلبات نشطة في قائمة الإنتاج حالياً. يرجى إكمال أو إلغاء الطلبات أولاً ليتم السماح بالحذف.</p>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">أرقام الطلبات النشطة:</p>
                                    <div className="flex flex-wrap justify-center gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                        {activeOrdersModal.orderIds.map(id => (
                                            <span key={id} className="bg-white border border-amber-200 px-4 py-2 rounded-xl text-sm font-mono font-black text-[#0e3c63] shadow-sm">#{id}</span>
                                        ))}
                                    </div>
                                </div>

                                <Button onClick={() => setActiveOrdersModal(prev => ({ ...prev, isOpen: false }))} className="w-full h-16 bg-[#0e3c63] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all mt-4">فهمت، سأقوم بالمراجعة</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Financial Safety Modal */}
            {
                deleteSafetyModal.isOpen && deleteSafetyModal.agent && (
                    <div className="fixed inset-0 bg-[#0e3c63]/60 backdrop-blur-md z-[700] flex items-center justify-center p-4 !mt-0">
                        <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in border-t-[12px] border-red-500">
                            <div className="p-10 text-center space-y-6">
                                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl ring-8 ring-red-50"><AlertOctagon size={42} /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800 mb-2">تنبيه مالي حرج!</h3>
                                    <p className="text-gray-500 font-bold leading-relaxed px-4">لا يمكن حذف حساب الوكيل <span className="text-[#0e3c63] font-black">"{deleteSafetyModal.agent.fullName}"</span> لأن الرصيد الحالي ليس (صفر).</p>
                                </div>

                                <div className={`p-6 rounded-[2rem] border-2 border-dashed ${deleteSafetyModal.balance < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{deleteSafetyModal.balance < 0 ? 'المبلغ المطلوب ذمة بذمة الوكيل' : 'المبلغ المتبقي للوكيل كدائن'}</p>
                                    <p className={`text-4xl font-mono font-black ${deleteSafetyModal.balance < 0 ? 'text-red-600' : 'text-green-600'}`} dir="ltr">${Math.abs(deleteSafetyModal.balance).toLocaleString()}</p>
                                </div>

                                <p className="text-xs text-gray-400 font-bold">يرجى تسوية الحساب المالي (تصفير الرصيد) قبل محاولة الحذف لضمان دقة السجلات المالية للنظام.</p>

                                <Button onClick={() => setDeleteSafetyModal({ isOpen: false, agent: null, balance: 0 })} className="w-full h-16 bg-[#0e3c63] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all mt-4">إغلاق وتوجه لتسوية الحساب</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Suspend/Freeze Confirmation Modal */}
            {
                agentSuspendConfirm && (
                    <div className="fixed inset-0 bg-[#0e3c63]/70 backdrop-blur-md z-[700] flex items-center justify-center p-4 animate-fade-in !mt-0">
                        <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
                            <div className={`p-10 text-white text-center relative overflow-hidden ${agentSuspendConfirm.agentDetails?.isFrozen ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-amber-500 to-amber-700'}`}>
                                <div className="absolute top-0 left-0 w-full h-full bg-contain opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                                <div className="relative z-10">
                                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">
                                        {agentSuspendConfirm.agentDetails?.isFrozen ? <CheckCircle size={42} className="text-white animate-pulse" /> : <ShieldAlert size={42} className="text-white animate-pulse" />}
                                    </div>
                                    <h3 className="text-2xl font-black mb-2">{agentSuspendConfirm.agentDetails?.isFrozen ? 'تنشيط الحساب' : 'تجميد الحساب'}</h3>
                                    <p className="text-white text-sm font-bold opacity-80">
                                        {agentSuspendConfirm.agentDetails?.isFrozen ? 'هل أنت متأكد من إعادة تفعيل وكالة المستخدم؟' : 'هل أنت متأكد من تجميد وكالة المستخدم مؤقتاً؟'}
                                    </p>
                                </div>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex items-center gap-4">
                                    <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border border-gray-100 ${agentSuspendConfirm.agentDetails?.isFrozen ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {agentSuspendConfirm.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">الاسم الكامل:</span>
                                        <span className="font-black text-gray-800 text-lg">{agentSuspendConfirm.fullName}</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-400 block mt-1">System ID: AGT-00{agentSuspendConfirm.id}</span>
                                    </div>
                                </div>

                                <div className={`border rounded-2xl p-4 text-center ${agentSuspendConfirm.agentDetails?.isFrozen ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <p className={`font-black text-sm mb-1 ${agentSuspendConfirm.agentDetails?.isFrozen ? 'text-emerald-700' : 'text-amber-700'}`}>ℹ️ ماذا يعني هذا الإجراء؟</p>
                                    <p className={`text-xs font-bold ${agentSuspendConfirm.agentDetails?.isFrozen ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {agentSuspendConfirm.agentDetails?.isFrozen ? 'سيتمكن الوكيل من الدخول للنظام وإجراء الطلبات' : 'لن يتمكن الوكيل من تسجيل الدخول للنظام'}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        onClick={executeSuspendAgent}
                                        className={`w-full h-16 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg transition-all border-b-4 ${agentSuspendConfirm.agentDetails?.isFrozen
                                            ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-700 active:scale-95'
                                            : 'bg-amber-500 hover:bg-amber-600 border-amber-700 active:scale-95'
                                            }`}
                                    >
                                        {agentSuspendConfirm.agentDetails?.isFrozen ? <CheckCircle size={20} /> : <ShieldX size={20} />}
                                        {agentSuspendConfirm.agentDetails?.isFrozen ? 'تأكيد تنشيط الحساب' : 'تأكيد تجميد الحساب'}
                                    </Button>

                                    <button
                                        onClick={() => setAgentSuspendConfirm(null)}
                                        className="w-full h-14 rounded-2xl font-black text-sm transition-all border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
                                    >
                                        إلغاء الأمر
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
