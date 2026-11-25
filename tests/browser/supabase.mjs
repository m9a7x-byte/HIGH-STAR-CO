// Test server only. Never connect browser fixtures to a production backend.
const result = () => ({ data: [], error: null });
const chain = () => new Proxy({}, { get(_, key) {
  if (key === 'then') return resolve => Promise.resolve(result()).then(resolve);
  if (key === 'single' || key === 'maybeSingle') return async () => ({ data: null, error: null });
  return () => chain();
} });
export const supabase = {
  from: chain, rpc: name => name === 'get_agent_production_queue' ? {
    order() { return this; },
    range(start, end) { this.start = start; this.end = end; return this; },
    async abortSignal() {
      const rows = Array.from({ length: 11 }, (_, index) => ({
        id: 500 + index, agent_name: 'وكيل آخر', is_own_order: false, has_special_request: false,
        created_at: '2026-11-24T07:00:00Z', production_at: '2026-11-25T07:00:00Z',
        production_status: index < 6 ? 'IN_PROGRESS' : 'WAITING'
      }));
      return { data: rows.slice(this.start, this.end + 1), count: rows.length, error: null };
    }
  } : Promise.resolve(result()),
  auth: { getUser: async () => ({ data: { user: { id: 'fixture-admin' } } }), getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => result(),
    signInWithPassword: async () => ({ data: null, error: new Error('Invalid login credentials') }), resetPasswordForEmail: async () => result(), updateUser: async () => result(), verifyOtp: async () => result() },
  storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: '' } }), upload: async () => result(), remove: async () => result(), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  functions: { invoke: async () => result() }, channel: () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} }), removeChannel() {}
};
