import { useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await signIn(email, password);
    if (err) setError('Email or password doesn’t match. Check both and try again.');
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-8 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-sm bg-accent" aria-hidden />
          <h1 className="text-[20px] font-semibold tracking-tight">4 HAUS</h1>
        </div>
        <p className="text-[13px] text-ink-2 -mt-2">Product import decisions.</p>
        <Input label="Email" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" type="password" required autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} error={error} />
        <Button type="submit" variant="primary" size="lg" disabled={busy || !email || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
