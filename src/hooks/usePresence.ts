import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';
import { getPublicIP, getDetailedDeviceInfo } from '../lib/deviceUtils';

export const usePresence = (activeTab: string = 'dashboard', enabled: boolean = true) => {
    const { user } = useAuth();

    // Map internal tab IDs to Arabic readable names
    const getPageName = (tabId: string) => {
        return `tab:${tabId}`;
    };

    useEffect(() => {
        if (!user?.id || !enabled) return;

        const updateStatus = async () => {
            try {
                const ip = await getPublicIP();
                const deviceInfo = JSON.stringify(getDetailedDeviceInfo());
                const currentPath = getPageName(activeTab);

                await db.updatePresence(user.id, ip, deviceInfo, currentPath);
            } catch (err) {
                console.error('Presence Heartbeat Failed:', err);
            }
        };

        updateStatus();

        // Faster Heartbeat (30 seconds)
        const interval = setInterval(updateStatus, 30 * 1000);

        return () => {
            clearInterval(interval);
        };
    }, [user?.id, activeTab, enabled]);
};
