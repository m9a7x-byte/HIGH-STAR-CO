import i18n from 'i18next';
const t = i18n.t.bind(i18n);

import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, RefreshCw, Upload, Image as ImageIcon, Trash2, X, ZoomIn, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import getCroppedImg from '../../lib/canvasUtils';

interface SettingsImageUploaderProps {
    label: string;
    description?: string;
    currentUrl?: string;
    onUpload: (url: string) => void;
    className?: string;
}

export const SettingsImageUploader: React.FC<SettingsImageUploaderProps> = ({
    label,
    description,
    currentUrl,
    onUpload,
    className = ''
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [imageSrc, setImageSrc] = useState<string | null>(null);

    // Cropper State
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [aspect, setAspect] = useState<number | undefined>(undefined);
    const [naturalAspect, setNaturalAspect] = useState<number>(1); // Store natural aspect
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const onMediaLoaded = (mediaSize: any) => {
        const r = mediaSize.naturalWidth / mediaSize.naturalHeight;
        setNaturalAspect(r);
        setAspect(r); // Default to natural
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const imageDataUrl = await readFile(file);
        setImageSrc(imageDataUrl);
        setModalOpen(true);
        e.target.value = '';
    };

    const handleExistingImageClick = () => {
        if (!currentUrl) {
            triggerUpload();
        } else {
            setImageSrc(currentUrl);
            setModalOpen(true);
        }
    };

    const readFile = (file: File) => {
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result as string));
            reader.readAsDataURL(file);
        });
    };

    const handleSaveCrop = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setIsUploading(true);

        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!croppedImageBlob) throw new Error('Failed to crop image');

            // Path: avatars/settings/settings_xxxxx.png
            const fileExt = 'png';
            const fileName = `settings_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to 'avatars' bucket
            // Upload to 'avatars' bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedImageBlob, { upsert: true });

            if (uploadError) throw uploadError;

            // Generate Signed URL (valid for 10 years ~ 315360000 seconds)
            // Since the bucket is private, we need a signed URL for access.
            // We set a very long expiry since these are static setting assets.
            const { data, error: signedUrlError } = await supabase.storage
                .from('avatars')
                .createSignedUrl(filePath, 315360000);

            if (signedUrlError) throw signedUrlError;

            onUpload(data.signedUrl);
            setModalOpen(false);
            setImageSrc(null);
        } catch (error: any) {
            console.error('Error uploading image:', error.message);
            alert('فشل رفع الصورة: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!currentUrl) return;
        if (!window.confirm('هل أنت متأكد من حذف الصورة نهائياً من السيرفر؟')) return;

        setIsUploading(true);
        try {
            // Extract filename from URL (works for both public and signed URLs)
            // Format: .../avatars/filename.png?token=...
            const urlParts = currentUrl.split('/avatars/');
            if (urlParts.length >= 2) {
                const fileName = urlParts[1].split('?')[0]; // Remove query params

                const { error } = await supabase.storage
                    .from('avatars')
                    .remove([fileName]);

                if (error) {
                    console.error('Error removing file:', error);
                    // We continue to clear the URL even if storage delete fails (consistency)
                }
            }

            onUpload('');
        } catch (error: any) {
            console.error('Error deleting image:', error.message);
            alert('فشل حذف الصورة: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const triggerUpload = () => fileInputRef.current?.click();

    // Helper to check if current aspect is close to natural
    const isNatural = aspect && Math.abs(aspect - naturalAspect) < 0.01;

    return (
        <>
            <div className={`space-y-3 ${className}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <ImageIcon size={14} className="text-blue-500" /> {label}
                        </label>
                        {description && <p className="text-[10px] text-gray-300 font-bold mt-1">{description}</p>}
                    </div>
                    {currentUrl && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleDelete}
                                disabled={isUploading}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title={t('batch4.k137')}
                            >
                                <Trash2 size={14} />
                            </button>
                            <button
                                onClick={triggerUpload}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-bold"
                            >
                                <Upload size={14} />
                                <span>{t('batch4.k138')}</span>
                            </button>
                        </div>
                    )}
                </div>

                <div
                    onClick={handleExistingImageClick}
                    className={`relative w-full h-32 rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden group
                    ${!currentUrl ? 'border-gray-200 hover:border-blue-300 hover:bg-gray-50' : 'border-dotted border-gray-300'}
                    `}
                >
                    {currentUrl ? (
                        <>
                            <img
                                src={currentUrl}
                                alt={label}
                                className="w-full h-full object-contain bg-gray-50/50 p-2"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <ZoomIn className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg transform scale-75 group-hover:scale-100 transition-all" size={32} />
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                            <ImageIcon size={32} className="opacity-20" />
                            <span className="text-xs font-bold opacity-50">{t('batch4.k139')}</span>
                        </div>
                    )}
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                />
            </div>

            {/* CROP MODAL */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <RefreshCw size={18} className="text-blue-600" />
                                تعديل وقص الصورة
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cropper Area */}
                        <div className="relative w-full h-80 sm:h-96 bg-gray-900 border-b border-gray-100">
                            {imageSrc && (
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={aspect || 4 / 3}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={onCropComplete}
                                    onMediaLoaded={onMediaLoaded}
                                />
                            )}
                        </div>

                        {/* Controls */}
                        <div className="p-6 space-y-6">

                            {/* Aspect Ratio Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 block">{t('batch4.k140')}</label>
                                <div className="flex flex-wrap bg-gray-100 p-1 rounded-xl gap-1">
                                    <button
                                        onClick={() => setAspect(naturalAspect)}
                                        className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-all ${isNatural ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        كاملة (أصلية)
                                    </button>
                                    <button
                                        onClick={() => setAspect(3 / 1)}
                                        className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-all ${aspect === 3 / 1 ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        بانوراما (3:1)
                                    </button>
                                    <button
                                        onClick={() => setAspect(4 / 1)}
                                        className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-all ${aspect === 4 / 1 ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        عريض (4:1)
                                    </button>
                                    <button
                                        onClick={() => setAspect(16 / 9)}
                                        className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-all ${aspect === 16 / 9 ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        يوتيوب (16:9)
                                    </button>
                                    <button
                                        onClick={() => setAspect(1)}
                                        className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-all ${aspect === 1 ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        مربع (1:1)
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-black text-gray-500">
                                    <span>{t('batch4.k141')}</span>
                                    <span>{zoom.toFixed(1)}x</span>
                                </div>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0e3c63]"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleSaveCrop}
                                    disabled={isUploading}
                                    className="flex-[2] py-3 bg-[#0e3c63] text-white font-bold rounded-xl hover:bg-[#1a4d7a] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                >
                                    {isUploading ? (
                                        <>
                                            <RefreshCw size={18} className="animate-spin text-blue-200" />
                                            <span>{t('batch4.k142')}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={18} />
                                            <span>{t('batch4.k143')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
