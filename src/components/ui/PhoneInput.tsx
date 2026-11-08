import i18n from 'i18next';
const t = i18n.t.bind(i18n);
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Country {
    code: string;
    name: string;
    dial_code: string;
    flag: string;
}

// Common countries + Iraq focused
const COUNTRIES: Country[] = [
    { code: 'IQ', name: t('batch4.txt_l5ggee_6960'), dial_code: '+964', flag: '🇮🇶' },
    { code: 'SA', name: t('batch4.txt_z6l7ip_6960'), dial_code: '+966', flag: '🇸🇦' },
    { code: 'AE', name: t('batch4.txt_mygqff_6960'), dial_code: '+971', flag: '🇦🇪' },
    { code: 'KW', name: t('batch4.txt_ho4q2v_6960'), dial_code: '+965', flag: '🇰🇼' },
    { code: 'QA', name: t('batch4.txt_ee9nwt_6960'), dial_code: '+974', flag: '🇶🇦' },
    { code: 'BH', name: t('batch4.txt_whvo8s_6960'), dial_code: '+973', flag: '🇧🇭' },
    { code: 'OM', name: t('batch4.txt_kvdjiv_6960'), dial_code: '+968', flag: '🇴🇲' },
    { code: 'JO', name: t('batch4.txt_l3qqpt_6960'), dial_code: '+962', flag: '🇯🇴' },
    { code: 'LB', name: t('batch4.txt_22iz5c_6960'), dial_code: '+961', flag: '🇱🇧' },
    { code: 'EG', name: t('batch4.txt_p7jvtu_6960'), dial_code: '+20', flag: '🇪🇬' },
    { code: 'TR', name: t('batch4.txt_mp4gmv_6960'), dial_code: '+90', flag: '🇹🇷' },
    { code: 'IR', name: t('batch4.txt_w6lbqn_6960'), dial_code: '+98', flag: '🇮🇷' },
    { code: 'US', name: t('batch4.txt_1mv33q_6960'), dial_code: '+1', flag: '🇺🇸' },
    { code: 'GB', name: t('batch4.txt_h0e59q_6960'), dial_code: '+44', flag: '🇬🇧' },
    { code: 'DE', name: t('batch4.txt_cq8r25_6960'), dial_code: '+49', flag: '🇩🇪' },
    { code: 'FR', name: t('batch4.txt_wfry4i_6960'), dial_code: '+33', flag: '🇫🇷' },
    { code: 'CN', name: t('batch4.txt_y619fs_6960'), dial_code: '+86', flag: '🇨🇳' },
    { code: 'IN', name: t('batch4.txt_akschd_6960'), dial_code: '+91', flag: '🇮🇳' },
    // Add more as needed
];

interface PhoneInputProps {
    value?: string;
    onChange?: (value: string) => void;
    label?: string;
    error?: string;
    placeholder?: string;
    className?: string;
    name?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, label, error, placeholder, className, name }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    // Parse initial value to find country
    const initialCountry = COUNTRIES.find(c => value?.startsWith(c.dial_code)) || COUNTRIES[0];
    const [selectedCountry, setSelectedCountry] = useState<Country>(initialCountry);

    // Extract number part
    const initialNumber = value?.replace(initialCountry.dial_code, '').trim() || '';
    const [phoneNumber, setPhoneNumber] = useState(initialNumber);

    // Sync state with value prop when it changes (fixes first load issue)
    useEffect(() => {
        if (value) {
            const country = COUNTRIES.find(c => value.startsWith(c.dial_code)) || COUNTRIES[0];
            const number = value.replace(country.dial_code, '').trim();
            setSelectedCountry(country);
            setPhoneNumber(number);
        } else {
            setPhoneNumber('');
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Update parent when country or number changes
    const updateValue = (country: Country, number: string) => {
        const cleanNumber = number.replace(/\D/g, ''); // Remove non-digits
        if (onChange) {
            if (cleanNumber) {
                onChange(`${country.dial_code}${cleanNumber}`);
            } else {
                onChange(''); // Empty if no number
            }
        }
    };

    const handleCountrySelect = (country: Country) => {
        setSelectedCountry(country);
        setIsOpen(false);
        setSearch('');
        updateValue(country, phoneNumber);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Allow only number characters
        if (!/^\d*$/.test(val)) return;

        setPhoneNumber(val);
        updateValue(selectedCountry, val);
    };

    // Hidden input for form submission
    const fullValue = phoneNumber ? `${selectedCountry.dial_code}${phoneNumber}` : '';

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial_code.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && <label className="block text-sm font-bold text-gray-700">{label}</label>}

            <div className="relative" ref={dropdownRef}>
                {/* Visual Container with Overflow Hidden */}
                <div className={`flex rtl:flex-row-reverse bg-gray-50 border-2 border-gray-200 rounded-xl focus-within:border-[#0e3c63] transition-colors duration-200 overflow-hidden ${error ? '!border-rose-400 !bg-rose-50/50' : ''}`}>
                    {/* Hidden input for native form data */}
                    <input type="hidden" name={name} value={fullValue || ''} />

                    {/* Country Selector */}
                    <button
                        ref={buttonRef}
                        type="button"
                        onClick={() => {
                            if (!isOpen && buttonRef.current) {
                                const rect = buttonRef.current.getBoundingClientRect();
                                setDropdownPos({ top: rect.bottom + 8, left: rect.left });
                            }
                            setIsOpen(!isOpen);
                        }}
                        className="flex items-center gap-2 px-4 py-4 bg-transparent hover:bg-gray-200/50 transition-colors rounded-s-xl outline-none"
                    >
                        <img
                            src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`}
                            srcSet={`https://flagcdn.com/w80/${selectedCountry.code.toLowerCase()}.png 2x`}
                            width="24"
                            alt={selectedCountry.name}
                            className="rounded-sm object-cover shadow-sm"
                        />
                        <span dir="ltr" className="text-sm font-bold text-gray-600 font-mono">{selectedCountry.dial_code}</span>
                        <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {/* Phone Input */}
                    <input
                        type="text"
                        value={phoneNumber}
                        onChange={handleNumberChange}
                        className="flex-1 w-full px-4 py-4 bg-transparent border-none focus:ring-0 text-gray-900 text-base placeholder-gray-400 font-mono text-left dir-ltr outline-none"
                        placeholder={placeholder || '7xxx xxx xxx'}
                        dir="ltr"
                    />
                </div>

                {/* Dropdown Menu via Portal */}
                {isOpen && ReactDOM.createPortal(
                    <div
                        ref={dropdownRef}
                        className="fixed w-72 max-h-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-[99999] overflow-hidden flex flex-col animate-fade-in"
                        style={{ top: dropdownPos.top, left: dropdownPos.left }}
                    >
                        <div className="p-3 border-b border-gray-50 bg-gray-50/30">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('batch4.txt_vkwxml_6960')}
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0e3c63] transition-colors text-right"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                            {filteredCountries.map((country) => (
                                <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => handleCountrySelect(country)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors hover:bg-gray-50 ${selectedCountry.code === country.code ? 'bg-[#0e3c63]/5 text-[#0e3c63] font-bold' : 'text-gray-700'}`}
                                >
                                    <span className={`fi fi-${country.code.toLowerCase()} text-xl shadow-sm rounded-sm`} />
                                    <span className="flex-1 text-left">{country.name}</span>
                                    <span className="text-gray-400 text-xs font-mono">{country.dial_code}</span>
                                    {selectedCountry.code === country.code && <Check size={14} className="text-[#0e3c63]" />}
                                </button>
                            ))}
                            {filteredCountries.length === 0 && (
                                <div className="p-4 text-center text-gray-400 text-sm">{t('batch4.txt_qu3bmh_6960')}</div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
};
