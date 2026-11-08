import i18n from 'i18next';
const t = i18n.t.bind(i18n);

import { UserRole } from '../types';
import { ListOrdered, FileText, Tags, Users, BarChart3, Factory, ShieldCheck, Box, DollarSign, Truck, UserCheck, Vault } from 'lucide-react';

export type PermissionKey =
    // الإنتاج والطلبات
    | 'VIEW_PRODUCTION' | 'EDIT_PRODUCTION'
    | 'VIEW_ORDERS' | 'ADD_ORDERS' | 'EDIT_ORDERS' | 'DELETE_ORDERS' | 'UNLOCK_ORDERS'
    // الكتالوج والوكلاء
    | 'VIEW_CATALOG' | 'ADD_CATALOG' | 'EDIT_CATALOG' | 'DELETE_CATALOG'
    | 'VIEW_AGENTS' | 'ADD_AGENTS' | 'EDIT_AGENTS' | 'DELETE_AGENTS'
    // المصنع - المخزن
    | 'VIEW_FACTORY_INV' | 'ADD_FACTORY_INV' | 'EDIT_FACTORY_INV' | 'DELETE_FACTORY_INV' | 'LOCK_FACTORY_INV'
    // المصنع - المصاريف
    | 'VIEW_FACTORY_EXP' | 'ADD_FACTORY_EXP' | 'EDIT_FACTORY_EXP' | 'DELETE_FACTORY_EXP' | 'LOCK_FACTORY_EXP'
    // المصنع - الموردين
    | 'VIEW_FACTORY_SUP' | 'ADD_FACTORY_SUP' | 'EDIT_FACTORY_SUP' | 'DELETE_FACTORY_SUP' | 'LOCK_FACTORY_SUP'
    // المصنع - اللوجستيات
    | 'VIEW_FACTORY_LOG' | 'ADD_FACTORY_LOG' | 'EDIT_FACTORY_LOG' | 'DELETE_FACTORY_LOG' | 'LOCK_FACTORY_LOG'
    // الصندوق المالي (الجديد)
    | 'VIEW_SAFE' | 'ADD_SAFE_TX' | 'EDIT_SAFE_TX' | 'DELETE_SAFE_TX'
    // النظام والرقابة
    | 'VIEW_SALES' | 'VIEW_REPORTS' | 'VIEW_LOGS' | 'VIEW_PRESENCE'
    | 'MANAGE_STAFF' | 'ACCESS_FACTORY'
    | 'VIEW_SETTINGS' | 'EDIT_SETTINGS';

export interface RoleDefinition {
    role: UserRole;
    label: string;
    description: string;
    color: string;
    permissions: PermissionKey[];
}

export const ROLE_PERMISSIONS: Record<UserRole, RoleDefinition> = {
    [UserRole.SUPER_ADMIN]: {
        role: UserRole.SUPER_ADMIN,
        label: t('batch4.k566'),
        description: t('batch4.k790'),
        color: 'purple',
        permissions: [
            'VIEW_PRODUCTION', 'EDIT_PRODUCTION',
            'VIEW_ORDERS', 'ADD_ORDERS', 'EDIT_ORDERS', 'DELETE_ORDERS', 'UNLOCK_ORDERS',
            'VIEW_CATALOG', 'ADD_CATALOG', 'EDIT_CATALOG', 'DELETE_CATALOG',
            'VIEW_AGENTS', 'ADD_AGENTS', 'EDIT_AGENTS', 'DELETE_AGENTS',
            'VIEW_FACTORY_INV', 'ADD_FACTORY_INV', 'EDIT_FACTORY_INV', 'DELETE_FACTORY_INV', 'LOCK_FACTORY_INV',
            'VIEW_FACTORY_EXP', 'ADD_FACTORY_EXP', 'EDIT_FACTORY_EXP', 'DELETE_FACTORY_EXP', 'LOCK_FACTORY_EXP',
            'VIEW_FACTORY_SUP', 'ADD_FACTORY_SUP', 'EDIT_FACTORY_SUP', 'DELETE_FACTORY_SUP', 'LOCK_FACTORY_SUP',
            'VIEW_FACTORY_LOG', 'ADD_FACTORY_LOG', 'EDIT_FACTORY_LOG', 'DELETE_FACTORY_LOG', 'LOCK_FACTORY_LOG',
            'VIEW_SAFE', 'ADD_SAFE_TX', 'EDIT_SAFE_TX', 'DELETE_SAFE_TX',
            'VIEW_SALES', 'VIEW_REPORTS', 'VIEW_LOGS', 'VIEW_PRESENCE',
            'MANAGE_STAFF', 'ACCESS_FACTORY',
            'VIEW_SETTINGS', 'EDIT_SETTINGS'
        ]
    },
    [UserRole.ADMIN]: {
        role: UserRole.ADMIN,
        label: t('batch4.k567'),
        description: t('batch4.k791'),
        color: 'red',
        permissions: [
            // كل صلاحيات المشرف
            'VIEW_AGENTS', 'VIEW_ORDERS', 'VIEW_PRODUCTION',
            'ADD_ORDERS', 'EDIT_ORDERS', 'DELETE_ORDERS', 'UNLOCK_ORDERS', 'EDIT_PRODUCTION',
            'VIEW_SALES', 'VIEW_REPORTS', 'VIEW_PRESENCE',
            'ACCESS_FACTORY',
            'VIEW_FACTORY_INV', 'ADD_FACTORY_INV', 'EDIT_FACTORY_INV', 'DELETE_FACTORY_INV',
            'VIEW_FACTORY_EXP', 'ADD_FACTORY_EXP', 'EDIT_FACTORY_EXP', 'DELETE_FACTORY_EXP',
            'VIEW_FACTORY_SUP', 'ADD_FACTORY_SUP', 'EDIT_FACTORY_SUP', 'DELETE_FACTORY_SUP',
            'VIEW_FACTORY_LOG', 'ADD_FACTORY_LOG', 'EDIT_FACTORY_LOG', 'DELETE_FACTORY_LOG',
            'VIEW_SAFE', 'ADD_SAFE_TX', 'EDIT_SAFE_TX', 'DELETE_SAFE_TX',
            // + سجل الأحداث
            'VIEW_LOGS',
            // + إدارة الوكلاء (إضافة/تعديل/حذف)
            'ADD_AGENTS', 'EDIT_AGENTS', 'DELETE_AGENTS',
            // + الكتالوج (كل الصلاحيات)
            'VIEW_CATALOG', 'ADD_CATALOG', 'EDIT_CATALOG', 'DELETE_CATALOG',
            // + الإعدادات (عرض فقط)
            'VIEW_SETTINGS',
            // + القفل
            'LOCK_FACTORY_INV', 'LOCK_FACTORY_EXP', 'LOCK_FACTORY_SUP', 'LOCK_FACTORY_LOG'
        ]
    },
    [UserRole.SUPERVISOR]: {
        role: UserRole.SUPERVISOR,
        label: t('batch4.k536'),
        description: t('batch4.k792'),
        color: 'blue',
        permissions: [
            // صلاحيات المشاهد
            'VIEW_AGENTS', 'VIEW_ORDERS', 'VIEW_PRODUCTION',
            // + الطلبات (إضافة/تعديل/حذف)
            'ADD_ORDERS', 'EDIT_ORDERS', 'DELETE_ORDERS', 'EDIT_PRODUCTION',
            // + المبيعات والتقارير وسجل المتواجدين
            'VIEW_SALES', 'VIEW_REPORTS', 'VIEW_PRESENCE',
            // + المصنع (إضافة/تعديل/حذف)
            'ACCESS_FACTORY',
            'VIEW_FACTORY_INV', 'ADD_FACTORY_INV', 'EDIT_FACTORY_INV', 'DELETE_FACTORY_INV',
            'VIEW_FACTORY_EXP', 'ADD_FACTORY_EXP', 'EDIT_FACTORY_EXP', 'DELETE_FACTORY_EXP',
            'VIEW_FACTORY_SUP', 'ADD_FACTORY_SUP', 'EDIT_FACTORY_SUP', 'DELETE_FACTORY_SUP',
            'VIEW_FACTORY_LOG', 'ADD_FACTORY_LOG', 'EDIT_FACTORY_LOG', 'DELETE_FACTORY_LOG',
            // + الصندوق (إضافة/تعديل/حذف)
            'VIEW_SAFE', 'ADD_SAFE_TX', 'EDIT_SAFE_TX', 'DELETE_SAFE_TX'
        ]
    },
    [UserRole.VIEWER]: {
        role: UserRole.VIEWER,
        label: t('batch4.k537'),
        description: t('batch4.k793'),
        color: 'gray',
        permissions: [
            'VIEW_AGENTS', 'VIEW_ORDERS', 'VIEW_PRODUCTION'
        ]
    },
    [UserRole.AGENT]: {
        role: UserRole.AGENT,
        label: t('batch4.k794'),
        description: t('batch4.k795'),
        color: 'emerald',
        permissions: []
    }
};

export const PERMISSION_LABELS: Record<PermissionKey, { label: string, desc: string }> = {
    'VIEW_PRODUCTION': { label: t('batch4.k796'), desc: 'عرض قائمة الطلبات قيد التحضير' },
    'EDIT_PRODUCTION': { label: t('batch4.k797'), desc: 'تحديث حالة الطلبات وتغيير مدد التجهيز' },
    'VIEW_ORDERS': { label: t('batch4.k798'), desc: 'عرض أرشيف وفواتير كافة الطلبات' },
    'ADD_ORDERS': { label: t('batch4.k799'), desc: 'إضافة طلبات يدوية وتنسيبها للوكلاء' },
    'EDIT_ORDERS': { label: t('batch4.k800'), desc: 'تغيير محتويات الطلب أو المبالغ الواصلة' },
    'DELETE_ORDERS': { label: t('batch4.k801'), desc: 'إمكانية حذف الطلبات نهائياً من النظام' },
    'UNLOCK_ORDERS': { label: t('batch4.k865'), desc: 'فتح قفل الطلبات المكتملة وتعديلها أو حذفها' },
    'VIEW_CATALOG': { label: t('batch4.k802'), desc: 'عرض المنتجات والأسعار' },
    'ADD_CATALOG': { label: t('batch4.k803'), desc: 'إضافة أكواد ومنتجات جديدة' },
    'EDIT_CATALOG': { label: t('batch4.k804'), desc: 'تغيير الأسعار والأبعاد والصور' },
    'DELETE_CATALOG': { label: t('batch4.k805'), desc: 'حذف المنتجات أو التصنيفات' },
    'VIEW_AGENTS': { label: t('batch4.k806'), desc: 'عرض بيانات الوكلاء وكشوفات حساباتهم' },
    'ADD_AGENTS': { label: t('batch4.k807'), desc: 'تسجيل وكلاء جدد في النظام' },
    'EDIT_AGENTS': { label: t('batch4.k808'), desc: 'تغيير بيانات الوكيل، الرصيد، أو التجميد' },
    'DELETE_AGENTS': { label: t('batch4.k809'), desc: 'إزالة حساب الوكيل نهائياً' },

    'VIEW_FACTORY_INV': { label: t('batch4.k810'), desc: 'رؤية أرصدة المواد الأولية وحركاتها' },
    'ADD_FACTORY_INV': { label: t('batch4.k811'), desc: 'تسجيل وارد أو صرف للمواد' },
    'EDIT_FACTORY_INV': { label: t('batch4.k812'), desc: 'تعديل سجلات حركات المخزن' },
    'DELETE_FACTORY_INV': { label: t('batch4.k813'), desc: 'حذف سجل حركة من المخزن' },
    'LOCK_FACTORY_INV': { label: t('batch4.k814'), desc: 'قفل حركات المخزن نهائياً' },

    'VIEW_FACTORY_EXP': { label: t('batch4.k815'), desc: 'رؤية سجل المصاريف التشغيلية' },
    'ADD_FACTORY_EXP': { label: t('batch4.k816'), desc: 'تسجيل رواتب، إيجار، طاقة، نثرية' },
    'EDIT_FACTORY_EXP': { label: t('batch4.k817'), desc: 'تعديل مبالغ أو بيانات المصاريف' },
    'DELETE_FACTORY_EXP': { label: t('batch4.k818'), desc: 'حذف سجل مصروف مسجل' },
    'LOCK_FACTORY_EXP': { label: t('batch4.k819'), desc: 'قفل المصاريف نهائياً ومنع التلاعب' },

    'VIEW_FACTORY_SUP': { label: t('batch4.k820'), desc: 'عرض بيانات موردين المواد الخام' },
    'ADD_FACTORY_SUP': { label: t('batch4.k821'), desc: 'تسجيل موردين جدد في النظام' },
    'EDIT_FACTORY_SUP': { label: t('batch4.k822'), desc: 'تحديث بيانات وعناوين الموردين' },
    'DELETE_FACTORY_SUP': { label: t('batch4.k823'), desc: 'إزالة مورد من سجلات المصنع' },
    'LOCK_FACTORY_SUP': { label: t('batch4.k824'), desc: 'قفل أرصدة الموردين نهائياً' },

    'VIEW_FACTORY_LOG': { label: t('batch4.k825'), desc: 'رؤية سجلات النقل والشحن والكمرك' },
    'ADD_FACTORY_LOG': { label: t('batch4.k826'), desc: 'تسجيل شحنات صادرة أو واردة جديدة' },
    'EDIT_FACTORY_LOG': { label: t('batch4.k827'), desc: 'تعديل بيانات الشحن وتكاليف النقل' },
    'DELETE_FACTORY_LOG': { label: t('batch4.k828'), desc: 'حذف سجل شحنة مسجل' },
    'LOCK_FACTORY_LOG': { label: t('batch4.k829'), desc: 'قفل سجلات الشحن نهائياً' },

    'VIEW_SAFE': { label: t('batch4.k830'), desc: 'عرض الرصيد النقدي الحالي وسجل الحركات المالية' },
    'ADD_SAFE_TX': { label: t('batch4.k831'), desc: 'إمكانية تسجيل حركات نقدية يدوية في الصندوق' },
    'EDIT_SAFE_TX': { label: t('batch4.k832'), desc: 'تعديل بيانات أو مبالغ العمليات النقدية اليدوية' },
    'DELETE_SAFE_TX': { label: t('batch4.k833'), desc: 'إزالة سجلات الحركات النقدية اليدوية نهائياً' },

    'VIEW_SALES': { label: t('batch4.k834'), desc: 'الوصول لسجل الحركات المالية المباشر' },
    'VIEW_REPORTS': { label: t('batch4.k835'), desc: 'عرض التقارير والرسوم البيانية التحليلية' },
    'VIEW_LOGS': { label: t('batch4.k836'), desc: 'مشاهدة سجل رقابة كافة العمليات' },
    'VIEW_PRESENCE': { label: t('batch4.k837'), desc: 'مشاهدة من يتواجد حالياً في النظام' },
    'MANAGE_STAFF': { label: t('batch4.k838'), desc: 'إضافة وتعديل وحذف حسابات الموظفين وصلاحياتهم' },
    'ACCESS_FACTORY': { label: t('batch4.k839'), desc: 'إمكانية دخول قسم إدارة المصنع العام' },
    'VIEW_SETTINGS': { label: t('batch4.k840'), desc: 'عرض إعدادات النظام ووضع الصيانة' },
    'EDIT_SETTINGS': { label: t('batch4.k841'), desc: 'تغيير وضع الصيانة، سعات المركبات، والإشعارات' }
};

export const PERMISSION_GROUPS = [
    {
        title: t('batch4.k842'),
        icon: FileText,
        color: 'orange',
        layout: 'row-4',
        keys: ['VIEW_PRODUCTION', 'EDIT_PRODUCTION', 'VIEW_ORDERS', 'ADD_ORDERS', 'EDIT_ORDERS', 'DELETE_ORDERS', 'UNLOCK_ORDERS'] as PermissionKey[]
    },
    {
        title: t('batch4.k843'),
        icon: Users,
        color: 'emerald',
        layout: 'grid-2',
        keys: ['VIEW_AGENTS', 'ADD_AGENTS', 'EDIT_AGENTS', 'DELETE_AGENTS'] as PermissionKey[]
    },
    {
        title: t('batch4.k844'),
        icon: Tags,
        color: 'purple',
        layout: 'grid-2',
        keys: ['VIEW_CATALOG', 'ADD_CATALOG', 'EDIT_CATALOG', 'DELETE_CATALOG'] as PermissionKey[]
    },
    {
        title: t('batch4.k845'),
        icon: BarChart3,
        color: 'indigo',
        layout: 'grid-2',
        keys: ['VIEW_SALES', 'VIEW_REPORTS', 'VIEW_LOGS', 'VIEW_PRESENCE'] as PermissionKey[]
    },
    {
        title: t('batch4.k846'),
        icon: Vault,
        color: 'teal',
        layout: 'grid-2',
        keys: ['VIEW_SAFE', 'ADD_SAFE_TX', 'EDIT_SAFE_TX', 'DELETE_SAFE_TX'] as PermissionKey[]
    },
    {
        title: t('batch4.k847'),
        icon: Box,
        color: 'indigo',
        layout: 'grid-2',
        keys: ['VIEW_FACTORY_INV', 'ADD_FACTORY_INV', 'EDIT_FACTORY_INV', 'DELETE_FACTORY_INV', 'LOCK_FACTORY_INV'] as PermissionKey[]
    },
    {
        title: t('batch4.k848'),
        icon: DollarSign,
        color: 'red',
        layout: 'grid-2',
        keys: ['VIEW_FACTORY_EXP', 'ADD_FACTORY_EXP', 'EDIT_FACTORY_EXP', 'DELETE_FACTORY_EXP', 'LOCK_FACTORY_EXP'] as PermissionKey[]
    },
    {
        title: t('batch4.k849'),
        icon: Truck,
        color: 'blue',
        layout: 'grid-2',
        keys: ['VIEW_FACTORY_LOG', 'ADD_FACTORY_LOG', 'EDIT_FACTORY_LOG', 'DELETE_FACTORY_LOG', 'LOCK_FACTORY_LOG'] as PermissionKey[]
    },
    {
        title: t('batch4.k850'),
        icon: UserCheck,
        color: 'teal',
        layout: 'row-5',
        keys: ['VIEW_FACTORY_SUP', 'ADD_FACTORY_SUP', 'EDIT_FACTORY_SUP', 'DELETE_FACTORY_SUP', 'LOCK_FACTORY_SUP'] as PermissionKey[]
    },
    {
        title: t('batch4.k851'),
        icon: ShieldCheck,
        color: 'indigo',
        layout: 'system-special',
        keys: ['VIEW_SETTINGS', 'EDIT_SETTINGS', 'MANAGE_STAFF', 'VIEW_LOGS', 'VIEW_PRESENCE', 'ACCESS_FACTORY'] as PermissionKey[]
    }
];
