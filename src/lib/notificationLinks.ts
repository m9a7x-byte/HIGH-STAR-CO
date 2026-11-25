export function notificationActionUrl(value: string | null | undefined, origin: string): string | null {
    if (!value?.trim()) return null;
    try {
        const url = new URL(value, origin);
        return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
}
