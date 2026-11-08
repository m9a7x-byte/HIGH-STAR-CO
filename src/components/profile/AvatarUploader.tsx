import i18n from 'i18next';
const t = i18n.t.bind(i18n);
import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { validateImageFile } from '../../lib/avatarUtils';
import { AvatarCropModal } from './AvatarCropModal';
import { useToast } from '../../context/ToastContext';
import { useSignedAvatarUrl } from '../../hooks/useSignedAvatarUrl';

interface AvatarUploaderProps {
    currentAvatarPath?: string; // Stored in DB as 'avatars/uid/filename.webp'
    currentAvatarUrl?: string; // Legacy public URL or external URL
    userName: string;
    onUploadSuccess: (path: string) => void;
    targetUserId?: string; // For admin uploads to other user's avatars
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({ currentAvatarPath, currentAvatarUrl, userName, onUploadSuccess, targetUserId }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cache Buster to force image reload after upload
    const [cacheBuster, setCacheBuster] = useState<number | undefined>(undefined);

    // Hooks
    const { signedUrl, loading: loadingSigned, error: signedError } = useSignedAvatarUrl(currentAvatarPath, cacheBuster);

    // Debug: Show error if fetching URL fails
    useEffect(() => {
        if (signedError) {
            console.error('Signed URL Error:', signedError);
            // Optional: toast.error(t('batch4.txt_tcf63z_6948'), signedError);
        }
    }, [signedError]);

    // UI State
    const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // If we have a signedUrl, use it. 
    // If not, fall back to currentAvatarUrl (legacy/external).
    // If neither, show placeholder.
    const displayUrl = signedUrl || currentAvatarUrl;

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const error = validateImageFile(file);
            if (error) {
                toast.error(t('batch4.txt_ti48wr_6948'), error);
                return;
            }

            // Create local preview for cropper
            const reader = new FileReader();
            reader.addEventListener('load', () => setSelectedImageSrc(reader.result as string));
            reader.readAsDataURL(file);

            // Clear input so selecting same file works again
            e.target.value = '';
        }
    };

    const handleCropComplete = async (blob: Blob) => {
        // Use targetUserId for admin uploads, otherwise use current user's ID
        const uploadUserId = targetUserId || user?.id;
        if (!uploadUserId) return;

        setIsUploading(true);
        setSelectedImageSrc(null); // Close modal

        try {
            const fileName = `avatar_${Date.now()}.webp`; // Unique name to bust cache
            const filePath = `${uploadUserId}/${fileName}`; // avatars/UID/avatar.webp

            // 1. Upload to Supabase Storage (Private 'avatars' bucket)
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob, {
                    upsert: true,
                    contentType: 'image/webp'
                });

            if (uploadError) {
                if (uploadError.message.includes('Bucket not found')) {
                    // This might happen if migration script didn't run.
                    throw new Error(t('batch4.txt_ofj1rn_6948'));
                }
                throw uploadError;
            }

            // 2. Notify Parent to update DB
            // Passing just the path inside the bucket
            onUploadSuccess(filePath);
            setCacheBuster(Date.now()); // Force refresh

            toast.success(t('batch4.txt_qci57l_6948'), t('batch4.txt_aa61rd_6948'));

        } catch (error: any) {
            console.error('Upload failed:', error);
            toast.error(t('batch4.txt_5gtxa2_6948'), t('batch4.txt_7c9zz2_6948'));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <>
            <div className="relative group cursor-pointer w-40 h-40 mx-auto" onClick={() => !isUploading && fileInputRef.current?.click()}>
                {/* Image Container */}
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl transform transition-all group-hover:scale-105 bg-white relative
                    ${isUploading ? 'opacity-80' : ''}`}>

                    {isUploading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-20">
                            {/* Loading Ring */}
                            <div className="w-12 h-12 border-4 border-[#0e3c63]/20 border-t-[#0e3c63] rounded-full animate-spin"></div>
                        </div>
                    ) : displayUrl ? (
                        <img
                            src={displayUrl}
                            alt={userName}
                            className="w-full h-full object-cover transition-opacity duration-300"
                        />
                    ) : (
                        <div className="w-full h-full bg-blue-50 text-[#0e3c63] flex items-center justify-center text-4xl font-black">
                            {userName.charAt(0)}
                        </div>
                    )}
                </div>

                {/* Overlay Icon */}
                {!isUploading && (
                    <div className="absolute inset-0 bg-black/30 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                        <Camera className="text-white drop-shadow-md" size={32} />
                    </div>
                )}

                {/* Edit Button Badge */}
                <div className="absolute -bottom-2 -right-2 p-2.5 bg-white rounded-xl shadow-lg border border-gray-100 text-[#0e3c63] group-hover:bg-[#0e3c63] group-hover:text-white transition-colors">
                    {isUploading ? <RefreshCw size={18} className="animate-spin" /> : <Camera size={18} />}
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={onFileSelect}
                />
            </div>

            <p className="text-[10px] text-gray-400 font-bold mt-4 text-center">
                JPG, PNG, WebP (Max 2MB)
            </p>

            {/* Crop Modal */}
            {selectedImageSrc && (
                <AvatarCropModal
                    imageSrc={selectedImageSrc}
                    onCancel={() => setSelectedImageSrc(null)}
                    onCropComplete={handleCropComplete}
                />
            )}
        </>
    );
};
