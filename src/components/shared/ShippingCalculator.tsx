
import React, { useState } from 'react';
import { Truck, Info } from 'lucide-react';
import { Card } from '../ui';
import { db } from '../../lib/db';

interface ShippingCalculatorProps {
    cartonCount: number;
    bagCount?: number;
}

export const ShippingCalculator = ({ cartonCount, bagCount = 0 }: ShippingCalculatorProps) => {
  const [selectedType, setSelectedType] = useState<'kia' | 'canter' | 'trailer'>('kia');
  const config = db.vehicleConfig;

  let label = '';
  let capacity = 0;

  switch(selectedType) {
    case 'kia': 
      capacity = config.kiaCapacity;
      label = 'أتيكو';
      break;
    case 'canter': 
      capacity = config.canterCapacity;
      label = 'حاوية';
      break;
    case 'trailer': 
      capacity = config.trailerCapacity;
      label = 'تريلة';
      break;
  }

  // Conversion Logic: 80 Bags = 5 Cartons space
  // Ratio: 5 / 80 = 0.0625 cartons per bag
  const BAG_TO_CARTON_RATIO = 0.0625;
  const bagEquivalentInCartons = bagCount * BAG_TO_CARTON_RATIO;
  
  const totalUnits = cartonCount + bagEquivalentInCartons;
  
  const needed = totalUnits / capacity;
  const count = Math.ceil(needed) || 0;
  const percentage = count > 0 ? Math.min((totalUnits / (count * capacity)) * 100, 100) : 0;

  const vehicleOptions = [
    { id: 'kia', label: 'أتيكو', cap: config.kiaCapacity }, 
    { id: 'canter', label: 'حاوية', cap: config.canterCapacity }, 
    { id: 'trailer', label: 'تريلة', cap: config.trailerCapacity }
  ];

  return (
    <Card className="p-5 bg-white border border-gray-100 shadow-sm mt-6">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
        <div className="bg-blue-50 p-1.5 rounded-lg text-[#0e3c63]">
            <Truck size={18}/>
        </div>
        <h4 className="font-bold text-gray-800 text-sm">حاسبة الشحن</h4>
      </div>

      {/* Prominent Unit Count */}
      <div className="bg-gradient-to-br from-[#0e3c63] to-[#1a4d7a] rounded-xl p-4 mb-2 text-center text-white shadow-md relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-white opacity-10 rounded-full"></div>
          <p className="text-[10px] text-blue-200 font-bold mb-2 uppercase tracking-widest">إجمالي الحجم المحتسب</p>
          
          <div className="flex justify-around items-end gap-2">
              <div className="flex flex-col items-center">
                  <span className="text-2xl font-black font-mono tracking-tighter">{cartonCount > 0 ? cartonCount.toFixed(1) : '0'}</span>
                  <span className="text-[10px] font-bold text-blue-200">كرتون</span>
              </div>
              {bagCount > 0 && (
                  <>
                    <div className="text-xl font-bold text-blue-300 pb-2">+</div>
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-black font-mono tracking-tighter">{bagCount}</span>
                        <span className="text-[10px] font-bold text-blue-200">كيس</span>
                    </div>
                  </>
              )}
          </div>
      </div>

      {/* Conversion Note */}
      <div className="text-center mb-4">
          <p className="text-[10px] text-gray-500 bg-gray-50 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-100">
              <Info size={12} className="text-[#0e3c63]"/>
              <span>كل <strong>80 كيس</strong> يأخذ مساحة <strong>5 كارتون</strong></span>
          </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {vehicleOptions.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedType(t.id as any)}
            className={`py-3 rounded-xl transition-all border flex flex-col items-center justify-center gap-1 ${selectedType === t.id ? 'bg-blue-50 text-[#0e3c63] border-[#0e3c63] shadow-md ring-2 ring-blue-100/50' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-200 hover:bg-gray-50'}`}
          >
            <span className="text-xs font-black">{t.label}</span>
            <span className={`text-[11px] font-mono font-black ${selectedType === t.id ? 'text-[#0e3c63]' : 'text-gray-400'}`}>{t.cap}</span>
          </button>
        ))}
      </div>

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center shadow-inner">
        <p className="text-gray-400 text-[10px] mb-1 font-black uppercase tracking-widest">المركبات المطلوبة</p>
        <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-3xl font-black text-[#0e3c63] font-mono tracking-tighter">{count}</span>
            <span className="text-sm font-black text-gray-600">{label}</span>
        </div>
        
        {/* Progress Bar for last vehicle fill */}
        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden shadow-inner border border-gray-100">
           <div 
             className={`h-full transition-all duration-700 ${percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-orange-500' : 'bg-green-500'}`} 
             style={{ width: `${percentage}%` }}
           ></div>
        </div>
        <div className="flex justify-between items-center mt-2 px-1">
            <span className={`text-[11px] font-black ${percentage >= 90 ? 'text-red-600' : 'text-gray-600'}`}>الامتلاء: {percentage.toFixed(0)}%</span>
            <span className="text-[10px] text-gray-400 font-mono font-bold">سعة: {capacity}</span>
        </div>
      </div>
    </Card>
  );
};
