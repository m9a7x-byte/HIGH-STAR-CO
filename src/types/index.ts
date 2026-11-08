import { PermissionKey } from '../lib/permissions';
import i18n from '../i18n';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  permissions?: PermissionKey[];
  avatar_url?: string;
  is_online?: boolean;
  status?: 'active' | 'suspended';
  deleted_at?: string | null;
  last_seen?: string;
  current_path?: string;
  phone?: string;
  agent_details?: AgentDetails;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  isRead: boolean;
  relatedEntityId?: string;
  relatedEntityType?: string;
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;
  createdAt: string;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  VIEWER = 'VIEWER',
  AGENT = 'AGENT',
}

export const getUserRoleLabel = (role: UserRole): string => {
  const map: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: i18n.t('roles.super_admin'),
    [UserRole.ADMIN]: i18n.t('roles.admin'),
    [UserRole.SUPERVISOR]: i18n.t('roles.supervisor'),
    [UserRole.VIEWER]: i18n.t('roles.viewer'),
    [UserRole.AGENT]: i18n.t('roles.agent'),
  };
  return map[role] || role;
};

// Backward compatibility - dynamic getter
export const UserRoleLabels = new Proxy({} as Record<UserRole, string>, {
  get: (_target, prop: string) => {
    return getUserRoleLabel(prop as UserRole);
  }
});

export enum AgentType {
  NORMAL = 'عادي',
  VIP = 'VIP',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export const getPaymentStatusLabel = (status: PaymentStatus): string => {
  const map: Record<PaymentStatus, string> = {
    [PaymentStatus.PENDING]: i18n.t('payment_status.pending'),
    [PaymentStatus.PARTIALLY_PAID]: i18n.t('payment_status.partially_paid'),
    [PaymentStatus.PAID]: i18n.t('payment_status.paid'),
    [PaymentStatus.CANCELLED]: i18n.t('payment_status.cancelled'),
  };
  return map[status] || status;
};

export const PaymentStatusLabels = new Proxy({} as Record<PaymentStatus, string>, {
  get: (_target, prop: string) => {
    return getPaymentStatusLabel(prop as PaymentStatus);
  }
});


export enum ProductionStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PENDING_TRANSFER = 'PENDING_TRANSFER',
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export const getProductionStatusLabel = (status: ProductionStatus): string => {
  const map: Record<ProductionStatus, string> = {
    [ProductionStatus.PENDING_PAYMENT]: i18n.t('production_status.pending_payment'),
    [ProductionStatus.PENDING_TRANSFER]: i18n.t('production_status.pending_transfer'),
    [ProductionStatus.WAITING]: i18n.t('production_status.waiting'),
    [ProductionStatus.IN_PROGRESS]: i18n.t('production_status.in_progress'),
    [ProductionStatus.COMPLETED]: i18n.t('production_status.completed'),
  };
  return map[status] || status;
};

export const ProductionStatusLabels = new Proxy({} as Record<ProductionStatus, string>, {
  get: (_target, prop: string) => {
    return getProductionStatusLabel(prop as ProductionStatus);
  }
});

export interface Category {
  id: number | string;
  name: string;
  type: 'STYROFOAM' | 'ADHESIVE' | 'PAINT';
}

export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export interface VehicleConfig {
  kiaCapacity: number;
  canterCapacity: number;
  trailerCapacity: number;
  showProductionQueueToAgents: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  enableToasts: boolean;
  toastPosition: ToastPosition;
  enablePrint: boolean;
  enableLanguageSwitcher: boolean;
  printHeaderUrl: string;
  printFooterUrl: string;
  geminiApiKey?: string;
  orderConstraintMode: 'OPEN' | 'LOCKED';
  maxKiaVehicles: number;
  maxCanterVehicles: number;
  maxTrailerVehicles: number;
}

export interface AgentPermissions {
  allowCreditOrders: boolean;
  showProductionQueue: boolean;
  showFinance: boolean;
  showHistory: boolean;
  allowSpecialRequests: boolean; // New Permission
}

export interface AgentDetails {
  id: number | string;
  type: AgentType;
  phone?: string; // Added phone number
  internalNotes?: string;
  priceIncreasePercent?: number;
  currentBalance: number;
  isFrozen: boolean;
  freezeMessage: string;
  permissions: AgentPermissions;
}

export interface WalletTransaction {
  id: number | string;
  agentId: number | string;
  amount: number;
  type: 'DEPOSIT' | 'PAYMENT' | 'ADJUSTMENT';
  description: string;
  createdAt: string;
  locked?: boolean;
  linkedOrderId?: number | string | null;
}

export interface AdminActionResponse {
  success: boolean;
  data?: any;
  error?: string;
  confirmationPending?: boolean;
}

export interface UserPresence {
  isOnline: boolean;
  lastSeen: string;
  currentPath: string;
  device?: string;
  ipAddress?: string;
  previousIpAddress?: string;
}

export interface User {
  id: number | string;
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  currentSessionId?: string;
  province?: string; // Moved from agent_details to profiles
  address?: string; // Moved from agent_details to profiles
  avatar_url?: string;
  imageUrl?: string; // Compatibility field
  avatar_path?: string;
  role: UserRole;
  permissions?: PermissionKey[];
  agentDetails?: AgentDetails;
  presence?: UserPresence;
  // Tracking
  last_ip?: string | null;
  device_info?: string | null; // Stores JSON string of detailed info
  last_active_at?: string | null;
  status?: 'active' | 'suspended';
  deleted_at?: string | null;
}

export interface Product {
  id: number | string;
  code: string;
  name?: string;
  paintType?: string;
  description?: string;
  imageNote?: string;
  technicalSheetUrl?: string;
  category: string;
  dimensions: string;
  imageUrl: string;
  metersPerCarton: number;
  volumePerCarton: number;
  isActive: boolean;
  prices: {
    [AgentType.NORMAL]: { pricePerMeter: number; pricePerCarton: number };
    [AgentType.VIP]: { pricePerMeter: number; pricePerCarton: number };
  };
}

export interface OrderItem {
  id: number | string;
  productId: number | string;
  productCode: string;
  productName?: string;
  productPaintType?: string;
  productDimensions: string;
  quantityMeters: number;
  quantityCartons: number;
  unitPriceMeter: number;
  unitPriceCarton: number;
  totalPrice: number;
  isSpecialRequest?: boolean;
  specialRequestNote?: string;
  priceAdjustmentNote?: string;
}

export interface OrderPaymentLog {
  id: number;
  amountAdded: number;
  previousPaid: number;
  newTotalPaid: number;
  addedBy: string;
  addedById: number;
  date: string;
  note?: string;
}

export interface Order {
  id: number | string;
  agentId: number | string;
  agentName: string;
  agentProvince: string;
  subTotalAmount: number;
  discountValue: number;
  discountType: 'FIXED' | 'PERCENT';
  totalAmount: number;
  paidAmount: number;
  totalVolume: number;
  paymentStatus: PaymentStatus;
  productionStatus: ProductionStatus;
  items: OrderItem[];
  paymentHistory: OrderPaymentLog[];
  seenByAdmin: boolean;
  createdAt: string;
  paidAt?: string | null;
  movedToProductionAt?: string | null;
  estimatedDays?: number;
  agentEditUnlocked?: boolean;

  hasSpecialRequest?: boolean;
  isManual?: boolean;
  manualBy?: string;
}

export type LogContext = 'ORDERS' | 'PRODUCTION' | 'CATALOG' | 'AGENTS' | 'STAFF' | 'FINANCE' | 'SYSTEM' | 'AUTH' | 'X_ACCOUNTS' | 'FACTORY' | 'SAFE' | 'INVENTORY' | 'EXPENSES' | 'SUPPLIERS' | 'LOGISTICS' | 'SETTINGS';

export interface AuditLog {
  id: number | string;
  userId: number | string;
  userName: string;
  action: string;
  context: LogContext;
  details: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export type FactoryCategory =
  | 'SALARY'
  | 'RENT'
  | 'FOOD'
  | 'DAILY_EXPENSE'
  | 'ELECTRICITY'
  | 'TRANSPORT_OUT'
  | 'TRANSPORT_IN'
  | 'INVENTORY'
  | 'CUSTOMS'
  | 'SUPPLIER'
  | 'SAFE_WITHDRAWAL'
  | 'SAFE_DEPOSIT'
  | 'SUPPLIER_PAYMENT'
  | 'SUPPLIER_DEPOSIT'
  | 'SUPPLIER_WITHDRAWAL';

export type MaterialType =
  | 'SILICON_HOT'
  | 'SILICON_COLD'
  | 'SAND'
  | 'SAND_ADHESIVE'
  | 'CEMENT_BLACK'
  | 'CEMENT_WHITE'
  | 'EPS_RAW'
  | 'POLYMER_ADHESIVE'
  | 'SILOSH_ADHESIVE'
  | 'SHASTA_ADHESIVE'
  | 'CARTON_FOAM'
  | 'BAGS_1051'
  | 'BAGS_1052'
  | 'BAGS_1053'
  | 'BAGS_1054'
  | 'BAGS_1059';

export interface Supplier {
  id: number | string;
  name: string;
  phone?: string;
  address?: string;
  currentBalance: number;
  createdAt: string;
}

export type SupplierTransactionType = 'DEBT' | 'PAYMENT' | 'DEPOSIT' | 'WITHDRAWAL';

export interface SupplierTransaction {
  id: number | string;
  supplierId: number | string;
  type: SupplierTransactionType;
  amount: number;
  description: string;
  linkedTxId?: number | string;
  locked?: boolean;
  createdAt: string;
  createdBy: string;
}

export interface FactoryPaymentLog {
  id: number;
  amount: number;
  date: string;
  addedBy: string;
  notes?: string;
}

export interface FactoryTransaction {
  id: number | string;
  category: FactoryCategory;
  date: string;
  amount: number;
  paidAmount?: number;
  paymentHistory?: FactoryPaymentLog[];
  supplierId?: number | string;
  supplierName?: string;
  subType?: string;
  notes?: string;
  materialType?: MaterialType;
  quantity?: number;
  weight?: number;
  transactionType?: 'IN' | 'OUT';
  source?: string;
  country?: string;
  agentId?: number | string;
  province?: string;
  brokerName?: string;
  isPaid?: boolean;
  isLocked?: boolean;
  withdrawnBy?: string;
}
