
import React from 'react';

// Badge Component
// FIX: Added className property to the Badge props type and implementation to allow custom Tailwind classes
export const Badge = ({ children, color, className = '' }: { children?: React.ReactNode, color: string, className?: string }) => {
  const colors: Record<string, string> = {
    green: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    blue: 'bg-blue-100 text-[#0e3c63] border border-blue-200',
    yellow: 'bg-amber-100 text-amber-800 border border-amber-200',
    orange: 'bg-orange-100 text-orange-800 border border-orange-200', // Added Orange
    red: 'bg-red-100 text-red-800 border border-red-200',
    gray: 'bg-gray-100 text-gray-800 border border-gray-200',
    dark: 'bg-[#0e3c63] text-white border border-[#0e3c63]',
  };
  return <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm ${colors[color] || colors.gray} ${className}`}>{children}</span>;
};

// Button Component
export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }: any) => {
  const base = "font-bold rounded-xl transition-all duration-200 transform hover:-translate-y-1 shadow-md hover:shadow-xl flex items-center justify-center gap-2";
  const variants: any = {
    primary: "bg-[#0e3c63] text-white hover:bg-[#1c5c8e] py-3 px-6",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 py-3 px-6",
    danger: "bg-red-500 text-white hover:bg-red-600 py-3 px-6",
    ghost: "bg-transparent text-gray-500 hover:text-[#0e3c63] shadow-none hover:shadow-none hover:bg-gray-100 py-2 px-4"
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed transform-none' : ''} ${className}`}>
      {children}
    </button>
  );
};

// Input Component
export const Input = (props: any) => (
  <div className="mb-4">
    {props.label && <label className="block text-sm font-bold text-gray-700 mb-2">{props.label}</label>}
    <input
      {...props}
      className={`w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 text-gray-900 text-base rounded-xl focus:outline-none focus:border-[#0e3c63] focus:ring-0 transition-colors duration-200 ${props.className}`}
    />
  </div>
);

// Select Component
export const Select = (props: any) => (
  <div className="mb-4">
    {props.label && <label className="block text-sm font-bold text-gray-700 mb-2">{props.label}</label>}
    <select
      {...props}
      className={`w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 text-gray-900 text-base rounded-xl focus:outline-none focus:border-[#0e3c63] focus:ring-0 transition-colors duration-200 ${props.className}`}
    >
      {props.children}
    </select>
  </div>
);

// Card Component
export const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

export { DateRangePicker } from './DateRangePicker';
export * from './UserAvatar';
export * from './PhoneInput';
export * from './AvatarUploader';
export * from './Tooltip';
export * from './SettingsImageUploader';
