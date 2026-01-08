import { supabase } from './supabase';

interface AdminActionResponse {
    data?: any;
    error?: string;
    success?: boolean;
    confirmationPending?: boolean;
}

export const invokeAdminAction = async (action: string, payload: any): Promise<AdminActionResponse> => {
    try {
        // 1. Get Session Token Manually
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            console.error('Invoke Error: No active session');
            return { error: 'No active session. Please login again.' };
        }

        // 2. Prepare URL & Keys
        const projectUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const functionUrl = `${projectUrl}/functions/v1/admin-actions`;

        if (!projectUrl || !anonKey) {
            console.error('Invoke Error: Missing Env Vars');
            return { error: 'Configuration Error: Missing API Keys' };
        }

        // 3. Native Fetch
        console.log(`Invoking Edge Function: ${action}`, { url: functionUrl });

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, payload })
        });

        // 4. Handle Response
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('JSON Parse Error:', text);
            return { error: `Server returned non-JSON: ${text.substring(0, 50)}` };
        }

        if (!response.ok) {
            // Http Error (4xx, 5xx)
            console.error(`Edge Function HTTP Error ${response.status}:`, data);
            return { error: data.error || `HTTP Error ${response.status}` };
        }

        // 5. Logic Error (200 OK but success: false)
        if (data.error || data.success === false) {
            console.error(`Edge Function Logic Error:`, data);
            return { error: data.error || 'Unknown operation error' };
        }

        return { data, success: true };

    } catch (err: any) {
        console.error(`Unexpected Error (${action}):`, err);
        return { error: err.message || 'Network connectivity error' };
    }
};
