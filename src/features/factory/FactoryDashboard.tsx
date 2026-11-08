import { useTranslation } from 'react-i18next';

import React, { useState, useEffect, useCallback } from 'react';
import { Factory, Truck, DollarSign, Box, BarChart3, Users } from 'lucide-react';
import { FactoryCategory, MaterialType, FactoryTransaction } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/db';

// Import Specialized Modals
import { InventoryModal } from './components/InventoryModal';
import { ExpenseModal } from './components/ExpenseModal';
import { LogisticsModal } from './components/LogisticsModal';
import { SupplierModal } from './components/SupplierModal';
import { EditFinanceModal } from './components/EditFinanceModal';

// Import Tabs
import { OverviewTab } from './tabs/OverviewTab';
import { InventoryTab } from './tabs/InventoryTab';
import { ExpensesTab } from './tabs/ExpensesTab';
import { LogisticsTab } from './tabs/LogisticsTab';
import { SuppliersTab } from './tabs/SuppliersTab';

export const FactoryDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INVENTORY' | 'EXPENSES' | 'SUPPLIERS' | 'LOGISTICS'>('OVERVIEW');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<FactoryCategory | 'EDIT_FINANCE'>('DAILY_EXPENSE');
  const [initialMaterial, setInitialMaterial] = useState<MaterialType | undefined>(undefined);
  const [selectedTx, setSelectedTx] = useState<FactoryTransaction | null>(null);
  
  // نظام التحديث التلقائي
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(prev => prev + 1), []);

  useEffect(() => {
    const unsubscribe = db.subscribe(refresh);
    return () => unsubscribe();
  }, [refresh]);

  const tabs = [
    { id: 'OVERVIEW', label: t('batch4.k672'), icon: BarChart3 },
    { id: 'INVENTORY', label: t('batch4.k673'), icon: Box },
    { id: 'EXPENSES', label: t('batch4.k674'), icon: DollarSign },
    { id: 'SUPPLIERS', label: t('batch4.k675'), icon: Users },
    { id: 'LOGISTICS', label: t('batch4.k676'), icon: Truck },
  ];

  const handleOpenModal = (cat: any, metadata?: any) => {
      if (cat === 'EDIT_FINANCE') {
          setSelectedTx(metadata.tx);
          setModalCategory('EDIT_FINANCE');
      } else {
          setSelectedTx(metadata?.tx || null);
          setModalCategory(cat);
          setInitialMaterial(metadata?.material);
      }
      setModalOpen(true);
  };

  const handleCloseModal = () => {
      setModalOpen(false);
      setSelectedTx(null);
      setInitialMaterial(undefined);
  };

  const renderActiveModal = () => {
      if (!modalOpen) return null;

      if (modalCategory === 'EDIT_FINANCE' && selectedTx) {
          return <EditFinanceModal isOpen={modalOpen} transaction={selectedTx} onClose={handleCloseModal} onSuccess={() => { refresh(); handleCloseModal(); }} />;
      }

      if (modalCategory === 'INVENTORY') {
          return <InventoryModal isOpen={modalOpen} onClose={handleCloseModal} onSuccess={() => { refresh(); handleCloseModal(); }} initialMaterial={initialMaterial} transaction={selectedTx || undefined} />;
      }

      if (modalCategory === 'SUPPLIER') {
          return <SupplierModal isOpen={modalOpen} onClose={handleCloseModal} onSuccess={() => { refresh(); handleCloseModal(); }} transaction={selectedTx || undefined} />;
      }
      
      if (['SALARY', 'RENT', 'FOOD', 'DAILY_EXPENSE', 'ELECTRICITY'].includes(modalCategory as string)) {
          return <ExpenseModal isOpen={modalOpen} category={modalCategory as any} onClose={handleCloseModal} onSuccess={() => { refresh(); handleCloseModal(); }} transaction={selectedTx || undefined} />;
      }

      if (['TRANSPORT_IN', 'TRANSPORT_OUT', 'CUSTOMS'].includes(modalCategory as string)) {
          return <LogisticsModal isOpen={modalOpen} category={modalCategory as any} onClose={handleCloseModal} onSuccess={() => { refresh(); handleCloseModal(); }} transaction={selectedTx || undefined} />;
      }

      return null;
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in pb-20">
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-3 md:p-4 shadow-sm border border-gray-100 flex flex-col xl:flex-row justify-between items-center gap-4">
         <div className="flex items-center gap-3 px-2 w-full xl:w-auto shrink-0">
             <div className="bg-[#0e3c63] text-white p-2.5 rounded-xl shadow-lg"><Factory size={20}/></div>
             <div><h2 className="text-lg md:text-2xl font-black text-gray-800 whitespace-nowrap">{t('batch4.k677')}</h2></div>
         </div>
         <div className="flex bg-gray-50 p-1 rounded-2xl w-full xl:w-auto overflow-x-auto border border-gray-100 no-scrollbar">
             {tabs.map(tab => (
                 <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] md:text-sm font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-[#0e3c63] shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}><tab.icon size={14} className={activeTab === tab.id ? 'text-blue-500' : ''}/>{tab.label}</button>
             ))}
         </div>
      </div>
      <div className="min-h-[500px]">
          {activeTab === 'OVERVIEW' && <OverviewTab refreshTrigger={refreshKey} />}
          {activeTab === 'INVENTORY' && <InventoryTab refreshTrigger={refreshKey} onOpenModal={handleOpenModal} />}
          {activeTab === 'EXPENSES' && <ExpensesTab refreshTrigger={refreshKey} onOpenModal={handleOpenModal} />}
          {activeTab === 'SUPPLIERS' && <SuppliersTab refreshTrigger={refreshKey} onOpenModal={handleOpenModal} />}
          {activeTab === 'LOGISTICS' && <LogisticsTab refreshTrigger={refreshKey} onOpenModal={handleOpenModal} />}
      </div>
      {renderActiveModal()}
    </div>
  );
};

