import { getProductUnit } from '../../../lib/productFamilies';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus, MapPin, Wallet, ArrowRight, Settings, TrendingUp, TrendingDown,
    FileText, Search, Filter, Eye, Globe, History, UserPlus, X, Info, Receipt,
    ShieldAlert, Landmark, Snowflake, ListOrdered, Save, ArrowUpRight, ArrowDownLeft,
    Check, ChevronDown, Award, User, Trash2, AlertOctagon, XCircle, Copy, Hash, Fingerprint, Activity, Clock, Monitor, Shield, Edit3, Smartphone, Laptop, CreditCard, UserCheck, CheckCircle,
    Users, Sparkles, Phone, Key, Lock, Unlock, Mail, AlertCircle, ShieldX
} from 'lucide-react';
import { UserAvatar, Badge, Button, Card, Input, PhoneInput, DateRangePicker } from '../../../components/ui';
import { AvatarUploader } from '../../../components/profile/AvatarUploader';
import { formatDate, formatTime } from '../../../lib/dateUtils';
import { supabase } from '../../../lib/supabase';
import { AgentType, UserRole, User as UserType, ProductionStatus, PaymentStatus, UserRoleLabels, Order, ProductionStatusLabels } from '../../../types';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { PROVINCES_IRAQ } from '../../../lib/constants';
import { db } from '../../../lib/db';
import { sortOrderItemsByProductCode } from '../../../lib/orderItems';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import carbonFibre from '../../../assets/patterns/carbon-fibre.png';

// --- MODERN PROVINCE SELECTOR WITH SEARCH ---
const ModernProvinceSelector = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
    const { t } = useTranslation();
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
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">{t('batch4.k252')}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[60px] flex items-center justify-between px-5 bg-white border-2 rounded-2xl transition-all duration-300 ${isOpen ? 'border-[#0e3c63] ring-4 ring-blue-50 shadow-lg' : 'border-gray-100 hover:border-blue-200'}`}
            >
                <div className="flex items-center gap-3">
                    <MapPin size={20} className={isOpen ? 'text-[#0e3c63]' : 'text-gray-400'} />
                    <span className={`font-bold ${value ? 'text-gray-800' : 'text-gray-400'}`}>{value || t('agents.select_province')}</span>
                </div>
                <ChevronDown size={18} className={`text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-3xl shadow-2xl border border-gray-100 z-[500] overflow-hidden animate-fade-in">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                            <input
                                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:border-[#0e3c63]"
                                placeholder={t('batch4.k253')}
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
    const { t } = useTranslation();
    return (
        <div className="space-y-2 w-full">
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 mr-1">{t('batch4.k254')}</label>
            <div className="grid grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => onChange(AgentType.NORMAL)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${value === AgentType.NORMAL ? 'bg-white border-[#0e3c63] shadow-md ring-1 ring-[#0e3c63]/10' : 'bg-gray-50 border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-gray-200'}`}
                >
                    <div className={`p-2 rounded-xl ${value === AgentType.NORMAL ? 'bg-blue-50 text-[#0e3c63]' : 'bg-white text-gray-400'}`}>
                        <User size={20} />
                    </div>
                    <span className="text-xs font-black">{t('batch4.k255')}</span>
                </button>

                <button
                    type="button"
                    onClick={() => onChange(AgentType.VIP)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${value === AgentType.VIP ? 'bg-white border-amber-500 shadow-md ring-1 ring-amber-500/10' : 'bg-gray-50 border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-gray-200'}`}
                >
                    <div className={`p-2 rounded-xl ${value === AgentType.VIP ? 'bg-amber text-amber-600' : 'bg-white text-gray-400'}`}>
                        <Award size={20} />
                    </div>
                    <span className="text-xs font-black">{t('batch4.k256')}</span>
                </button>
            </div>
        </div>
    );
};

const formatSignedMoney = (value: number) => `${value < 0 ? '-' : value > 0 ? '+' : ''}$${Math.abs(value).toLocaleString()}`;

const isAgentDebtMovement = (tx: any) => {
    const description = tx.description || '';
    return (Number(tx.amount) || 0) < 0 && (
        description.includes('شراء طلبية #') ||
        description.includes('تعديل قيمة الطلب #')
    );
};

export const AgentsTab = ({ agents, selectedAgent, agentTransactions, canEdit, isSuperAdmin, onSelectAgent, onViewOrder }: any) => {
    const { t } = useTranslation();
    
    const translateDesc = (desc: string) => {
        if (!desc) return '';
        let res = desc;
        res = res.replace('تنزيل فاتورة', t('batch4.tx_desc_1', 'تنزيل فاتورة'));
        res = res.replace('تسديد رصيد يدوي', t('batch4.tx_desc_10', 'تسديد رصيد يدوي'));
        res = res.replace('تسديد دفعة للطلب', t('batch4.tx_desc_2', 'تسديد دفعة للطلب'));
        res = res.replace('تعديل رصيد للطلب', t('batch4.tx_desc_3', 'تعديل رصيد للطلب'));
        res = res.replace('تسديد إضافي للطلب', t('batch4.tx_desc_6', 'تسديد إضافي للطلب'));
        res = res.replace('تعديل رصيد يدوي', t('batch4.tx_desc_8', 'تعديل رصيد يدوي'));
        res = res.replace('بواسطة', t('batch4.tx_desc_7', 'بواسطة'));
        res = res.replace('نقصان', t('batch4.tx_desc_4', 'نقصان'));
        res = res.replace('زيادة', t('batch4.tx_desc_5', 'زيادة'));
        res = res.replace('دفعة', t('batch4.tx_desc_9', 'دفعة'));
        return res;
    };

    // --- STATE MANAGEMENT ---
    const { user: currentUser } = useAuth();
    const { success, error, info } = useToast();

    // Pagination & Search
    const [listPage, setListPage] = useState(0);
    const [listRowsPerPage, setListRowsPerPage] = useState(12);
    const [agentTypeFilter, setAgentTypeFilter] = useState<'ALL' | AgentType>('ALL');
    const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'DEBT' | 'CREDIT'>('ALL');
    const [listSearch, setListSearch] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [fromDate, setFromDate] = useState<Date | undefined>();
    const [toDate, setToDate] = useState<Date | undefined>();
    const [walletTypeFilter, setWalletTypeFilter] = useState('ALL');
    const [showThumbprintModal, setShowThumbprintModal] = useState(false);
    const [agentDetailTab, setAgentDetailTab] = useState<'statement' | 'orders'>('statement');
    const [agentOrderSearch, setAgentOrderSearch] = useState('');
    const [agentOrderPage, setAgentOrderPage] = useState(0);
    const [agentOrderRowsPerPage, setAgentOrderRowsPerPage] = useState(10);
    const [agentOrderPaymentModal, setAgentOrderPaymentModal] = useState<{ order: Order | null, amount: string, editingPaymentId: number | null, editAmount: string }>({ order: null, amount: '', editingPaymentId: null, editAmount: '' });
    const [agentOrderEditModal, setAgentOrderEditModal] = useState<{ order: Order | null, items: any[], discountValue: number, discountType: 'FIXED' | 'PERCENT' }>({ order: null, items: [], discountValue: 0, discountType: 'FIXED' });

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
    const [agentPriceIncreasePercent, setAgentPriceIncreasePercent] = useState('');
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
    const [walletModal, setWalletModal] = useState<{ isOpen: boolean, agent: UserType | null, mode: 'deposit' | 'withdraw' | 'settlement', amount: string, notes: string, editId?: string }>({
        isOpen: false, agent: null, mode: 'deposit', amount: '', notes: ''
    });
    const [lossModal, setLossModal] = useState<{ isOpen: boolean, agent: UserType | null, amount: string, notes: string }>({
        isOpen: false, agent: null, amount: '', notes: ''
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
    const [deleteWalletTxModal, setDeleteWalletTxModal] = useState<{ isOpen: boolean, txId: number | null }>({
        isOpen: false, txId: null
    });

    // --- EFFECTS ---
    useEffect(() => {
        setPage(0);
        setSearchTerm('');
        setAgentDetailTab('statement');
        setAgentOrderSearch('');
        setAgentOrderPage(0);
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
                setAgentPriceIncreasePercent(String(editingAgent.agentDetails?.priceIncreasePercent || ''));
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
                setAgentPriceIncreasePercent('');
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

        if (!fullName.trim()) { errors.fullName = true; missingFields.push(t('batch3.txt_c7voho_7063')); }
        if (!province) { errors.province = true; missingFields.push(t('batch4.k252')); }
        if (!phone.trim()) { errors.phone = true; missingFields.push(t('batch4.k283')); }
        if (!email.trim()) { errors.email = true; missingFields.push(t('batch4.k856')); }

        // Password validation (only if manual and creating NEW or explicitly setting for existing)
        if (authMethod === 'manual') {
            if (!editingAgent && !password) { errors.password = true; missingFields.push(t('batch4.k571')); }
            if (editingAgent && isEditingPassword && !password) { errors.password = true; missingFields.push(t('batch4.k571')); }

            if (password && password.length < 6) {
                error(t('batch4.txt_q446tt_6979'), t('batch4.txt_9a8xp2_6979'));
                errors.password = true;
            }
            if (password !== confirmPassword) {
                error(t('batch4.k528'), t('batch4.k776'));
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
            error(t('batch4.txt_kvdazq_6979'), t('batch4.txt_x0iv3b_6979'));
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
                priceIncreasePercent: Math.max(0, Number(agentPriceIncreasePercent || 0)),
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

                if (password) info(t('batch4.txt_k1w9ej_6979'));
                success(t('batch4.txt_hdyvai_6979'), t('batch4.txt_3nlcgr_6979'));

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
                success(t('batch4.txt_7cvnuk_6980'), t('batch4.txt_rjgomx_6980'));
            }
            setShowAgentModal(false);
            setEditingAgent(null);
        } catch (err: any) {
            console.error('Error saving agent:', err);
            error(t('batch4.txt_wdlseu_6980'), err.message || t('batch4.txt_f4yc8h_6980'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- AGENT STATS ---
    const agentStats = useMemo(() => {
        let totalDebt = 0;
        let totalCredit = 0;
        let vipCount = 0;
        let normalCount = 0;
        let debtCount = 0;
        let creditCount = 0;
        agents.forEach((a: any) => {
            const bal = a.agentDetails?.currentBalance || 0;
            if (bal < 0) { totalDebt += Math.abs(bal); debtCount++; }
            else if (bal > 0) { totalCredit += bal; creditCount++; }
            if (a.agentDetails?.type === AgentType.VIP) vipCount++;
            else normalCount++;
        });
        return { totalDebt, totalCredit, vipCount, normalCount, debtCount, creditCount, total: agents.length };
    }, [agents]);

    // --- LOGIC HELPERS ---
    const filteredAgents = useMemo(() => {
        return agents.filter((a: any) => {
            const matchesSearch = a.fullName.toLowerCase().includes(listSearch.toLowerCase()) ||
                (a.province && a.province.includes(listSearch)) ||
                (a.phone && a.phone.includes(listSearch));
            const matchesType = agentTypeFilter === 'ALL' || a.agentDetails?.type === agentTypeFilter;
            const bal = a.agentDetails?.currentBalance || 0;
            const matchesBalance = balanceFilter === 'ALL' || (balanceFilter === 'DEBT' ? bal < 0 : bal > 0);
            return matchesSearch && matchesType && matchesBalance;
        });
    }, [agents, listSearch, agentTypeFilter, balanceFilter]);

    const currentAgents = useMemo(() => {
        return filteredAgents.slice(listPage * listRowsPerPage, (listPage + 1) * listRowsPerPage);
    }, [filteredAgents, listPage, listRowsPerPage]);

    const agentTransactionsWithBalance = useMemo(() => {
        if (!agentTransactions) return [];
        const sortedTx = [...agentTransactions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        let runningBalance = 0;
        const withBalance = sortedTx.map(tx => {
            runningBalance += tx.amount;
            return { ...tx, balanceAfter: runningBalance };
        });
        return withBalance.reverse();
    }, [agentTransactions]);

    const filteredTransactions = useMemo(() => {
        if (!agentTransactionsWithBalance) return [];
        return agentTransactionsWithBalance.filter((t: any) => {
            const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.amount.toString().includes(searchTerm);
            
            let matchesType = true;
            if (walletTypeFilter === 'ORDERS') matchesType = !!t.linkedOrderId || t.description.includes('#');
            else if (walletTypeFilter === 'DEPOSIT') matchesType = t.amount > 0 && (t.description.includes('إيداع') || t.description.includes('رصيد يدوي'));
            else if (walletTypeFilter === 'WITHDRAW') matchesType = t.amount < 0 && (t.description.includes('سحب') || (!t.linkedOrderId && !t.description.includes('#')));
            else if (walletTypeFilter === 'SETTLEMENT') matchesType = t.amount > 0 && t.description.includes('تسديد');

            let matchesDate = true;
            if (fromDate || toDate) {
                const txDate = new Date(t.createdAt);
                txDate.setHours(0, 0, 0, 0);
                if (fromDate) {
                    const f = new Date(fromDate);
                    f.setHours(0, 0, 0, 0);
                    if (txDate < f) matchesDate = false;
                }
                if (toDate) {
                    const tDate = new Date(toDate);
                    tDate.setHours(23, 59, 59, 999);
                    if (txDate > tDate) matchesDate = false;
                }
            }
            return matchesSearch && matchesDate && matchesType;
        });
    }, [agentTransactionsWithBalance, searchTerm, fromDate, toDate, walletTypeFilter]);

    const currentTransactions = useMemo(() => {
        return filteredTransactions.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    }, [filteredTransactions, page, rowsPerPage]);

    const selectedAgentOrders = useMemo(() => {
        if (!displayAgent) return [];
        return db.orders
            .filter(o => String(o.agentId) === String(displayAgent.id))
            .filter(o => {
                const term = agentOrderSearch.trim().toLowerCase();
                if (!term) return true;
                return String(o.id).includes(term) || o.items.some(item =>
                    item.productCode.toLowerCase().includes(term) ||
                    item.productDimensions.toLowerCase().includes(term)
                );
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [displayAgent, agentOrderSearch, agents, agentTransactions]);

    const currentAgentOrders = useMemo(() => {
        return selectedAgentOrders.slice(agentOrderPage * agentOrderRowsPerPage, (agentOrderPage + 1) * agentOrderRowsPerPage);
    }, [selectedAgentOrders, agentOrderPage, agentOrderRowsPerPage]);

    const agentFinancialSummary = useMemo(() => {
        const balance = displayAgent?.agentDetails?.currentBalance || 0;
        const debtMovements = (agentTransactions || []).filter(isAgentDebtMovement);
        const debt = debtMovements.reduce((acc: number, tx: any) => acc + Math.abs(Number(tx.amount) || 0), 0);
        const paid = Math.max(0, debt + balance);

        return {
            debt,
            paid,
            net: balance,
            debtCount: debtMovements.length,
            paidCount: (agentTransactions || []).filter((tx: any) => !isAgentDebtMovement(tx) && (Number(tx.amount) || 0) !== 0).length,
            totalCount: (agentTransactions || []).length
        };
    }, [displayAgent, agentTransactions]);

    const agentNetCardTheme = useMemo(() => {
        if (agentFinancialSummary.net < 0) {
            return {
                active: 'bg-red-600 text-white border-red-600 shadow-xl',
                idle: 'bg-red-50 border-red-100 hover:border-red-300 text-red-700',
                labelActive: 'text-red-100',
                labelIdle: 'text-red-700',
                subActive: 'text-red-100',
                subIdle: 'text-red-500'
            };
        }
        if (agentFinancialSummary.net > 0) {
            return {
                active: 'bg-emerald-600 text-white border-emerald-600 shadow-xl',
                idle: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300 text-emerald-700',
                labelActive: 'text-emerald-100',
                labelIdle: 'text-emerald-700',
                subActive: 'text-emerald-100',
                subIdle: 'text-emerald-500'
            };
        }
        return {
            active: 'bg-[#0e3c63] text-white border-[#0e3c63] shadow-xl',
            idle: 'bg-indigo-50 border-indigo-100 hover:border-indigo-300 text-[#0e3c63]',
            labelActive: 'text-indigo-100',
            labelIdle: 'text-indigo-700',
            subActive: 'text-indigo-100',
            subIdle: 'text-indigo-500'
        };
    }, [agentFinancialSummary.net]);

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
            success(t('batch4.txt_vwet5h_6980'));
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
                        freezeMessage: isFrozen ? '' : t('batch4.txt_w7o0ei_6980')
                    }
                });
                success(isFrozen ? t('batch4.txt_0gpdmd_6980') : t('batch4.txt_spsgcq_6980'));
                setAgentSuspendConfirm(null);
            } catch (e) {
                error(t('batch4.txt_f3fce9_7079'));
            }
        }
    };

    const toOrderUpdatePayload = (order: Order) => order.items.map(item => ({
        productId: item.productId,
        paintColor: item.paintColor,
        productSaleMode: item.productSaleMode,
        productMetersPerCarton: item.productMetersPerCarton,
        qMeters: item.quantityMeters,
        qCartons: item.quantityCartons,
        isSpecialRequest: item.isSpecialRequest,
        specialRequestNote: item.specialRequestNote,
        unitPriceCarton: item.unitPriceCarton,
        unitPriceMeter: item.unitPriceMeter,
        priceAdjustmentNote: item.priceAdjustmentNote
    }));

    const refreshAgentOrderPaymentModal = (orderId: Order['id']) => {
        const updated = db.orders.find(o => o.id == orderId) as Order | undefined;
        setAgentOrderPaymentModal({ order: updated || null, amount: '', editingPaymentId: null, editAmount: '' });
    };

    const payOldestAgentDebts = async (agent: UserType, amount: number) => {
        const openOrders = db.orders
            .filter(o => String(o.agentId) === String(agent.id))
            .filter(o => Math.max((o.totalAmount || 0) - (o.paidAmount || 0), 0) > 0)
            .sort((a, b) => {
                const dateDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                if (dateDiff !== 0) return dateDiff;
                return Number(a.id) - Number(b.id);
            });

        const totalDebt = openOrders.reduce((sum, order) => sum + Math.max((order.totalAmount || 0) - (order.paidAmount || 0), 0), 0);
        let remaining = amount;
        let paid = 0;
        const allocations: { id: Order['id']; amount: number }[] = [];
        for (const order of openOrders) {
            if (remaining <= 0) break;
            const orderDebt = Math.max((order.totalAmount || 0) - (order.paidAmount || 0), 0);
            const applied = Math.min(remaining, orderDebt);
            await db.updateOrder(currentUser!.id, order.id, toOrderUpdatePayload(order), applied, order.discountValue || 0, order.discountType || 'FIXED', { recordPaymentTransaction: false });
            remaining -= applied;
            paid += applied;
            allocations.push({ id: order.id, amount: applied });
        }

        return {
            paid: Math.min(paid, totalDebt),
            remainder: remaining,
            invoices: allocations.length,
            allocations
        };
    };

    const buildUnifiedAgentPaymentDescription = (amount: number, result: Awaited<ReturnType<typeof payOldestAgentDebts>>, note: string) => {
        const allocationText = result.allocations.length > 0
            ? `توزعت على ${result.allocations.length} فاتورة: ${result.allocations.map(a => `#${a.id} ($${a.amount.toLocaleString()})`).join('، ')}`
            : 'لا توجد فواتير مفتوحة';
        const remainderText = result.remainder > 0 ? ` | رصيد مقدم: $${result.remainder.toLocaleString()}` : '';
        const noteText = note.trim() ? ` | ملاحظة: ${note.trim()}` : '';
        return `تسديد موحد $${amount.toLocaleString()} - ${allocationText}${remainderText}${noteText}`;
    };

    const handleAgentInvoicePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        const order = agentOrderPaymentModal.order;
        if (!order) return;
        const amount = Number(agentOrderPaymentModal.amount || 0);
        const remaining = Math.max((order.totalAmount || 0) - (order.paidAmount || 0), 0);

        if (Number.isNaN(amount) || amount <= 0) { error('مبلغ الواصل غير صحيح'); return; }
        if (amount > remaining) { error('مبلغ الواصل أكبر من المتبقي'); return; }

        try {
            await db.updateOrder(currentUser!.id, order.id, toOrderUpdatePayload(order), amount, order.discountValue || 0, order.discountType || 'FIXED');
            success('تم تسجيل الواصل بنجاح');
            refreshAgentOrderPaymentModal(order.id);
        } catch (err: any) {
            error(err.message || 'تعذر تسجيل الواصل');
        }
    };

    const handleEditAgentOrderPayment = async (paymentId: number) => {
        const order = agentOrderPaymentModal.order;
        if (!order) return;
        const nextAmount = Number(agentOrderPaymentModal.editAmount || 0);
        if (Number.isNaN(nextAmount) || nextAmount <= 0) { error('مبلغ الدفعة غير صحيح'); return; }

        const otherPaymentsTotal = (order.paymentHistory || [])
            .filter(pay => pay.id !== paymentId)
            .reduce((sum, pay) => sum + (Number(pay.amountAdded) || 0), 0);
        if (otherPaymentsTotal + nextAmount > order.totalAmount) { error('مجموع الدفعات أكبر من الفاتورة'); return; }

        try {
            const nextHistory = (order.paymentHistory || []).map(pay => pay.id === paymentId ? { ...pay, amountAdded: nextAmount } : pay);
            await db.updateOrderPaymentHistory(currentUser!.id, order.id, nextHistory);
            success('تم تعديل الدفعة');
            refreshAgentOrderPaymentModal(order.id);
        } catch (err: any) {
            error(err.message || 'تعذر تعديل الدفعة');
        }
    };

    const handleDeleteAgentOrderPayment = async (paymentId: number) => {
        const order = agentOrderPaymentModal.order;
        if (!order) return;
        try {
            const nextHistory = (order.paymentHistory || []).filter(pay => pay.id !== paymentId);
            await db.updateOrderPaymentHistory(currentUser!.id, order.id, nextHistory);
            success('تم حذف الدفعة');
            refreshAgentOrderPaymentModal(order.id);
        } catch (err: any) {
            error(err.message || 'تعذر حذف الدفعة');
        }
    };

    const openAgentOrderEditModal = (order: Order) => {
        setAgentOrderEditModal({
            order,
            items: sortOrderItemsByProductCode(JSON.parse(JSON.stringify(order.items))),
            discountValue: order.discountValue || 0,
            discountType: order.discountType || 'FIXED'
        });
    };

    const handleSaveAgentOrderEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        const order = agentOrderEditModal.order;
        if (!order) return;
        try {
            const payload = agentOrderEditModal.items.map(item => ({
                productId: item.productId,
                paintColor: item.paintColor,
        productSaleMode: item.productSaleMode,
                productMetersPerCarton: item.productMetersPerCarton,
                qMeters: item.quantityMeters,
                qCartons: item.quantityCartons,
                isSpecialRequest: item.isSpecialRequest,
                specialRequestNote: item.specialRequestNote,
                unitPriceCarton: item.unitPriceCarton,
                unitPriceMeter: item.unitPriceMeter,
                priceAdjustmentNote: item.priceAdjustmentNote
            }));
            await db.updateOrder(currentUser!.id, order.id, payload, 0, agentOrderEditModal.discountValue, agentOrderEditModal.discountType);
            success('تم تعديل الطلب');
            setAgentOrderEditModal({ order: null, items: [], discountValue: 0, discountType: 'FIXED' });
        } catch (err: any) {
            error(err.message || 'تعذر تعديل الطلب');
        }
    };

    const handleWalletSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!walletModal.agent) return;

        const amount = Number(walletModal.amount);
        if (isNaN(amount) || amount <= 0) { error(t('batch4.txt_fq1w8p_6980')); return; }

        setIsSubmitting(true);
        try {
            const isPositive = walletModal.mode === 'deposit' || walletModal.mode === 'settlement';
            const cleanAmount = isPositive ? amount : -amount;

            let defaultNotes = '';
            if (walletModal.mode === 'settlement') defaultNotes = 'تسديد / إضافة رصيد';
            else if (walletModal.mode === 'deposit') defaultNotes = t('batch4.txt_py85ni_6980');
            else defaultNotes = t('batch4.txt_ie40oz_6980');

            const finalNotes = walletModal.notes || defaultNotes;

            if (walletModal.editId) {
                const oldTx = agentTransactions?.find((t: any) => t.id === walletModal.editId);
                if (oldTx) {
                    const difference = cleanAmount - oldTx.amount;
                    if (difference !== 0) {
                        const newBal = (walletModal.agent.agentDetails?.currentBalance || 0) + difference;
                        await supabase.from('agent_details').update({ current_balance: newBal }).eq('id', walletModal.agent.id);
                    }
                    
                    let updatedNotes = finalNotes;
                    const byMatch = oldTx.description.match(/\| بواسطة: (.*?)( \| عُدلت|$)/);
                    const originalCreator = byMatch ? byMatch[1] : null;
                    const currentUserName = currentUser?.fullName || 'النظام';
                    
                    let creatorSuffix = originalCreator ? ` | بواسطة: ${originalCreator}` : '';
                    if (originalCreator && originalCreator.trim() !== currentUserName.trim()) {
                        creatorSuffix += ` | عُدلت بواسطة: ${currentUserName}`;
                    } else if (!originalCreator) {
                        creatorSuffix = ` | عُدلت بواسطة: ${currentUserName}`;
                    }
                    updatedNotes = `${finalNotes}${creatorSuffix}`;

                    await supabase.from('wallet_transactions').update({
                        amount: cleanAmount,
                        description: updatedNotes
                    }).eq('id', walletModal.editId);
                    
                    db.fetchWalletTransactions();
                    db.fetchUsers();
                    success('تم تعديل الحركة بنجاح');
                }
            } else {
                if (walletModal.mode === 'settlement') {
                    const result = await payOldestAgentDebts(walletModal.agent, amount);
                    if (result.remainder > 0) {
                        await db.addBalance(currentUser!.id, walletModal.agent.id, result.remainder, walletModal.notes || 'رصيد مقدم على حساب الوكيل', { recordTransaction: false });
                    }
                    await db.addAgentLedgerTransaction(
                        currentUser!.id,
                        walletModal.agent.id,
                        amount,
                        buildUnifiedAgentPaymentDescription(amount, result, walletModal.notes)
                    );
                } else {
                    await db.addBalance(currentUser!.id, walletModal.agent.id, cleanAmount, finalNotes);
                }
                const successMsg = walletModal.mode === 'settlement' ? 'تم تنفيذ التسديد / إضافة الرصيد بنجاح' : 
                                   walletModal.mode === 'deposit' ? t('batch4.txt_p3jm8r_6981') : t('batch4.txt_1cfjfs_6981');
                success(successMsg);
            }

            // Re-select the agent to update the view instantly
            // We use db.users because 'agents' prop might be stale in this closure
            const updatedAgent = db.users.find((a: any) => a.id === walletModal.agent!.id);
            if (updatedAgent) onSelectAgent(updatedAgent);

            setWalletModal({ ...walletModal, isOpen: false, amount: '', notes: '' });
        } catch (err: any) {
            console.error('Wallet Error:', err);
            error(t('batch4.k528'), t('batch4.txt_yw51se_6981'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAgentLoss = async (mode: 'CREDIT_ONLY' | 'CASH_REFUND') => {
        if (isSubmitting || !lossModal.agent) return;
        const amount = Number(lossModal.amount);
        if (Number.isNaN(amount) || amount <= 0) { error('الرجاء إدخال مبلغ خسارة صحيح'); return; }

        const note = lossModal.notes.trim();
        setIsSubmitting(true);
        try {
            if (mode === 'CREDIT_ONLY') {
                await db.addBalance(
                    currentUser!.id,
                    lossModal.agent.id,
                    amount,
                    note ? `خسارة/خصم للوكيل - إضافة رصيد: ${note}` : 'خسارة/خصم للوكيل - إضافة رصيد',
                    { affectsSafe: false }
                );
                success('تم تسجيل الخسارة كرصيد للوكيل');
            } else {
                await db.addBalance(
                    currentUser!.id,
                    lossModal.agent.id,
                    amount,
                    note ? `خسارة/خصم للوكيل - اعتماد محاسبي: ${note}` : 'خسارة/خصم للوكيل - اعتماد محاسبي',
                    { affectsSafe: false }
                );
                await db.addBalance(
                    currentUser!.id,
                    lossModal.agent.id,
                    -amount,
                    note ? `ترجيع كاش فعلي للوكيل: ${note}` : 'ترجيع كاش فعلي للوكيل',
                    { affectsSafe: true }
                );
                success('تم تسجيل الخسارة وترجيع الكاش من القاصة');
            }

            const updatedAgent = db.users.find((a: any) => a.id === lossModal.agent!.id);
            if (updatedAgent) onSelectAgent(updatedAgent);
            setLossModal({ isOpen: false, agent: null, amount: '', notes: '' });
        } catch (err: any) {
            console.error('Agent Loss Error:', err);
            error(err.message || 'تعذر تسجيل الخسارة');
        } finally {
            setIsSubmitting(false);
        }
    };

    const expectedBalance = useMemo(() => {
        if (!walletModal.isOpen || !walletModal.agent?.agentDetails) return 0;
        const current = walletModal.agent.agentDetails.currentBalance || 0;
        const change = Number(walletModal.amount) || 0;
        return (walletModal.mode === 'deposit' || walletModal.mode === 'settlement') ? current + change : current - change;
    }, [walletModal]);

    return (
        <div className="space-y-6">
            {!selectedAgent ? (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100">
                        <h3 className="font-black text-xl text-gray-800 flex items-center gap-3 px-2">
                            <Users size={24} className="text-[#0e3c63]" />
                            {t('batch3.txt_vsfnkm_5339')}
                        </h3>

                        <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <input
                                    className="w-full h-[54px] pl-4 pr-11 bg-gray-50 border border-gray-200 rounded-2xl focus:border-[#0e3c63] outline-none text-sm font-bold shadow-inner"
                                    placeholder={t('batch4.k257')}
                                    value={listSearch}
                                    onChange={e => { setListSearch(e.target.value); setListPage(0); }}
                                />
                                <Search className="absolute right-4 top-[18px] text-gray-400" size={18} />
                            </div>
                            {isSuperAdmin && <Button onClick={() => { setEditingAgent(null); setShowAgentModal(true); }} className="h-[54px] text-sm rounded-2xl px-6 shadow-xl shadow-blue-900/10"><Plus size={16} /> {t('batch4.k258')}</Button>}
                        </div>
                    </div>

                    {/* Summary Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-[2rem] border border-red-100 p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-24 h-24 bg-red-50 rounded-full -ml-8 -mt-8 blur-2xl"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('agents.stats_total_debt')}</p>
                                    <h4 className="text-3xl font-black font-mono text-red-600" dir="ltr">${agentStats.totalDebt.toLocaleString()}</h4>
                                    <p className="text-[10px] font-bold text-red-400 mt-1">{agentStats.debtCount} {t('agents.stats_agents')}</p>
                                </div>
                                <div className="p-4 bg-red-50 text-red-500 rounded-2xl">
                                    <TrendingDown size={24} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-[2rem] border border-emerald-100 p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-50 rounded-full -ml-8 -mt-8 blur-2xl"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('agents.stats_total_credit')}</p>
                                    <h4 className="text-3xl font-black font-mono text-emerald-600" dir="ltr">${agentStats.totalCredit.toLocaleString()}</h4>
                                    <p className="text-[10px] font-bold text-emerald-400 mt-1">{agentStats.creditCount} {t('agents.stats_agents')}</p>
                                </div>
                                <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-[2rem] border border-blue-100 p-6 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-24 h-24 bg-blue-50 rounded-full -ml-8 -mt-8 blur-2xl"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('agents.stats_agents_count')}</p>
                                    <div className="flex items-center gap-4 mt-1">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200">VIP</span>
                                            <span className="text-2xl font-black font-mono text-amber-600">{agentStats.vipCount}</span>
                                        </div>
                                        <div className="w-px h-8 bg-gray-200"></div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200">{t('agents.stats_normal')}</span>
                                            <span className="text-2xl font-black font-mono text-blue-600">{agentStats.normalCount}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-blue-50 text-[#0e3c63] rounded-2xl">
                                    <Users size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'ALL', label: t('agents.filter_all'), count: agentStats.total, color: 'bg-gray-100 text-gray-700 border-gray-200', active: 'bg-[#0e3c63] text-white border-[#0e3c63]' },
                            { key: 'DEBT', label: t('agents.filter_debt'), count: agentStats.debtCount, color: 'bg-red-50 text-red-600 border-red-200', active: 'bg-red-600 text-white border-red-600' },
                            { key: 'CREDIT', label: t('agents.filter_credit'), count: agentStats.creditCount, color: 'bg-emerald-50 text-emerald-600 border-emerald-200', active: 'bg-emerald-600 text-white border-emerald-600' },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => { setBalanceFilter(f.key as any); setListPage(0); }}
                                className={`px-5 py-2.5 rounded-2xl text-xs font-black border-2 transition-all ${balanceFilter === f.key ? f.active : f.color + ' hover:shadow-md'}`}
                            >
                                {f.label} ({f.count})
                            </button>
                        ))}
                        <div className="w-px h-10 bg-gray-200 mx-1 self-center"></div>
                        {[
                            { key: 'ALL', label: t('agents.filter_all_types'), color: 'bg-gray-100 text-gray-700 border-gray-200', active: 'bg-[#0e3c63] text-white border-[#0e3c63]' },
                            { key: AgentType.VIP, label: 'VIP', color: 'bg-amber-50 text-amber-700 border-amber-200', active: 'bg-amber-600 text-white border-amber-600' },
                            { key: AgentType.NORMAL, label: t('agents.stats_normal'), color: 'bg-blue-50 text-blue-600 border-blue-200', active: 'bg-blue-600 text-white border-blue-600' },
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => { setAgentTypeFilter(f.key as any); setListPage(0); }}
                                className={`px-5 py-2.5 rounded-2xl text-xs font-black border-2 transition-all ${agentTypeFilter === f.key ? f.active : f.color + ' hover:shadow-md'}`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentAgents.map((a: any) => {
                            const balance = a.agentDetails?.currentBalance || 0;
                            const isDebt = balance < 0;
                            const isCredit = balance > 0;
                            const balanceBoxClass = isDebt ? 'bg-red-50/30 border-red-100' : isCredit ? 'bg-emerald-50/30 border-emerald-100' : 'bg-indigo-50/30 border-indigo-100';
                            const balanceTextClass = isDebt ? 'text-red-500' : isCredit ? 'text-emerald-500' : 'text-indigo-500';
                            const balanceAmountClass = isDebt ? 'text-red-700' : isCredit ? 'text-emerald-700' : 'text-indigo-700';
                            const balanceIconClass = isDebt ? 'bg-red-500 text-white' : isCredit ? 'bg-emerald-500 text-white' : 'bg-[#0e3c63] text-white';
                            const balanceLabel = isDebt ? 'مطلوب من الوكيل' : isCredit ? 'رصيد للوكيل' : 'الحساب مصفى';
                            return (
                                <div key={a.id} onClick={() => onSelectAgent(a)} className={`bg-white rounded-[2.5rem] border border-gray-100 hover:shadow-2xl transition-all cursor-pointer relative group overflow-hidden shadow-sm ${a.agentDetails?.isFrozen ? 'grayscale opacity-75' : ''}`}>
                                    {a.agentDetails?.isFrozen && (
                                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/5 pointer-events-none data-[frozen=true]:block">
                                            <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-lg shadow-lg rotate-[-12deg] border-2 border-white">
                                                {t('batch3.txt_bvleez_5339')}
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
                                                {(a as any).province || a.agentDetails?.province || t('common.unspecified')}
                                            </span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dir-ltr font-mono">
                                                {(a as any).phone || a.agentDetails?.phone || t('common.no_number')}
                                                <Phone size={12} className="text-blue-500" />
                                            </span>
                                        </div>
                                    </div>

                                    <div className={`mt-auto p-5 flex justify-between items-center border-t transition-colors ${balanceBoxClass}`}>
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${balanceTextClass}`}>{balanceLabel}</p>
                                            <p className={`font-mono font-black text-2xl ${balanceAmountClass}`} dir="ltr">{formatSignedMoney(balance)}</p>
                                        </div>
                                        <div className={`p-3 rounded-2xl shadow-sm ${balanceIconClass}`}>
                                            <Wallet size={20} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    
                    {filteredAgents.length > listRowsPerPage && (
                        <div className="mt-8">
                            <PaginationControl
                                page={listPage}
                                rowsPerPage={listRowsPerPage}
                                setPage={setListPage}
                                setRowsPerPage={setListRowsPerPage}
                                totalItems={filteredAgents.length}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="animate-fade-in space-y-8 pb-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/70 backdrop-blur-md p-4 rounded-[2rem] border border-white shadow-xl">
                        <button onClick={() => onSelectAgent(null)} className="flex items-center gap-3 text-gray-500 hover:text-[#0e3c63] font-black transition-all group px-3">
                            <div className="p-2 bg-white rounded-2xl shadow-md border border-gray-100 group-hover:bg-[#0e3c63] group-hover:text-white transition-all transform group-hover:translate-x-1"><ArrowRight size={20} /></div>
                            {t('batch3.txt_8foycm_5339')}
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
                                        <span className="hidden lg:inline mr-2">{displayAgent.agentDetails?.isFrozen ? t('agents.activate_account') : t('batch4.k583')}</span>
                                    </Button>
                                )}
                                <Button onClick={() => { setEditingAgent(displayAgent); setShowAgentModal(true); }} variant="secondary" className="py-3 px-6 text-sm bg-white border-gray-200 shadow-md font-black">
                                    <Settings size={18} /> {t('batch3.txt_duucds_5340')}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* Top Info Bar */}
                        <Card className="p-6 border-0 shadow-lg rounded-[2.5rem] bg-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#0e3c63]/5 to-transparent rounded-full -mr-32 -mt-32 pointer-events-none"></div>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                                <div className="flex flex-col md:flex-row items-center gap-6">
                                    <div className="relative">
                                        <UserAvatar
                                            name={displayAgent.fullName}
                                            avatarPath={displayAgent.avatar_path}
                                            avatarUrl={displayAgent.imageUrl}
                                            size="lg"
                                            className="w-24 h-24 rounded-full shadow-lg border-4 border-gray-50"
                                        />
                                        <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-white shadow-lg ${displayAgent.presence?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                    </div>
                                    <div className="text-center md:text-right">
                                        <h2 className="font-black text-2xl text-gray-800 tracking-tight flex items-center justify-center md:justify-start gap-3">
                                            {displayAgent.fullName}
                                            {displayAgent.agentDetails?.type === AgentType.VIP && (
                                                <Badge color="yellow" className="px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm">VIP</Badge>
                                            )}
                                        </h2>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-sm font-bold text-gray-500">
                                            <span className="flex items-center gap-1.5"><MapPin size={16} className="text-red-500"/> {(displayAgent as any).province || displayAgent.agentDetails?.province || t('common.unspecified')}</span>
                                            <span className="flex items-center gap-1.5 dir-ltr"><Phone size={16} className="text-blue-500"/> {(displayAgent as any).phone || displayAgent.agentDetails?.phone || '-'}</span>
                                            <span className="flex items-center gap-1.5"><Mail size={16} className="text-gray-400"/> {displayAgent.email}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setShowThumbprintModal(true)}
                                        className="flex flex-col items-center justify-center gap-1.5 p-3 w-20 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:scale-105 transition-all shadow-sm border border-indigo-100"
                                        title="بصمة الوكيل الرقمية"
                                    >
                                        <Fingerprint size={24} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">البصمة</span>
                                    </button>
                                    {isSuperAdmin && (
                                        <button
                                            onClick={(e) => handleInitiateDelete(e, displayAgent)}
                                            className="flex flex-col items-center justify-center gap-1.5 p-3 w-20 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-100 hover:scale-105 transition-all shadow-sm border border-rose-100"
                                            title={t('batch3.txt_proxek_5340')}
                                        >
                                            <Trash2 size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">حذف</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Action Buttons */}
                        {canEdit && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Button onClick={() => setWalletModal({ isOpen: true, agent: selectedAgent, mode: 'settlement', amount: '', notes: '' })} className="bg-emerald-600 hover:bg-emerald-700 h-14 px-8 rounded-2xl shadow-lg font-black flex-1"><Landmark size={20} /> تسديد / إضافة رصيد</Button>
                                <Button onClick={() => setLossModal({ isOpen: true, agent: selectedAgent, amount: '', notes: '' })} className="bg-amber-500 hover:bg-amber-600 h-14 px-8 rounded-2xl shadow-lg font-black flex-1"><Receipt size={20} /> الخسارة</Button>
                                <Button onClick={() => setWalletModal({ isOpen: true, agent: selectedAgent, mode: 'withdraw', amount: '', notes: '' })} className="bg-red-500 hover:bg-red-600 h-14 px-8 rounded-2xl shadow-lg font-black flex-1"><TrendingDown size={20} /> سحب رصيد</Button>
                            </div>
                        )}

                        {/* Balance Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => setWalletTypeFilter('ORDERS')}
                                className={`p-5 rounded-[1.5rem] border-2 text-right transition-all bg-red-50 border-red-100 hover:border-red-300 text-red-700`}
                            >
                                <span className="block text-[10px] font-black uppercase tracking-widest mb-1 text-red-600">الدين</span>
                                <p className="text-2xl font-mono font-black" dir="ltr">${agentFinancialSummary.debt.toLocaleString()}</p>
                                <span className="text-[10px] font-black mt-2 inline-block text-red-500">{agentFinancialSummary.debtCount.toLocaleString()} حركة</span>
                            </button>
                            <button
                                onClick={() => setWalletTypeFilter('SETTLEMENT')}
                                className={`p-5 rounded-[1.5rem] border-2 text-right transition-all bg-emerald-50 border-emerald-100 hover:border-emerald-300 text-emerald-700`}
                            >
                                <span className="block text-[10px] font-black uppercase tracking-widest mb-1 text-emerald-600">المسدد له</span>
                                <p className="text-2xl font-mono font-black" dir="ltr">${agentFinancialSummary.paid.toLocaleString()}</p>
                                <span className="text-[10px] font-black mt-2 inline-block text-emerald-500">{agentFinancialSummary.paidCount.toLocaleString()} حركة</span>
                            </button>
                            <div className={`p-5 rounded-[1.5rem] min-w-[220px] border-2 text-right transition-all ${agentNetCardTheme.active}`}>
                                <div className="p-3 bg-white/20 rounded-2xl shadow-xl backdrop-blur-md border border-white/10 w-fit mb-3"><CreditCard size={24} /></div>
                                <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${agentNetCardTheme.labelActive}`}>الصافي بين الدين والمسدد</p>
                                    <p className="text-2xl font-mono font-black tracking-tighter" dir="ltr">
                                        {formatSignedMoney(agentFinancialSummary.net)}
                                    </p>
                                    <span className={`text-[10px] font-black mt-2 inline-block ${agentNetCardTheme.subActive}`}>
                                        {agentFinancialSummary.net < 0 ? 'مطلوب من الوكيل' : agentFinancialSummary.net > 0 ? 'رصيد للوكيل' : 'الحساب مصفى'} • {agentFinancialSummary.totalCount.toLocaleString()} حركة
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-lg p-2 grid grid-cols-2 gap-2">
                            <button
                                onClick={() => { setAgentDetailTab('statement'); setPage(0); }}
                                className={`relative min-h-[76px] rounded-[1.5rem] px-5 flex items-center gap-4 text-right transition-all ${agentDetailTab === 'statement' ? 'bg-[#0e3c63] text-white shadow-xl' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                            >
                                <span className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${agentDetailTab === 'statement' ? 'bg-white/15' : 'bg-white text-[#0e3c63]'}`}>
                                    <FileText size={22} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block font-black text-sm md:text-base">كشف حساب تفصيلي</span>
                                    <span className={`block text-[11px] font-bold mt-1 ${agentDetailTab === 'statement' ? 'text-blue-100' : 'text-gray-400'}`}>
                                        {agentTransactions.length.toLocaleString()} حركة
                                    </span>
                                </span>
                            </button>
                            <button
                                onClick={() => { setAgentDetailTab('orders'); setAgentOrderPage(0); }}
                                className={`relative min-h-[76px] rounded-[1.5rem] px-5 flex items-center gap-4 text-right transition-all ${agentDetailTab === 'orders' ? 'bg-[#0e3c63] text-white shadow-xl' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                            >
                                <span className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${agentDetailTab === 'orders' ? 'bg-white/15' : 'bg-white text-[#0e3c63]'}`}>
                                    <ListOrdered size={22} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block font-black text-sm md:text-base">الطلبات</span>
                                    <span className={`block text-[11px] font-bold mt-1 ${agentDetailTab === 'orders' ? 'text-blue-100' : 'text-gray-400'}`}>
                                        {selectedAgentOrders.length.toLocaleString()} فاتورة
                                    </span>
                                </span>
                            </button>
                        </div>

                        {agentDetailTab === 'statement' ? (
                        <>
                        {/* Account Statement Table */}
                        <Card className="p-0 overflow-hidden border border-gray-100 shadow-2xl rounded-[3rem] mt-8">
                            <div className="p-8 border-b border-gray-100 bg-gray-50 flex flex-col gap-6">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div className="flex items-center gap-5">
                                            <div className="bg-white p-4 rounded-2xl border border-gray-200 text-[#0e3c63] shadow-lg"><FileText size={28} /></div>
                                            <div>
                                                <h3 className="font-black text-2xl text-gray-800">كشف حساب تفصيلي</h3>
                                                <p className="text-sm text-gray-500 font-bold">سجل الحركات المالية والمتبقي للوكيل</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm w-full">
                                        <div className="relative w-full md:flex-1">
                                            <Input
                                                value={searchTerm}
                                                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                                                placeholder="بحث في المعاملات..."
                                                icon={Search}
                                                className="h-14 text-sm"
                                            />
                                        </div>
                                        <div className="w-full md:w-auto shrink-0 min-w-[180px]">
                                            <select
                                                className="w-full h-14 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#0e3c63] outline-none text-sm font-bold shadow-inner cursor-pointer appearance-none text-gray-700"
                                                value={walletTypeFilter}
                                                onChange={(e) => { setWalletTypeFilter(e.target.value); setPage(0); }}
                                                style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131C23%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 1rem top 50%', backgroundSize: '0.65rem auto' }}
                                            >
                                                <option value="ALL">جميع الحركات</option>
                                                <option value="ORDERS">الطلبات والمبيعات</option>
                                                <option value="DEPOSIT">إيداع رصيد</option>
                                                <option value="WITHDRAW">سحب رصيد</option>
                                                <option value="SETTLEMENT">تسديد ديون</option>
                                            </select>
                                        </div>
                                        <div className="w-full md:w-auto shrink-0">
                                            <DateRangePicker
                                                from={fromDate}
                                                to={toDate}
                                                onChangeFrom={(d) => { setFromDate(d); setPage(0); }}
                                                onChangeTo={(d) => { setToDate(d); setPage(0); }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto min-h-[400px]">
                                    <table className="w-full text-right text-sm">
                                        <thead className="bg-white text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] border-b">
                                            <tr>
                                                <th className="p-6 pr-10">{t('batch4.k273')}</th>
                                                <th className="p-6">{t('batch4.k274')}</th>
                                                <th className="p-6">{t('batch4.k275')}</th>
                                                <th className="p-6 text-left">{t('batch4.k276')}</th>
                                                <th className="p-6 text-left">الرصيد بعد الحركة</th>
                                                <th className="p-6 text-center">إجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 bg-white">
                                            {currentTransactions.map((tx: any) => {
                                                const isLinked = !!tx.linkedOrderId;
                                                const isLocked = tx.locked || isLinked;
                                                const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
                                                const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
                                                return (
                                                <tr key={tx.id} className={`hover:bg-blue-50/30 transition-all group ${isLocked ? 'opacity-80' : ''}`}>
                                                    <td className="p-6 pr-10">
                                                        <div className="flex flex-col font-mono">
                                                            <span className="font-black text-gray-800 text-sm">{formatDate(tx.createdAt)}</span>
                                                            <span className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1.5"><Clock size={12} /> {formatTime(tx.createdAt)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${tx.amount >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                            {tx.amount >= 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                                            {tx.amount >= 0 ? t('batch4.txt_9oodnp_6981') : t('batch4.txt_a86nmx_6981')}
                                                        </span>
                                                    </td>
                                                    <td className="p-6 text-gray-700 font-bold text-sm leading-relaxed max-w-[300px]">{translateDesc(tx.description)}</td>
                                                    <td className={`p-6 text-left font-mono font-black text-2xl ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                                                        {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                                    </td>
                                                    <td className={`p-6 text-left font-mono font-black text-xl ${tx.balanceAfter >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                                                        {tx.balanceAfter >= 0 ? '+' : ''}{tx.balanceAfter?.toLocaleString() ?? 0}
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button onClick={() => { const ord = db.orders.find(o => tx.description.includes(o.id.toString())); if (ord) onViewOrder(ord); }} className="p-2 rounded-lg text-gray-300 hover:text-[#0e3c63] hover:bg-blue-50 transition-all disabled:opacity-20" disabled={!tx.description.includes('#')} title="عرض الطلب"><Eye size={16} /></button>
                                                            {isLinked ? (
                                                                /* Auto-locked: linked to order — cannot unlock */
                                                                <div className="flex items-center justify-center p-2" title="مقفلة تلقائياً (مرتبطة بطلب)">
                                                                    <Lock size={16} className="text-blue-400" />
                                                                </div>
                                                            ) : isLocked ? (
                                                                /* Manually locked — super admin double-click to unlock */
                                                                <button
                                                                    onDoubleClick={() => {
                                                                        if (isSuperAdmin) {
                                                                            db.toggleLockWalletTransaction(tx.id, false);
                                                                        }
                                                                    }}
                                                                    className={`p-2 rounded-lg transition-all ${isSuperAdmin ? 'text-amber-500 hover:bg-amber-50 cursor-pointer' : 'text-gray-300 cursor-not-allowed opacity-50'}`}
                                                                    title={isSuperAdmin ? 'انقر مرتين لفتح القفل' : 'المدير العام (Super Admin) فقط يمكنه الفتح'}
                                                                >
                                                                    <Lock size={16} />
                                                                </button>
                                                            ) : (
                                                                /* Unlocked — show lock + delete */
                                                                <>
                                                                    <button
                                                                        onClick={() => db.toggleLockWalletTransaction(tx.id, true)}
                                                                        className="p-2 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition-all"
                                                                        title="قفل الحركة"
                                                                    >
                                                                        <Unlock size={16} />
                                                                    </button>
                                                                    {!tx.description.includes('#') && (
                                                                        <>
                                                                    <button
                                                                        onClick={() => {
                                                                            let cleanNotes = tx.description.split(' | بواسطة:')[0].split(' | عُدلت بواسطة:')[0];
                                                                            setWalletModal({ isOpen: true, agent: agents.find((a: any) => a.id == tx.agentId), mode: tx.amount > 0 ? (tx.description.includes('تسديد') ? 'settlement' : 'deposit') : 'withdraw', amount: Math.abs(tx.amount).toString(), notes: cleanNotes, editId: tx.id });
                                                                        }}
                                                                        className="p-2 rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-all"
                                                                        title="تعديل الحركة"
                                                                    >
                                                                        <Edit3 size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDeleteWalletTxModal({ isOpen: true, txId: tx.id })}
                                                                        className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                                        title="حذف الحركة"
                                                                    >
                                                                    <Trash2 size={16} />
                                                                        </button>
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                );
                                            })}
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
                                    totalItems={agentTransactions.filter((tx: any) => tx.description.toLowerCase().includes(searchTerm) || tx.amount.toString().includes(searchTerm)).length}
                                />
                            </div>
                        </>
                        ) : (
                            <Card className="p-0 overflow-hidden border border-gray-100 shadow-2xl rounded-[3rem] mt-8">
                                <div className="p-8 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex items-center gap-5">
                                        <div className="bg-white p-4 rounded-2xl border border-gray-200 text-[#0e3c63] shadow-lg"><ListOrdered size={28} /></div>
                                        <div>
                                            <h3 className="font-black text-2xl text-gray-800">طلبات الوكيل</h3>
                                            <p className="text-sm text-gray-500 font-bold">كل الفواتير الخاصة بهذا الوكيل مع الدفع والتعديل</p>
                                        </div>
                                    </div>
                                    <div className="relative w-full md:w-80">
                                        <Input
                                            value={agentOrderSearch}
                                            onChange={(e) => { setAgentOrderSearch(e.target.value); setAgentOrderPage(0); }}
                                            placeholder="بحث برقم الطلب أو المادة..."
                                            icon={Search}
                                            className="h-14 text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-x-auto min-h-[400px]">
                                    <table className="w-full text-right text-sm">
                                        <thead className="bg-white text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] border-b">
                                            <tr>
                                                <th className="p-6 pr-10">الطلب</th>
                                                <th className="p-6">التاريخ</th>
                                                <th className="p-6">الحالة</th>
                                                <th className="p-6 text-left">الفاتورة</th>
                                                <th className="p-6 text-left">الواصل</th>
                                                <th className="p-6 text-left">المتبقي</th>
                                                <th className="p-6 text-center">إجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 bg-white">
                                            {currentAgentOrders.map((order: Order) => {
                                                const remaining = Math.max((order.totalAmount || 0) - (order.paidAmount || 0), 0);
                                                return (
                                                    <tr key={order.id} className="hover:bg-blue-50/30 transition-all">
                                                        <td className="p-6 pr-10">
                                                            <div className="font-mono font-black text-gray-800">#{order.id}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold mt-1">{order.items.length} مادة</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="font-bold text-gray-800">{formatDate(order.createdAt)}</div>
                                                            <div className="text-[10px] text-gray-400 font-bold mt-1">{formatTime(order.createdAt)}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="flex flex-col gap-2 items-start">
                                                                <Badge color={order.productionStatus === ProductionStatus.COMPLETED ? 'blue' : 'gray'}>{ProductionStatusLabels[order.productionStatus]}</Badge>
                                                                <Badge color={remaining <= 0 ? 'green' : 'yellow'}>{remaining <= 0 ? 'مسدد' : 'دين'}</Badge>
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-left font-mono font-black text-[#0e3c63]" dir="ltr">${(order.totalAmount || 0).toLocaleString()}</td>
                                                        <td className="p-6 text-left font-mono font-black text-emerald-600" dir="ltr">${(order.paidAmount || 0).toLocaleString()}</td>
                                                        <td className="p-6 text-left font-mono font-black text-amber-600" dir="ltr">${remaining.toLocaleString()}</td>
                                                        <td className="p-6 text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button onClick={() => onViewOrder(order)} className="p-2 rounded-lg text-gray-400 hover:text-[#0e3c63] hover:bg-blue-50 transition-all" title="عرض الطلب"><Eye size={16} /></button>
                                                                {canEdit && remaining > 0 && <button onClick={() => setAgentOrderPaymentModal({ order, amount: '', editingPaymentId: null, editAmount: '' })} className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all" title="إضافة دفعة"><CreditCard size={16} /></button>}
                                                                {canEdit && <button onClick={() => openAgentOrderEditModal(order)} className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-all" title="تعديل الطلب"><Edit3 size={16} /></button>}
                                                                {canEdit && <button onClick={() => { db.deleteOrder(currentUser!.id, order.id, false); success('تم حذف الطلب'); }} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all" title="حذف الطلب"><Trash2 size={16} /></button>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-4">
                                    <PaginationControl
                                        page={agentOrderPage}
                                        rowsPerPage={agentOrderRowsPerPage}
                                        setPage={setAgentOrderPage}
                                        setRowsPerPage={setAgentOrderRowsPerPage}
                                        totalItems={selectedAgentOrders.length}
                                    />
                                </div>
                            </Card>
                        )}
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
                                        <h3 className="font-black text-2xl">{editingAgent ? t('log_details.edit_agent_data') : t('agents.register_new_agent')}</h3>
                                        <p className="text-blue-200 text-xs font-bold opacity-70 uppercase tracking-widest mt-1">
                                            {editingAgent ? editingAgent.fullName : t('agents.create_agency_account')}
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
                                { id: 'general', label: t('batch4.k278'), icon: Info },
                                { id: 'permissions', label: t('batch4.k279'), icon: Shield },
                                { id: 'security', label: t('batch4.k280'), icon: Lock },
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
                                                userName={fullName || t('batch4.k258')}
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
                                                label={t('batch4.k281')}
                                                value={fullName}
                                                onChange={e => { setFullName(e.target.value); setFieldErrors(prev => ({ ...prev, fullName: false })); }}
                                                placeholder={t('batch4.k282')}
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
                                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">{t('batch4.k283')}</label>
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

                                        <Input label={t('batch4.k284')} value={address} onChange={e => setAddress(e.target.value)} placeholder={t('batch4.k285')} />
                                    </div>
                                )}

                                {activeTab === 'permissions' && (
                                    <div className="space-y-8 animate-fade-in">
                                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                                            <ModernTypeSelector value={agentType} onChange={setAgentType} />
                                            <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                            <TrendingUp size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-800 text-sm">زيادة أسعار المنتجات</p>
                                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">تضاف فوق أسعار المنتجات لهذا الوكيل في بوابة الوكيل والطلبات</p>
                                                        </div>
                                                    </div>
                                                    <div className="font-mono font-black text-emerald-600 text-xl min-w-[64px] text-left">
                                                        {Number(agentPriceIncreasePercent || 0)}%
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    {[5, 10].map(percent => (
                                                        <button
                                                            key={percent}
                                                            type="button"
                                                            onClick={() => setAgentPriceIncreasePercent(String(percent))}
                                                            className={`h-12 rounded-2xl border-2 font-black font-mono transition-all ${Number(agentPriceIncreasePercent || 0) === percent ? 'bg-[#0e3c63] border-[#0e3c63] text-white shadow-md' : 'bg-gray-50 border-transparent text-gray-500 hover:border-blue-100 hover:bg-white'}`}
                                                        >
                                                            {percent}%+
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={agentPriceIncreasePercent}
                                                        onChange={e => setAgentPriceIncreasePercent(String(Math.max(0, Number(e.target.value) || 0)))}
                                                        className="w-full h-12 bg-gray-50 border-2 border-transparent rounded-2xl px-4 pl-10 font-black font-mono text-gray-800 outline-none focus:bg-white focus:border-[#0e3c63]"
                                                        placeholder="نسبة مخصصة"
                                                    />
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-sm font-black">%</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">{t('batch4.k286')}</h4>

                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-xl ${allowCredit ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}><TrendingDown size={20} /></div>
                                                        <div>
                                                            <p className="font-bold text-gray-800 text-sm">{t('batch4.k287')}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">{t('batch4.k288')}</p>
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
                                                            <p className="font-bold text-gray-800 text-sm">{t('batch4.k289')}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">{t('batch4.k290')}</p>
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
                                                            <p className="font-bold text-gray-800 text-sm">{t('batch4.k291')}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">{t('batch4.k292')}</p>
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
                                            <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest px-2">{t('batch4.k293')}</h4>
                                            <div className={`p-6 rounded-[2rem] border-2 transition-all ${isFrozen ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${isFrozen ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-400'}`}><Snowflake size={20} /></div>
                                                        <span className={`font-black text-sm ${isFrozen ? 'text-red-700' : 'text-gray-500'}`}>{t('batch4.k294')}</span>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" checked={isFrozen} onChange={e => setIsFrozen(e.target.checked)} />
                                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                                                    </label>
                                                </div>
                                                {isFrozen && (
                                                    <div className="mt-4 animate-fade-in">
                                                        <label className="block text-xs font-black text-red-400 mb-2 mr-1">{t('batch4.k295')}</label>
                                                        <input
                                                            value={freezeMessage}
                                                            onChange={e => setFreezeMessage(e.target.value)}
                                                            className="w-full h-12 bg-white border border-red-200 rounded-xl px-4 text-sm font-bold text-red-700 placeholder:text-red-300 outline-none focus:ring-2 focus:ring-red-100"
                                                            placeholder={t('batch4.k296')}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mr-1">{t('batch4.k297')}</label>
                                            <textarea
                                                value={internalNotes}
                                                onChange={e => setInternalNotes(e.target.value)}
                                                className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-600 focus:border-[#0e3c63] outline-none min-h-[100px]"
                                                placeholder={t('batch4.k298')}
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'security' && (
                                    <div className="space-y-8 animate-fade-in">
                                        <div className="bg-amber-50/50 p-6 rounded-[2.5rem] border border-amber-100 text-amber-800 text-sm font-bold leading-relaxed flex gap-4">
                                            <ShieldAlert className="shrink-0" />
                                            <p>{t('batch4.k299')}</p>
                                        </div>

                                        <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-gray-100 space-y-6">
                                            {/* Email Field - Moved Here */}
                                            <div className="space-y-2 relative">
                                                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                                    <Monitor size={16} className="text-[#0e3c63]" /> {t('batch3.txt_ljd6nr_5342')}
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
                                                <h4 className="font-black text-gray-800 flex items-center gap-2"><Key size={20} className="text-[#0e3c63]" /> {t('batch4.k300')}</h4>
                                                {editingAgent && (
                                                    <button type="button" onClick={() => setIsEditingPassword(!isEditingPassword)} className="text-xs font-black text-[#0e3c63] hover:underline">
                                                        {isEditingPassword ? t('batch4.txt_56bkj3_6982') : t('batch4.txt_rmasf5_6982')}
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
                                                        {t('batch3.txt_s3oez5_5343')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAuthMethod('invite')}
                                                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-black transition-all ${authMethod === 'invite' ? 'bg-white text-[#0e3c63] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        {t('batch3.txt_q99d2b_5343')}
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
                                                                placeholder={t('batch4.k301')}
                                                            />
                                                            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        </div>
                                                        <div className="relative">
                                                            <input
                                                                type="password"
                                                                value={confirmPassword}
                                                                onChange={e => setConfirmPassword(e.target.value)}
                                                                className={`w-full h-14 bg-gray-50 border-2 rounded-xl px-5 pl-12 font-bold text-lg focus:border-[#0e3c63] outline-none transition-all placeholder:text-gray-300 placeholder:font-normal placeholder:text-sm ${confirmPassword && password !== confirmPassword ? 'border-red-300 focus:border-red-500' : 'border-gray-200'}`}
                                                                placeholder={t('batch4.k302')}
                                                            />
                                                            <Check size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${confirmPassword && password === confirmPassword ? 'text-emerald-500' : 'text-gray-300'}`} />
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold px-2"> {t('batch4.k303')}</p>
                                                </div>
                                            )}

                                            {!editingAgent && authMethod === 'invite' && (
                                                <div className="p-4 bg-blue-50 text-[#0e3c63] rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                                                    <Info size={16} />
                                                    {t('batch4.txt_jql0l2_6976')}
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
                                        ? t('agents.send_invite_add')
                                        : (editingAgent ? t('common.save_changes') : t('agents.add_new_agent'))
                                    }
                                </div>

                                {/* Error State */}
                                <div className={`flex items-center justify-center gap-2 transition-all duration-500 absolute w-full text-white ${validationButtonFlip ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                                    <AlertCircle size={20} className="ml-2" /> {validationError || t('agents.fill_required_fields')}
                                </div>

                                {/* Loading State */}
                                <div className={`flex items-center justify-center gap-2 transition-all duration-500 absolute w-full ${isSubmitting ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> {authMethod === 'invite' ? t('common.sending') : t('batch4.k787')}
                                </div>
                            </Button>
                            <button
                                onClick={() => setShowAgentModal(false)}
                                className="px-8 h-16 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all"
                            >
                                {t('products_tab.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Agent Order Payment Modal */}
            {agentOrderPaymentModal.order && (
                <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-md z-[720] flex items-center justify-center p-4 !mt-0">
                    <form onSubmit={handleAgentInvoicePayment} className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]">
                        <div className="p-6 bg-[#0e3c63] text-white flex justify-between items-start gap-4 shrink-0">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center"><CreditCard size={24} /></div>
                                <div>
                                    <h3 className="font-black text-2xl">دفع فاتورة <span className="font-mono text-blue-200">#{agentOrderPaymentModal.order.id}</span></h3>
                                    <p className="text-[11px] font-bold text-blue-200 mt-1">{agentOrderPaymentModal.order.agentName}</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setAgentOrderPaymentModal({ order: null, amount: '', editingPaymentId: null, editAmount: '' })} className="bg-white/10 hover:bg-red-500 p-3 rounded-2xl transition-all"><X size={20} /></button>
                        </div>
                        {(() => {
                            const order = agentOrderPaymentModal.order!;
                            const remaining = Math.max((order.totalAmount || 0) - (order.paidAmount || 0), 0);
                            const after = Math.max((order.totalAmount || 0) - ((order.paidAmount || 0) + Number(agentOrderPaymentModal.amount || 0)), 0);
                            const ratio = order.totalAmount > 0 ? Math.min(100, Math.round(((order.paidAmount || 0) / order.totalAmount) * 100)) : 0;
                            return (
                                <div className="p-6 bg-gray-50 space-y-5 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
                                    <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-5 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">نسبة التسديد</p>
                                                <h4 className="font-mono font-black text-3xl text-[#0e3c63] mt-1">{ratio}%</h4>
                                            </div>
                                            <Badge color={remaining <= 0 ? 'green' : 'yellow'}>{remaining <= 0 ? 'مسدد بالكامل' : 'باقي دين'}</Badge>
                                        </div>
                                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${ratio}%` }} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">قيمة الفاتورة</p><div className="font-mono font-black text-[#0e3c63]">${order.totalAmount.toLocaleString()}</div></div>
                                        <div className="bg-white rounded-2xl p-4 border border-emerald-100"><p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">الواصل الحالي</p><div className="font-mono font-black text-emerald-700">${order.paidAmount.toLocaleString()}</div></div>
                                        <div className="bg-white rounded-2xl p-4 border border-amber-100"><p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">المتبقي</p><div className="font-mono font-black text-amber-700">${remaining.toLocaleString()}</div></div>
                                    </div>
                                    <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 mr-1">مبلغ واصل جديد</label>
                                            <input type="number" min="1" max={remaining} value={agentOrderPaymentModal.amount} onChange={e => setAgentOrderPaymentModal(prev => ({ ...prev, amount: e.target.value }))} disabled={remaining <= 0} className="w-full h-14 bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 font-black font-mono text-gray-800 outline-none focus:bg-white focus:border-emerald-500 disabled:opacity-50" placeholder="0" autoFocus />
                                        </div>
                                        <div className="bg-[#0e3c63] text-white rounded-2xl p-4 min-w-[170px]"><p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1">بعد الواصل</p><div className="font-mono font-black text-lg">${after.toLocaleString()}</div></div>
                                    </div>
                                    <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-4">
                                        <div className="flex justify-between mb-3"><h4 className="font-black text-gray-700 text-sm">سجل الدفعات</h4><span className="text-[10px] font-black text-gray-400">{(order.paymentHistory || []).length} دفعة</span></div>
                                        {(order.paymentHistory || []).length === 0 ? (
                                            <div className="h-20 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center text-xs font-bold text-gray-400">لا توجد دفعات</div>
                                        ) : (
                                            <div className="space-y-2 sm:max-h-52 sm:overflow-y-auto custom-scrollbar">
                                                {[...(order.paymentHistory || [])].reverse().map(pay => {
                                                    const isEditing = agentOrderPaymentModal.editingPaymentId === pay.id;
                                                    return (
                                                        <div key={pay.id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center bg-gray-50 rounded-2xl px-3 py-3 border border-gray-100">
                                                            <div><span className="font-black text-gray-700 block">{pay.addedBy || 'مستخدم'}</span><span className="text-[10px] text-gray-400 font-bold">{formatDate(pay.date)}</span></div>
                                                            <div className="flex items-center justify-end gap-2">
                                                                {isEditing ? (
                                                                    <>
                                                                        <input type="number" min="1" value={agentOrderPaymentModal.editAmount} onChange={e => setAgentOrderPaymentModal(prev => ({ ...prev, editAmount: e.target.value }))} className="w-28 h-10 bg-white border-2 border-emerald-100 rounded-xl px-3 text-center font-mono font-black outline-none focus:border-emerald-500" />
                                                                        <button type="button" onClick={() => handleEditAgentOrderPayment(pay.id)} className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center"><Save size={16} /></button>
                                                                        <button type="button" onClick={() => setAgentOrderPaymentModal(prev => ({ ...prev, editingPaymentId: null, editAmount: '' }))} className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center"><X size={16} /></button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="font-mono font-black text-emerald-600 min-w-[90px] text-left">${pay.amountAdded.toLocaleString()}</span>
                                                                        <button type="button" onClick={() => setAgentOrderPaymentModal(prev => ({ ...prev, editingPaymentId: pay.id, editAmount: String(pay.amountAdded) }))} className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Edit3 size={16} /></button>
                                                                        <button type="button" onClick={() => handleDeleteAgentOrderPayment(pay.id)} className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center"><Trash2 size={16} /></button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <Button type="submit" disabled={remaining <= 0} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl"><Save size={20} /> حفظ الواصل</Button>
                                </div>
                            );
                        })()}
                    </form>
                </div>
            )}

            {/* Agent Order Edit Modal */}
            {agentOrderEditModal.order && (
                <div className="fixed inset-0 bg-[#0e3c63]/40 z-[720] flex items-center justify-center p-4 backdrop-blur-md !mt-0">
                    <form onSubmit={handleSaveAgentOrderEdit} className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 bg-[#0e3c63] text-white flex justify-between items-center">
                            <div><h3 className="font-black text-2xl">تعديل الطلب <span className="font-mono text-blue-200">#{agentOrderEditModal.order.id}</span></h3><p className="text-blue-200 text-xs font-bold mt-1">{agentOrderEditModal.order.agentName}</p></div>
                            <button type="button" onClick={() => setAgentOrderEditModal({ order: null, items: [], discountValue: 0, discountType: 'FIXED' })} className="bg-white/10 hover:bg-red-500 p-3 rounded-2xl transition-all"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                            {agentOrderEditModal.items.map((item, idx) => (
                                <div key={item.id || idx} className="bg-gray-50 rounded-2xl border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
                                    <div><div className="font-mono font-black text-[#0e3c63]">{item.productName || item.productCode}</div><div className="text-[10px] text-gray-400 font-bold">{item.productDimensions}</div></div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-[10px] font-black text-gray-400">{item.productPaintType ? "سطلة" : getProductUnit(db.products.find(p => p.id == item.productId), db.categories, item.productSaleMode)}</label>
                                        <input type="number" min="0" value={item.quantityCartons} onChange={e => {
                                            const next = [...agentOrderEditModal.items];
                                            next[idx].quantityCartons = Math.max(0, Number(e.target.value));
                                            next[idx].totalPrice = (next[idx].quantityCartons * next[idx].unitPriceCarton) + (next[idx].quantityMeters * (next[idx].unitPriceMeter || 0));
                                            setAgentOrderEditModal(prev => ({ ...prev, items: next }));
                                        }} className="w-20 h-10 bg-white border border-gray-200 rounded-xl text-center font-black outline-none focus:border-[#0e3c63]" />
                                        {item.unitPriceMeter > 0 && (
                                            <>
                                                <label className="text-[10px] font-black text-gray-400">متر</label>
                                                <input type="number" min="0" value={item.quantityMeters} onChange={e => {
                                                    const next = [...agentOrderEditModal.items];
                                                    next[idx].quantityMeters = Math.max(0, Number(e.target.value));
                                                    next[idx].totalPrice = (next[idx].quantityCartons * next[idx].unitPriceCarton) + (next[idx].quantityMeters * (next[idx].unitPriceMeter || 0));
                                                    setAgentOrderEditModal(prev => ({ ...prev, items: next }));
                                                }} className="w-20 h-10 bg-white border border-gray-200 rounded-xl text-center font-black outline-none focus:border-[#0e3c63]" />
                                            </>
                                        )}
                                        <div className="font-mono font-black text-emerald-600 min-w-[100px] text-left">${(item.totalPrice || 0).toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
                            <Button type="submit" className="flex-1 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black"><Save size={20} /> حفظ التعديل</Button>
                            <button type="button" onClick={() => setAgentOrderEditModal({ order: null, items: [], discountValue: 0, discountType: 'FIXED' })} className="px-8 h-14 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all">إلغاء</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Agent Loss Modal */}
            {lossModal.isOpen && lossModal.agent && (
                <div className="fixed inset-0 bg-[#0e3c63]/40 z-[730] flex items-center justify-center p-4 backdrop-blur-md !mt-0">
                    <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in border-t-[12px] border-amber-500">
                        <div className="p-10 text-center space-y-5">
                            <div className="w-24 h-24 rounded-[2rem] bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-2xl">
                                <Receipt size={46} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-800">تسجيل خسارة للوكيل</h3>
                                <p className="text-sm font-bold text-gray-500 mt-1">{lossModal.agent.fullName}</p>
                            </div>
                        </div>

                        <div className="px-10 pb-10 space-y-6">
                            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 text-right">
                                <p className="text-xs font-bold text-amber-700 leading-relaxed">
                                    إذا الخسارة رصيد محاسبي فقط ما تنحسب بالقاصة. إذا رجعت كاش فعلي للوكيل، تنزل حركة خارجة من القاصة.
                                </p>
                            </div>

                            <div className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                                <label className="block text-xs font-black text-gray-400 uppercase text-center mb-4 tracking-widest">مبلغ الخسارة ($)</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full text-5xl font-black font-mono text-center bg-transparent outline-none text-[#0e3c63] placeholder:text-gray-200"
                                    placeholder="0"
                                    value={lossModal.amount}
                                    onChange={e => setLossModal(prev => ({ ...prev, amount: e.target.value }))}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">ملاحظات (اختياري)</label>
                                <textarea
                                    className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-sm focus:border-amber-500 outline-none min-h-[80px]"
                                    placeholder="سبب الخسارة أو الخصم..."
                                    value={lossModal.notes}
                                    onChange={(e: any) => setLossModal(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => handleAgentLoss('CREDIT_ONLY')}
                                    className="w-full min-h-16 p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-100 border-b-4 border-emerald-800 active:scale-[0.98] transition-all flex items-center justify-between gap-4 text-right disabled:opacity-60"
                                >
                                    <span className="flex items-center gap-3">
                                        <Wallet size={22} />
                                        <span>
                                            <span className="block font-black text-sm">إضافة رصيد فقط</span>
                                            <span className="block text-[10px] text-emerald-100 font-bold mt-1">ما تنحسب بالقاصة لأن ماكو كاش طالع</span>
                                        </span>
                                    </span>
                                    <span className="font-mono font-black text-lg" dir="ltr">${Number(lossModal.amount || 0).toLocaleString()}</span>
                                </button>

                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => handleAgentLoss('CASH_REFUND')}
                                    className="w-full min-h-16 p-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white shadow-xl shadow-amber-100 border-b-4 border-amber-800 active:scale-[0.98] transition-all flex items-center justify-between gap-4 text-right disabled:opacity-60"
                                >
                                    <span className="flex items-center gap-3">
                                        <ArrowDownLeft size={22} />
                                        <span>
                                            <span className="block font-black text-sm">ترجيع كاش فعلي</span>
                                            <span className="block text-[10px] text-amber-100 font-bold mt-1">ينسجل خروج كاش من القاصة</span>
                                        </span>
                                    </span>
                                    <span className="font-mono font-black text-lg" dir="ltr">${Number(lossModal.amount || 0).toLocaleString()}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setLossModal({ isOpen: false, agent: null, amount: '', notes: '' })}
                                    className="w-full h-14 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-black text-sm transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Wallet Modal */}
            {
                walletModal.isOpen && walletModal.agent && (
                    <div className="fixed inset-0 bg-[#0e3c63]/40 z-[700] flex items-center justify-center p-4 backdrop-blur-md !mt-0">
                        <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-fade-in border-t-[12px] border-[#0e3c63]">
                            <div className="p-10 text-center space-y-6">
                                <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-2 shadow-2xl ${walletModal.mode === 'deposit' ? 'bg-emerald-100 text-emerald-600' : walletModal.mode === 'settlement' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {walletModal.mode === 'deposit' ? <TrendingUp size={48} /> : walletModal.mode === 'settlement' ? <Landmark size={48} /> : <TrendingDown size={48} />}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800">{walletModal.mode === 'deposit' ? t('agents.register_new_payment') : walletModal.mode === 'settlement' ? 'تسديد / إضافة رصيد' : t('agents.register_financial')}</h3>
                                    <p className="text-sm font-bold text-gray-500 mt-1">تعديل رصيد الوكيل: {walletModal.agent.fullName}</p>
                                </div>
                            </div>
                            <form onSubmit={handleWalletSubmit} className="p-10 pt-0 space-y-8">
                                <div className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                                    <label className="block text-xs font-black text-gray-400 uppercase text-center mb-4 tracking-widest">{t('batch4.k304')}</label>
                                    <div className="relative">
                                        <input type="number" className="w-full text-5xl font-black font-mono text-center bg-transparent outline-none text-[#0e3c63] placeholder:text-gray-200" placeholder="0" value={walletModal.amount} onChange={e => setWalletModal({ ...walletModal, amount: e.target.value })} autoFocus required />
                                    </div>
                                </div>

                                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-3">
                                    <div className="flex justify-between text-xs font-bold text-gray-400">
                                        <span>{t('batch4.k305')}</span>
                                        <span dir="ltr">${(walletModal.agent.agentDetails?.currentBalance || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-black text-gray-800 pt-3 border-t border-blue-100">
                                        <span>{t('batch4.k306')}</span>
                                        <span className={expectedBalance < 0 ? 'text-red-600' : 'text-emerald-600'} dir="ltr">${expectedBalance.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">{t('batch4.k307')}</label>
                                    <textarea className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-sm focus:border-[#0e3c63] outline-none min-h-[80px]" placeholder={t('batch4.k308')} value={walletModal.notes} onChange={(e: any) => setWalletModal({ ...walletModal, notes: e.target.value })} />
                                </div>

                                <div className="flex gap-4">
                                    <Button type="submit" disabled={isSubmitting} className={`flex-1 h-16 font-black text-white text-lg rounded-2xl shadow-xl ${walletModal.mode === 'deposit' ? 'bg-emerald-500 hover:bg-emerald-600' : walletModal.mode === 'settlement' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'} active:scale-95 transition-all`}>
                                        {isSubmitting ? t('common.executing') : t('common.confirm_and_save_operation')}
                                    </Button>
                                    <button type="button" onClick={() => setWalletModal({ ...walletModal, isOpen: false })} className="px-8 h-16 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all">{t('products_tab.cancel')}</button>
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
                                    <h3 className="text-2xl font-black mb-2">{t('batch4.k309')}</h3>
                                    <p className="text-red-100 text-sm font-bold opacity-80">{t('batch4.k310')}</p>
                                </div>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-red-600 font-black text-xl shadow-sm border border-gray-100">
                                        {deleteConfirmModal.agent.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">{t('batch4.k311')}</span>
                                        <span className="font-black text-gray-800 text-lg">{deleteConfirmModal.agent.fullName}</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-400 block mt-1">Agent ID: AGT-000{deleteConfirmModal.agent.id}</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        onClick={executeDeleteAgent}
                                        className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 border-b-4 border-red-800"
                                    >
                                        <Trash2 size={20} /> {t('batch3.txt_w78yec_5343')}
                                    </Button>

                                    <button
                                        onClick={() => setDeleteConfirmModal({ isOpen: false, agent: null })}
                                        className="w-full h-14 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm transition-all border border-gray-200"
                                    >
                                        {t('batch3.txt_jtd5nf_5343')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Wallet Transaction Modal */}
            {
                deleteWalletTxModal.isOpen && deleteWalletTxModal.txId && (
                    <div className="fixed inset-0 bg-[#0e3c63]/70 backdrop-blur-md z-[700] flex items-center justify-center p-4 animate-fade-in !mt-0">
                        <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
                            <div className="bg-gradient-to-br from-red-600 to-red-800 p-10 text-white text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-contain opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                                <div className="relative z-10">
                                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">
                                        <AlertOctagon size={42} className="text-white animate-pulse" />
                                    </div>
                                    <h3 className="text-2xl font-black mb-2">تأكيد حذف الحركة</h3>
                                    <p className="text-red-100 text-sm font-bold opacity-80">هل أنت متأكد من حذف هذه الحركة؟ سيتم تحديث رصيد الوكيل تلقائياً.</p>
                                </div>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="space-y-3">
                                    <Button
                                        onClick={async () => {
                                            const tx = agentTransactions.find((t: any) => t.id === deleteWalletTxModal.txId);
                                            if (!tx) return;
                                            try {
                                                const agent = agents.find((a: any) => a.id == tx.agentId);
                                                if (agent?.agentDetails) {
                                                    const newBal = agent.agentDetails.currentBalance - tx.amount;
                                                    await supabase.from('agent_details').update({ current_balance: newBal }).eq('id', agent.id);
                                                    agent.agentDetails.currentBalance = newBal;
                                                }
                                                await supabase.from('wallet_transactions').delete().eq('id', tx.id);
                                                db.fetchWalletTransactions();
                                                db.fetchUsers();
                                                setDeleteWalletTxModal({ isOpen: false, txId: null });
                                            } catch (e) { console.error(e); }
                                        }}
                                        className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 border-b-4 border-red-800"
                                    >
                                        <Trash2 size={20} /> حذف الحركة
                                    </Button>

                                    <button
                                        onClick={() => setDeleteWalletTxModal({ isOpen: false, txId: null })}
                                        className="w-full h-14 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-2xl font-black text-sm transition-all border border-gray-200"
                                    >
                                        إلغاء
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
                                    <h3 className="text-2xl font-black text-gray-800 mb-2">{t('batch4.k312')}</h3>
                                    <p className="text-gray-500 font-bold leading-relaxed px-4">{t('batch4.k313')} <span className="text-[#0e3c63] font-black">"{activeOrdersModal.agentName}"</span> {t('batch4.k314')}</p>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('batch4.k315')}</p>
                                    <div className="flex flex-wrap justify-center gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                        {activeOrdersModal.orderIds.map(id => (
                                            <span key={id} className="bg-white border border-amber-200 px-4 py-2 rounded-xl text-sm font-mono font-black text-[#0e3c63] shadow-sm">#{id}</span>
                                        ))}
                                    </div>
                                </div>

                                <Button onClick={() => setActiveOrdersModal(prev => ({ ...prev, isOpen: false }))} className="w-full h-16 bg-[#0e3c63] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all mt-4">{t('products_tab.understood_review')}</Button>
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
                                    <h3 className="text-2xl font-black text-gray-800 mb-2">{t('batch4.k316')}</h3>
                                    <p className="text-gray-500 font-bold leading-relaxed px-4">{t('batch4.k317')} <span className="text-[#0e3c63] font-black">"{deleteSafetyModal.agent.fullName}"</span> {t('batch4.k318')}</p>
                                </div>

                                <div className={`p-6 rounded-[2rem] border-2 border-dashed ${deleteSafetyModal.balance < 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{deleteSafetyModal.balance < 0 ? t('batch4.txt_in8081_6982') : t('batch4.txt_upyq52_6982')}</p>
                                    <p className={`text-4xl font-mono font-black ${deleteSafetyModal.balance < 0 ? 'text-red-600' : 'text-green-600'}`} dir="ltr">${Math.abs(deleteSafetyModal.balance).toLocaleString()}</p>
                                </div>

                                <p className="text-xs text-gray-400 font-bold">{t('batch4.k319')}</p>

                                <Button onClick={() => setDeleteSafetyModal({ isOpen: false, agent: null, balance: 0 })} className="w-full h-16 bg-[#0e3c63] text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all mt-4">{t('batch4.k320')}</Button>
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
                                    <h3 className="text-2xl font-black mb-2">{agentSuspendConfirm.agentDetails?.isFrozen ? t('agents.activate_account') : t('batch4.k583')}</h3>
                                    <p className="text-white text-sm font-bold opacity-80">
                                        {agentSuspendConfirm.agentDetails?.isFrozen ? t('agents.confirm_activate_msg') : t('agents.confirm_freeze_msg')}
                                    </p>
                                </div>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex items-center gap-4">
                                    <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border border-gray-100 ${agentSuspendConfirm.agentDetails?.isFrozen ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {agentSuspendConfirm.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">{t('batch4.k321')}</span>
                                        <span className="font-black text-gray-800 text-lg">{agentSuspendConfirm.fullName}</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-400 block mt-1">System ID: AGT-00{agentSuspendConfirm.id}</span>
                                    </div>
                                </div>

                                <div className={`border rounded-2xl p-4 text-center ${agentSuspendConfirm.agentDetails?.isFrozen ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <p className={`font-black text-sm mb-1 ${agentSuspendConfirm.agentDetails?.isFrozen ? 'text-emerald-700' : 'text-amber-700'}`}>{t('batch4.k322')}</p>
                                    <p className={`text-xs font-bold ${agentSuspendConfirm.agentDetails?.isFrozen ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {agentSuspendConfirm.agentDetails?.isFrozen ? t('agents.activate_effect') : t('agents.freeze_effect')}
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
                                        {agentSuspendConfirm.agentDetails?.isFrozen ? t('agents.confirm_activate') : t('batch3.txt_5ourh6_7042')}
                                    </Button>

                                    <button
                                        onClick={() => setAgentSuspendConfirm(null)}
                                        className="w-full h-14 rounded-2xl font-black text-sm transition-all border border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
                                    >
                                        {t('batch3.txt_v1l0sb_5344')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Thumbprint / Device Info Modal */}
            {
                showThumbprintModal && selectedAgent && (
                    <div className="fixed inset-0 bg-[#0e3c63]/60 backdrop-blur-md z-[700] flex items-center justify-center p-4 !mt-0" onClick={() => setShowThumbprintModal(false)}>
                        <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in border-t-[12px] border-indigo-500" onClick={(e) => e.stopPropagation()}>
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                                        <Fingerprint size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-800">البصمة الرقمية للوكيل</h3>
                                        <p className="text-sm font-bold text-gray-500">تفاصيل الأجهزة والوصول الخاصة بـ {displayAgent?.fullName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowThumbprintModal(false)} className="w-10 h-10 bg-white text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full flex items-center justify-center transition-all shadow-sm">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Main Digital ID Card */}
                                    <div className="md:col-span-2 bg-[#0e3c63] rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden group mb-4">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                                        <div className="relative z-10 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/5">
                                                    <Shield size={22} className="text-blue-200" />
                                                </div>
                                                <div className="text-left">
                                                    <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest block mb-1 opacity-80">{t('batch4.k260')}</span>
                                                    <span className="text-2xl font-black font-mono tracking-tighter text-white">
                                                        AGT-{String(displayAgent?.id).split('-')[0].toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-[9px] font-bold text-blue-300 uppercase tracking-widest">VOGA SECURITY ACCESS</span>
                                                <span className="text-[10px] font-bold text-blue-200">{t('batch4.k261')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-6 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col gap-2 hover:border-indigo-200 transition-all">
                                        <div className="flex items-center gap-2 text-indigo-500 mb-2">
                                            <Monitor size={18} />
                                            <span className="text-[11px] font-black uppercase tracking-wider">{t('batch4.k262')}</span>
                                        </div>
                                        <span className="text-sm font-black text-gray-800 dir-ltr">
                                            {(() => {
                                                try {
                                                    const info = displayAgent?.device_info ? JSON.parse(displayAgent.device_info) : null;
                                                    return info ? info.type || `${info.device_type}` : t('batch4.txt_vz08ep_7002');
                                                } catch { return t('batch4.txt_vz08ep_7002'); }
                                            })()}
                                        </span>
                                        <span className="text-[11px] font-bold text-gray-500 dir-ltr">
                                            {(() => {
                                                try {
                                                    const info = displayAgent?.device_info ? JSON.parse(displayAgent.device_info) : null;
                                                    return info ? `${info.os} - ${info.browser}` : '';
                                                } catch { return displayAgent?.device_info || ''; }
                                            })()}
                                        </span>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-6 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col gap-2 hover:border-blue-200 transition-all">
                                        <div className="flex items-center gap-2 text-blue-500 mb-2">
                                            <Globe size={18} />
                                            <span className="text-[11px] font-black uppercase tracking-wider">{t('batch4.k263')}</span>
                                        </div>
                                        <span className="text-base font-black text-gray-800 font-mono tracking-tight dir-ltr">
                                            {displayAgent?.last_ip || t('batch4.k544')}
                                        </span>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-6 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col gap-2 hover:border-emerald-200 transition-all">
                                        <div className="flex items-center gap-2 text-emerald-500 mb-2">
                                            <Activity size={18} />
                                            <span className="text-[11px] font-black uppercase tracking-wider">{t('batch4.k264')}</span>
                                        </div>
                                        <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-black w-fit">
                                            {agentTransactions.length} الحركات
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-50 p-6 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col gap-2 hover:border-amber-200 transition-all">
                                        <div className="flex items-center gap-2 text-amber-500 mb-2">
                                            <Clock size={18} />
                                            <span className="text-[11px] font-black uppercase tracking-wider">{t('batch4.k265')}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 leading-relaxed dir-ltr">
                                            {displayAgent?.last_active_at ? (
                                                <>
                                                    {formatDate(displayAgent.last_active_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                    <br />
                                                    <span className="text-amber-600">{formatTime(displayAgent.last_active_at)}</span>
                                                </>
                                            ) : t('batch4.k544')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
