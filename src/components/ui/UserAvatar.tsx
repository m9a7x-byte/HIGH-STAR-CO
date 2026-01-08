import React from 'react';
import { useSignedAvatarUrl } from '../../hooks/useSignedAvatarUrl';

interface UserAvatarProps {
    avatarPath?: string;
    avatarUrl?: string; // Legacy/External
    name: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
    avatarPath,
    avatarUrl,
    name,
    className = '',
    size = 'md'
}) => {
    // Generate signed URL if we have a path
    const { signedUrl } = useSignedAvatarUrl(avatarPath);

    // Determine source: Signed URL > Legacy URL
    const src = signedUrl || avatarUrl;

    // Size mappings
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-16 h-16 text-xl',
        xl: 'w-24 h-24 text-3xl'
    };

    return (
        <div className={`relative rounded-full overflow-hidden flex-shrink-0 bg-blue-50 border border-gray-100 ${sizeClasses[size]} ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt={name}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-[#0e3c63]">
                    {name?.charAt(0)?.toUpperCase() || '?'}
                </div>
            )}
        </div>
    );
};
