import type { User } from '../types';

export const isVisibleStaffAccount = (user: Pick<User, 'role' | 'status' | 'deleted_at' | 'email'>): boolean => {
    if (user.role === 'AGENT') return false;
    if (!user.deleted_at) return true;

    // Older staff freezes set deleted_at; permanent archival also replaces the email.
    const email = user.email?.trim().toLowerCase();
    return user.status === 'suspended' && !!email && !email.endsWith('@voga.deleted');
};
