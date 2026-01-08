
import React, { useState, useRef } from 'react';
import { Camera, RefreshCw, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UserAvatar } from './UserAvatar';

interface AvatarUploaderProps {
    currentImageUrl?: string;
    currentAvatarPath?: string;
    onUploadComplete: (path: string, url: string) => void;
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
    currentImageUrl,
    currentAvatarPath,
    onUploadComplete,
    name,
    size = 'xl',
    className = ''
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setIsUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Upload to Supabase
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            onUploadComplete(filePath, publicUrl);
        } catch (error: any) {
            console.error('Error uploading avatar:', error.message);
            // Ideally use toast here if available, or just console error
            alert('فشل رفع الصورة: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const triggerUpload = () => fileInputRef.current?.click();

    return (
        <div className={`relative group inline-block ${className}`}>
            <div className={`relative rounded-full overflow-hidden border-4 border-white shadow-xl transition-all group-hover:shadow-2xl`}>
                <UserAvatar
                    name={name}
                    avatarUrl={currentImageUrl}
                    avatarPath={currentAvatarPath}
                    size={size}
                />

                {/* Overlay */}
                <div
                    onClick={triggerUpload}
                    className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-10"
                >
                    <Camera className="text-white drop-shadow-md" size={24} />
                </div>

                {/* Loading State */}
                {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                        <RefreshCw className="text-white animate-spin" size={24} />
                    </div>
                )}
            </div>

            <button
                type="button"
                onClick={triggerUpload}
                className="absolute bottom-0 right-0 bg-[#0e3c63] text-white p-2 rounded-xl shadow-lg hover:bg-blue-700 transition-all border-2 border-white z-30"
                title="تغيير الصورة"
            >
                <div className="relative">
                    <Upload size={16} />
                </div>
            </button>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
            />
        </div>
    );
};
