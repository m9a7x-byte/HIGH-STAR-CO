
import { PermissionKey } from '../lib/permissions';

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

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  VIEWER = 'VIEWER',
  AGENT = 'AGENT',
}

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'الأدمن الخارق',
  [UserRole.ADMIN]: 'مدير عام',
  [UserRole.SUPERVISOR]: 'مشرف',
  [UserRole.VIEWER]: 'مشاهد',
  [UserRole.AGENT]: 'وكيل',
};

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

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'معلق (أجل)',
  [PaymentStatus.PARTIALLY_PAID]: 'مدفوع جزئياً',
  [PaymentStatus.PAID]: 'مدفوع',
  [PaymentStatus.CANCELLED]: 'ملغي',
};


export enum ProductionStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PENDING_TRANSFER = 'PENDING_TRANSFER',
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export const ProductionStatusLabels: Record<ProductionStatus, string> = {
  [ProductionStatus.PENDING_PAYMENT]: 'بانتظار الدفع',
  [ProductionStatus.PENDING_TRANSFER]: 'بانتظار ترحيل',
  [ProductionStatus.WAITING]: 'قيد الانتظار',
  [ProductionStatus.IN_PROGRESS]: 'جاري التحضير',
  [ProductionStatus.COMPLETED]: 'تم التجهيز',
};

export interface Category {
  id: number | string;
  name: string;
  type: 'STYROFOAM' | 'ADHESIVE';
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
  printHeaderUrl: string;
  printFooterUrl: string;
  geminiApiKey?: string;
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
}

export interface Product {
  id: number | string;
  code: string;
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
  productDimensions: string;
  quantityMeters: number;
  quantityCartons: number;
  unitPriceMeter: number;
  unitPriceCarton: number;
  totalPrice: number;
  isSpecialRequest?: boolean;
  specialRequestNote?: string;
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
  | 'SAFE_DEPOSIT';

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
  | 'CHEMICAL';

export interface Supplier {
  id: number | string;
  name: string;
  phone?: string;
  address?: string;
  currentBalance: number;
  createdAt: string;
}

export interface FactoryPaymentLog {
  id: number;
  amount: number;
  date: string;
  addedBy: string;
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
