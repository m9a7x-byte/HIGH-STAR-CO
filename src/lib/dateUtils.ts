export const TIMEZONE = 'Asia/Baghdad';
export const LOCALE = 'ar-IQ';

/**
 * Formats a date string, number, or Date object into a localized date string.
 * Enforces 'Asia/Baghdad' timezone by default.
 */
export const formatDate = (date: string | number | Date, options: Intl.DateTimeFormatOptions = {}) => {
    if (!date) return '-';
    const d = new Date(date);
    // Default options can be overridden
    const defaultOptions: Intl.DateTimeFormatOptions = {
        timeZone: TIMEZONE,
        // You can add other defaults here if needed, e.g. year: 'numeric', month: 'long', day: 'numeric'
        ...options
    };
    return d.toLocaleDateString(LOCALE, defaultOptions);
};

/**
 * Formats a date string, number, or Date object into a localized time string.
 * Enforces 'Asia/Baghdad' timezone by default.
 */
export const formatTime = (date: string | number | Date, options: Intl.DateTimeFormatOptions = {}) => {
    if (!date) return '-';
    const d = new Date(date);
    const defaultOptions: Intl.DateTimeFormatOptions = {
        timeZone: TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        ...options
    };
    return d.toLocaleTimeString(LOCALE, defaultOptions);
};

/**
 * Formats a date string, number, or Date object into a localized date and time string.
 * Enforces 'Asia/Baghdad' timezone by default.
 */
export const formatDateTime = (date: string | number | Date, options: Intl.DateTimeFormatOptions = {}) => {
    if (!date) return '-';
    const d = new Date(date);
    const defaultOptions: Intl.DateTimeFormatOptions = {
        timeZone: TIMEZONE,
        ...options
    };
    return d.toLocaleString(LOCALE, defaultOptions);
};

/**
 * Returns the current date as a string (YYYY-MM-DD) in the application's timezone ('Asia/Baghdad').
 * precise logic to avoid "yesterday" issues due to UTC vs Local time offsets.
 */
export const getTodayDateString = () => {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(new Date());
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error('Date format error:', e);
        // Fallback to manual UTC+3 calculation for Baghdad
        const now = new Date();
        const baghdadOffset = 3 * 60; // Baghdad is UTC+3 in minutes
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const baghdadTime = new Date(utc + (baghdadOffset * 60000));
        return baghdadTime.toISOString().split('T')[0];
    }
};

/**
 * Returns the first day of the current month as a string (YYYY-MM-01) in the application's timezone.
 */
export const getFirstDayOfMonthString = () => {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(new Date());
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        return `${year}-${month}-01`;
    } catch (e) {
        console.error('Date format error:', e);
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }
};
