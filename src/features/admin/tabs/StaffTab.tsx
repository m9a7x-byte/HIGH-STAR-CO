import i18n from 'i18next';
const t = i18n.t.bind(i18n);
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, UserCheck, Mail, Search, Filter, ArrowRight, Activity, Clock, ShieldCheck, Globe, History, Shield, Lock, CheckCircle2, AlertCircle, Trash2, Key, Settings2, Fingerprint, CalendarDays, MousePointer2, ListOrdered, FileText, Tags, Users, BarChart3, Factory, Settings, ExternalLink, X, Save, UserPlus, Info, ShieldAlert, ShieldX, RotateCcw, AlertOctagon, ArrowRightLeft, Hash, Monitor, Cpu, Phone, User as UserIcon, Camera, Crown, Eye } from 'lucide-react';
import { Badge, Button, Card, DateRangePicker, Input, Select, UserAvatar } from '../../../components/ui';
import { PhoneInput } from '../../../components/ui/PhoneInput';
import { PaginationControl } from '../../../components/shared/PaginationControl';
import { AvatarUploader } from '../../../components/profile/AvatarUploader';
import { UserRole, LogContext, User, UserRoleLabels } from '../../../types';
import { db } from '../../../lib/db';
import { formatDate, formatTime } from '../../../lib/dateUtils';
import { supabase } from '../../../lib/supabase';
import { ROLE_PERMISSIONS, PERMISSION_LABELS, PERMISSION_GROUPS, PermissionKey } from '../../../lib/permissions';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import carbonFibre from '../../../assets/patterns/carbon-fibre.png';

type ModalTab = 'general' | 'permissions' | 'security';

const getArabicContext = (context: LogContext): string => {
    const map: Record<LogContext, string> = {
        ORDERS: 'الطلبات',
        PRODUCTION: 'الإنتاج',
        CATALOG: 'الكتالوج',
        AGENTS: 'الوكلاء',
        STAFF: 'الموظفين',
        FINANCE: 'المالية',
        SYSTEM: 'النظام',
        AUTH: 'الدخول والأمان',
        FACTORY: 'المصنع',
        SAFE: 'القاصة',
        X_ACCOUNTS: 'الحسابات الخارجية',
        INVENTORY: 'المخزون',
        EXPENSES: 'المصاريف',
        SUPPLIERS: 'الموردين',
        LOGISTICS: 'النقل واللوجستيك',
        SETTINGS: 'الإعدادات'

    };
    return map[context] || context;
};

export const StaffTab = ({ employees, selectedEmployee, onSelectEmployee, isSuperAdmin, onNavigateOrder }: any) => {
    const { user: currentUser } = useAuth();
    const toast = useToast();

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(12);
    const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
    const [search, setSearch] = useState('');

    const [logPage, setLogPage] = useState(0);
    const [logRowsPerPage, setLogRowsPerPage] = useState(10);
    const [logFromDate, setLogFromDate] = useState('');
    const [logToDate, setLogToDate] = useState('');

    const [showEmployeeModal, setShowEmployeeModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
    const [selectedPerms, setSelectedPerms] = useState<any[]>([]);
    const [authMethod, setAuthMethod] = useState<'manual' | 'invite'>('manual');
    const [phone, setPhone] = useState(''); // Phone state
    const [passwordMethod, setPasswordMethod] = useState<'set' | 'reset'>('reset'); // For editing existing employee
    const [isResetting, setIsResetting] = useState(false); // Loading state for password reset
    const [modalTab, setModalTab] = useState<ModalTab>('general'); // Tab state for modal
    const [isEditingEmail, setIsEditingEmail] = useState(false); // Lock/unlock email field
    const [editEmail, setEditEmail] = useState(''); // Email value when editing
    const [isEditingPassword, setIsEditingPassword] = useState(false); // Lock/unlock password field
    const [newPassword, setNewPassword] = useState(''); // New password value
    const [confirmNewPassword, setConfirmNewPassword] = useState(''); // Confirm password value
    const [hasGeneralChanges, setHasGeneralChanges] = useState(false); // Track changes in General tab
    const [hasPermissionsChanges, setHasPermissionsChanges] = useState(false); // Track changes in Permissions tab
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null); // Track role selection
    const [isSavingPermissions, setIsSavingPermissions] = useState(false); // Loading state for permissions save
    const [isDeleting, setIsDeleting] = useState(false); // Loading state for delete
    const [isCreating, setIsCreating] = useState(false); // Loading state for create employee

    const [validationError, setValidationError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
    const [validationButtonFlip, setValidationButtonFlip] = useState(false); // For button transform animation

    const [staffDeleteConfirm, setStaffDeleteConfirm] = useState<User | null>(null);
    const [staffSuspendConfirm, setStaffSuspendConfirm] = useState<User | null>(null);

    const filteredEmployees = useMemo(() => {
        return employees.filter((e: any) => {
            const matchesSearch = e.fullName.toLowerCase().includes(search.toLowerCase()) ||
                e.email.toLowerCase().includes(search.toLowerCase());
            const matchesRole = roleFilter === 'ALL' || e.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [employees, search, roleFilter]);

    const currentEmployees = useMemo(() => {
        return filteredEmployees.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    }, [filteredEmployees, page, rowsPerPage]);

    const employeeLogs = useMemo(() => {
        if (!selectedEmployee) return [];
        return db.getLogs(selectedEmployee.id, 'ALL', logFromDate, logToDate);
    }, [selectedEmployee, logFromDate, logToDate]);

    const currentLogs = useMemo(() => {
        return employeeLogs.slice(logPage * logRowsPerPage, (logPage + 1) * logRowsPerPage);
    }, [employeeLogs, logPage, logRowsPerPage]);

    const isPermissionsCustom = (employee: User) => {
        if (!employee.permissions) return false;
        const roleDef = ROLE_PERMISSIONS[employee.role as UserRole];
        if (!roleDef) return true;
        const rolePerms = [...roleDef.permissions].sort();
        const userPerms = [...employee.permissions].sort();
        return JSON.stringify(rolePerms) !== JSON.stringify(userPerms);
    };

    // Check if current permissions exceed the default for the selected role
    const hasExtraPermissions = useMemo(() => {
        const role = selectedRole || editingEmployee?.role as UserRole;
        if (!role) return false;
        const defaultPerms = ROLE_PERMISSIONS[role]?.permissions || [];
        // Check if any selected permission is NOT in the default set
        return selectedPerms.some(p => !defaultPerms.includes(p as any));
    }, [selectedRole, selectedPerms, editingEmployee?.role]);

    // Handle role change - auto-select default permissions for the role
    const handleRoleChange = (newRole: UserRole) => {
        setSelectedRole(newRole);
        const defaultPerms = ROLE_PERMISSIONS[newRole]?.permissions || [];
        setSelectedPerms([...defaultPerms] as any[]);
        setHasPermissionsChanges(true);
    };

    // Reset permissions to role defaults
    const handleResetPermissions = () => {
        const role = selectedRole || editingEmployee?.role as UserRole;
        if (!role) return;
        const defaultPerms = ROLE_PERMISSIONS[role]?.permissions || [];
        setSelectedPerms([...defaultPerms] as any[]);
        setHasPermissionsChanges(true);
    };

    const handleOpenAdd = () => {
        setEditingEmployee(null);
        setSelectedPerms(Object.keys(Permissions));
        setPhone('');
        setAuthMethod('manual');
        setModalTab('general'); // Reset to first tab
        setShowEmployeeModal(true);
    };

    const handleOpenEdit = (emp: User) => {
        setEditingEmployee(emp);
        setSelectedPerms(emp.permissions || []);
        setPhone((emp as any).phone || '');
        setEditEmail(emp.email || ''); // Initialize email value
        setIsEditingEmail(false); // Lock email by default
        setPasswordMethod('reset'); // Default to reset mode
        setModalTab('general'); // Reset to first tab
        setHasGeneralChanges(false); // Reset change tracking
        setHasPermissionsChanges(false); // Reset permissions change tracking
        setSelectedRole(emp.role as UserRole); // Initialize role selection
        setShowEmployeeModal(true);
    };

    const handleInitiateDeleteStaff = (e: React.MouseEvent, emp: User) => {
        e.stopPropagation();
        if (String(emp.id) === String(currentUser?.id)) {
            toast.error(t('batch4.k520'), t('batch4.k521'));
            return;
        }
        setStaffDeleteConfirm(emp);
    };

    const executeDeleteStaff = async () => {
        if (staffDeleteConfirm) {
            if (String(staffDeleteConfirm.id) === String(currentUser?.id)) {
                toast.error(t('batch4.k520'), t('batch4.k522'));
                setStaffDeleteConfirm(null);
                return;
            }
            setIsDeleting(true);
            try {
                await db.deleteAgent(currentUser!.id, String(staffDeleteConfirm.id));
                toast.success(t('batch4.k523'));
                setStaffDeleteConfirm(null);
                onSelectEmployee(null);
                setEditingEmployee(null);
            } catch (err: any) {
                toast.error('خطأ في الحذف', err.message || 'فشل في حذف الموظف');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const executeSuspendStaff = async () => {
        if (staffSuspendConfirm) {
            if (String(staffSuspendConfirm.id) === String(currentUser?.id)) {
                toast.error(t('batch4.k520'), t('batch4.k524'));
                setStaffSuspendConfirm(null);
                return;
            }
            setIsDeleting(true);
            try {
                await db.setAgentStatus(currentUser!.id, staffSuspendConfirm.id, 'suspended');
                const updated = db.users.find(e => e.id === staffSuspendConfirm.id);
                if (updated) onSelectEmployee({ ...updated, status: 'suspended' });

                toast.success(t('batch4.k525'));
                setStaffSuspendConfirm(null);
            } catch (err: any) {
                toast.error('خطأ', err.message);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const togglePermission = (key: PermissionKey) => {
        setSelectedPerms(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
        setHasPermissionsChanges(true); // Track that permissions were changed
    };

    // Avatar Upload Handler (similar to ProfileTab)
    const handleAvatarUpload = async (path: string) => {
        if (!editingEmployee) return;

        try {
            // Update profile in DB with the new avatar path
            await supabase.from('profiles').update({ avatar_path: path }).eq('id', editingEmployee.id);

            // Refresh employees list
            await db.fetchUsers();

            toast.success(t('batch4.k526'));
        } catch (error: any) {
            console.error('Avatar update failed:', error);
            toast.error('فشل حفظ الصورة', error.message);
        }
    };

    // ==================== TAB-SPECIFIC SAVE HANDLERS ====================

    // TAB 1: General Info (Name, Phone, Image)
    const handleSaveGeneral = async () => {
        if (!editingEmployee) return;

        const form = document.querySelector('form') as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            // IMPORTANT: Only send the fields we want to update (NOT email)
            const updates = {
                id: editingEmployee.id, // Required for updateProfile
                fullName: data.fullName as string,
                phone: (data.phone as string)?.trim() || null,
            };
            await db.updateEmployee(currentUser!.id, updates);
            setHasGeneralChanges(false); // Reset after save
            toast.success(t('batch4.k527'));
        } catch (err: any) {
            toast.error('خطأ', err.message || 'فشل في حفظ البيانات');
        }
    };

    // TAB 2: Permissions (Role, Permission Matrix)
    const handleSavePermissions = async () => {
        if (!editingEmployee) return;

        setIsSavingPermissions(true);
        try {
            const changes: string[] = [];

            // Role Update - Use selectedRole state instead of form data
            const newRole = selectedRole || editingEmployee.role;
            if (newRole !== editingEmployee.role) {
                await db.setAgentRole(currentUser!.id, editingEmployee.id, newRole);
                changes.push(`الرتبة: ${UserRoleLabels[newRole]}`);
            }

            // Permissions Update - Only send id and permissions (NOT email)
            await db.updateEmployee(currentUser!.id, { id: editingEmployee.id, permissions: selectedPerms });
            changes.push('الصلاحيات');

            setHasPermissionsChanges(false); // Reset after save
            toast.success(`تم حفظ: ${changes.join('، ')} ✓`);
        } catch (err: any) {
            toast.error('خطأ', err.message || 'فشل في حفظ الصلاحيات');
        } finally {
            setIsSavingPermissions(false);
        }
    };

    // TAB 3: Security (Email, Password)
    const handleSaveSecurity = async () => {
        if (!editingEmployee) return;

        try {
            const credentialUpdates: { email?: string; password?: string } = {};
            const changes: string[] = [];

            // Email Change (only if unlocked and changed)
            if (isEditingEmail) {
                const oldEmail = (editingEmployee.email || '').trim().toLowerCase();
                const newEmailValue = editEmail.trim().toLowerCase();
                if (oldEmail !== newEmailValue && newEmailValue.length > 0) {
                    credentialUpdates.email = editEmail.trim();
                    changes.push('البريد الإلكتروني');
                }
            }

            // Password Change (only if unlocked and fields filled)
            if (isEditingPassword) {
                if (newPassword.length < 6) {
                    toast.error(t('batch4.k528'), t('batch4.k529'));
                    return;
                }
                if (newPassword !== confirmNewPassword) {
                    toast.error(t('batch4.k528'), t('batch4.k530'));
                    return;
                }
                credentialUpdates.password = newPassword;
                changes.push('كلمة المرور');
            }

            if (Object.keys(credentialUpdates).length === 0) {
                toast.info(t('batch4.k531'), t('batch4.k532'));
                return;
            }

            await db.updateUserCredentials(currentUser!.id, editingEmployee.id, credentialUpdates);
            toast.success(`تم تحديث: ${changes.join('، ')} ✓`);

            // Reset editing states
            setIsEditingEmail(false);
            setIsEditingPassword(false);
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err: any) {
            toast.error('خطأ', err.message || 'فشل في تحديث بيانات الأمان');
        }
    };

    // New Employee Creation (for Add modal)
    const handleSaveEmployee = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const payload: any = {
            fullName: data.fullName as string,
            email: data.email as string,
            phone: (data.phone as string)?.trim() || null,
            role: data.role as UserRole,
            permissions: selectedPerms,
            imageUrl: data.imageUrl as string || `https://api.dicebear.com/9.x/lorelei/svg?seed=${data.fullName}`
        };

        // Validation
        const showValidationError = (msg: string, field?: string) => {
            setValidationError(msg);
            setValidationButtonFlip(true); // Trigger button transform
            if (field) setFieldErrors(prev => ({ ...prev, [field]: true }));

            setTimeout(() => {
                setValidationError(null);
                setFieldErrors({});
                setValidationButtonFlip(false); // Revert button
            }, 3000);
        };

        const errors: Record<string, boolean> = {};
        const missingFields: string[] = [];

        if (!payload.fullName) { errors.fullName = true; missingFields.push('الاسم الكامل'); }
        if (!payload.role) { errors.role = true; missingFields.push('الرتبة الوظيفية'); }
        if (!payload.email) { errors.email = true; missingFields.push('البريد الإلكتروني'); }

        // Password validation only for manual auth
        if (authMethod === 'manual') {
            const password = data.password as string;
            if (!password) { errors.password = true; missingFields.push('كلمة المرور'); }
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            showValidationError(`بيانات ناقصة: ${missingFields.join('، ')}`);
            return;
        }

        try {
            setIsCreating(true);
            // Handling Password / Invite Logic for New Users
            const authMethod = data.authMethod as string;

            if (authMethod === 'invite') {
                payload.invite = true;
            } else if (authMethod === 'manual') {
                const password = data.password as string;
                const confirm = data.confirmPassword as string;

                if (!password || password.length < 6) {
                    toast.error(t('batch4.k528'), t('batch4.k529'));
                    return;
                }
                if (password !== confirm) {
                    toast.error(t('batch4.k528'), t('batch4.k530'));
                    return;
                }
                payload.password = password;
            }

            await db.registerEmployee(currentUser!.id, payload);

            if (payload.invite) toast.success(`تمت إضافة الموظف وإرسال دعوة إلى ${payload.email}`);
            else toast.success(t('batch4.k533'));

            setShowEmployeeModal(false);
            setEditingEmployee(null);
            setIsCreating(false);
        } catch (err: any) {
            console.error(err);
            toast.error('خطأ', err.message || 'فشل في حفظ البيانات');
            setIsCreating(false);
        }
    };

    const renderPermissionItem = (key: PermissionKey, isSpecialSpan = false) => {
        const info = PERMISSION_LABELS[key];
        const hasPermission = selectedEmployee.permissions?.includes(key);
        return (
            <div
                key={key}
                className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all duration-300 ${isSpecialSpan ? 'md:col-span-2' : ''} ${hasPermission
                    ? 'bg-white border-blue-100 shadow-sm ring-1 ring-blue-50/50 scale-[1.01]'
                    : 'bg-gray-50/50 border-transparent opacity-40 grayscale-[0.8]'
                    }`}
            >
                <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 transition-all ${hasPermission
                    ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100 ring-2 ring-emerald-50'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}>
                    {hasPermission ? <ShieldCheck size={16} /> : <Lock size={16} />}
                </div>
                <div className="min-w-0">
                    <h5 className={`text-xs font-black flex items-center gap-1.5 ${hasPermission ? 'text-gray-800' : 'text-gray-400'}`}>
                        {info.label}
                        {hasPermission && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                    </h5>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 leading-tight">{info.desc}</p>
                </div>
            </div>
        );
    };

    const renderInteractiveDetails = (text: string) => {
        const parts = text.split(/(#\d+)/g);
        return (
            <p className="text-gray-600 font-bold text-sm leading-relaxed">
                {parts.map((part, i) => {
                    if (part.startsWith('#')) {
                        const orderId = parseInt(part.substring(1));
                        return (
                            <button
                                key={i}
                                onClick={() => onNavigateOrder?.(orderId)}
                                className="text-[#0e3c63] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 font-mono font-black mx-0.5 hover:bg-[#0e3c63] hover:text-white transition-all inline-flex items-center gap-1 shadow-sm"
                            >
                                {part}
                                <ExternalLink size={10} className="opacity-50" />
                            </button>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </p>
        );
    };

    const formatLogValue = (val: string | undefined) => {
        if (!val || val === '-' || val === 'محذوف') return val;
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
            {!selectedEmployee ? (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100">
                        <h3 className="font-black text-xl text-gray-800 flex items-center gap-3 px-2 whitespace-nowrap shrink-0">
                            <UserCheck size={24} className="text-[#0e3c63]" />
                            {t('batch4.staff_team')}
                        </h3>

                        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                            <div className="relative md:w-80">
                                <input
                                    className="w-full h-[54px] pl-4 pr-11 bg-gray-50 border border-gray-200 rounded-2xl focus:border-[#0e3c63] outline-none text-sm font-bold shadow-inner"
                                    placeholder={t('batch4.k190')}
                                    value={search}
                                    onChange={e => { setSearch(e.target.value); setPage(0); }}
                                />
                                <Search className="absolute right-4 top-[18px] text-gray-400" size={18} />
                            </div>

                            <div className="flex h-[54px] bg-gray-50 p-1 rounded-2xl border border-gray-200 shadow-inner">
                                <button onClick={() => { setRoleFilter('ALL'); setPage(0); }} className={`px-3 h-full rounded-xl text-xs font-black transition-all ${roleFilter === 'ALL' ? 'bg-white text-[#0e3c63] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{t('batch4.k239')}</button>
                                {isSuperAdmin && <button onClick={() => { setRoleFilter(UserRole.SUPER_ADMIN); setPage(0); }} className={`px-3 h-full rounded-xl text-xs font-black transition-all ${roleFilter === UserRole.SUPER_ADMIN ? 'bg-amber-50 text-amber-600 shadow-sm' : 'text-gray-400'}`}>{t('batch4.k534')}</button>}
                                <button onClick={() => { setRoleFilter(UserRole.ADMIN); setPage(0); }} className={`px-3 h-full rounded-xl text-xs font-black transition-all ${roleFilter === UserRole.ADMIN ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-400'}`}>{t('batch4.k535')}</button>
                                <button onClick={() => { setRoleFilter(UserRole.SUPERVISOR); setPage(0); }} className={`px-3 h-full rounded-xl text-xs font-black transition-all ${roleFilter === UserRole.SUPERVISOR ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-gray-400'}`}>{t('batch4.k536')}</button>
                                <button onClick={() => { setRoleFilter(UserRole.VIEWER); setPage(0); }} className={`px-3 h-full rounded-xl text-xs font-black transition-all ${roleFilter === UserRole.VIEWER ? 'bg-gray-100 text-gray-600 shadow-sm' : 'text-gray-400'}`}>{t('batch4.k537')}</button>
                            </div>

                            {isSuperAdmin && <Button onClick={handleOpenAdd} className="h-[54px] text-sm rounded-2xl px-6 shadow-xl shadow-blue-900/10"><Plus size={18} />{t('batch4.k538')}</Button>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {currentEmployees.map((e: any) => {
                            const roleDef = ROLE_PERMISSIONS[e.role as UserRole];
                            const custom = isPermissionsCustom(e);
                            return (
                                <div
                                    key={e.id}
                                    onClick={() => onSelectEmployee(e)}
                                    className="bg-white rounded-[2.5rem] border border-gray-100 p-8 flex flex-col items-center text-center hover:border-blue-300 transition-all shadow-sm hover:shadow-2xl relative group cursor-pointer"
                                >
                                    {custom && (
                                        <div className="absolute top-6 left-6" title={t('batch4.k539')}>
                                            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl border border-amber-200 animate-pulse">
                                                <Settings2 size={14} />
                                            </div>
                                        </div>
                                    )}

                                    {isSuperAdmin && (
                                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-2">
                                            <button
                                                onClick={(ev) => { ev.stopPropagation(); handleOpenEdit(e); }}
                                                className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-xl transition-all hover:bg-white hover:shadow-md"
                                                title={t('batch4.k195')}
                                            >
                                                <Edit size={18} />
                                            </button>
                                        </div>
                                    )}

                                    <div className={`relative mb-6 ${e.status === 'suspended' ? 'grayscale opacity-75' : ''}`}>
                                        {e.status === 'suspended' && (
                                            <div className="absolute inset-0 z-10 flex items-center justify-center">
                                                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md rotate-[-12deg]">{t('batch4.k540')}</span>
                                            </div>
                                        )}
                                        {e.imageUrl ? (
                                            <UserAvatar
                                                avatarPath={(e as any).avatar_path}
                                                avatarUrl={e.imageUrl}
                                                name={e.fullName}
                                                size="xl"
                                                className="w-28 h-28 shadow-2xl border-4 border-white group-hover:scale-105 transition-transform"
                                            />
                                        ) : (
                                            <UserAvatar
                                                avatarPath={(e as any).avatar_path}
                                                name={e.fullName}
                                                size="xl"
                                                className="w-28 h-28 shadow-inner border-4 border-white"
                                            />
                                        )}
                                        <div className={`absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full border-4 border-white ${e.presence?.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                    </div>

                                    <h4 className="font-black text-gray-800 text-xl mb-1">{e.fullName}</h4>
                                    <div className="flex items-center justify-center gap-2">
                                        <Badge color={roleDef?.color || 'gray'} className="py-1 px-3 text-[10px] uppercase tracking-wider">
                                            {UserRoleLabels[e.role as UserRole] || e.role}{custom ? '+' : ''}
                                        </Badge>
                                    </div>

                                    <div className="mt-8 w-full space-y-3">
                                        <div className="flex items-center gap-3 text-xs text-gray-400 bg-gray-50 p-3 rounded-2xl justify-center font-bold border border-gray-100/50">
                                            <Mail size={14} className="shrink-0 text-[#0e3c63]/40" /> <span className="truncate">{e.email}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <PaginationControl page={page} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalItems={filteredEmployees.length} />
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in space-y-8 pb-10">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/70 backdrop-blur-md p-4 rounded-[2rem] border border-white shadow-xl">
                        <button onClick={() => onSelectEmployee(null)} className="flex items-center gap-3 text-gray-500 hover:text-[#0e3c63] font-black transition-all group px-3">
                            <div className="p-2 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:bg-[#0e3c63] group-hover:text-white transition-all transform group-hover:translate-x-1"><ArrowRight size={20} /></div>
                            {t('batch4.back_to_list')}
                        </button>

                        {isSuperAdmin && (
                            <div className="flex gap-3">
                                {/* Suspend/Unsuspend Button */}
                                {selectedEmployee.status === 'suspended' ? (
                                    <Button
                                        onClick={async () => {
                                            try {
                                                if (selectedEmployee.deleted_at) {
                                                    await db.restoreAgent(currentUser!.id, selectedEmployee.id);
                                                } else {
                                                    await db.setAgentStatus(currentUser!.id, selectedEmployee.id, 'active');
                                                }
                                                const updated = db.users.find(e => e.id === selectedEmployee.id);
                                                if (updated) onSelectEmployee({ ...updated, status: 'active' });
                                                toast.success(t('batch4.k541'));
                                            } catch (err: any) {
                                                toast.error('خطأ', err.message);
                                            }
                                        }}
                                        variant="secondary"
                                        className="py-3 px-6 text-sm bg-emerald-50 border-emerald-200 text-emerald-700 shadow-md font-black hover:bg-emerald-100"
                                    >
                                        <RotateCcw size={18} /> {t('batch4.unfreeze_account')}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={async () => {
                                            if (String(selectedEmployee.id) === String(currentUser?.id)) {
                                                toast.error(t('batch4.k520'), t('batch4.k524'));
                                                return;
                                            }
                                            setStaffSuspendConfirm(selectedEmployee);
                                        }}
                                        variant="secondary"
                                        className="py-3 px-6 text-sm bg-red-50 border-red-200 text-red-600 shadow-md font-black hover:bg-red-100"
                                    >
                                        <ShieldX size={18} /> {t('batch4.k583')}
                                    </Button>
                                )}
                                <Button onClick={() => handleOpenEdit(selectedEmployee)} variant="secondary" className="py-3 px-6 text-sm bg-white border-gray-200 shadow-md font-black">
                                    <Edit size={18} /> {t('batch4.assign_permissions')}
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (String(selectedEmployee.id) === String(currentUser?.id)) {
                                            toast.error(t('batch4.k520'), t('batch4.k522'));
                                            return;
                                        }
                                        setStaffDeleteConfirm(selectedEmployee);
                                    }}
                                    variant="danger"
                                    className="py-3 px-6 text-sm shadow-md font-black"
                                >
                                    <Trash2 size={18} /> {t('batch4.permanent_delete')}
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
                                        {selectedEmployee.imageUrl ? (
                                            <UserAvatar
                                                avatarPath={(selectedEmployee as any).avatar_path}
                                                avatarUrl={selectedEmployee.imageUrl}
                                                name={selectedEmployee.fullName}
                                                size="xl"
                                                className="w-32 h-32 shadow-2xl border-4 border-white mx-auto"
                                            />
                                        ) : (
                                            <UserAvatar
                                                avatarPath={(selectedEmployee as any).avatar_path}
                                                name={selectedEmployee.fullName}
                                                size="xl"
                                                className="w-32 h-32 shadow-2xl border-4 border-white mx-auto"
                                            />
                                        )}
                                        <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white shadow-lg ${selectedEmployee.presence?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                    </div>
                                    <h2 className="font-black text-3xl text-gray-800 tracking-tight">{selectedEmployee.fullName}</h2>
                                    <p className="text-gray-400 text-sm mt-1 font-bold font-mono">{selectedEmployee.email}</p>

                                    <div className="mt-6 flex justify-center gap-3">
                                        <Badge color={ROLE_PERMISSIONS[selectedEmployee.role as UserRole]?.color || 'gray'} className="py-1.5 px-4 text-xs font-black uppercase tracking-widest">
                                            {UserRoleLabels[selectedEmployee.role as UserRole] || selectedEmployee.role}
                                        </Badge>
                                        {isPermissionsCustom(selectedEmployee) && (
                                            <Badge color="orange" className="py-1.5 px-4 text-xs font-black">{t('batch4.k542')}</Badge>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-2">
                                    <Fingerprint size={18} className="text-[#0e3c63]" />
                                    <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-[0.2em]">{t('batch4.k259')}</h4>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <div className="bg-[#0e3c63] rounded-3xl p-5 text-white shadow-xl relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
                                        <div className="relative z-10">
                                            <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest block mb-1">{t('batch4.k543')}</span>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl font-black font-mono tracking-tighter">USR-{String(selectedEmployee.id).split('-')[0].toUpperCase()}</span>
                                                </div>
                                                <div className="p-2 bg-white/10 rounded-xl"><Shield size={18} className="text-blue-200" /></div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-[10px] font-mono opacity-60">{t('batch4.k261')}</span>
                                                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{t('batch4.voga_security_access')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:border-blue-100 transition-all">
                                            <div className="flex items-center gap-2 text-blue-500">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t('batch4.k263')}</span>
                                                <Globe size={16} />
                                            </div>
                                            <span className="text-sm font-black text-gray-800 font-mono tracking-tight dir-ltr">
                                                {selectedEmployee.presence?.ipAddress || 'غير متوفر'}
                                            </span>
                                        </div>
                                        <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:border-blue-100 transition-all">
                                            <div className="flex items-center gap-2 text-indigo-500">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t('batch4.k262')}</span>
                                                <Monitor size={16} />
                                            </div>
                                            <div className="flex flex-col items-center">
                                                {(() => {
                                                    try {
                                                        const raw = selectedEmployee.presence?.device;
                                                        if (!raw) return <span className="text-sm font-black text-gray-400">{t('batch4.k544')}</span>;

                                                        if (raw.startsWith('{')) {
                                                            const d = JSON.parse(raw);
                                                            return (
                                                                <>
                                                                    <span className="text-sm font-black text-gray-800 dir-ltr">{d.deviceModel || 'PC'}</span>
                                                                    <span className="text-[9px] font-bold text-gray-400 dir-ltr">{d.os} - {d.browser}</span>
                                                                </>
                                                            );
                                                        }
                                                        return <span className="text-sm font-black text-gray-800 dir-ltr">{raw}</span>;
                                                    } catch { return <span className="text-sm font-black text-gray-800 dir-ltr text-center">{selectedEmployee.presence?.device || 'غير معروف'}</span>; }
                                                })()}
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:border-blue-100 transition-all">
                                            <div className="flex items-center gap-2 text-amber-500">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t('batch4.k265')}</span>
                                                <Clock size={16} />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-700 leading-tight dir-ltr">
                                                {selectedEmployee.presence?.lastSeen ? (
                                                    <>
                                                        {new Date(selectedEmployee.presence.lastSeen).toLocaleDateString('ar-IQ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                        <br />
                                                        {new Date(selectedEmployee.presence.lastSeen).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </>
                                                ) : 'غير متوفر'}
                                            </span>
                                        </div>
                                        <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center gap-2 hover:border-blue-100 transition-all">
                                            <div className="flex items-center gap-2 text-emerald-500">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t('batch4.k264')}</span>
                                                <Activity size={16} />
                                            </div>
                                            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black">{employeeLogs.length}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50 text-[11px] text-blue-800 font-bold leading-relaxed flex gap-4">
                                <AlertCircle size={20} className="shrink-0 text-blue-400" />
                                <p>{t('batch4.k545')}</p>
                            </div>
                        </div>

                        <div className="lg:col-span-8 space-y-8">
                            <Card className="p-10 border-gray-100 shadow-2xl rounded-[3rem]">
                                <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3.5 bg-blue-50 text-[#0e3c63] rounded-2xl shadow-inner ring-1 ring-blue-100">
                                            <ShieldCheck size={32} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-2xl text-gray-800">{t('batch4.k546')}</h3>
                                            <p className="text-sm text-gray-400 font-bold mt-1">{t('batch4.k547')}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {PERMISSION_GROUPS.map((group, gIdx) => {
                                        const isFullRow = group.layout === 'row-2' || group.layout === 'row-4' || group.layout === 'row-5' || group.layout === 'system-special';
                                        return (
                                            <div key={gIdx} className={`space-y-4 ${isFullRow ? 'md:col-span-2' : ''}`}>
                                                <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
                                                    <div className={`p-2 rounded-xl bg-gray-50 text-gray-700`}>
                                                        <group.icon size={20} />
                                                    </div>
                                                    <h4 className="font-black text-base text-gray-700">{group.title}</h4>
                                                </div>

                                                <div className={`grid gap-3 ${group.layout === 'row-2' ? 'grid-cols-2' :
                                                    group.layout === 'row-4' ? 'grid-cols-2 lg:grid-cols-4' :
                                                        group.layout === 'row-5' ? 'grid-cols-2 lg:grid-cols-5' :
                                                            group.layout === 'grid-2' || group.layout === 'system-special' ? 'grid-cols-2' :
                                                                'grid-cols-1'
                                                    }`}>
                                                    {group.keys.map((key, idx) => {
                                                        const isLastAndSpecial = group.layout === 'system-special' && idx === group.keys.length - 1;
                                                        return renderPermissionItem(key, isLastAndSpecial);
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-center gap-10 bg-gray-50/50 p-6 rounded-3xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 ring-4 ring-emerald-50">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-800">{t('batch4.k548')}</p>
                                            <p className="text-[10px] text-gray-500 font-bold">{t('batch4.k549')}</p>
                                        </div>
                                    </div>
                                    <div className="w-px h-8 bg-gray-200 hidden md:block"></div>
                                    <div className="flex items-center gap-4 opacity-60">
                                        <div className="p-2 bg-gray-100 text-gray-400 rounded-xl border border-gray-200">
                                            <Lock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-800">{t('batch4.k550')}</p>
                                            <p className="text-[10px] text-gray-500 font-bold">{t('batch4.k551')}</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <div className="lg:col-span-12">
                            <Card className="p-0 overflow-hidden border-0 shadow-2xl rounded-[3rem]">
                                <div className="p-8 bg-gray-50/80 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-center">
                                    <div className="flex items-center gap-5">
                                        <div className="bg-white p-4 rounded-2xl border border-gray-200 text-[#0e3c63] shadow-lg">
                                            <History size={28} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-2xl text-gray-800">{t('batch4.k552')}</h3>
                                            <p className="text-sm text-gray-500 font-bold">{t('batch4.k553')}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-2 rounded-[1.5rem] border border-gray-200 shadow-sm">
                                        <span className="text-xs font-black text-gray-400 px-3 uppercase tracking-wider">{t('batch4.k554')}</span>
                                        <DateRangePicker
                                            from={logFromDate}
                                            to={logToDate}
                                            onChangeFrom={(d: any) => { setLogFromDate(d); setLogPage(0); }}
                                            onChangeTo={(d: any) => { setLogToDate(d); setLogPage(0); }}
                                        />
                                        {(logFromDate || logToDate) && (
                                            <button
                                                onClick={() => { setLogFromDate(''); setLogToDate(''); }}
                                                className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                title={t('batch4.k555')}
                                            >
                                                <RotateCcw size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-sm border-collapse">
                                        <thead className="bg-white text-gray-500 font-black uppercase text-[10px] tracking-[0.2em] border-b border-gray-100">
                                            <tr>
                                                <th className="p-6 pr-10 w-1/5">{t('batch4.k245')}</th>
                                                <th className="p-6 w-1/6 text-center">{t('batch4.k247')}</th>
                                                <th className="p-6 w-1/5 text-center">{t('batch4.k556')}</th>
                                                <th className="p-6">{t('batch4.k557')}</th>
                                                <th className="p-6 w-64">{t('batch4.k558')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 bg-white">
                                            {currentLogs.map((log: any) => (
                                                <tr key={log.id} className="hover:bg-blue-50/30 transition-all group">
                                                    <td className="p-6 pr-10">
                                                        <div className="flex flex-col font-mono">
                                                            <div className="flex items-center gap-2 font-black text-gray-800 text-sm">
                                                                <CalendarDays size={14} className="text-[#0e3c63]/30" />
                                                                {formatDate(log.timestamp)}
                                                            </div>
                                                            <div className="mt-1.5 text-[10px] font-bold text-gray-400 flex items-center gap-2 mr-5">
                                                                <Clock size={12} />
                                                                {formatTime(log.timestamp)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <Badge color="gray" className="bg-gray-100 text-gray-500 border-none font-black py-1.5 px-4 rounded-xl text-[10px]">
                                                            {getArabicContext(log.context)}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-6 text-center">
                                                        <span className="font-black text-[#0e3c63] text-xs bg-sky-50 px-4 py-2 rounded-xl border border-sky-100/50 shadow-sm uppercase tracking-wider group-hover:bg-[#0e3c63] group-hover:text-white transition-all">
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="p-6">
                                                        {renderInteractiveDetails(log.details)}
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-3">
                                                            {log.previousValue || log.newValue ? (
                                                                <>
                                                                    <div className="flex-1 bg-red-50 text-red-700 px-3 py-2 rounded-xl border border-red-100 text-[10px] font-bold shadow-sm flex flex-col min-w-[80px]">
                                                                        <span className="text-[8px] text-red-400 mb-1 font-black">{t('batch4.k559')}</span>
                                                                        <div className="truncate line-through opacity-70">
                                                                            {formatLogValue(log.previousValue) || '-'}
                                                                        </div>
                                                                    </div>

                                                                    <div className="bg-blue-50 text-[#0e3c63] p-1.5 rounded-full shrink-0">
                                                                        <ArrowRightLeft size={14} className="opacity-20" />
                                                                    </div>

                                                                    <div className="flex-1 bg-emerald-50 text-emerald-800 px-3 py-2 rounded-xl border border-red-100 text-[11px] font-black shadow-sm flex flex-col min-w-[80px]">
                                                                        <span className="text-[8px] text-emerald-400 mb-1 font-black">{t('batch4.k560')}</span>
                                                                        <div className="truncate">
                                                                            {formatLogValue(log.newValue) || '-'}
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="text-gray-300 text-[10px]">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {employeeLogs.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-32 text-center text-gray-400 font-black italic">
                                                        <div className="flex flex-col items-center gap-4 opacity-30">
                                                            <History size={64} />
                                                            <p className="text-xl">{t('batch4.k561')}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="bg-gray-50/50 border-t border-gray-100">
                                    <PaginationControl page={logPage} rowsPerPage={logRowsPerPage} setPage={setLogPage} setRowsPerPage={setLogRowsPerPage} totalItems={employeeLogs.length} />
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {showEmployeeModal && (
                <div className="fixed inset-0 bg-[#0e3c63]/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 !mt-0">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[90vh] border border-white/20 animate-fade-in relative">
                        <div className="p-6 bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-2xl"><UserPlus size={24} className="text-blue-200" /></div>
                                <div>
                                    <h3 className="font-black text-xl">{editingEmployee ? `${t('batch4.edit_employee_title')} (USR-00${editingEmployee.id})` : t('batch4.add_new_employee')}</h3>
                                    <p className="text-blue-200 text-[10px] font-bold opacity-70 uppercase tracking-widest">{t('batch4.staff_privileges_management')}</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); }} className="bg-white/10 hover:bg-red-500 p-2.5 rounded-xl transition-all shadow-inner"><X size={20} /></button>
                        </div>


                        {/* TAB NAVIGATOR */}
                        <div className="flex bg-gray-100 p-1.5 mx-6 mt-4 rounded-2xl shrink-0">
                            <button
                                type="button"
                                onClick={() => setModalTab('general')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-black transition-all ${modalTab === 'general' ? 'bg-white text-[#0e3c63] shadow-md' : 'text-gray-400 hover:bg-white/50'}`}
                            >
                                <UserIcon size={16} />
                                {t('batch4.general_information')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalTab('permissions')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-black transition-all ${modalTab === 'permissions' ? 'bg-white text-[#0e3c63] shadow-md' : 'text-gray-400 hover:bg-white/50'}`}
                            >
                                <ShieldCheck size={16} />
                                {t('batch4.permissions_tab')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setModalTab('security')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-black transition-all ${modalTab === 'security' ? 'bg-white text-[#0e3c63] shadow-md' : 'text-gray-400 hover:bg-white/50'}`}
                            >
                                <Lock size={16} />
                                {t('batch4.security_tab')}
                            </button>
                        </div>

                        <form onSubmit={handleSaveEmployee} noValidate className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-gray-50/30">
                            {/* TAB 1: General Info */}
                            <div className={`space-y-6 ${modalTab === 'general' ? 'block' : 'hidden'}`}>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4 px-1"><UserIcon size={14} className="text-[#0e3c63]" />{t('batch4.k562')}</h4>

                                {/* Avatar Upload - Using targetUserId for employee's folder */}
                                <div className="flex justify-center mb-6">
                                    <AvatarUploader
                                        currentAvatarUrl={editingEmployee?.imageUrl || ''}
                                        currentAvatarPath={(editingEmployee as any)?.avatar_path}
                                        userName={editingEmployee?.fullName || t('batch4.new_employee') || 'موظف جديد'}
                                        targetUserId={editingEmployee?.id}
                                        onUploadSuccess={handleAvatarUpload}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className={`relative ${fieldErrors.fullName ? 'animate-shake' : ''}`}>
                                        <Input
                                            required
                                            label={t('batch4.k563')}
                                            name="fullName"
                                            defaultValue={editingEmployee?.fullName}
                                            placeholder={t('batch4.k564')}
                                            onChange={() => { setHasGeneralChanges(true); setFieldErrors(prev => ({ ...prev, fullName: false })); }}
                                            className={fieldErrors.fullName ? '!border-rose-400 !bg-rose-50/50 text-rose-900 focus:!ring-rose-200 !shadow-[0_0_0_4px_rgba(251,113,133,0.1)]' : ''}
                                        />
                                        {fieldErrors.fullName && <div className="absolute left-3 top-[38px] text-rose-500 animate-pulse"><AlertCircle size={18} /></div>}
                                    </div>
                                    <div className={`relative ${fieldErrors.phone ? 'animate-shake' : ''}`}>
                                        <PhoneInput
                                            label={t('batch4.k283')}
                                            name="phone"
                                            value={phone}
                                            onChange={(val) => { setPhone(val); setHasGeneralChanges(true); setFieldErrors(prev => ({ ...prev, phone: false })); }}
                                            placeholder="7xxxxxxxxx"
                                            className={`${fieldErrors.phone ? '!border-rose-400 !bg-rose-50/50' : '!border-gray-200'} rounded-2xl`}
                                        />
                                        {fieldErrors.phone && <div className="absolute left-3 top-[38px] text-rose-500 animate-pulse"><AlertCircle size={18} /></div>}
                                    </div>
                                </div>

                                {/* Tab 1 Save Button - Only for Editing */}
                                {editingEmployee && (
                                    <div className="pt-6 border-t border-gray-100 mt-6">
                                        <button
                                            type="button"
                                            onClick={handleSaveGeneral}
                                            disabled={!hasGeneralChanges}
                                            className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-[0.98] ${hasGeneralChanges
                                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-xl'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            <Save size={18} />
                                            {t('batch4.save_general_info')}
                                        </button>
                                    </div>
                                )}
                            </div>
                            {/* END TAB 1 */}

                            {/* TAB 2: Permissions */}
                            <div className={`space-y-6 ${modalTab === 'permissions' ? 'block' : 'hidden'}`}>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4 px-1"><ShieldCheck size={14} className="text-[#0e3c63]" />{t('batch4.k565')}</h4>

                                {/* Role Selection - Modern Button Style */}
                                <div className="mb-6">
                                    <label className="block text-xs font-black text-gray-500 mb-3 flex items-center gap-2 justify-between">
                                        <div className="flex items-center gap-2">
                                            <Crown size={14} className="text-amber-500" />
                                            {t('batch4.role_label')}
                                            {hasExtraPermissions && <span className="text-amber-500">+</span>}
                                        </div>
                                        {hasExtraPermissions && (
                                            <button
                                                type="button"
                                                onClick={handleResetPermissions}
                                                className="text-[10px] bg-amber-100 text-amber-600 px-2 py-1 rounded-lg hover:bg-amber-200 transition-all flex items-center gap-1"
                                            >
                                                <RotateCcw size={12} />
                                                {t('batch4.reset')}
                                            </button>
                                        )}
                                    </label>
                                    <input type="hidden" name="role" value={selectedRole || editingEmployee?.role || ''} />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {isSuperAdmin && (
                                            <button
                                                type="button"
                                                onClick={() => handleRoleChange(UserRole.SUPER_ADMIN)}
                                                className={`p-4 rounded-2xl border-2 text-center transition-all relative ${(selectedRole || editingEmployee?.role) === UserRole.SUPER_ADMIN
                                                    ? 'bg-gradient-to-br from-amber-500 to-orange-500 border-amber-400 text-white shadow-lg shadow-amber-200'
                                                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-amber-300 hover:bg-amber-50'
                                                    }`}
                                            >
                                                <Crown size={20} className="mx-auto mb-2" />
                                                <span className="text-xs font-black block">{t('batch4.k566')}</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleRoleChange(UserRole.ADMIN)}
                                            className={`p-4 rounded-2xl border-2 text-center transition-all relative ${(selectedRole || editingEmployee?.role) === UserRole.ADMIN
                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-500 border-blue-400 text-white shadow-lg shadow-blue-200'
                                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-blue-300 hover:bg-blue-50'
                                                }`}
                                        >
                                            <Shield size={20} className="mx-auto mb-2" />
                                            <span className="text-xs font-black block">{t('batch4.k567')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRoleChange(UserRole.SUPERVISOR)}
                                            className={`p-4 rounded-2xl border-2 text-center transition-all relative ${(selectedRole || editingEmployee?.role) === UserRole.SUPERVISOR
                                                ? 'bg-gradient-to-br from-emerald-500 to-teal-500 border-emerald-400 text-white shadow-lg shadow-emerald-200'
                                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-emerald-300 hover:bg-emerald-50'
                                                }`}
                                        >
                                            <Users size={20} className="mx-auto mb-2" />
                                            <span className="text-xs font-black block">{t('batch4.k536')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRoleChange(UserRole.VIEWER)}
                                            className={`p-4 rounded-2xl border-2 text-center transition-all relative ${(selectedRole || editingEmployee?.role) === UserRole.VIEWER
                                                ? 'bg-gradient-to-br from-gray-500 to-slate-500 border-gray-400 text-white shadow-lg shadow-gray-200'
                                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-100'
                                                }`}
                                        >
                                            <Eye size={20} className="mx-auto mb-2" />
                                            <span className="text-xs font-black block">{t('batch4.k537')}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Permission Matrix */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4 px-1"><ShieldAlert size={14} className="text-amber-600" />{t('batch4.k568')}</h4>

                                    <div className="grid grid-cols-1 gap-8">
                                        {PERMISSION_GROUPS.map((group, gIdx) => (
                                            <div key={gIdx} className="space-y-4">
                                                <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
                                                    <div className="p-2 rounded-xl bg-gray-100 text-gray-700"><group.icon size={18} /></div>
                                                    <h5 className="font-black text-sm text-gray-700">{group.title}</h5>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {group.keys.map(key => {
                                                        const info = PERMISSION_LABELS[key];
                                                        const isSelected = selectedPerms.includes(key);
                                                        return (
                                                            <button
                                                                key={key}
                                                                type="button"
                                                                onClick={() => togglePermission(key)}
                                                                className={`p-4 rounded-2xl border-2 text-right transition-all flex items-start gap-3 group/btn ${isSelected ? 'bg-white border-[#0e3c63] shadow-md ring-1 ring-blue-50' : 'bg-gray-100 border-transparent text-gray-400 hover:border-gray-200'}`}
                                                            >
                                                                <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 transition-colors ${isSelected ? 'bg-blue-50 text-[#0e3c63]' : 'bg-gray-200 text-gray-300'}`}>
                                                                    {isSelected ? <CheckCircle2 size={16} /> : <Shield size={16} />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className={`text-xs font-black transition-colors ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>{info.label}</p>
                                                                    <p className="text-[9px] font-bold mt-1 leading-tight opacity-60">{info.desc}</p>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Tab 2 Save Button - Only for Editing */}
                                {editingEmployee && (
                                    <div className="pt-6 border-t border-gray-100 mt-6">
                                        <button
                                            type="button"
                                            onClick={handleSavePermissions}
                                            disabled={!hasPermissionsChanges || isSavingPermissions}
                                            className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-[0.98] ${isSavingPermissions
                                                ? 'bg-emerald-400 text-white cursor-wait'
                                                : hasPermissionsChanges
                                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-xl'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            {isSavingPermissions ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    {t('batch4.saving')}
                                                </>
                                            ) : (
                                                <>
                                                    <Save size={18} />
                                                    {t('batch4.save_permissions')}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                            {/* END TAB 2 */}

                            {/* TAB 3: Security */}
                            <div className={`space-y-6 ${modalTab === 'security' ? 'block' : 'hidden'}`}>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4 px-1"><Lock size={14} className="text-[#0e3c63]" />{t('batch4.k569')}</h4>

                                {/* Email Field - Lock/Unlock Pattern */}
                                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                                <Mail size={16} className="text-gray-400" /> {t('batch4.email_label')}
                                            </h4>
                                            <p className="text-[10px] text-gray-400 mt-1 font-bold">{t('batch4.k570')}</p>
                                        </div>
                                        {editingEmployee && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isEditingEmail) {
                                                        setEditEmail(editingEmployee.email || '');
                                                    }
                                                    setIsEditingEmail(!isEditingEmail);
                                                }}
                                                className={`rounded-xl px-4 py-2 font-bold text-xs border-2 flex items-center gap-2 transition-all ${isEditingEmail ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                {isEditingEmail ? <><X size={14} />{t('batch4.k156')}</> : <><Edit size={14} />{t('batch4.k138')}</>}
                                            </button>
                                        )}
                                    </div>

                                    <div className={`relative ${fieldErrors.email ? 'animate-shake' : ''}`}>
                                        <input
                                            type="email"
                                            name="email"
                                            value={editEmail || ''}
                                            disabled={editingEmployee ? !isEditingEmail : false}
                                            onChange={(e) => { setEditEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: false })); }}
                                            placeholder="staff@factory.com"
                                            className={`w-full h-14 rounded-2xl px-5 font-bold outline-none transition-all
                                                ${editingEmployee && isEditingEmail
                                                    ? 'bg-white border-2 border-amber-400 text-gray-800 shadow-lg'
                                                    : 'bg-gray-100 border-2 border-transparent text-gray-500'
                                                }
                                                ${!editingEmployee ? `bg-white border-2 text-gray-800 ${fieldErrors.email ? '!border-rose-400 !bg-rose-50/50 text-rose-900 focus:!ring-rose-200 !shadow-[0_0_0_4px_rgba(251,113,133,0.1)]' : 'border-gray-200'}` : ''}
                                            `}
                                            required={!editingEmployee}
                                        />
                                        {fieldErrors.email && <div className="absolute left-3 top-4 text-rose-500 animate-pulse"><AlertCircle size={18} /></div>}
                                    </div>
                                    {editingEmployee && isEditingEmail && (
                                        <p className="text-[10px] text-amber-600 mt-2 font-bold flex items-center gap-1">
                                            <AlertCircle size={12} /> {t('batch4.email_confirm_notice')}
                                        </p>
                                    )}
                                </div>

                                {/* Password Settings for NEW EMPLOYEE - moved from General tab */}
                                {!editingEmployee && (
                                    <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                                        <div className="space-y-4">
                                            <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                                <Key size={14} className="text-[#0e3c63]" />
                                                {t('batch4.login_settings')}
                                            </h5>

                                            <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => setAuthMethod('manual')}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all relative z-10 ${authMethod === 'manual' ? 'bg-[#0e3c63] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                                                >
                                                    <Key size={16} />
                                                    {t('batch4.set_password')}
                                                </button>
                                                <div className="w-px bg-gray-100 my-2 mx-1"></div>
                                                <button
                                                    type="button"
                                                    onClick={() => setAuthMethod('invite')}
                                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all relative z-10 ${authMethod === 'invite' ? 'bg-[#0e3c63] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
                                                >
                                                    <Mail size={16} />
                                                    {t('batch4.send_invite')}
                                                </button>
                                            </div>
                                            <input type="hidden" name="authMethod" value={authMethod} />
                                        </div>

                                        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${authMethod === 'manual' ? 'max-h-48 opacity-100' : 'max-h-0 opacity-50'}`}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                                                <div className={`relative ${fieldErrors.password ? 'animate-shake' : ''}`}>
                                                    <Input
                                                        type="password"
                                                        name="password"
                                                        label={t('batch4.k571')}
                                                        placeholder="••••••••"
                                                        disabled={authMethod === 'invite'}
                                                        onChange={() => setFieldErrors(prev => ({ ...prev, password: false }))}
                                                        className={fieldErrors.password ? '!border-rose-400 !bg-rose-50/50 text-rose-900 focus:!ring-rose-200 !shadow-[0_0_0_4px_rgba(251,113,133,0.1)]' : ''}
                                                    />
                                                    {fieldErrors.password && <div className="absolute left-3 top-[38px] text-rose-500 animate-pulse"><AlertCircle size={18} /></div>}
                                                </div>
                                                <Input type="password" name="confirmPassword" label={t('batch4.k572')} placeholder="••••••••" disabled={authMethod === 'invite'} />
                                            </div>
                                        </div>

                                        {/* Submit Button Removed - Using Main Footer Button */}
                                    </div>
                                )}

                                {/* Password Field - Lock/Unlock Pattern */}
                                {editingEmployee && isSuperAdmin && (
                                    <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                                    <Key size={16} className="text-gray-400" /> {t('batch4.password_label')}
                                                </h4>
                                                <p className="text-[10px] text-gray-400 mt-1 font-bold">{t('batch4.k573')}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isEditingPassword) {
                                                        setNewPassword('');
                                                        setConfirmNewPassword('');
                                                    }
                                                    setIsEditingPassword(!isEditingPassword);
                                                }}
                                                className={`rounded-xl px-4 py-2 font-bold text-xs border-2 flex items-center gap-2 transition-all ${isEditingPassword ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                {isEditingPassword ? <><X size={14} />{t('batch4.k156')}</> : <><Edit size={14} />{t('batch4.k138')}</>}
                                            </button>
                                        </div>

                                        {isEditingPassword ? (
                                            <div className="space-y-4">
                                                <input
                                                    type="password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder={t('batch4.k574')}
                                                    className="w-full h-14 rounded-2xl px-5 font-bold outline-none transition-all bg-white border-2 border-amber-400 text-gray-800 shadow-lg"
                                                />
                                                <input
                                                    type="password"
                                                    value={confirmNewPassword}
                                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                    placeholder={t('batch4.k572')}
                                                    className="w-full h-14 rounded-2xl px-5 font-bold outline-none transition-all bg-white border-2 border-amber-400 text-gray-800 shadow-lg"
                                                />
                                                <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                                    <AlertCircle size={12} /> {t('batch4.password_update_notice')}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-gray-400">
                                                <Lock size={32} className="mx-auto mb-2 opacity-30" />
                                                <p className="text-xs font-bold">{t('batch4.k575')}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tab 3 Save Button - Only for Editing */}
                                {editingEmployee && (
                                    <div className="pt-6 border-t border-gray-100 mt-6">
                                        <button
                                            type="button"
                                            onClick={handleSaveSecurity}
                                            className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
                                        >
                                            <Save size={18} />
                                            {t('batch4.save_security_settings')}
                                        </button>
                                    </div>
                                )}
                            </div>
                            {/* END TAB 3 */}
                        </form>

                        {/* Validation Error Message - FIXED POSITION to guarantee visibility */}


                        <div className="p-6 border-t bg-white flex flex-col gap-4 shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)] relative z-50">

                            <div className="flex gap-4 w-full">
                                {!editingEmployee && (
                                    <Button
                                        type="submit"
                                        onClick={() => (document.querySelector('form') as HTMLFormElement).requestSubmit()}
                                        className={`flex-1 h-14 rounded-2xl shadow-lg font-black transition-all duration-500 overflow-hidden relative ${validationButtonFlip
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white scale-[1.02] ring-4 ring-rose-200'
                                            : authMethod === 'invite'
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:from-blue-700 hover:to-indigo-700'
                                                : 'bg-[#0e3c63] hover:bg-indigo-600 text-white shadow-xl'
                                            } ${isCreating ? 'cursor-wait opacity-80' : ''}`}
                                    >
                                        <div className={`flex items-center justify-center gap-2 transition-all duration-500 absolute w-full ${validationButtonFlip || isCreating ? '-translate-y-12 opacity-0' : 'translate-y-0 opacity-100'}`}>
                                            {authMethod === 'invite' ? (
                                                <>
                                                    <Mail size={20} className="ml-2" /> {t('batch4.send_invite_add_employee')}
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus size={20} className="ml-2" /> {t('batch4.add_new_employee_btn')}
                                                </>
                                            )}
                                        </div>

                                        <div className={`flex items-center justify-center gap-2 transition-all duration-500 absolute w-full ${validationButtonFlip && !isCreating ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                                            <AlertCircle size={20} className="ml-2" /> {validationError}
                                        </div>

                                        {/* Loading Spinner */}
                                        <div className={`flex items-center justify-center gap-2 transition-all duration-500 absolute w-full ${isCreating ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>{t('batch4.k576')}</span>
                                        </div>
                                    </Button>
                                )}
                                <Button type="button" onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); }} variant="secondary" className={`${editingEmployee ? 'flex-1' : 'px-10'} h-14 rounded-2xl font-bold`}>{t('batch4.k577')}</Button>
                            </div>
                        </div>
                    </div>
                </div >
            )}

            {/* Delete Confirmation Modal */}
            {
                staffDeleteConfirm && (
                    <div className="fixed inset-0 bg-[#0e3c63]/70 backdrop-blur-md z-[700] flex items-center justify-center p-4 animate-fade-in !mt-0">
                        <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
                            <div className="bg-gradient-to-br from-red-600 to-red-800 p-10 text-white text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-contain opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                                <div className="relative z-10">
                                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">
                                        <AlertOctagon size={42} className="text-white animate-pulse" />
                                    </div>
                                    <h3 className="text-2xl font-black mb-2">{t('batch4.k578')}</h3>
                                    <p className="text-red-100 text-sm font-bold opacity-80">{t('batch4.k579')}</p>
                                </div>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-red-600 font-black text-xl shadow-sm border border-gray-100">
                                        {staffDeleteConfirm.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">{t('batch4.k321')}</span>
                                        <span className="font-black text-gray-800 text-lg">{staffDeleteConfirm.fullName}</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-400 block mt-1">System ID: USR-00{staffDeleteConfirm.id}</span>
                                    </div>
                                </div>

                                {/* Info about smart deletion */}
                                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
                                    <p className="text-blue-700 font-black text-sm mb-1">{t('batch4.k580')}</p>
                                    <p className="text-blue-600 text-xs font-bold">{t('batch4.k581')}</p>
                                    <p className="text-blue-500 text-[10px] font-bold mt-1">{t('batch4.k582')}</p>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        onClick={executeDeleteStaff}
                                        disabled={isDeleting}
                                        className={`w-full h-16 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg transition-all border-b-4 ${isDeleting
                                            ? 'bg-red-400 border-red-500 cursor-wait'
                                            : 'bg-red-600 hover:bg-red-700 border-red-800 active:scale-95'
                                            }`}
                                    >
                                        {isDeleting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                جاري الحذف...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 size={20} /> تأكيد الحذف النهائي
                                            </>
                                        )}
                                    </Button>

                                    <button
                                        onClick={() => setStaffDeleteConfirm(null)}
                                        disabled={isDeleting}
                                        className={`w-full h-14 rounded-2xl font-black text-sm transition-all border border-gray-200 ${isDeleting ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                            }`}
                                    >
                                        إلغاء التراجع عن الحذف
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Suspend Confirmation Modal */}
            {
                staffSuspendConfirm && (
                    <div className="fixed inset-0 bg-[#0e3c63]/70 backdrop-blur-md z-[700] flex items-center justify-center p-4 animate-fade-in !mt-0">
                        <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden border border-white/20">
                            <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-10 text-white text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-full bg-contain opacity-20" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                                <div className="relative z-10">
                                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl backdrop-blur-md border border-white/20">
                                        <ShieldAlert size={42} className="text-white animate-pulse" />
                                    </div>
                                    <h3 className="text-2xl font-black mb-2">{t('batch4.k583')}</h3>
                                    <p className="text-amber-100 text-sm font-bold opacity-80">{t('batch4.k584')}</p>
                                </div>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex items-center gap-4">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-amber-600 font-black text-xl shadow-sm border border-gray-100">
                                        {staffSuspendConfirm.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">{t('batch4.k321')}</span>
                                        <span className="font-black text-gray-800 text-lg">{staffSuspendConfirm.fullName}</span>
                                        <span className="text-[10px] font-mono font-bold text-gray-400 block mt-1">System ID: USR-00{staffSuspendConfirm.id}</span>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                                    <p className="text-amber-700 font-black text-sm mb-1">{t('batch4.k585')}</p>
                                    <p className="text-amber-600 text-xs font-bold">{t('batch4.k586')}</p>
                                    <p className="text-amber-500 text-[10px] font-bold mt-1">{t('batch4.k587')}</p>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        onClick={executeSuspendStaff}
                                        disabled={isDeleting}
                                        className={`w-full h-16 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg transition-all border-b-4 ${isDeleting
                                            ? 'bg-amber-400 border-amber-500 cursor-wait'
                                            : 'bg-amber-500 hover:bg-amber-600 border-amber-700 active:scale-95'
                                            }`}
                                    >
                                        {isDeleting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                {t('batch4.freezing_account')}
                                            </>
                                        ) : (
                                            <>
                                                <ShieldX size={20} /> {t('batch4.confirm_freeze_account')}
                                            </>
                                        )}
                                    </Button>

                                    <button
                                        onClick={() => setStaffSuspendConfirm(null)}
                                        disabled={isDeleting}
                                        className={`w-full h-14 rounded-2xl font-black text-sm transition-all border border-gray-200 ${isDeleting ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                            }`}
                                    >
                                        {t('common.cancel')}
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
