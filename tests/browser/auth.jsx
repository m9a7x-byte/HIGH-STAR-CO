import { db } from '../../src/lib/db';
export const useAuth = () => ({
  user: db.users.find(u => u.id === (new URLSearchParams(location.search).get('role') === 'agent' ? 'fixture-agent' : 'fixture-admin')),
  login: async () => { throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة'); },
  logout: async () => {}, updateUser: () => {}
});
export const AuthProvider = ({ children }) => children;
