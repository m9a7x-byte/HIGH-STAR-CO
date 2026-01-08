import { UAParser } from 'ua-parser-js';

/**
 * Fetches the public IP address and location using DB-IP free API.
 * Returns formatted string "IP (City, Country)" or just IP.
 */
export async function getPublicIP(): Promise<string | null> {
    try {
        const response = await fetch('https://api.db-ip.com/v2/free/self');
        if (!response.ok) throw new Error('IP Fetch Failed');
        const data = await response.json();

        let ipString = data.ipAddress;
        if (data.city || data.stateProv) {
            const loc = [data.city, data.stateProv].filter(Boolean).join(', ');
            ipString += ` (${loc})`;
        }
        return ipString;
    } catch (e) {
        console.warn('Failed to fetch IP/Location, trying fallback...');
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            if (!response.ok) throw new Error('Fallback IP Fetch Failed');
            const data = await response.json();
            return data.ip;
        } catch (e2) {
            console.error('All IP fetch attempts failed', e2);
            return null;
        }
    }
}

export interface DetailedDeviceInfo {
    type: string;
    os: string;
    browser: string;
    deviceModel: string;
}

/**
 * Parses the User Agent string using UAParser.js to extract accurate device information.
 */
export function getDetailedDeviceInfo(): DetailedDeviceInfo {
    // @ts-ignore
    const parser = new (UAParser as any)();
    const result = parser.getResult();

    const type = result.device.type ?
        (result.device.type === 'mobile' ? 'Mobile' :
            result.device.type === 'tablet' ? 'Tablet' :
                result.device.type === 'smarttv' ? 'Smart TV' : 'Desktop')
        : 'Desktop';

    const os = result.os.name ? `${result.os.name} ${result.os.version || ''}` : 'Unknown OS';
    const browser = result.browser.name ? `${result.browser.name} ${result.browser.version || ''}` : 'Unknown Browser';

    let deviceModel = result.device.model ? `${result.device.vendor || ''} ${result.device.model}` : 'PC/Mac';

    // Heuristic fallback if model is empty but OS/Type suggests a generic category
    if (deviceModel === 'PC/Mac') {
        if (os.includes('iOS')) deviceModel = 'iPhone/iPad';
        else if (os.includes('Android')) deviceModel = 'Android Device';
        else if (os.includes('Windows')) deviceModel = 'Windows PC';
        else if (os.includes('Mac')) deviceModel = 'Mac';
    }

    return { type, os, browser, deviceModel };
}
