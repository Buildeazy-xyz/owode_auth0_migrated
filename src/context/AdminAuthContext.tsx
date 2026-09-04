import { createContext, useContext, useEffect, useState } from 'react';

export type AdminUser = {
  id: string;
  name?: string;
  phone?: string;
  role?: string;
};

type State = {
  token: string | null;
  user: AdminUser | null;
  loading: boolean;
  signIn: (token: string, user: AdminUser) => void;
  signOut: () => void;
};

const AdminAuthContext = createContext<State>({
  token: null,
  user: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
});

export const useAdminAuth = () => useContext(AdminAuthContext);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const t = localStorage.getItem('owode_admin_session');
      const u = localStorage.getItem('owode_admin_user');
      if (t) setToken(t);
      if (u) setUser(JSON.parse(u));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = (newToken: string, newUser: AdminUser) => {
    localStorage.setItem('owode_admin_session', newToken);
    localStorage.setItem('owode_admin_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const signOut = () => {
    localStorage.removeItem('owode_admin_session');
    localStorage.removeItem('owode_admin_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AdminAuthContext.Provider value={{ token, user, loading, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
