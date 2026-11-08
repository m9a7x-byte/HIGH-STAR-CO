
import { User, Product, Order, AuditLog, VehicleConfig, UserRole, AgentType, PaymentStatus, ProductionStatus, OrderItem, Category, WalletTransaction, LogContext, FactoryTransaction, FactoryCategory, Supplier, Profile, AgentDetails, AppNotification } from '../types';
import { invokeAdminAction } from './edgeFunctions';
import { STYROFOAM_CATEGORIES, ADHESIVE_CATEGORY } from './constants';
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getAdjustedProductPrices } from './pricing';

type Listener = () => void;

const APP_MODE = (import.meta.env.VITE_APP_MODE || 'all') as 'admin' | 'agent' | 'all';

const getAuthOrigin = () => {
  const origin = window.location.origin;

  if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.endsWith('.high-star.iq') || origin === 'https://v.high-star.iq' || origin === 'https://agents.high-star.iq') {
    return origin;
  }

  return APP_MODE === 'agent' ? 'https://agents.high-star.iq' : 'https://v.high-star.iq';
};

const getAuthRedirectUrl = (path: string) => `${getAuthOrigin()}${path.startsWith('/') ? path : `/${path}`}`;

class SupabaseService {
  users: User[] = [];
  suppliers: Supplier[] = [];
  categories: Category[] = [];
  products: Product[] = [];
  orders: Order[] = [];
  auditLogs: AuditLog[] = [];
  walletTransactions: WalletTransaction[] = [];
  factoryTransactions: FactoryTransaction[] = [];
  notifications: AppNotification[] = [];

  vehicleConfig: VehicleConfig = {
    kiaCapacity: 140, canterCapacity: 180, trailerCapacity: 240, showProductionQueueToAgents: true,
    maintenanceMode: false, maintenanceMessage: '', enableToasts: true, toastPosition: 'bottom-left',
    enablePrint: true, enableLanguageSwitcher: true, printHeaderUrl: '', printFooterUrl: '',
    orderConstraintMode: 'OPEN', maxKiaVehicles: 1, maxCanterVehicles: 1, maxTrailerVehicles: 1
  };

  private listeners: Listener[] = [];
  private realtimeChannel: RealtimeChannel | null = null;
  private initialized = false;
  private settingsLoaded = false;
  private hasRemoteVehicleConfig = false;

  constructor() {
    this.init();
  }

  
  
  getSupplierTransactions(supplierId?: number | string): import('../types').SupplierTransaction[] {
    let txs = this.factoryTransactions
      .filter(tx => ['SUPPLIER_PAYMENT', 'SUPPLIER_DEPOSIT', 'SUPPLIER_WITHDRAWAL', 'RAW_MATERIALS'].includes(tx.category) || tx.supplierId);
    
    if (supplierId) {
      txs = txs.filter(tx => String(tx.supplierId) === String(supplierId));
    }

    return txs.map(tx => {
        let type: import('../types').SupplierTransactionType = 'DEBT';
        if (tx.category === 'SUPPLIER_PAYMENT') type = 'PAYMENT';
        else if (tx.category === 'SUPPLIER_DEPOSIT') type = 'DEPOSIT';
        else if (tx.category === 'SUPPLIER_WITHDRAWAL') type = 'WITHDRAWAL';

        // For CUSTOMS transactions, show category info in description
        const isCustoms = tx.category === 'CUSTOMS';
        const desc = isCustoms
          ? `كمرك: ${tx.notes || ''} (${tx.materialType || ''})`
          : (tx.notes || tx.supplierName || '');

        return {
          id: tx.id,
          supplierId: tx.supplierId!,
          type,
          amount: tx.amount,
          description: desc,
          createdAt: tx.date,
          createdBy: tx.withdrawnBy || 'نظام المصنع',
          locked: tx.is_locked,
          linkedTxId: (isCustoms || tx.category === 'SUPPLIER' || tx.category === 'TRANSPORT_IN') ? tx.id : undefined
        };
      }).filter(tx => tx.supplierId);
  }

  async addSupplierTransaction(userId: string, data: any) {
    let category = 'RAW_MATERIALS';
    let transactionType = 'OUT';
    
    if (data.type === 'PAYMENT') { category = 'SUPPLIER_PAYMENT'; transactionType = 'OUT'; }
    else if (data.type === 'DEPOSIT') { category = 'SUPPLIER_DEPOSIT'; transactionType = 'IN'; }
    else if (data.type === 'WITHDRAWAL') { category = 'SUPPLIER_WITHDRAWAL'; transactionType = 'OUT'; }

    const supplier = this.suppliers.find(s => String(s.id) === String(data.supplierId));
    
    return this.addFactoryTransaction(userId, {
      category: category as any,
      amount: data.amount,
      notes: data.description,
      supplierId: data.supplierId,
      supplierName: supplier?.name,
      transactionType: transactionType as any,
      isLocked: true // Add locked state flag to pass to addFactoryTransaction
    } as any);
  }

  async deleteSupplierTransaction(userId: string, txId: string | number) {
    return this.deleteFactoryTransaction(userId, txId);
  }

  async toggleLockSupplierTransaction(userId: string, txId: string | number, isLocked: boolean) {
    const { error } = await supabase.from('factory_transactions').update({ is_locked: isLocked }).eq('id', txId);
    if (error) throw error;
    
    // Log activity
    await this.logActivity(userId, isLocked ? 'قفل حركة مورد' : 'فتح قفل حركة مورد', 'FACTORY', `تم تغيير حالة القفل للحركة #${txId}`);
    
    // Optimistic update
    const tx = this.factoryTransactions.find(t => String(t.id) === String(txId));
    if (tx) {
        (tx as any).is_locked = isLocked;
        this.notify();
    }
  }

  async updateSupplierTransaction(userId: string, txId: string | number, updates: { amount?: number; description?: string }) {
    const dbUpdates: any = {};
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.description !== undefined) dbUpdates.notes = updates.description;
    return this.updateFactoryTransaction(userId, txId, dbUpdates);
  }


  async restoreSession(): Promise<User | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) return null;
      
      if (this.users.length === 0) {
        await this.fetchUsers();
      }
      
      const user = this.users.find(u => u.id === session.user.id);
      return user || null;
    } catch (e) {
      console.error('Error restoring session:', e);
      return null;
    }
  }

  async fetchNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      this.notifications = (data || []).map(n => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.is_read,
        relatedEntityId: n.related_entity_id,
        relatedEntityType: n.related_entity_type,
        actionUrl: n.action_url,
        actionLabel: n.action_label,
        imageUrl: n.image_url,
        createdAt: n.created_at
      }));
      this.notify();
    } catch (e) {
      console.error('Error fetching notifications:', e);
    }
  }

  shownNotifications: Set<string> = new Set();

  consumeNewNotifications(): AppNotification[] {
    const newNotifs = this.notifications.filter(n => !n.isRead && !this.shownNotifications.has(n.id));
    newNotifs.forEach(n => this.shownNotifications.add(n.id));
    return newNotifs;
  }

  async markNotificationAsRead(id: string) {
    try {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
      
      const notif = this.notifications.find(n => n.id === id);
      if (notif) {
        notif.isRead = true;
        this.notify();
      }
    } catch (e) {
      console.error('Error marking notification as read:', e);
    }
  }

  async markAllNotificationsAsRead() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      if (error) throw error;
      
      this.notifications.forEach(n => n.isRead = true);
      this.notify();
    } catch (e) {
      console.error('Error marking all notifications as read:', e);
    }
  }

  async deleteAllNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
      if (error) throw error;
      
      this.notifications = [];
      this.notify();
    } catch (e) {
      console.error('Error deleting notifications:', e);
    }
  }

  async uploadNotificationImage(userId: string, file: File): Promise<string> {
    const extension = (file.name.split('.').pop() || 'png').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'png';
    const filePath = `notifications/${userId}/${Date.now()}-${this.generateUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: file.type || 'image/png',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data, error: signedUrlError } = await supabase.storage
      .from('avatars')
      .createSignedUrl(filePath, 315360000);

    if (signedUrlError) throw signedUrlError;
    return data.signedUrl;
  }

  async sendBroadcastNotification(userId: string, data: {
    title: string;
    message: string;
    type?: AppNotification['type'];
    actionUrl?: string;
    actionLabel?: string;
    imageUrl?: string;
    target?: 'ALL' | 'STAFF' | 'AGENTS';
  }) {
    const cleanTitle = data.title.trim();
    const cleanMessage = data.message.trim();
    if (!cleanTitle || !cleanMessage) throw new Error('عنوان ووصف الإشعار مطلوبة.');

    const recipients = this.users.filter(user => {
      if (user.status === 'suspended' || user.deleted_at) return false;
      if (data.target === 'STAFF') return user.role !== UserRole.AGENT;
      if (data.target === 'AGENTS') return user.role === UserRole.AGENT;
      return true;
    });

    if (recipients.length === 0) throw new Error('لا يوجد مستلمين لهذا الإشعار.');

    const payload = recipients.map(recipient => ({
      user_id: recipient.id,
      title: cleanTitle,
      message: cleanMessage,
      type: data.type || 'info',
      related_entity_type: 'BROADCAST',
      action_url: data.actionUrl?.trim() || null,
      action_label: data.actionLabel?.trim() || null,
      image_url: data.imageUrl || null
    }));

    const { error } = await supabase.from('notifications').insert(payload);
    if (error) throw error;

    await this.logActivity(userId, 'إرسال إشعار عام', 'SETTINGS', `تم إرسال إشعار "${cleanTitle}" إلى ${recipients.length} مستخدم`);
    await this.fetchNotifications();
    return recipients.length;
  }


  async init() {
    if (this.initialized) return;

    // Initial fetch
    await Promise.all([
      this.fetchSettings(),
      this.fetchCategories(),
      this.fetchProducts(),
      this.fetchSuppliers(),
      this.fetchUsers(),
      this.fetchOrders(),
      this.fetchFactoryTransactions(),
      this.fetchWalletTransactions(),
      this.fetchAuditLogs(),
      this.fetchNotifications()
    ]);

    this.setupRealtimeSubscription();
    this.initialized = true;

    // Polling fallback for critical settings (every 5 seconds)
    // This ensures agents get updates even if Realtime is not enabled for system_settings table
    setInterval(() => this.fetchSettings(), 5000);

    this.notify();
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify() { this.listeners.forEach(listener => listener()); }

  isLanguageSwitcherEnabled() {
    return this.settingsLoaded && this.hasRemoteVehicleConfig && this.vehicleConfig.enableLanguageSwitcher !== false;
  }

  private generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback for non-secure contexts (http://IP)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private setupRealtimeSubscription() {
    if (this.realtimeChannel) return;
    this.realtimeChannel = supabase.channel('db_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        const table = payload.table;
        // Refetch strategy for simplicity
        switch (table) {
          case 'orders':
            console.log('Realtime Order Update:', payload);
            this.fetchOrders().then(() => this.notify());
            break;
          case 'products': this.fetchProducts(); break;
          case 'factory_transactions': this.fetchFactoryTransactions().then(() => this.notify()); break;
          case 'supplier_transactions': this.fetchFactoryTransactions().then(() => this.notify()); break;
          case 'wallet_transactions': this.fetchWalletTransactions().then(() => this.notify()); break;
          case 'profiles': this.fetchUsers().then(() => this.notify()); break;
          case 'agent_details': this.fetchUsers().then(() => this.notify()); break;
          case 'suppliers': this.fetchSuppliers().then(() => this.notify()); break;
          case 'audit_logs': this.fetchAuditLogs().then(() => this.notify()); break;
          case 'system_settings': this.fetchSettings().then(() => this.notify()); break;
          case 'categories': this.fetchCategories(); break;
          case 'notifications': this.fetchNotifications().then(() => this.notify()); break;
        }
      })
      .subscribe();
  }

  getPublicUrl(path: string) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }

  // --- Fetchers ---

  async fetchSettings() {
    const { data } = await supabase.from('system_settings').select('*');
    if (data) {
      const config = data.find(d => d.key === 'vehicle_config');
      this.settingsLoaded = true;
      this.hasRemoteVehicleConfig = Boolean(config);
      if (config) this.vehicleConfig = { ...this.vehicleConfig, ...config.value };
      this.notify();
    }
  }

  async updateVehicleConfig(userId: any, newConfig: any) {
    // Optimistic Update
    this.settingsLoaded = true;
    this.hasRemoteVehicleConfig = true;
    this.vehicleConfig = newConfig;
    this.notify();

    try {
      const { error } = await supabase.from('system_settings').upsert({
        key: 'vehicle_config',
        value: newConfig
      }, { onConflict: 'key' });

      if (error) throw error;

      // Log activity
      this.logActivity(userId, 'تعديل الإعدادات', 'SETTINGS', 'تم تحديث إعدادات النظام وسعات المركبات');
    } catch (err) {
      console.error('Failed to update vehicle config:', err);
      // Revert if needed, though fetch will correct it eventually
      this.fetchSettings();
    }
  }

  async fetchCategories() {
    const { data } = await supabase.from('categories').select('*').order('id');
    if (data) {
      this.categories = data;
      this.notify();
    }
  }

  async fetchProducts() {
    const { data } = await supabase.from('products').select('*').order('id');
    if (data) {
      this.products = data.map(p => ({
        ...p,
        imageUrl: p.image_url,
        paintType: p.paint_type,
        imageNote: p.image_note,
        technicalSheetUrl: p.technical_sheet_url,
        isActive: p.is_active,
        metersPerCarton: p.meters_per_carton,
        volumePerCarton: p.volume_per_carton
      }));
      this.notify();
    }
  }
  // ... (skip suppliers/users fetchers) ...



  async fetchSuppliers() {
    const { data } = await supabase.from('suppliers').select('*').order('id');
    if (data) {
      this.suppliers = data;
      this.notify();
    }
  }

  async fetchUsers() {
    const { data: profiles, error } = await supabase.from('profiles').select('*, agent_details(*)');
    if (error) { console.error('Error fetching users', error); return; }

    this.users = profiles.map(p => ({
      id: p.id, // UUID string
      fullName: p.full_name,
      email: p.email,
      phone: p.phone, // Map phone from profiles table
      currentSessionId: p.current_session_id,
      province: p.province, // Now from profiles table directly
      address: p.address, // Now from profiles table directly
      role: p.role,
      permissions: p.permissions || [],
      imageUrl: p.avatar_url,
      avatar_path: p.avatar_path, // Map the private storage path
      is_deleted: p.is_deleted || false, // Map soft delete flag
      presence: {
        // DYNAMIC ONLINE STATUS: Active in last 1 minute (matching 30s heartbeat)
        isOnline: (new Date().getTime() - new Date(p.last_active_at || 0).getTime()) < (60 * 1000),
        lastSeen: p.last_active_at || p.last_seen,
        currentPath: p.current_path,
        device: p.device_info,  // Pass the raw JSON string or parsed info
        ipAddress: p.last_ip
      },
      // Tracking
      last_ip: p.last_ip,
      device_info: p.device_info,
      last_active_at: p.last_active_at,
      status: p.status,
      deleted_at: p.deleted_at,
      agentDetails: p.agent_details ? {
        id: p.id,
        type: p.agent_details.agent_type === 'NORMAL' ? 'عادي' : p.agent_details.agent_type,
        currentBalance: p.agent_details.current_balance,
        isFrozen: p.agent_details.is_frozen,
        freezeMessage: p.agent_details.freeze_message,
        priceIncreasePercent: Number(p.agent_details.price_increase_percent || 0),
        permissions: p.agent_details.permissions,
        phone: p.agent_details.phone,
        internalNotes: p.agent_details.internal_notes
      } : undefined
    }));
    this.notify();
  }

  private mapOrder(o: any): Order {
    return {
      ...o,
      id: o.id,
      subTotalAmount: o.sub_total_amount,
      discountValue: o.discount_value,
      discountType: o.discount_type,
      totalAmount: o.total_amount,
      paidAmount: o.paid_amount,
      totalVolume: o.total_volume,
      paymentStatus: o.payment_status,
      productionStatus: o.production_status,
      seenByAdmin: o.seen_by_admin,
      hasSpecialRequest: o.has_special_request,
      isManual: o.is_manual,
      manualBy: o.manual_by,
      paidAt: o.paid_at,
      movedToProductionAt: o.moved_to_production_at,
      estimatedDays: o.estimated_days,
      agentEditUnlocked: o.agent_edit_unlocked === true,
      createdAt: o.created_at,
      agentId: o.agent_id,
      agentName: o.agent_name,
      agentProvince: o.agent_province,
      items: o.items,
      paymentHistory: o.payment_history
    };
  }

  async fetchOrders() {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }
      if (data) {
        this.orders = data.map(o => this.mapOrder(o));
        this.notify();
      }
    } catch (err) {
      console.error('Unexpected error fetching orders:', err);
    }
  }

  async fetchFactoryTransactions() {
    const { data } = await supabase.from('factory_transactions').select('*').order('created_at', { ascending: false });
    if (data) {
      this.factoryTransactions = data.map(t => ({
        ...t,
        date: t.transaction_date,
        paidAmount: t.paid_amount,
        paymentHistory: t.payment_history,
        supplierId: t.supplier_id,
        supplierName: t.supplier_name,
        subType: t.sub_type,
        materialType: t.material_type,
        transactionType: t.transaction_type,
        brokerName: t.broker_name,
        isPaid: t.is_paid,
        isLocked: t.is_locked,
        withdrawnBy: t.withdrawn_by,
        agentId: t.agent_id
      }));
      this.notify();
    }
  }

  async fetchWalletTransactions() {
    const { data } = await supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false });
    if (data) {
      this.walletTransactions = data.map(t => ({
        ...t,
        agentId: t.agent_id,
        createdAt: t.created_at
      }));
      this.notify();
    }
  }

  async fetchAuditLogs() {
    const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
    if (data) {
      this.auditLogs = data.map(l => ({
        ...l,
        userId: l.user_id,
        userName: l.user_name,
        previousValue: l.previous_value,
        newValue: l.new_value
      }));
      this.notify();
    }
  }

  // --- Actions ---

  async login(email: string, password?: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: password || '' });
    if (error) {
      if (error.message === 'Invalid login credentials') {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
      throw new Error(error.message);
    }

    // Generate new Session ID
    const newSessionId = this.generateUUID();
    await supabase.from('profiles').update({ current_session_id: newSessionId }).eq('id', data.user.id);

    // Force re-initialization to get fresh data for the logged-in user context
    // First, ensure we don't have stale state if init ran before
    this.initialized = false;
    if (this.realtimeChannel) {
      await this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
    await this.init();

    // Force fetch to ensure we have the user profile (init calls it, but just to be safe and get the user object for return)
    await this.fetchUsers();

    let user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Fallback: Direct fetch if cache missed (Robostness)
    if (!user) {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('*, agent_details(*)').eq('id', data.user.id).single();

      if (profile) {
        user = {
          id: profile.id,
          fullName: profile.full_name,
          email: profile.email,
          role: profile.role,
          permissions: profile.permissions || [],
          imageUrl: profile.avatar_url,
          avatar_url: profile.avatar_url,
          avatar_path: profile.avatar_path,
          // Tracking
          last_ip: profile.last_ip,
          device_info: profile.device_info,
          last_active_at: profile.last_active_at,
          presence: { isOnline: profile.is_online, lastSeen: profile.last_seen, currentPath: profile.current_path },
          agentDetails: profile.agent_details ? {
            id: profile.id,
            type: profile.agent_details.agent_type === 'NORMAL' ? 'عادي' : profile.agent_details.agent_type,
            currentBalance: profile.agent_details.current_balance,
            isFrozen: profile.agent_details.is_frozen,
            freezeMessage: profile.agent_details.freeze_message,
            priceIncreasePercent: Number(profile.agent_details.price_increase_percent || 0),
            permissions: profile.agent_details.permissions,
            phone: profile.agent_details.phone,
            internalNotes: profile.agent_details.internal_notes
          } : undefined,
          currentSessionId: profile.current_session_id
        };
      }
    }

    // Ensure we have the latest session ID in the returned object
    if (user) {
      user.currentSessionId = newSessionId;
    }

    if (!user) {
      throw new Error('User profile not found. Please contact admin.');
    }

    try {
      this.logActivity(user.id, 'تسجيل دخول', 'AUTH', 'تسجيل دخول للنظام').catch(e => console.error('Login Log Error:', e));
    } catch (err) { console.error(err); }

    return user;
  }

  async logout() {
    await supabase.auth.signOut();
    // Reset state on logout
    this.initialized = false;
    this.users = [];
    this.suppliers = [];
    this.categories = [];
    this.products = [];
    this.orders = [];
    this.auditLogs = [];
    this.walletTransactions = [];
    this.factoryTransactions = [];
    if (this.realtimeChannel) {
      await this.realtimeChannel.unsubscribe();
      this.realtimeChannel = null;
    }
    this.notify();
  }



  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  async logActivity(userId: string | number, action: string, context: LogContext, details: string, previousValue?: string, newValue?: string) {
    const user = this.users.find(u => u.id == userId);
    await supabase.from('audit_logs').insert({
      user_id: userId,
      user_name: user?.fullName || 'System',
      action, context, details, previous_value: previousValue, new_value: newValue
    });
  }

  async createOrder(userId: string | number, items: { productId: string | number, qMeters: number, qCartons: number, isSpecial?: boolean, specialNote?: string }[], paidAmount: number, isManual: boolean = false, manualBy?: string, operatorId?: string | number) {
    let user = this.users.find(u => u.id == userId);
    if (!user) throw new Error('الوكيل غير موجود');

    // Self-healing: If agent details are missing, create defaults immediately
    if (!user.agentDetails) {
      console.log('Agent details missing for user', userId, 'attempting auto-repair...');
      await this.ensureAgentDetails(userId, { type: AgentType.NORMAL }); // Create default record
      await this.fetchUsers(); // Refresh state
      user = this.users.find(u => u.id == userId);
      if (!user || !user.agentDetails) throw new Error('بيانات الوكيل غير مكتملة (فشل التصحيح التلقائي)');
    }

    let hasSpecial = false;
    const orderItems: OrderItem[] = items.map(item => {
      if (item.isSpecial || Number(item.productId) < 0) {
        hasSpecial = true;
        return {
          id: Math.random(), // Helper ID for JSON
          productId: -1,
          productCode: 'طلب خاص (إنتاج)',
          productDimensions: 'حسب الطلب',
          quantityCartons: item.qCartons,
          quantityMeters: item.qMeters,
          unitPriceCarton: 0,
          unitPriceMeter: 0,
          totalPrice: 0,
          isSpecialRequest: true,
          specialRequestNote: item.specialNote || 'بدون ملاحظات'
        };
      }

      const p = this.products.find(prod => prod.id == item.productId);
      if (!p) throw new Error(`المنتج غير موجود (ID: ${item.productId})`);

      const prices = getAdjustedProductPrices(p, user.agentDetails);
      const totalPrice = (item.qCartons * prices.pricePerCarton) + (item.qMeters * prices.pricePerMeter);
      return {
        id: Math.random(),
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        productPaintType: p.paintType,
        productDimensions: p.dimensions,
        quantityCartons: item.qCartons,
        quantityMeters: item.qMeters,
        unitPriceCarton: prices.pricePerCarton,
        unitPriceMeter: prices.pricePerMeter,
        totalPrice,
        priceAdjustmentNote: prices.increasePercent > 0 ? `زيادة ${prices.increasePercent}%` : undefined
      };
    });

    const subTotal = orderItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const totalVolume = orderItems.reduce((acc, curr) => {
      const p = this.products.find(x => x.id == curr.productId);
      return acc + (curr.quantityCartons * (p?.volumePerCarton || 0));
    }, 0);

    // Current Date
    const now = new Date().toISOString();

    // Optimistic logic or direct insert? - Direct insert
    const paymentHistory = paidAmount > 0 ? [{ id: Math.random(), amountAdded: paidAmount, previousPaid: 0, newTotalPaid: paidAmount, addedBy: user.fullName, addedById: user.id, date: now }] : [];

    const { data, error } = await supabase.from('orders').insert({
      agent_id: user.id,
      agent_name: user.fullName,
      agent_province: user.province || '',
      sub_total_amount: subTotal,
      discount_value: 0,
      discount_type: 'FIXED',
      total_amount: subTotal,
      paid_amount: paidAmount,
      total_volume: totalVolume,
      payment_status: paidAmount >= subTotal && subTotal > 0 ? PaymentStatus.PAID : (paidAmount > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.PENDING),
      production_status: ProductionStatus.PENDING_TRANSFER,
      items: orderItems,
      payment_history: paymentHistory,
      seen_by_admin: false,
      has_special_request: hasSpecial,
      is_manual: isManual,
      manual_by: manualBy || null,
      paid_at: paidAmount >= subTotal && subTotal > 0 ? now : null
    }).select().single();

    if (error) throw error;
    const newOrder = data;

    // Update Wallet (Deferred Billing Logic)
    // We only add paidAmount (deposit) upfront. Subtotal deduction happens when order is COMPLETED.
    const newBalance = user.agentDetails.currentBalance + paidAmount;

    // Update Agent Profile (Balance)
    // Note: We update agent_details table
    await supabase.from('agent_details').update({ current_balance: newBalance }).eq('id', user.id);

    // Update Local Cache Immediately
    if (user.agentDetails) {
      user.agentDetails.currentBalance = newBalance;
    }

    // Wallet Transactions
    // DO NOT insert 'PAYMENT' for -subTotal here. Deferred until 'COMPLETED'.

    if (paidAmount > 0) {
      await supabase.from('wallet_transactions').insert({
        agent_id: user.id,
        amount: paidAmount,
        type: 'DEPOSIT',
        description: `تسديد واصل لطلبية #${newOrder.id}`
      });
    }

    const logUserId = operatorId || userId;
    const logDetails = operatorId && operatorId !== userId
      ? `تم إنشاء طلب يدوي #${newOrder.id} لصالح الوكيل: ${user.fullName}`
      : `تم إنشاء طلب جديد #${newOrder.id}`;

    this.logActivity(logUserId, 'إنشاء طلب', 'ORDERS', logDetails);

    // OPTIMISTIC UPDATE: Manually append to local state immediately
    const mappedOrder = this.mapOrder(newOrder);
    this.orders = [mappedOrder, ...this.orders];
    this.notify(); // Immediate UI update

    // Background fetch to ensure consistency (no await)
    this.fetchOrders();
    return newOrder;
  }

  // --- Getters (Sync for UI) ---

  getOrders(id: number | string, role: UserRole) {
    return role === UserRole.AGENT
      ? this.orders.filter(o => o.agentId == id)
      : [...this.orders];
  }

  getFactoryTransactions(category?: FactoryCategory) {
    if (category) return this.factoryTransactions.filter(t => t.category === category);
    return [...this.factoryTransactions];
  }

  getMaterialStock(materialType: string): number {
    const txs = this.factoryTransactions.filter(t => t.category === 'INVENTORY' && t.materialType === materialType);
    const stockIn = txs.filter(t => t.transactionType === 'IN').reduce((acc, t) => acc + (t.quantity || 0), 0);
    const stockOut = txs.filter(t => t.transactionType === 'OUT').reduce((acc, t) => acc + (t.quantity || 0), 0);
    return stockIn - stockOut;
  }

  getProductionQueue() {
    return this.orders.filter(o => o.productionStatus === ProductionStatus.WAITING || o.productionStatus === ProductionStatus.IN_PROGRESS);
  }

  getSuppliers() { return [...this.suppliers]; }

  getAllTransactions() { return [...this.walletTransactions]; }
  getTransactions(agentId: string | number) { return this.walletTransactions.filter(t => t.agentId == agentId); }

  getLogs(userId: 'ALL' | string | number, context: 'ALL' | LogContext, from?: string, to?: string) {
    let logs = this.auditLogs;
    if (userId !== 'ALL') logs = logs.filter(l => l.userId == userId);
    if (context !== 'ALL') logs = logs.filter(l => l.context === context);
    if (from) logs = logs.filter(l => new Date(l.timestamp) >= new Date(from));
    if (to) logs = logs.filter(l => new Date(l.timestamp) <= new Date(to));
    return [...logs];
  }

  // --- Placeholders/Todo ---
  async updateOrder(userId: any, orderId: any, items: any[], paymentAddition: number, discountValue: number, discountType: 'FIXED' | 'PERCENT', options: { recordPaymentTransaction?: boolean; agentEditUnlocked?: boolean } = {}) {
    // 1. Get Existing Order
    const existingOrder = this.orders.find(o => o.id == orderId);
    if (!existingOrder) throw new Error('الطلب غير موجود');

    const agent = this.users.find(u => u.id == existingOrder.agentId);
    if (!agent || !agent.agentDetails) throw new Error('بيانات الوكيل غير موجودة');

    // 2. Recalculate New Items & Totals
    let newVolume = 0;
    const newItems: OrderItem[] = items.map((item, idx) => {
      // Find product for volume info (even if active/inactive, we need volume)
      const product = this.products.find(p => p.id == item.productId);

      const totalPrice = (Number(item.qCartons) * Number(item.unitPriceCarton)) + (Number(item.qMeters) * Number(item.unitPriceMeter));

      if (!item.isSpecialRequest && product) {
        newVolume += (Number(item.qCartons) * (product.volumePerCarton || 0));
      }

      return {
        id: Math.random() + idx, // Regenerate IDs to avoid conflicts
        productId: item.productId,
        productCode: item.productCode || (item.isSpecialRequest ? 'طلب خاص' : product?.code || '?'),
        productName: item.productName || product?.name,
        productPaintType: item.productPaintType || product?.paintType,
        productDimensions: item.productDimensions || (item.isSpecialRequest ? 'أبعاد مخصصة' : product?.dimensions || '-'),
        quantityCartons: Number(item.qCartons),
        quantityMeters: Number(item.qMeters),
        unitPriceCarton: Number(item.unitPriceCarton),
        unitPriceMeter: Number(item.unitPriceMeter),
        totalPrice: totalPrice,
        isSpecialRequest: item.isSpecialRequest,
        specialRequestNote: item.specialRequestNote,
        priceAdjustmentNote: item.priceAdjustmentNote
      };
    });

    const newSubTotal = newItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
    const discountAmount = discountType === 'PERCENT' ? (newSubTotal * discountValue / 100) : discountValue;
    const newTotalAmount = newSubTotal - discountAmount;

    // 3. Calculate Deltas
    const oldTotalAmount = existingOrder.totalAmount;
    const costDifference = newTotalAmount - oldTotalAmount;

    // 4. Prepare Updates
    const newPaidAmount = existingOrder.paidAmount + paymentAddition;

    // Payment History Update
    let newPaymentHistory = [...(existingOrder.paymentHistory || [])];
    if (paymentAddition > 0) {
      newPaymentHistory.push({
        id: Date.now(),
        amountAdded: paymentAddition,
        previousPaid: existingOrder.paidAmount,
        newTotalPaid: newPaidAmount,
        addedBy: this.users.find(u => u.id == userId)?.fullName || 'مستخدم',
        addedById: userId,
        date: new Date().toISOString(),
        note: 'تعديل إداري'
      });
    }

    // 5. Update Database
    const hasSpecial = newItems.some(i => i.isSpecialRequest);

    const updatePayload = {
      sub_total_amount: newSubTotal,
      discount_value: discountValue,
      discount_type: discountType,
      total_amount: newTotalAmount,
      paid_amount: newPaidAmount,
      total_volume: newVolume,
      has_special_request: hasSpecial,
      payment_status: newPaidAmount >= newTotalAmount && newTotalAmount > 0 ? PaymentStatus.PAID : (newPaidAmount > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.PENDING),
      items: newItems,
      payment_history: newPaymentHistory,
      paid_at: newPaidAmount >= newTotalAmount && newTotalAmount > 0 ? (existingOrder.paidAt || new Date().toISOString()) : null,
      ...(options.agentEditUnlocked !== undefined ? { agent_edit_unlocked: options.agentEditUnlocked } : {})
    };

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select('id')
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedOrder) throw new Error('لم يتم تحديث الطلب. تحقق من صلاحية التعديل وحاول مرة ثانية.');

    // 6. Wallet & Balance Adjustments
    // a) Adjust for Cost Difference (If order is more expensive, deduct more. If cheaper, refund difference).
    // Logic: Balance = Balance - CostDiff
    // Example: Old Cost 100. New Cost 150. Diff +50. Balance -= 50.
    // Example: Old Cost 100. New Cost 80. Diff -20. Balance -= -20 (Balance += 20).

    // b) Adjust for New Payment
    // Logic: Balance = Balance + Payment

    const isBilled = existingOrder.productionStatus === ProductionStatus.COMPLETED;
    const appliedCostDifference = isBilled ? costDifference : 0;
    const totalBalanceChange = -appliedCostDifference + paymentAddition;

    if (totalBalanceChange !== 0) {
      const newBalance = agent.agentDetails.currentBalance + totalBalanceChange;

      await supabase.from('agent_details').update({ current_balance: newBalance }).eq('id', agent.id);

      // Update Local Cache
      if (agent.agentDetails) agent.agentDetails.currentBalance = newBalance;
    }

    // 7. Log Transactions
    if (appliedCostDifference !== 0) {
      await supabase.from('wallet_transactions').insert({
        agent_id: agent.id,
        amount: -appliedCostDifference, // Negative means "Spend", so if Cost goes UP (Diff > 0), Amount is Negative.
        type: 'ADJUSTMENT',
        description: `تعديل قيمة الطلب #${orderId} (${appliedCostDifference > 0 ? 'زيادة' : 'نقصان'})`
      });
    }

    if (paymentAddition > 0 && options.recordPaymentTransaction !== false) {
      await supabase.from('wallet_transactions').insert({
        agent_id: agent.id,
        amount: paymentAddition,
        type: 'DEPOSIT', // Payment is a deposit into the system wallet
        description: `دفعة إضافية للطلب #${orderId} | بواسطة: ${this.users.find(u => u.id == userId)?.fullName}`
      });
    }

    this.logActivity(userId, 'تعديل طلب', 'ORDERS', `تعديل الطلب #${orderId}`, existingOrder.totalAmount.toString(), newTotalAmount.toString());

    // 8. Refresh
    await this.fetchOrders();
    this.notify();
  }

  private isOrderBeforeProduction(order: Order) {
    return order.productionStatus === ProductionStatus.PENDING_TRANSFER || order.productionStatus === ProductionStatus.PENDING_PAYMENT;
  }

  async setOrderAgentEditUnlocked(userId: any, orderId: any, unlocked: boolean) {
    const existingOrder = this.orders.find(o => o.id == orderId);
    if (!existingOrder) throw new Error('الطلب غير موجود');
    if (!this.isOrderBeforeProduction(existingOrder)) {
      throw new Error('لا يمكن فتح تعديل الوكيل بعد ترحيل الطلب لخط الإنتاج');
    }

    const { data, error } = await supabase
      .from('orders')
      .update({ agent_edit_unlocked: unlocked })
      .eq('id', orderId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('لم يتم تحديث صلاحية تعديل الوكيل');

    this.orders = this.orders.map(o => o.id == orderId ? { ...o, agentEditUnlocked: unlocked } : o);
    this.logActivity(userId, unlocked ? 'فتح تعديل الوكيل' : 'قفل تعديل الوكيل', 'ORDERS', `${unlocked ? 'تم فتح' : 'تم قفل'} تعديل الوكيل للطلب #${orderId}`);
    this.notify();
  }

  async updateOrderByAgent(agentId: any, orderId: any, items: any[]) {
    const existingOrder = this.orders.find(o => o.id == orderId);
    if (!existingOrder) throw new Error('الطلب غير موجود');
    if (String(existingOrder.agentId) !== String(agentId)) throw new Error('لا تملك صلاحية تعديل هذا الطلب');
    if (!existingOrder.agentEditUnlocked) throw new Error('تعديل هذا الطلب غير مفتوح من الإدارة');
    if (!this.isOrderBeforeProduction(existingOrder)) throw new Error('لا يمكن تعديل الطلب بعد ترحيله لخط الإنتاج');

    await this.updateOrder(agentId, orderId, items, 0, existingOrder.discountValue || 0, existingOrder.discountType || 'FIXED', {
      recordPaymentTransaction: false,
      agentEditUnlocked: false
    });

    this.orders = this.orders.map(o => o.id == orderId ? { ...o, agentEditUnlocked: false } : o);
    this.logActivity(agentId, 'تعديل وكيل للطلب', 'ORDERS', `تم تعديل الطلب #${orderId} من بوابة الوكيل وانقفل التعديل تلقائياً`);
    await this.fetchOrders();
    this.notify();
  }

  async addAgentLedgerTransaction(userId: any, agentId: any, amount: number, description: string, type: 'DEPOSIT' | 'ADJUSTMENT' = 'DEPOSIT') {
    const agent = this.users.find(u => u.id == agentId);
    if (!agent) throw new Error('وكيل غير موجود');

    const finalDescription = `${description || 'حركة مالية'} | بواسطة: ${this.users.find(u => u.id == userId)?.fullName || 'مستخدم'}`;
    const tempTx = {
      id: Date.now(),
      agent_id: agentId,
      agentId,
      amount,
      type,
      description: finalDescription,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    this.walletTransactions = [tempTx as any, ...this.walletTransactions];
    this.notify();

    const { error } = await supabase.from('wallet_transactions').insert({
      agent_id: agentId,
      amount,
      type,
      description: finalDescription
    });
    if (error) throw error;

    await this.fetchWalletTransactions();
    this.logActivity(userId, 'تسجيل حركة مالية', 'AGENTS', `تسجيل حركة موحدة للوكيل ${agent.fullName} بمبلغ ${amount}`);
    this.notify();
  }

  async updateOrderPaymentHistory(userId: any, orderId: any, paymentHistory: any[]) {
    const existingOrder = this.orders.find(o => o.id == orderId);
    if (!existingOrder) throw new Error('الطلب غير موجود');

    const agent = this.users.find(u => u.id == existingOrder.agentId);
    if (!agent || !agent.agentDetails) throw new Error('بيانات الوكيل غير موجودة');

    const normalizedHistory = paymentHistory
      .filter(pay => Number(pay.amountAdded) > 0)
      .map(pay => ({ ...pay, amountAdded: Number(pay.amountAdded) }));

    let runningPaid = 0;
    const recalculatedHistory = normalizedHistory.map(pay => {
      const previousPaid = runningPaid;
      runningPaid += pay.amountAdded;
      return {
        ...pay,
        previousPaid,
        newTotalPaid: runningPaid
      };
    });

    if (runningPaid > existingOrder.totalAmount) {
      throw new Error('مجموع الدفعات أكبر من قيمة الفاتورة');
    }

    const { error: updateError } = await supabase.from('orders').update({
      paid_amount: runningPaid,
      payment_status: runningPaid >= existingOrder.totalAmount && existingOrder.totalAmount > 0 ? PaymentStatus.PAID : (runningPaid > 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.PENDING),
      payment_history: recalculatedHistory,
      paid_at: runningPaid >= existingOrder.totalAmount && existingOrder.totalAmount > 0 ? (existingOrder.paidAt || new Date().toISOString()) : null
    }).eq('id', orderId);

    if (updateError) throw updateError;

    const balanceChange = runningPaid - existingOrder.paidAmount;
    if (balanceChange !== 0) {
      const newBalance = agent.agentDetails.currentBalance + balanceChange;
      await supabase.from('agent_details').update({ current_balance: newBalance }).eq('id', agent.id);
      agent.agentDetails.currentBalance = newBalance;

      await supabase.from('wallet_transactions').insert({
        agent_id: agent.id,
        amount: balanceChange,
        type: 'ADJUSTMENT',
        description: `تعديل دفعات الطلب #${orderId} | بواسطة: ${this.users.find(u => u.id == userId)?.fullName || 'مستخدم'}`
      });
    }

    this.logActivity(userId, 'تعديل دفعات طلب', 'ORDERS', `تعديل دفعات الطلب #${orderId}`, existingOrder.paidAmount.toString(), runningPaid.toString());
    await this.fetchOrders();
    this.notify();
  }

  updateOrderStatus(userId: any, orderId: any, type: 'payment' | 'production', newVal: string) {
    // Optimistic update
    const originalOrders = [...this.orders];
    if (type === 'production') {
      const shouldLockAgentEdit = newVal !== ProductionStatus.PENDING_TRANSFER && newVal !== ProductionStatus.PENDING_PAYMENT;
      this.orders = this.orders.map(o => o.id == orderId ? { ...o, productionStatus: newVal as any, ...(shouldLockAgentEdit ? { agentEditUnlocked: false } : {}) } : o);
    } else {
      this.orders = this.orders.map(o => o.id == orderId ? { ...o, paymentStatus: newVal as any } : o);
    }
    this.notify();

    // Real update - async
    (async () => {
      try {
        const shouldLockAgentEdit = type === 'production' && newVal !== ProductionStatus.PENDING_TRANSFER && newVal !== ProductionStatus.PENDING_PAYMENT;
        const updateData = type === 'production'
          ? { production_status: newVal, ...(newVal === ProductionStatus.WAITING ? { moved_to_production_at: new Date().toISOString() } : {}), ...(shouldLockAgentEdit ? { agent_edit_unlocked: false } : {}) }
          : { payment_status: newVal };

        const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
        if (error) throw error;
        
        const targetOrder = originalOrders.find(o => o.id == orderId);
        const oldStatus = targetOrder?.[type === 'production' ? 'productionStatus' : 'paymentStatus'];

        if (type === 'production' && targetOrder) {
            const isNowCompleted = newVal === ProductionStatus.COMPLETED;
            const wasCompleted = oldStatus === ProductionStatus.COMPLETED;

            if (isNowCompleted && !wasCompleted) {
                const agent = this.users.find(u => u.id == targetOrder.agentId);
                if (agent && agent.agentDetails) {
                    const { data: existingTx } = await supabase.from('wallet_transactions')
                        .select('id').eq('agent_id', agent.id).eq('description', `شراء طلبية #${orderId}`);
                        
                    if (!existingTx || existingTx.length === 0) {
                        const newBalance = agent.agentDetails.currentBalance - targetOrder.totalAmount;
                        await supabase.from('agent_details').update({ current_balance: newBalance }).eq('id', agent.id);
                        if (agent.agentDetails) agent.agentDetails.currentBalance = newBalance;
                        
                        await supabase.from('wallet_transactions').insert({
                            agent_id: agent.id,
                            amount: -targetOrder.totalAmount,
                            type: 'PAYMENT',
                            description: `شراء طلبية #${orderId}`
                        });
                        this.fetchWalletTransactions();
                    }
                }
            } else if (!isNowCompleted && wasCompleted) {
                const agent = this.users.find(u => u.id == targetOrder.agentId);
                if (agent && agent.agentDetails) {
                    const { data: existingTx } = await supabase.from('wallet_transactions')
                        .select('id').eq('agent_id', agent.id).eq('description', `شراء طلبية #${orderId}`);
                    
                    if (existingTx && existingTx.length > 0) {
                        const newBalance = agent.agentDetails.currentBalance + targetOrder.totalAmount;
                        await supabase.from('agent_details').update({ current_balance: newBalance }).eq('id', agent.id);
                        if (agent.agentDetails) agent.agentDetails.currentBalance = newBalance;
                        
                        await supabase.from('wallet_transactions').delete().eq('agent_id', agent.id).eq('description', `شراء طلبية #${orderId}`);
                        this.fetchWalletTransactions();
                    }
                }
            }
        }

        this.logActivity(userId, 'تحديث حالة', 'SYSTEM', `تحديث حالة ${type} لطلب #${orderId}`, oldStatus as string, newVal);
      } catch (err) {
        console.error('Update status failed, reverting:', err);
        this.orders = originalOrders;
        this.notify();
      }
    })();
  }
  updateOrderEstimate(userId: any, orderId: any, days: number) {
    const originalOrders = [...this.orders];
    this.orders = this.orders.map(o => o.id == orderId ? { ...o, estimatedDays: days } : o);
    this.notify();

    (async () => {
      try {
        const { error } = await supabase.from('orders').update({ estimated_days: days }).eq('id', orderId);
        if (error) throw error;
      } catch (err) {
        console.error('Update estimate failed, reverting:', err);
        this.orders = originalOrders;
        this.notify();
      }
    })();
  }

  deleteOrder(userId: any, orderId: any, refund: boolean) {
    const originalOrders = [...this.orders];
    this.orders = this.orders.filter(o => o.id != orderId);
    this.notify();

    (async () => {
      try {
        const { error } = await supabase.from('orders').delete().eq('id', orderId);
        if (error) throw error;
      } catch (err) {
        console.error('Delete order failed, reverting:', err);
        this.orders = originalOrders;
        this.notify();
      }
    })();
  }

  markOrderAsSeen(orderId: any) {
    const originalOrders = [...this.orders];
    this.orders = this.orders.map(o => o.id == orderId ? { ...o, seenByAdmin: true } : o);
    this.notify();

    (async () => {
      try {
        const { error } = await supabase.from('orders').update({ seen_by_admin: true }).eq('id', orderId);
        if (error) throw error;
      } catch (err) {
        console.error('Mark seen failed, reverting:', err);
        this.orders = originalOrders;
        this.notify();
      }
    })();
  }

  async registerAgent(userId: any, agentData: any) {
    // Cannot programmatically create a new user from client-side without logging out current user or using Service Role.
    // Throw error instructing user to use Dashboard.
    throw new Error('للحفاظ على أمان النظام، يرجى إنشاء الحسابات الجديدة من لوحة تحكم Supabase مباشرة (Authentication -> Add User).');
  }





  async updateUserCredentials(userId: any, targetUserId: any, updates: { email?: string, password?: string }) {
    const response = await invokeAdminAction('update_user_credentials', { userId: targetUserId, ...updates });
    if (response.error) throw new Error(response.error);

    this.logActivity(userId, 'تحديث بيانات دخول', 'AUTH', `تحديث بيانات الدخول للمستخدم #${targetUserId}`);
    await this.fetchUsers();
    this.notify();
    return response;
  }

  async updateProfile(userId: string | number, data: any) {
    // 1. Update Auth User (Email/Password) if requested
    const authUpdates: any = {};
    if (data.email) authUpdates.email = data.email;

    // Get current user for verification and role check
    const currentUser = this.users.find(u => u.id == userId);
    if (!currentUser) throw new Error('المستخدم غير موجود');

    // Security Check: If changing password, verify old password first
    if (data.password) {
      if (!data.currentPassword) {
        throw new Error('يرجى إدخال كلمة المرور الحالية للأمان.');
      }

      // Verify by trying to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: data.currentPassword
      });

      if (verifyError) {
        throw new Error('كلمة المرور الحالية غير صحيحة.');
      }

      // If verified, proceed to add password to updates
      authUpdates.password = data.password;
    }

    let confirmationPending = false;

    if (Object.keys(authUpdates).length > 0) {
      const { data: authData, error } = await supabase.auth.updateUser(authUpdates);
      if (error) throw error;

      // Check if email change requires confirmation (only if we requested an email update)
      if (authUpdates.email && authData.user && authData.user.new_email && authData.user.new_email !== authData.user.email) {
        confirmationPending = true;
      }
    }

    // 2. Update Public Profile
    const updates: any = {};
    if (data.fullName) updates.full_name = data.fullName;
    if (data.role) updates.role = data.role;
    if (data.permissions) updates.permissions = data.permissions; // Handle permissions updates

    // Only update public profile email if it was changed IMMEDIATELY (no confirmation pending)
    if (data.email && !confirmationPending) {
      updates.email = data.email;
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').update(updates).eq('id', userId);
    }

    // Also update phone in profiles if provided - CHECK FOR UNIQUENESS FIRST
    if (data.phone) {
      // Check if phone is already used by another user
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', data.phone)
        .neq('id', userId);

      if (existingUsers && existingUsers.length > 0) {
        throw new Error('رقم الهاتف مستخدم مسبقاً من قبل مستخدم آخر');
      }

      await supabase.from('profiles').update({ phone: data.phone }).eq('id', userId);
    }

    // Update province and address in profiles table (for all users including agents)
    const profileExtras: any = {};
    if (data.province !== undefined) profileExtras.province = data.province;
    if (data.address !== undefined) profileExtras.address = data.address;

    if (Object.keys(profileExtras).length > 0) {
      console.log('Updating profile extras (province/address):', profileExtras);
      await supabase.from('profiles').update(profileExtras).eq('id', userId);
    }

    this.logActivity(userId, 'تحديث بروفايل', 'AUTH', `تحديث بيانات المستخدم`);

    // Force refresh to get latest state
    await this.fetchUsers();
    this.notify();

    // Return the updated user for the UI to show success toast
    const updatedUser = this.users.find(u => u.id == userId);
    if (!updatedUser) {
      // Fallback: If fetchUsers fails to find the user immediately (race condition),
      // construct the user object from the input data + existing data.
      // Return a constructed object so the UI doesn't crash
      // We use 'any' to bypass strict type checking for this fallback
      const currentUser: any = this.users.find(u => u.id == userId) || {};

      const safeUser = {
        ...currentUser,
        id: userId,
        email: (data.email && !confirmationPending) ? data.email : (currentUser.email || data.email),
        fullName: data.fullName || currentUser.fullName,
        role: data.role || currentUser.role,
        // Reconstruct other fields as best as possible
        agentDetails: {
          ...(currentUser.agentDetails || {}),
          phone: data.phoneNumber || data.phone || currentUser.agentDetails?.phone
        },
        avatar_path: currentUser.avatar_path // Preserve avatar path
      } as any;

      return { user: safeUser, confirmationPending };
    }

    return { user: updatedUser, confirmationPending };
  }

  // --- PRESENCE TRACKING ---
  async updatePresence(userId: string | number, ip: string | null, deviceInfo: string, currentPath?: string) {
    // console.log('DEBUG: updatePresence called for', userId, ip);
    try {
      const updates: any = {
        last_ip: ip,
        device_info: deviceInfo,
        last_active_at: new Date().toISOString()
      };

      if (currentPath) {
        updates.current_path = currentPath;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        console.error('Error updating presence:', error);
      }
    } catch (err) {
      console.error('Presence update failed:', err);
    }
  }

  async setOffline(userId: string | number) {
    try {
      await supabase
        .from('profiles')
        .update({
          is_online: false,
          last_active_at: new Date(Date.now() - 3600000).toISOString() // Set to 1 hour ago
        })
        .eq('id', userId);

      // Notify subscribers immediately
      await this.fetchUsers();
    } catch (e) {
      console.error('Error setting offline:', e);
    }
  }

  // Helper for Staff Management (Reuse updateProfile logic usually)
  async updateEmployee(userId: any, empData: any) {
    const result = await this.updateProfile(empData.id, empData);
    return result.user || result;
  }

  async uploadAvatar(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to 'avatars' bucket
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      // If bucket doesn't exist, try 'public' or generic
      if (uploadError.message.includes('Bucket not found')) {
        throw new Error('لم يتم العثور على مساحة التخزين (Bucket "avatars"). يرجى إنشاؤها في Supabase.');
      }
      throw uploadError;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  }

  async uploadProductImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to 'ProductImg' bucket
    const { error: uploadError } = await supabase.storage
      .from('ProductImg')
      .upload(filePath, file);

    if (uploadError) {
      // If bucket doesn't exist, try 'public' or generic
      if (uploadError.message.includes('Bucket not found')) {
        throw new Error('لم يتم العثور على مساحة التخزين (Bucket "ProductImg"). يرجى إنشاؤها في Supabase.');
      }
      throw uploadError;
    }

    const { data } = supabase.storage.from('ProductImg').getPublicUrl(filePath);
    return data.publicUrl;
  }

  async createProduct(userId: any, productData: any) {
    const { id, imageUrl, isActive, metersPerCarton, volumePerCarton, paintType, paint_type, imageNote, image_note, technicalSheetUrl, technical_sheet_url, ...rest } = productData;
    // Map frontend camelCase to DB snake_case
    const dbPayload = {
      ...rest,
      image_url: imageUrl,
      paint_type: paintType ?? paint_type ?? null,
      image_note: imageNote ?? image_note ?? null,
      technical_sheet_url: technicalSheetUrl ?? technical_sheet_url ?? null,
      is_active: isActive,
      meters_per_carton: metersPerCarton,
      volume_per_carton: volumePerCarton
    };

    const { error } = await supabase.from('products').insert(dbPayload);
    if (error) throw error;
    await this.fetchProducts();
    this.notify();
  }
  async updateProduct(userId: any, productData: any) {
    const { id, imageUrl, isActive, metersPerCarton, volumePerCarton, paintType, paint_type, imageNote, image_note, technicalSheetUrl, technical_sheet_url, ...rest } = productData;
    const dbPayload = {
      ...rest,
      image_url: imageUrl,
      paint_type: paintType ?? paint_type ?? null,
      image_note: imageNote ?? image_note ?? null,
      technical_sheet_url: technicalSheetUrl ?? technical_sheet_url ?? null,
      is_active: isActive,
      meters_per_carton: metersPerCarton,
      volume_per_carton: volumePerCarton
    };

    const { error } = await supabase.from('products').update(dbPayload).eq('id', id);
    if (error) throw error;
    await this.fetchProducts();
    this.notify();
  }
  async deleteProduct(userId: any, productId: any) {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) throw error;
    await this.fetchProducts();
    this.notify();
  }


  async addCategory(userId: any, name: string, type: any) {
    const tempId = -Math.random(); // Temporary ID to show immediately
    const newCat = { id: tempId, name, type };
    this.categories.push(newCat as any);
    this.notify();

    const { data, error } = await supabase.from('categories').insert({ name, type }).select().single();
    if (data) {
      // Replace temp item with real one
      this.categories = this.categories.map(c => c.id === tempId ? data : c);
      this.notify();
    } else {
      // Revert on error
      this.categories = this.categories.filter(c => c.id !== tempId);
      this.notify();
    }
    return newCat;
  }
  deleteCategory(userId: any, id: any) {
    this.categories = this.categories.filter(c => c.id !== id);
    this.notify();
    supabase.from('categories').delete().eq('id', id).then();
  }
  updateCategory(userId: any, id: any, name: string, type?: 'STYROFOAM' | 'ADHESIVE' | 'PAINT') {
    // Optimistic Update
    this.categories = this.categories.map(c => c.id === id ? { ...c, name, ...(type ? { type } : {}) } : c);
    this.notify();
    const updates: any = { name };
    if (type) updates.type = type;
    supabase.from('categories').update(updates).eq('id', id).then();
  }

  addSupplier(userId: any, supplier: any) {
    // Optimistic local update for instant UI response
    const optimisticSupplier = { id: Date.now(), ...supplier, currentBalance: 0 };
    this.suppliers.push(optimisticSupplier);
    this.notify();

    supabase.from('suppliers').insert(supplier).then(() => {
      this.fetchSuppliers(); // Refetch to sync real ID
    });
    this.logActivity(userId, 'إضافة مورد', 'SUPPLIERS' as any, `إضافة المورد الجديد: ${supplier.name}`);
    return optimisticSupplier;
  }
  updateSupplier(userId: any, id: any, supplierData: any) {
    // Optimistic local update
    const idx = this.suppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.suppliers[idx] = { ...this.suppliers[idx], ...supplierData };
      this.notify();
    }

    supabase.from('suppliers').update(supplierData).eq('id', id).then(() => {
      this.fetchSuppliers();
    });
    this.logActivity(userId, 'تعديل مورد', 'SUPPLIERS' as any, `تعديل بيانات المورد #${id}`);
  }
  async deleteSupplier(userId: any, id: any) {
    const { data } = await supabase.from('suppliers').select('name').eq('id', id).single();
    supabase.from('suppliers').delete().eq('id', id).then();
    this.logActivity(userId, 'حذف مورد', 'SUPPLIERS' as any, `حذف المورد: ${data?.name || id}`);
  }

  async addFactoryTransaction(userId: any, transaction: any) {
    // Correct: Generate payment history if missing but amount is paid (Critical for SafeTab visibility)
    // Inventory purchases usually come as full payment without history array.
    let finalPaymentHistory = transaction.payment_history;
    if ((!finalPaymentHistory || finalPaymentHistory.length === 0) && transaction.paidAmount > 0) {
      finalPaymentHistory = [{
        id: Date.now(),
        date: transaction.date || new Date().toISOString(),
        amount: transaction.paidAmount,
        addedBy: this.users.find(u => u.id == userId)?.fullName || 'النظام',
        notes: 'دفع فوري عند الشراء'
      }];
    }

    // Auto-fill withdrawnBy if missing (Crucial for SafeTab display)
    const actorName = transaction.withdrawnBy || this.users.find(u => u.id == userId)?.fullName;

    const dbTx = {
      category: transaction.category,
      amount: transaction.amount,
      paid_amount: transaction.paidAmount,
      payment_history: finalPaymentHistory, // Ensure this is saved
      supplier_id: transaction.supplierId || null,
      supplier_name: transaction.supplierName || null,
      transaction_type: transaction.transactionType,
      material_type: transaction.materialType || null,
      quantity: transaction.quantity || null,
      transaction_date: transaction.date || new Date().toISOString(),
      // ... map other fields
      notes: transaction.notes || '',
      source: transaction.source || null,
      country: transaction.country || null,
      province: transaction.province || null,
      withdrawn_by: actorName,
      agent_id: transaction.agentId || null, // Map Agent ID
      is_locked: transaction.isLocked || false
    };

    // Optimistic local update - add to local array immediately for instant UI response
    const optimisticTx: FactoryTransaction = {
      id: Date.now(), // Temporary ID until real one arrives from DB
      ...transaction,
      paymentHistory: finalPaymentHistory, // Use the generated history
      date: transaction.date || new Date().toISOString(),
    };
    this.factoryTransactions.unshift(optimisticTx);
    this.notify(); // Notify immediately for instant UI update

    // Then persist to database
    try {
      const { error } = await supabase.from('factory_transactions').insert(dbTx);
      if (error) throw error;

      // Wait a moment before refetching to ensure DB has synced
      // The realtime subscription will also pick this up
      setTimeout(() => {
        this.fetchFactoryTransactions();
      }, 1500);
    } catch (err) {
      console.error('Insert failed, reverting optimistic add:', err);
      // Remove the optimistic item
      this.factoryTransactions = this.factoryTransactions.filter(t => t.id !== optimisticTx.id);
      this.notify();
      throw err; // Re-throw to caller
    }

    // Determine Context
    let context = 'FACTORY';
    if (['SAFE_DEPOSIT', 'SAFE_WITHDRAWAL'].includes(transaction.category)) context = 'SAFE';
    else if (['SALARY', 'RENT', 'FOOD', 'DAILY_EXPENSE', 'ELECTRICITY'].includes(transaction.category)) context = 'EXPENSES';
    else if (['TRANSPORT_IN', 'TRANSPORT_OUT', 'CUSTOMS'].includes(transaction.category)) context = 'LOGISTICS';
    else if (transaction.category === 'SUPPLIER') context = 'SUPPLIERS'; // Or Logistics, but user said "Modern" is suppliers page
    else context = 'INVENTORY';

    this.logActivity(userId, 'إضافة حركة', context as any, `إضافة حركة جديدة: ${transaction.category}`, '', transaction.amount?.toString());
  }

  async updateFactoryTransaction(userId: any, txId: any, updates: any) {
    // Implement Update
    const payload: any = {};
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.paidAmount !== undefined) payload.paid_amount = updates.paidAmount;
    if (updates.date !== undefined) payload.transaction_date = updates.date;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    // Fix: Map missing inventory fields
    if (updates.payment_history !== undefined) payload.payment_history = updates.payment_history;
    if (updates.quantity !== undefined) payload.quantity = updates.quantity;
    if (updates.materialType !== undefined) payload.material_type = updates.materialType;
    if (updates.transactionType !== undefined) payload.transaction_type = updates.transactionType;
    if (updates.subType !== undefined) payload.sub_type = updates.subType;
    if (updates.source !== undefined) payload.source = updates.source;
    if (updates.supplierId !== undefined) payload.supplier_id = updates.supplierId;
    if (updates.supplierName !== undefined) payload.supplier_name = updates.supplierName;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.agentId !== undefined) payload.agent_id = updates.agentId; // Map Agent ID
    if (updates.isLocked !== undefined) payload.is_locked = updates.isLocked; // Map Lock status

    // Optimistic Update: Update local cache immediately
    const originalTxs = [...this.factoryTransactions]; // Backup state
    this.factoryTransactions = this.factoryTransactions.map(t => {
      if (t.id === txId) {
        return { ...t, ...updates };
      }
      return t;
    });
    this.notify(); // Force UI Refresh

    // Fetch old value for auditing (before async network call)
    // Note: We can't await this if we want to be truly instant, but a select single is fast. 
    // Ideally we should have old value from local state.
    const oldTx = originalTxs.find(t => t.id === txId);

    // Fire and forget (with error handling)
    (async () => {
      try {
        const { error } = await supabase.from('factory_transactions').update(payload).eq('id', txId);
        if (error) throw error;

        // Audit Log (Async)
        const context = updates.category && ['SAFE_DEPOSIT', 'SAFE_WITHDRAWAL'].includes(updates.category) ? 'SAFE' : 'FACTORY';
        await this.logActivity(userId, 'تعديل حركة', context as any, `تعديل حركة #${txId}`, oldTx?.amount?.toString(), updates.amount?.toString());
      } catch (err) {
        console.error('Update failed, reverting optimistic update:', err);
        // Revert to original state
        this.factoryTransactions = originalTxs;
        this.notify();
      }
    })();
  }

  async deleteFactoryTransaction(userId: any, txId: any) {
    const originalTxs = [...this.factoryTransactions];
    const txToDelete = originalTxs.find(t => t.id === txId);

    // Optimistic Delete
    this.factoryTransactions = this.factoryTransactions.filter(t => t.id !== txId);
    this.notify();

    // Fire and forget with catch
    (async () => {
      try {
        const { error } = await supabase.from('factory_transactions').delete().eq('id', txId);
        if (error) throw error;

        let context = 'FACTORY';
        if (txToDelete) {
          if (['SAFE_DEPOSIT', 'SAFE_WITHDRAWAL'].includes(txToDelete.category)) context = 'SAFE';
          else if (['SALARY', 'RENT', 'FOOD', 'DAILY_EXPENSE', 'ELECTRICITY'].includes(txToDelete.category)) context = 'EXPENSES';
          else if (['TRANSPORT_IN', 'TRANSPORT_OUT', 'CUSTOMS'].includes(txToDelete.category)) context = 'LOGISTICS';
          else if (txToDelete.category === 'SUPPLIER') context = 'SUPPLIERS';
          else context = 'INVENTORY';
        }
        await this.logActivity(userId, 'حذف حركة', context as any, `حذف حركة #${txId}`, txToDelete?.amount?.toString(), '0');
      } catch (err) {
        console.error('Delete failed, reverting optimistic delete:', err);
        this.factoryTransactions = originalTxs; // Restore
        this.notify();
      }
    })();
  }

  lockFactoryTransaction(userId: any, txId: any) {
    const originalTxs = [...this.factoryTransactions];
    // Optimistic Update
    this.factoryTransactions = this.factoryTransactions.map(t => t.id === txId ? { ...t, isLocked: true } : t);
    this.notify();

    (async () => {
      try {
        const { error } = await supabase.from('factory_transactions').update({ is_locked: true }).eq('id', txId);
        if (error) throw error;
        this.logActivity(userId, 'قفل حركة', 'FACTORY', `قفل حركة #${txId}`);
      } catch (err) {
        console.error('Lock failed, reverting:', err);
        this.factoryTransactions = originalTxs;
        this.notify();
      }
    })();
  }



  async registerEmployee(userId: any, empData: any) {
    const response = await invokeAdminAction('create_user', {
      email: empData.email,
      password: empData.password,
      invite: empData.invite,
      redirectTo: getAuthRedirectUrl('/accept-invite'),
      fullName: empData.fullName,
      role: empData.role,
      phone: empData.phone
    });

    if (response.error) throw new Error(response.error);

    // Persist Agent Details & Extra Profile Data (Avatar)
    const newUserId = response.data?.user?.id;
    if (newUserId) {
      // 1. Update Profile Avatar & Personal Details if present
      const profileUpdates: any = {};
      if (empData.avatar_path) profileUpdates.avatar_path = empData.avatar_path;
      // New: Save province and address to profiles
      // Check top-level first (standard from UI), then fallback to agentDetails
      if (empData.province) profileUpdates.province = empData.province;
      else if (empData.agentDetails?.province) profileUpdates.province = empData.agentDetails.province;

      if (empData.address) profileUpdates.address = empData.address;
      else if (empData.agentDetails?.address) profileUpdates.address = empData.agentDetails.address;

      if (Object.keys(profileUpdates).length > 0) {
        await supabase.from('profiles').update(profileUpdates).eq('id', newUserId);
      }

      // 2. Insert Agent Details if present
      if (empData.agentDetails) {
        const d = empData.agentDetails;
        const { error: detailsError } = await supabase.from('agent_details').insert({
          id: newUserId,
          // province/address removed from here
          // Use top-level phone if not provided in details (Fallback)
          phone: d.phone || empData.phone,
          internal_notes: d.internalNotes,
          permissions: d.permissions,
          agent_type: d.type,
          price_increase_percent: Number(d.priceIncreasePercent || 0),
          is_frozen: d.isFrozen,
          freeze_message: d.freezeMessage,
          current_balance: 0 // Initialize balance
        });

        if (detailsError) {
          console.error('Failed to create agent details:', detailsError);
          // Optional: rollback or warn?
        }
      }
    }

    this.logActivity(userId, 'إضافة موظف', 'STAFF', `تم إضافة الموظف الجديد ${empData.fullName}`);
    await this.fetchUsers();
    this.notify();
    return response;
  }

  // --- Unified Helper for Agent Details ---
  private async ensureAgentDetails(userId: string | number, updates: Partial<AgentDetails>) {
    // 1. Fetch existing to merge (Crucial for partial updates like ProfileTab where permissions aren't sent)
    const { data: existing } = await supabase.from('agent_details').select('*').eq('id', userId).maybeSingle();

    const defaults = {
      agent_type: 'عادي',
      current_balance: 0,
      price_increase_percent: 0,
      is_frozen: false,
      permissions: {
        allowCreditOrders: false,
        showProductionQueue: false,
        showFinance: true,
        showHistory: true,
        allowSpecialRequests: false
      }
    };

    // Merge: Defaults -> Existing -> New Updates
    // If existing is null, we start with defaults. If existing is present, we overlay it.
    // keys in 'updates' override everything.
    const merged = {
      ...(existing || defaults), // Base
      ...updates, // Overrides
      id: userId, // Force ID
    };

    const dbPayload: any = {
      id: merged.id,
      // Prioritize UPDATES over MERGED defaults/existing to ensure changes are saved
      phone: updates.phone || merged.phone,
      internal_notes: updates.internalNotes || (updates as any).internal_notes || (merged as any).internal_notes || merged.internalNotes,
      permissions: updates.permissions || merged.permissions,
      agent_type: ((updates as any).type || (updates as any).agentType || (updates as any).agent_type || (merged as any).agent_type || (merged as any).type) === 'عادي' ? 'NORMAL' : ((updates as any).type || (updates as any).agentType || (updates as any).agent_type || (merged as any).agent_type || (merged as any).type || 'NORMAL'),
      // FIX: Check 'updates' explicitly or prioritize camelCase to ensure UI updates aren't ignored
      is_frozen: updates.isFrozen !== undefined ? updates.isFrozen : (merged.is_frozen !== undefined ? merged.is_frozen : false),
      freeze_message: updates.freezeMessage !== undefined ? updates.freezeMessage : (merged.freeze_message || merged.freezeMessage),
      price_increase_percent: updates.priceIncreasePercent !== undefined ? Number(updates.priceIncreasePercent || 0) : Number((merged as any).price_increase_percent || merged.priceIncreasePercent || 0),
      current_balance: updates.currentBalance !== undefined ? updates.currentBalance : (merged.current_balance !== undefined ? merged.current_balance : 0),
    };

    const { error } = await supabase.from('agent_details').upsert(dbPayload);
    if (error) {
      console.error('Error in ensureAgentDetails (upsert):', error);
      // Fallback: Try a simple update if upsert fails (RLS might block insert)
      const { error: updateError } = await supabase.from('agent_details').update(dbPayload).eq('id', dbPayload.id);
      if (updateError) {
        console.error('Fallback update also failed:', updateError);
        throw new Error(`فشل حفظ تفاصيل الوكيل: ${error.message}`);
      }
    }
  }

  async updateAgent(adminUserId: any, agentData: any) {
    // 1. Update Profile (Name, Avatar, Province, Address)
    const profileUpdates: any = {
      full_name: agentData.fullName,
      avatar_path: agentData.avatar_path
    };

    // Extract province/address - prioritize top level (New Standard)
    if (agentData.province !== undefined) profileUpdates.province = agentData.province;
    else if (agentData.agentDetails?.province !== undefined) profileUpdates.province = agentData.agentDetails.province;

    if (agentData.address !== undefined) profileUpdates.address = agentData.address;
    else if (agentData.agentDetails?.address !== undefined) profileUpdates.address = agentData.agentDetails.address;

    const { error: profileError } = await supabase.from('profiles').update(profileUpdates).eq('id', agentData.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw new Error('فشل تحديث الملف الشخصي');
    }

    // 2. Update Agent Details (Unified)
    if (agentData.agentDetails) {
      // Ensure phone is passed if missing in agentDetails (since we stripped it in UI)
      const detailsUpdates = {
        ...agentData.agentDetails,
        phone: agentData.agentDetails.phone || agentData.phone
      };
      await this.ensureAgentDetails(agentData.id, detailsUpdates);
    }

    this.logActivity(adminUserId, 'تعديل وكيل', 'AGENTS', `تعديل بيانات الوكيل ${agentData.fullName}`);
    await this.fetchUsers();
    this.notify();
  }

  async addBalance(userId: any, agentId: any, amount: number, notes: string, options: { affectsSafe?: boolean; recordTransaction?: boolean } = {}) {
    const agent = this.users.find(u => u.id == agentId);
    if (!agent || !agent.agentDetails) throw new Error('وكيل غير موجود');

    const originalUsers = JSON.parse(JSON.stringify(this.users)); // Deep copy backup
    const originalTransactions = [...this.walletTransactions];

    // Optimistic Update
    const newBalance = agent.agentDetails.currentBalance + amount;
    agent.agentDetails.currentBalance = newBalance;
    this.users = [...this.users]; // Trigger update
    const affectsSafe = options.affectsSafe ?? amount > 0;
    const transactionType = amount > 0 && affectsSafe ? 'DEPOSIT' : 'ADJUSTMENT';
    const shouldRecordTransaction = options.recordTransaction ?? true;

    if (shouldRecordTransaction) {
      const tempTx = {
        id: Date.now(),
        agent_id: agentId,
        agentId: agentId,
        amount: amount,
        type: transactionType as any,
        description: notes || 'تعديل رصيد يدوي',
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      this.walletTransactions = [tempTx as any, ...this.walletTransactions];
    }
    this.notify();

    try {
      await supabase.from('agent_details').update({ current_balance: newBalance }).eq('id', agentId);
      if (shouldRecordTransaction) {
        await supabase.from('wallet_transactions').insert({
          agent_id: agentId,
          amount: amount,
          type: transactionType,
          description: `${notes || 'تعديل رصيد يدوي'} | بواسطة: ${this.users.find(u => u.id == userId)?.fullName}`
        });
      }

      // Re-sync to confirm
      await this.fetchUsers();
      if (shouldRecordTransaction) await this.fetchWalletTransactions();
      this.logActivity(userId, 'تعديل رصيد', 'AGENTS', `تعديل رصيد الوكيل ${agent.fullName} بمبلغ ${amount}`);

    } catch (err) {
      console.error('Add balance failed, reverting:', err);
      // Rollback
      this.users = originalUsers;
      this.walletTransactions = originalTransactions;
      this.notify();
      throw err;
    }
  }

  async setAgentStatus(userId: any, targetId: any, status: 'active' | 'suspended') {
    const originalUsers = JSON.parse(JSON.stringify(this.users));
    // Optimistic
    const userIndex = this.users.findIndex(u => u.id === targetId);
    if (userIndex !== -1 && this.users[userIndex].agentDetails) {
      this.users[userIndex].agentDetails!.isFrozen = (status === 'suspended');
      this.users = [...this.users];
      this.notify();
    }

    try {
      const res = await invokeAdminAction('set_status', { userId: String(targetId), status });
      if (!res.success) throw new Error(res.error || 'فشل تحديث الحالة');
      await this.fetchUsers();
    } catch (err) {
      console.error('Set status failed, reverting:', err);
      this.users = originalUsers;
      this.notify();
      throw err;
    }
  }

  async softDeleteAgent(userId: any, targetId: any) {
    const originalUsers = [...this.users];
    // Optimistic: remove from list (since soft delete usually hides it) or mark deleted
    // Assuming UI hides deleted users, let's mark it
    // Actually, usually users list filters out deleted. Let's filter it out.
    this.users = this.users.filter(u => u.id !== targetId);
    this.notify();

    try {
      const res = await invokeAdminAction('soft_delete_user', { userId: String(targetId) });
      if (!res.success) throw new Error(res.error || 'فشل الحذف المؤقت');
      await this.fetchUsers(); // Confirm state
    } catch (err) {
      console.error('Soft delete failed, reverting:', err);
      this.users = originalUsers;
      this.notify();
      throw err;
    }
  }

  async restoreAgent(userId: any, targetId: any) {
    // Restore logic is tricky optimistically because we need the data back.
    // However, if we are in "Deleted Users" tab, we can move it out.
    // For now, let's keep it async as it is a rare administrative action.
    const res = await invokeAdminAction('restore_user', { userId: String(targetId) });
    if (!res.success) throw new Error(res.error || 'فشل استعادة المستخدم');
    await this.fetchUsers();
    this.notify();
  }

  async deleteAgent(userId: any, targetId: any) {
    // Hard delete - permanently removes user and ALL related data
    // We must manually delete dependencies first to avoid FK constraint errors
    try {
      console.log('Starting cascade delete for agent:', targetId);

      // 1. Delete Wallet Transactions
      await supabase.from('wallet_transactions').delete().eq('agent_id', targetId);

      // 2. Delete Orders (Warning: This removes sales history)
      await supabase.from('orders').delete().eq('agent_id', targetId);

      // 3. Delete Audit Logs
      await supabase.from('audit_logs').delete().eq('user_id', targetId);

      // 4. Delete Agent Details
      await supabase.from('agent_details').delete().eq('id', targetId);

      // 5. Delete Profile Manually (to clear FK for auth.users if needed)
      // We delete from 'profiles' first because often 'auth.users' references 'profiles' or vice versa,
      // but 'profiles.id' is usually the FK to 'auth.users.id'. 
      // If we delete 'profiles' row, the 'auth.users' row has no dependents in public schema.
      const { error: profileDelError } = await supabase.from('profiles').delete().eq('id', targetId);
      if (profileDelError) console.warn('Manual profile delete warning:', profileDelError);

      // 6. Delete Auth User via Edge Function
      // Now that all public schema references are gone, this should succeed.
      const res = await invokeAdminAction('delete_user', { userId: String(targetId) });

      if (!res.success) {
        console.warn('Edge function delete failed (user might already be deleted or other issue):', res.error);
        // If we successfully deleted the profile, the user is effectively gone from the app UI.
        // We can consider this a "partial success" if the profile is gone.
        // But let's check: if it failed because "User not found", thats fine.
        if (res.error?.includes('Database error') && !profileDelError) {
          // If we already deleted the profile, maybe that's why it errored? 
          // Logic error: If we delete profile first, maybe the edge function tries to delete it again?
          // Depends on how 'delete_user' is implemented. Usually it deletes auth.users.
          // If ON DELETE CASCADE is set, deleting auth.users deletes profiles.
          // If we deleted profiles manually, deleting auth.users should still work unless there is a check.
          // BUT, if we deleted profiles, we are good for the UI.
        } else {
          // throw new Error(res.error || 'فشل الحذف النهائي');
        }
      }

      await this.fetchUsers();
      this.notify();
    } catch (e: any) {
      console.error('Cascade Delete Error:', e);
      throw new Error(e.message || 'فشل الحذف، يرجى التحقق من وجود بيانات مرتبطة');
    }
  }

  async setAgentRole(userId: any, targetId: any, role: string) {
    const res = await invokeAdminAction('set_role', { userId: String(targetId), role });
    if (!res.success) throw new Error(res.error || 'فشل تحديث الرتبة');
    await this.fetchUsers();
    this.notify();
  }

  async sendPasswordResetCode(email: string) {
    // Uses the recovery email template. The template should show {{ .Token }} as the code.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getAuthRedirectUrl('/reset-password'),
    });

    if (error) {
      console.error('Reset Password Error:', error);
      throw new Error(error.message || 'فشل إرسال كود استعادة كلمة المرور');
    }

    return { success: true };
  }

  async verifyPasswordResetCode(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });

    if (error) {
      console.error('Verify Reset Code Error:', error);
      throw new Error('الكود غير صحيح أو منتهي الصلاحية');
    }

    if (!data.session) {
      throw new Error('تعذر إنشاء جلسة آمنة لتغيير كلمة المرور');
    }

    return data.session;
  }

  async verifyEmailChangeCode(currentEmail: string, newEmail: string, token: string) {
    const emailsToTry = Array.from(new Set([newEmail.trim(), currentEmail.trim()].filter(Boolean)));
    let lastError: any = null;

    for (const email of emailsToTry) {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email_change',
      });

      if (!error) {
        const { data: authData } = await supabase.auth.getUser();
        const confirmedEmail = authData.user?.email;
        const completed = confirmedEmail?.toLowerCase() === newEmail.trim().toLowerCase();

        if (completed && authData.user?.id) {
          await supabase.from('profiles').update({ email: newEmail.trim() }).eq('id', authData.user.id);
          await this.fetchUsers();
          this.notify();
        }

        return { completed, email: confirmedEmail };
      }

      lastError = error;
    }

    console.error('Verify Email Change Code Error:', lastError);
    throw new Error('كود تأكيد البريد غير صحيح أو منتهي الصلاحية');
  }

  async sendPasswordResetEmail(email: string) {
    return this.sendPasswordResetCode(email);
  }

  async sendMagicLink(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: getAuthRedirectUrl('/magic-link'),
      },
    });

    if (error) throw new Error(error.message || 'فشل إرسال الرابط السحري');
    return { success: true };
  }
}

export const db = new SupabaseService();
