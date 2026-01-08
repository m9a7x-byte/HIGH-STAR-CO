
import { UserRole } from '../types';
import { ListOrdered, FileText, Tags, Users, BarChart3, Factory, ShieldCheck, Box, DollarSign, Truck, UserCheck, Vault } from 'lucide-react';

export type PermissionKey =
    // الإنتاج والطلبات
    | 'VIEW_PRODUCTION' | 'EDIT_PRODUCTION'
    | 'VIEW_ORDERS' | 'ADD_ORDERS' | 'EDIT_ORDERS' | 'DELETE_ORDERS'
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
        label: 'الأدمن الخارق',
        description: 'صلاحيات كاملة وغير محدودة للنظام، بما في ذلك إدارة الفريق والوكلاء والإعدادات الحساسة.',
        color: 'purple',
        permissions: [
            'VIEW_PRODUCTION', 'EDIT_PRODUCTION',
            'VIEW_ORDERS', 'ADD_ORDERS', 'EDIT_ORDERS', 'DELETE_ORDERS',
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
        label: 'مدير عام',
        description: 'كل الصلاحيات ماعدا إدارة الموظفين. يمكنه إدارة الوكلاء بالكامل.',
        color: 'red',
        permissions: [
            // كل صلاحيات المشرف
            'VIEW_AGENTS', 'VIEW_ORDERS', 'VIEW_PRODUCTION',
            'ADD_ORDERS', 'EDIT_ORDERS', 'DELETE_ORDERS', 'EDIT_PRODUCTION',
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
        label: 'مشرف',
        description: 'إدارة العمليات اليومية: طلبات، مصنع، صندوق، مبيعات، تقارير.',
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
        label: 'مشاهد',
        description: 'إمكانية عرض الوكلاء والطلبات وخط الإنتاج فقط دون أي صلاحيات تعديل.',
        color: 'gray',
        permissions: [
            'VIEW_AGENTS', 'VIEW_ORDERS', 'VIEW_PRODUCTION'
        ]
    },
    [UserRole.AGENT]: {
        role: UserRole.AGENT,
        label: 'وكيل معتمد',
        description: 'الوصول لكتالوج الطلب ومتابعة الحساب الشخصي فقط.',
        color: 'emerald',
        permissions: []
    }
};

export const PERMISSION_LABELS: Record<PermissionKey, { label: string, desc: string }> = {
    'VIEW_PRODUCTION': { label: 'مشاهدة الإنتاج', desc: 'عرض قائمة الطلبات قيد التحضير' },
    'EDIT_PRODUCTION': { label: 'تعديل الإنتاج', desc: 'تحديث حالة الطلبات وتغيير مدد التجهيز' },
    'VIEW_ORDERS': { label: 'مشاهدة الطلبات', desc: 'عرض أرشيف وفواتير كافة الطلبات' },
    'ADD_ORDERS': { label: 'إضافة طلبات', desc: 'إضافة طلبات يدوية وتنسيبها للوكلاء' },
    'EDIT_ORDERS': { label: 'تعديل الطلبات', desc: 'تغيير محتويات الطلب أو المبالغ الواصلة' },
    'DELETE_ORDERS': { label: 'حذف الطلبات', desc: 'إمكانية حذف الطلبات نهائياً من النظام' },
    'VIEW_CATALOG': { label: 'مشاهدة الكتالوج', desc: 'عرض المنتجات والأسعار' },
    'ADD_CATALOG': { label: 'إضافة منتجات', desc: 'إضافة أكواد ومنتجات جديدة' },
    'EDIT_CATALOG': { label: 'تعديل الكتالوج', desc: 'تغيير الأسعار والأبعاد والصور' },
    'DELETE_CATALOG': { label: 'حذف من الكتالوج', desc: 'حذف المنتجات أو التصنيفات' },
    'VIEW_AGENTS': { label: 'مشاهدة الوكلاء', desc: 'عرض بيانات الوكلاء وكشوفات حساباتهم' },
    'ADD_AGENTS': { label: 'إضافة وكلاء', desc: 'تسجيل وكلاء جدد في النظام' },
    'EDIT_AGENTS': { label: 'تعديل الوكلاء', desc: 'تغيير بيانات الوكيل، الرصيد، أو التجميد' },
    'DELETE_AGENTS': { label: 'حذف الوكلاء', desc: 'إزالة حساب الوكيل نهائياً' },

    'VIEW_FACTORY_INV': { label: 'مشاهدة المخزن', desc: 'رؤية أرصدة المواد الأولية وحركاتها' },
    'ADD_FACTORY_INV': { label: 'إضافة للمخزن', desc: 'تسجيل وارد أو صرف للمواد' },
    'EDIT_FACTORY_INV': { label: 'تعديل المخزن', desc: 'تعديل سجلات حركات المخزن' },
    'DELETE_FACTORY_INV': { label: 'حذف من المخزن', desc: 'حذف سجل حركة من المخزن' },
    'LOCK_FACTORY_INV': { label: 'قفل المخزن', desc: 'قفل حركات المخزن نهائياً' },

    'VIEW_FACTORY_EXP': { label: 'مشاهدة المصاريف', desc: 'رؤية سجل المصاريف التشغيلية' },
    'ADD_FACTORY_EXP': { label: 'إضافة مصاريف', desc: 'تسجيل رواتب، إيجار، طاقة، نثرية' },
    'EDIT_FACTORY_EXP': { label: 'تعديل مصاريف', desc: 'تعديل مبالغ أو بيانات المصاريف' },
    'DELETE_FACTORY_EXP': { label: 'حذف مصاريف', desc: 'حذف سجل مصروف مسجل' },
    'LOCK_FACTORY_EXP': { label: 'قفل المصاريف', desc: 'قفل المصاريف نهائياً ومنع التلاعب' },

    'VIEW_FACTORY_SUP': { label: 'مشاهدة الموردين', desc: 'عرض بيانات موردين المواد الخام' },
    'ADD_FACTORY_SUP': { label: 'إضافة موردين', desc: 'تسجيل موردين جدد في النظام' },
    'EDIT_FACTORY_SUP': { label: 'تعديل الموردين', desc: 'تحديث بيانات وعناوين الموردين' },
    'DELETE_FACTORY_SUP': { label: 'حذف الموردين', desc: 'إزالة مورد من سجلات المصنع' },
    'LOCK_FACTORY_SUP': { label: 'قفل حساب مورد', desc: 'قفل أرصدة الموردين نهائياً' },

    'VIEW_FACTORY_LOG': { label: 'مشاهدة اللوجستيات', desc: 'رؤية سجلات النقل والشحن والكمرك' },
    'ADD_FACTORY_LOG': { label: 'إضافة لوجستيات', desc: 'تسجيل شحنات صادرة أو واردة جديدة' },
    'EDIT_FACTORY_LOG': { label: 'تعديل اللوجستيات', desc: 'تعديل بيانات الشحن وتكاليف النقل' },
    'DELETE_FACTORY_LOG': { label: 'حذف اللوجستيات', desc: 'حذف سجل شحنة مسجل' },
    'LOCK_FACTORY_LOG': { label: 'قفل اللوجستيات', desc: 'قفل سجلات الشحن نهائياً' },

    'VIEW_SAFE': { label: 'مشاهدة الصندوق', desc: 'عرض الرصيد النقدي الحالي وسجل الحركات المالية' },
    'ADD_SAFE_TX': { label: 'إيداع وسحب نقدي', desc: 'إمكانية تسجيل حركات نقدية يدوية في الصندوق' },
    'EDIT_SAFE_TX': { label: 'تعديل العمليات', desc: 'تعديل بيانات أو مبالغ العمليات النقدية اليدوية' },
    'DELETE_SAFE_TX': { label: 'حذف من الصندوق', desc: 'إزالة سجلات الحركات النقدية اليدوية نهائياً' },

    'VIEW_SALES': { label: 'صفحة المبيعات', desc: 'الوصول لسجل الحركات المالية المباشر' },
    'VIEW_REPORTS': { label: 'صفحة التقارير', desc: 'عرض التقارير والرسوم البيانية التحليلية' },
    'VIEW_LOGS': { label: 'سجل الأحداث', desc: 'مشاهدة سجل رقابة كافة العمليات' },
    'VIEW_PRESENCE': { label: 'المتواجدين', desc: 'مشاهدة من يتواجد حالياً في النظام' },
    'MANAGE_STAFF': { label: 'إدارة الموظفين', desc: 'إضافة وتعديل وحذف حسابات الموظفين وصلاحياتهم' },
    'ACCESS_FACTORY': { label: 'الوصول للمصنع', desc: 'إمكانية دخول قسم إدارة المصنع العام' },
    'VIEW_SETTINGS': { label: 'مشاهدة إعدادات النظام', desc: 'عرض إعدادات النظام ووضع الصيانة' },
    'EDIT_SETTINGS': { label: 'تعديل إعدادات النظام', desc: 'تغيير وضع الصيانة، سعات المركبات، والإشعارات' }
};

export const PERMISSION_GROUPS = [
    {
        title: 'الإنتاج والطلبات',
        icon: FileText,
        color: 'orange',
        layout: 'row-4',
        keys: ['VIEW_PRODUCTION', 'EDIT_PRODUCTION', 'VIEW_ORDERS', 'ADD_ORDERS', 'EDIT_ORDERS', 'DELETE_ORDERS'] as PermissionKey[]
    },
    {
        title: 'كتالوج الوكلاء',
        icon: Users,
        color: 'emerald',
        layout: 'grid-2',
        keys: ['VIEW_AGENTS', 'ADD_AGENTS', 'EDIT_AGENTS', 'DELETE_AGENTS'] as PermissionKey[]
    },
    {
        title: 'الكتالوج (المنتجات)',
        icon: Tags,
        color: 'purple',
        layout: 'grid-2',
        keys: ['VIEW_CATALOG', 'ADD_CATALOG', 'EDIT_CATALOG', 'DELETE_CATALOG'] as PermissionKey[]
    },
    {
        title: 'المبيعات والتقارير',
        icon: BarChart3,
        color: 'indigo',
        layout: 'grid-2',
        keys: ['VIEW_SALES', 'VIEW_REPORTS', 'VIEW_LOGS', 'VIEW_PRESENCE'] as PermissionKey[]
    },
    {
        title: 'إدارة الصندوق المالي',
        icon: Vault,
        color: 'teal',
        layout: 'grid-2',
        keys: ['VIEW_SAFE', 'ADD_SAFE_TX', 'EDIT_SAFE_TX', 'DELETE_SAFE_TX'] as PermissionKey[]
    },
    {
        title: 'إدارة المخزن (المصنع)',
        icon: Box,
        color: 'indigo',
        layout: 'grid-2',
        keys: ['VIEW_FACTORY_INV', 'ADD_FACTORY_INV', 'EDIT_FACTORY_INV', 'DELETE_FACTORY_INV', 'LOCK_FACTORY_INV'] as PermissionKey[]
    },
    {
        title: 'المصاريف التشغيلية (المصنع)',
        icon: DollarSign,
        color: 'red',
        layout: 'grid-2',
        keys: ['VIEW_FACTORY_EXP', 'ADD_FACTORY_EXP', 'EDIT_FACTORY_EXP', 'DELETE_FACTORY_EXP', 'LOCK_FACTORY_EXP'] as PermissionKey[]
    },
    {
        title: 'اللوجستيات والشحن (المصنع)',
        icon: Truck,
        color: 'blue',
        layout: 'grid-2',
        keys: ['VIEW_FACTORY_LOG', 'ADD_FACTORY_LOG', 'EDIT_FACTORY_LOG', 'DELETE_FACTORY_LOG', 'LOCK_FACTORY_LOG'] as PermissionKey[]
    },
    {
        title: 'الموردين والمشتريات (المصنع)',
        icon: UserCheck,
        color: 'teal',
        layout: 'row-5',
        keys: ['VIEW_FACTORY_SUP', 'ADD_FACTORY_SUP', 'EDIT_FACTORY_SUP', 'DELETE_FACTORY_SUP', 'LOCK_FACTORY_SUP'] as PermissionKey[]
    },
    {
        title: 'إدارة النظام والرقابة',
        icon: ShieldCheck,
        color: 'indigo',
        layout: 'system-special',
        keys: ['VIEW_SETTINGS', 'EDIT_SETTINGS', 'MANAGE_STAFF', 'VIEW_LOGS', 'VIEW_PRESENCE', 'ACCESS_FACTORY'] as PermissionKey[]
    }
];
