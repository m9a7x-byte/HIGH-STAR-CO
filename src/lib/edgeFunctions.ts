import { supabase } from './supabase';

interface AdminActionResponse {
    data?: any;
    error?: string;
    success?: boolean;
    confirmationPending?: boolean;
}

export const invokeAdminAction = async (action: string, payload: any): Promise<AdminActionResponse> => {
    try {
        console.log(`Invoking Edge Function: admin-actions (${action})`);

        const { data, error } = await supabase.functions.invoke('admin-actions', {
            body: { action, payload }
        });

        if (error) {
            console.error(`Edge Function Invoke Error:`, error);
            // Handle specific HttpError from Supabase client
            if (error instanceof Error && error.message.includes('401')) {
                return { error: 'Authentication failed. Please login again. (401)' };
            }
            return { error: error.message || 'Function invocation failed' };
        }

        // Logic Error (200 OK but success: false)
        if (data?.error || data?.success === false) {
            console.error(`Edge Function Logic Error:`, data);
            return { error: data.error || 'Unknown operation error' };
        }

        return { data, success: true };

    } catch (err: any) {
        console.error(`Unexpected Error (${action}):`, err);
        return { error: err.message || 'Network connectivity error' };
    }
};
