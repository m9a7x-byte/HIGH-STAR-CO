
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

// PRODUCTION: Define allowed origins (main domain + all subdomains)
const ALLOWED_ORIGINS = [
    'https://high-star.iq',             // Main domain (no app here)
    'https://v.high-star.iq',           // Admin subdomain (الإدارة)
    'https://agents.high-star.iq',      // Agents subdomain (الوكلاء)
    'http://localhost:3000',            // Local development
    'http://localhost:5173',            // Vite dev server
];

// Dynamic CORS based on request origin
function getCorsHeaders(requestOrigin: string | null) {
    // Check if origin is in whitelist or matches subdomain pattern
    const isAllowed = requestOrigin && (
        ALLOWED_ORIGINS.includes(requestOrigin) ||
        requestOrigin.endsWith('.high-star.iq') // Allow all subdomains
    );

    return {
        'Access-Control-Allow-Origin': isAllowed ? requestOrigin : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
    };
}

Deno.serve(async (req) => {
    const origin = req.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);

    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
            throw new Error('Missing Env Vars');
        }

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization Header', success: false }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Initialize Clients
        // Client for auth check (uses user token)
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
            auth: {
                persistSession: false // Critical for Edge Functions
            }
        });
        // Admin client for privileged actions
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false
            }
        });

        // Authenticate User & Validate Token
        // CRITICAL: In Deno Edge Functions, we must pass the JWT explicitly
        const jwt = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);

        if (authError || !user) {
            console.error("Auth Failure:", authError);
            return new Response(JSON.stringify({
                error: `Unauthorized: ${authError?.message || 'User not found'}`,
                debug_auth_header_len: authHeader?.length,
                debug_auth_header_prefix: authHeader ? authHeader.substring(0, 10) : 'N/A',
                // Don't leak full keys/url, just hints
                debug_project: supabaseUrl.substring(0, 15) + '...',
                details: authError,
                success: false
            }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Check Permissions (Admins Only)
        // We use serviceRole to read profile to avoid any RLS block
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
            return new Response(JSON.stringify({ error: 'Forbidden: Insufficient Permissions (Admins Only)', success: false }), {
                status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Parse Body
        let body;
        try { body = await req.json(); } catch { throw new Error('Invalid JSON body'); }
        const { action, payload } = body;

        let result;

        switch (action) {
            case 'health_check':
                result = {
                    status: 'healthy',
                    message: "Connection Successful!",
                    user: user.id,
                    role: profile.role,
                    success: true
                };
                break;

            case 'create_user': {
                if (!payload.email) throw new Error('Email is required');

                // Duplicate Check (Email)
                const { data: existingUser } = await supabaseAdmin.from('profiles').select('id').eq('email', payload.email).maybeSingle();
                if (existingUser) {
                    return new Response(JSON.stringify({ error: 'البريد الإلكتروني مستخدم مسبقاً', code: 'EMAIL_EXISTS', success: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
                }

                // Duplicate Check (Phone)
                if (payload.phone) {
                    const { data: existingPhone } = await supabaseAdmin.from('profiles').select('id').eq('phone', payload.phone).maybeSingle();
                    if (existingPhone) {
                        return new Response(JSON.stringify({ error: 'رقم الهاتف مستخدم مسبقاً', code: 'PHONE_EXISTS', success: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
                    }
                }

                if (payload.invite) {
                    // Invite User
                    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(payload.email, {
                        data: { full_name: payload.fullName, role: payload.role, phone: payload.phone }
                    });
                    if (error) throw error;

                    // Upsert Profile immediately
                    if (data.user) {
                        await supabaseAdmin.from('profiles').upsert({
                            id: data.user.id,
                            email: payload.email,
                            full_name: payload.fullName,
                            role: payload.role,
                            phone: payload.phone,
                            permissions: payload.permissions || []
                        });
                    }
                    result = { user: data.user, success: true };
                } else {
                    // Create User Manually
                    // Note: 'email_confirm: true' auto-confirms the email
                    const { data, error } = await supabaseAdmin.auth.admin.createUser({
                        email: payload.email,
                        password: payload.password,
                        email_confirm: true,
                        user_metadata: { full_name: payload.fullName, role: payload.role, phone: payload.phone }
                    });
                    if (error) throw error;

                    // Upsert Profile
                    if (data.user) {
                        await supabaseAdmin.from('profiles').upsert({
                            id: data.user.id,
                            email: payload.email,
                            full_name: payload.fullName,
                            role: payload.role,
                            phone: payload.phone,
                            permissions: payload.permissions || []
                        });
                    }
                    result = { user: data.user, success: true };
                }
                break;
            }

            case 'update_user_credentials': {
                if (!payload.userId) throw new Error('User ID required');
                const updates: any = {};
                if (payload.email) updates.email = payload.email;
                if (payload.password) updates.password = payload.password;

                const { data: updated, error } = await supabaseAdmin.auth.admin.updateUserById(payload.userId, updates);
                if (error) throw error;

                // CRITICAL: Also update the profiles table if email was changed
                // This ensures the email is synced everywhere (Auth + DB)
                if (payload.email) {
                    const { error: profileErr } = await supabaseAdmin
                        .from('profiles')
                        .update({ email: payload.email })
                        .eq('id', payload.userId);

                    if (profileErr) {
                        console.error('Failed to update email in profiles table:', profileErr);
                    }
                }

                result = { user: updated.user, success: true };
                break;
            }

            case 'send_password_reset': {
                // Send password reset email to any user (Admin action)
                if (!payload.email) throw new Error('Email is required');

                // Use the public resetPasswordForEmail API
                // This sends an email with a magic link to reset password
                const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(payload.email, {
                    redirectTo: payload.redirectTo || `${supabaseUrl.replace('.supabase.co', '')}/auth/callback`
                });

                if (resetErr) throw resetErr;

                result = {
                    success: true,
                    message: `تم إرسال رابط استعادة كلمة المرور إلى ${payload.email}`
                };
                break;
            }

            case 'delete_user': {
                // Smart Delete: Remove auth access but KEEP historical data
                // - Delete auth account (removes login ability)
                // - Clear email/phone in profile (allows reuse)
                // - Mark profile as deleted (for filtering)
                // - KEEP all orders, transactions, logs for reporting
                if (!payload.userId) throw new Error('User ID required');

                // 1. Update profile: mark as deleted and clear email/phone for reuse
                const { error: profileErr } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        status: 'deleted',
                        deleted_at: new Date().toISOString(),
                        email: null,  // Clear to allow reuse
                        phone: null,  // Clear to allow reuse
                        full_name: `[محذوف] ${payload.userId.substring(0, 8)}` // Mark as deleted
                    })
                    .eq('id', payload.userId);

                if (profileErr) {
                    console.error('Profile update error:', profileErr);
                }

                // 2. Delete auth user (removes login ability)
                const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(payload.userId);
                if (delErr) {
                    console.error('Auth delete error:', delErr);
                    throw new Error(`فشل حذف المستخدم: ${delErr.message}`);
                }

                result = { success: true, message: 'تم حذف الحساب مع الحفاظ على البيانات' };
                break;
            }

            case 'soft_delete_user': {
                if (!payload.userId) throw new Error('User ID required');

                // 1. Mark in DB
                const { error: dbErr } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        deleted_at: new Date().toISOString(),
                        status: 'suspended'
                    })
                    .eq('id', payload.userId);

                if (dbErr) throw dbErr;

                // 2. Ban in Auth (Security)
                // ban_duration is in hours. 876000 hours ~= 100 years
                const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(payload.userId, {
                    ban_duration: '876000h'
                });
                if (authErr) console.error("Soft delete auth ban failed:", authErr);

                result = { success: true, message: 'User soft deleted and suspended' };
                break;
            }

            case 'restore_user': {
                if (!payload.userId) throw new Error('User ID required');

                // 1. Un-mark in DB
                const { error: dbErr } = await supabaseAdmin
                    .from('profiles')
                    .update({
                        deleted_at: null,
                        status: 'active'
                    })
                    .eq('id', payload.userId);

                if (dbErr) throw dbErr;

                // 2. Unban in Auth
                const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(payload.userId, {
                    ban_duration: 'none'
                });
                if (authErr) console.error("Restore auth unban failed:", authErr);

                result = { success: true, message: 'User restored' };
                break;
            }

            case 'set_status': {
                if (!payload.userId || !payload.status) throw new Error('User ID and status required');
                const isSuspended = payload.status === 'suspended';

                // 1. Update DB
                const { error: dbErr } = await supabaseAdmin
                    .from('profiles')
                    .update({ status: payload.status })
                    .eq('id', payload.userId);

                if (dbErr) throw dbErr;

                // 2. Update Auth (Ban/Unban)
                const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(payload.userId, {
                    ban_duration: isSuspended ? '876000h' : 'none'
                });
                if (authErr) console.warn("Auth status update warning:", authErr);

                result = { success: true, status: payload.status };
                break;
            }

            case 'set_role': {
                if (!payload.userId || !payload.role) throw new Error('User ID and role required');

                // 1. Update DB
                const { error: dbErr } = await supabaseAdmin
                    .from('profiles')
                    .update({ role: payload.role })
                    .eq('id', payload.userId);

                if (dbErr) throw dbErr;

                // 2. Update Metadata (useful for frontend quick checks)
                const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(payload.userId, {
                    user_metadata: { role: payload.role } // This merges by default
                });

                result = { success: true, role: payload.role };
                break;
            }

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error: any) {
        // Global Error Handler
        // Ensures we ALWAYS return JSON, never a generic 500 HTML page
        return new Response(JSON.stringify({
            error: error.message || 'Unknown Server Error',
            success: false,
            // stack: error.stack // Uncomment for deep debugging if needed
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });
    }
});
