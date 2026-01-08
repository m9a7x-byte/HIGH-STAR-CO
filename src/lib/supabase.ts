
import { createClient } from '@supabase/supabase-js';

// Use Environment Variables for security and flexibility
// If these are missing, the app will fail fast, which is better than silent auth errors
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('CRITICAL: Missing Supabase Environment Variables!');
    console.error('Please verify details in .env.local');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
