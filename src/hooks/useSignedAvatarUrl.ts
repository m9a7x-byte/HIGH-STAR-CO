import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Global memory cache to prevent flickering
// Key: avatarPath, Value: { url: string, expiresAt: number }
const urlCache = new Map<string, { url: string, expiresAt: number }>();

export const useSignedAvatarUrl = (avatarPath: string | undefined | null, cacheBuster?: number) => {
    const [signedUrl, setSignedUrl] = useState<string | null>(() => {
        // Initial state from cache if available and valid
        if (avatarPath && !cacheBuster) {
            const cached = urlCache.get(avatarPath);
            if (cached && cached.expiresAt > Date.now()) {
                return cached.url;
            }
        }
        // If legacy URL, use it immediately
        if (avatarPath && avatarPath.startsWith('http')) {
            return avatarPath;
        }
        return null;
    });

    const [loading, setLoading] = useState(() => {
        // If we have a cached URL or legacy URL, we are not loading
        if (avatarPath && !cacheBuster) {
            const cached = urlCache.get(avatarPath);
            if (cached && cached.expiresAt > Date.now()) return false;
        }
        if (avatarPath && avatarPath.startsWith('http')) return false;
        return !!avatarPath; // Loading only if we need to fetch
    });

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchSignedUrl = async () => {
            if (!avatarPath) {
                if (isMounted) {
                    setSignedUrl(null);
                    setLoading(false);
                }
                return;
            }

            // Legacy Support
            if (avatarPath.startsWith('http')) {
                if (isMounted) {
                    setSignedUrl(avatarPath);
                    setLoading(false);
                }
                return;
            }

            // Check Cache again (in case re-render happened or cacheBuster changed)
            if (!cacheBuster) {
                const cached = urlCache.get(avatarPath);
                if (cached && cached.expiresAt > Date.now()) {
                    if (isMounted) {
                        setSignedUrl(cached.url);
                        setLoading(false);
                    }
                    return;
                }
            }

            if (isMounted) {
                setLoading(true);
                setError(null);
            }

            try {
                const { data, error } = await supabase.storage
                    .from('avatars')
                    .createSignedUrl(avatarPath, 3600); // 1 hour

                if (error) {
                    console.error('Error signing URL:', error);
                    if (isMounted) setError(error.message);
                } else if (data) {
                    // Append cachebuster to the signed URL if provided
                    const finalUrl = cacheBuster
                        ? `${data.signedUrl}&t=${cacheBuster}`
                        : data.signedUrl;

                    // Update Cache (only if no cacheBuster, as cacheBuster implies explicit refresh)
                    if (!cacheBuster) {
                        urlCache.set(avatarPath, {
                            url: finalUrl,
                            expiresAt: Date.now() + (55 * 60 * 1000) // Cache for 55 mins (slightly less than token)
                        });
                    }

                    if (isMounted) setSignedUrl(finalUrl);
                }
            } catch (err: any) {
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchSignedUrl();

        return () => { isMounted = false; };
    }, [avatarPath, cacheBuster]);

    return { signedUrl, loading, error };
};
