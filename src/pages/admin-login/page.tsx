import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAction } from 'convex/react';
import { ConvexError } from 'convex/values';
import { api } from '@/convex/_generated/api.js';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { toast } from 'sonner';
import { useAdminAuth } from '@/context/AdminAuthContext.tsx';

export default function AdminLoginPage() {
  const login = useAction(api.auth.login);
  const { signIn } = useAdminAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error('Enter your phone number and password');
      return;
    }
    try {
      setBusy(true);
      const res = await login({ phone, password });
      if (res.user.role !== 'admin') {
        toast.error('This area is for OWODE administrators only.');
        return;
      }
      signIn(res.sessionToken, res.user);
      navigate('/admin', { replace: true });
    } catch (error) {
      if (error instanceof ConvexError) {
        const d = error.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error('Could not sign in. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f4f7fb' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1e3a6d' }}>
            OWODE
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Administrator sign in</p>
        </div>

        <form onSubmit={submit} className="space-y-4 bg-white p-6 rounded-xl border">
          <div className="space-y-2">
            <Label htmlFor="admin-phone">Phone number</Label>
            <Input
              id="admin-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-pw">Password</Label>
            <Input
              id="admin-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Agents and savers should use the OWODE app.
        </p>
      </div>
    </div>
  );
}
