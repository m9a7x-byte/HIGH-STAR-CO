// Test server only. Never connect browser fixtures to a production backend.
const result = () => ({ data: [], error: null });
const chain = () => new Proxy({}, { get(_, key) {
  if (key === 'then') return resolve => Promise.resolve(result()).then(resolve);
  if (key === 'single' || key === 'maybeSingle') return async () => ({ data: null, error: null });
  return () => chain();
} });
export const supabase = {
  from: chain, rpc: async () => result(),
  auth: { getUser: async () => ({ data: { user: { id: 'fixture-admin' } } }), getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => result(),
    signInWithPassword: async () => ({ data: null, error: new Error('Invalid login credentials') }), resetPasswordForEmail: async () => result(), updateUser: async () => result(), verifyOtp: async () => result() },
  storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: '' } }), upload: async () => result(), remove: async () => result(), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  functions: { invoke: async () => result() }, channel: () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} }), removeChannel() {}
};
