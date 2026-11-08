
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Package, Settings, LayoutDashboard, ListOrdered, FileText, Banknote, Tags, Users, BarChart3, Menu, X, User, Edit, Lock, Camera, Mail, History, UserCheck, Calculator, Activity, Factory, ChevronLeft, Info, Globe, Wallet, FileStack } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/ui';
import { NotificationBell } from '../components/shared/NotificationBell';
import { LanguageSwitcher } from '../components/shared/LanguageSwitcher';
import { UserRole, UserRoleLabels } from '../types';
import { Badge, Button, Input } from '../components/ui';
import { db } from '../lib/db';

interface LayoutProps {
  children?: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

import carbonFibre from '../assets/patterns/carbon-fibre.png';
import { usePresence } from '../hooks/usePresence';

export const Layout = ({ children, activeTab, setActiveTab }: LayoutProps) => {
  const { user, logout, updateUser } = useAuth();
  const { t } = useTranslation();
  // Enable Realtime Presence Tracking (Disabled for Agents, they handle it internally)
  usePresence(activeTab || 'overview', user?.role !== UserRole.AGENT);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [userIP, setUserIP] = useState<string>(t('layout.fetching_ip'));
  const profileRef = useRef<HTMLDivElement>(null);

  const unseenOrdersCount = db.orders.filter(o => !o.seenByAdmin).length;

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setUserIP(data.ip))
      .catch(() => setUserIP('156.210.44.12'));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Global Auto-Refresh (Every 5 Seconds)
    // Refreshes critical data: Orders, Users (Balance/Presence), Transactions
    const refreshInterval = setInterval(() => {
      // Only refresh if tab is visible/active to save resources
      if (!document.hidden) {
        db.fetchOrders();
        db.fetchUsers(); // Updates Balances & Online Status
        db.fetchWalletTransactions();
        db.fetchFactoryTransactions();
        // Added Products & Categories to ensure Catalog updates automatically
        db.fetchProducts();
        db.fetchCategories();
      }
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Permission Checks (use live data from db.users for instant updates)
  const liveUser = db.users.find(u => u.id === user?.id);
  const userPerms = (liveUser || user)?.permissions || [];
  const has = (p: string) => userPerms.includes(p as any);

  const primaryTabs = [
    { id: 'overview', label: t('tabs.overview'), icon: LayoutDashboard, show: true },
    { id: 'production', label: t('tabs.production'), icon: ListOrdered, show: has('VIEW_PRODUCTION') },
    { id: 'orders', label: t('tabs.orders'), icon: FileText, count: unseenOrdersCount, show: has('VIEW_ORDERS') },
    { id: 'catalog', label: t('tabs.catalog'), icon: Tags, show: has('VIEW_CATALOG') },
    { id: 'agents', label: t('tabs.agents'), icon: Users, show: has('VIEW_AGENTS') },
  ].filter(tab => tab.show);

  const secondaryTabs = [
    { id: 'invoice_merge', label: 'دمج فواتير', icon: FileStack, show: has('VIEW_ORDERS') },
    { id: 'sales', label: t('tabs.sales'), icon: Banknote, show: has('VIEW_SALES') },
    { id: 'reports', label: t('tabs.reports'), icon: BarChart3, show: has('VIEW_REPORTS') },
    { id: 'staff', label: t('tabs.staff'), icon: UserCheck, show: has('MANAGE_STAFF') },
    { id: 'activity_log', label: t('tabs.activity_log'), icon: History, show: has('VIEW_LOGS') },
    { id: 'presence', label: t('tabs.presence'), icon: Activity, show: has('VIEW_PRESENCE') },
    { id: 'factory', label: t('tabs.factory'), icon: Factory, show: has('ACCESS_FACTORY') },
    { id: 'safe', label: t('tabs.safe'), icon: Wallet, show: has('VIEW_SAFE') },
    { id: 'settings', label: t('tabs.settings'), icon: Settings, show: has('VIEW_SETTINGS') },
  ].filter(tab => tab.show);

  const isStaff = user?.role !== UserRole.AGENT;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans print:bg-white flex flex-col" dir="rtl">
      <header className="bg-[#0e3c63] text-white shadow-xl z-[60] print:hidden relative border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex justify-between items-center">

            {/* Brand */}
            <button onClick={() => setActiveTab?.('overview')} className="flex items-center gap-3 group active:scale-95 transition-all">
              <div className="bg-white/10 p-2 rounded-xl border border-white/10 shadow-inner group-hover:bg-sky-500/20 transition-colors">
                <Package className="text-white w-5 h-5" />
              </div>
              <div className="text-right">
                <h1 className="voga-brand-logo font-bold leading-none group-hover:text-sky-200 transition-colors"><span className="text-2xl">V</span><span className="text-lg">OGA</span></h1>
              </div>
            </button>

            {/* Desktop Navigation */}
            {isStaff && setActiveTab && (
              <nav className="hidden md:flex items-center gap-3 mx-4">
                <div className="flex bg-black/20 rounded-xl p-1 gap-1 border border-white/5">
                  {primaryTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black transition-all duration-200 whitespace-nowrap relative ${activeTab === tab.id ? 'bg-white text-[#0e3c63] shadow-lg' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
                    >
                      <tab.icon size={14} className={activeTab === tab.id ? 'text-[#0e3c63]' : 'opacity-70'} />
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">{tab.count}</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 border-r border-white/10 pr-3 mr-1">
                  {secondaryTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                      className={`p-2 rounded-lg transition-all duration-200 relative group/icon ${activeTab === tab.id ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`}
                    >
                      <tab.icon size={18} />
                      <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/icon:opacity-100 transition-all pointer-events-none -translate-y-1 group-hover/icon:translate-y-0 whitespace-nowrap z-50 shadow-xl font-black">
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
                        {tab.label}
                      </div>
                    </button>
                  ))}
                </div>
              </nav>
            )}

            {/* Profile Trigger */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <NotificationBell />
              
              <div className="relative" ref={profileRef}>
                <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 group/avatar relative">
                  <UserAvatar
                    name={user?.fullName || 'U'}
                    avatarPath={user?.avatar_path}
                    avatarUrl={user?.imageUrl}
                    size="md"
                    className="border-2 border-white/10 group-hover:border-sky-400 transition-all shadow-sm"
                  />
                </button>

                {isProfileOpen && (
                  <div className="absolute top-full left-0 mt-4 w-72 bg-white rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.25)] border border-gray-100 overflow-hidden animate-fade-in z-[100] text-gray-800">
                    <div className="p-8 bg-gradient-to-br from-[#0e3c63] to-[#164e7d] text-center relative">
                      <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: `url(${carbonFibre})` }}></div>
                      <div className="relative z-10">
                        <div className="relative inline-block mb-4">
                          <UserAvatar
                            name={user?.fullName || 'User'}
                            avatarPath={user?.avatar_path}
                            avatarUrl={user?.imageUrl}
                            size="lg" // Changed from 'md' to 'lg' to match original size
                            className="mx-auto ring-4 ring-white/20 shadow-2xl" // Added mx-auto for centering
                          />
                          <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full shadow-lg"></div>
                        </div>
                        <h4 className="font-black text-xl text-white leading-tight mb-1">{user?.fullName}</h4>
                        <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-sky-400/20 border border-sky-400/30 text-sky-100 text-[9px] font-black uppercase tracking-widest">{UserRoleLabels[user?.role as UserRole] || user?.role}</div>
                      </div>
                    </div>
                    <div className="p-3 space-y-1 bg-white">
                      {!user?.agentDetails?.isFrozen && (
                        <button onClick={() => { setActiveTab?.('profile'); setIsProfileOpen(false); }} className="w-full flex items-center justify-between px-4 py-3.5 text-xs font-black text-gray-700 hover:bg-gray-50 rounded-2xl transition-all group">
                          <div className="flex items-center gap-3"><div className="bg-sky-50 p-2 rounded-xl text-[#0e3c63] group-hover:scale-110 transition-transform"><Edit size={16} /></div>{t('common.edit_account')}</div>
                          <ChevronLeft size={14} className="opacity-20" />
                        </button>
                      )}
                      <button onClick={logout} className="w-full flex items-center justify-between px-4 py-3.5 text-xs font-black text-red-600 hover:bg-red-50 rounded-2xl transition-all group">
                        <div className="flex items-center gap-3"><div className="bg-red-100 p-2 rounded-xl text-red-500 group-hover:scale-110 transition-transform"><LogOut size={16} /></div>{t('common.logout')}</div>
                        <ChevronLeft size={14} className="opacity-20" />
                      </button>
                    </div>
                    <div className="bg-gray-50/80 p-4 border-t border-gray-100 flex flex-col items-center">
                      <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                        <Globe size={11} className="text-[#0e3c63]" />
                        <span className="font-mono text-gray-600 text-sm tracking-widest">{userIP}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {isStaff && (
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-white hover:bg-white/10 rounded-xl transition-all active:scale-90 bg-white/5 border border-white/10 shadow-inner">
                  {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isStaff && isMobileMenuOpen && setActiveTab && (
          <div className="fixed inset-0 top-16 bg-[#05111b] backdrop-blur-3xl z-[100] md:hidden animate-fade-in flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div>
                <h3 className="text-sky-300/30 text-[10px] font-black uppercase tracking-[0.4em] mb-4 mr-1">{t('layout.main_sections')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {primaryTabs.map((tab, idx) => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                      className={`flex flex-col items-center justify-center gap-3 p-5 rounded-[2rem] transition-all duration-300 relative border ${activeTab === tab.id ? 'bg-gradient-to-br from-sky-400 to-blue-600 text-white border-sky-300 shadow-2xl scale-105 z-10' : 'bg-white/5 text-sky-100 border-white/10 hover:bg-white/10'} ${tab.id === 'agents' ? 'col-span-2 sm:col-span-1' : ''}`}
                    >
                      <tab.icon size={26} />
                      <span className="text-[10px] font-black">{tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="absolute top-3 left-3 bg-red-500 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-white/20 animate-bounce">{tab.count}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sky-300/30 text-[10px] font-black uppercase tracking-[0.4em] mb-4 mr-1">{t('layout.management_reports')}</h3>
                <div className="grid grid-cols-1 gap-2">
                  {secondaryTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center justify-between gap-4 p-4 rounded-2xl transition-all border ${activeTab === tab.id ? 'bg-sky-500/20 text-sky-200 border-sky-400/30' : 'bg-white/5 text-sky-200/70 border-white/5 hover:bg-white/10'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl ${activeTab === tab.id ? 'bg-sky-400 text-white' : 'bg-sky-500/10'}`}><tab.icon size={18} /></div>
                        <span className="text-sm font-bold">{tab.label}</span>
                      </div>
                      <ChevronLeft size={16} className="opacity-20" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/5 bg-black/40 flex justify-between items-center">
              <button onClick={logout} className="flex items-center gap-3 text-red-400 font-black text-sm active:scale-95 transition-transform">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20"><LogOut size={20} /></div>
                {t('common.exit')}
              </button>
              <div className="flex items-center gap-2 text-sky-400/60 bg-sky-400/5 px-4 py-2 rounded-2xl border border-sky-400/10">
                <Globe size={14} /><span className="text-sm font-mono font-bold tracking-widest">{userIP}</span>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 lg:p-8 print:p-0 overflow-y-auto scrollbar-hide">
        <div className="animate-fade-in">{children}</div>
      </main>

      <footer className="py-8 text-center text-gray-400 text-[10px] font-black border-t border-gray-100 print:hidden uppercase tracking-[0.2em]">
        &copy; {new Date().getFullYear()} HIGH STAR CO. - VOGA ERP
      </footer>
    </div>
  );
};
