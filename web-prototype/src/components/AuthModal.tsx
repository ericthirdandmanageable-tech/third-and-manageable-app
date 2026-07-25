import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../lib/useAuth';
import { api } from '../lib/api';

const AuthModal = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const { signIn, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const ok =
      mode === 'login'
        ? await signIn(email, password)
        : await register(email, password, name, school || undefined);
    if (ok) {
      onClose();
      // First-run gating: new accounts always enter onboarding; returning
      // users only when they never finished the intake (resumable flow).
      if (mode === 'register') {
        navigate('/onboarding');
      } else {
        const gp = await api.getGamePlan();
        if (gp && !gp.intake_done) navigate('/onboarding');
      }
    } else {
      setError(mode === 'login' ? 'Invalid email or password.' : 'Could not register — that email may already be in use.');
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-rise">
      <div className="bg-bg-surface border border-border-subtle rounded-[20px] w-full max-w-md p-6 md:p-8 grain relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-serif text-3xl text-sand italic mb-1">
          {mode === 'login' ? 'Welcome back' : 'Join the team'}
        </h2>
        <p className="text-[13px] text-text-secondary mb-6">
          {mode === 'login' ? 'A daily game plan and a community that has your back.' : 'We\'ll tailor your experience using language from your game.'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <>
              <input
                required
                placeholder="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle rounded-full py-3 px-5 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-all"
              />
              <input
                placeholder="School (optional)"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className="w-full bg-bg-elevated border border-border-subtle rounded-full py-3 px-5 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-all"
              />
            </>
          )}
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-bg-elevated border border-border-subtle rounded-full py-3 px-5 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-all"
          />
          <input
            required
            type="password"
            minLength={8}
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-bg-elevated border border-border-subtle rounded-full py-3 px-5 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-all"
          />

          {error && <p className="text-[13px] text-danger px-2">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-volt text-volt-ink font-semibold py-3.5 rounded-full hover:bg-volt/90 transition-all disabled:opacity-50"
          >
            {busy ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-[13px] text-text-secondary mt-4">
          {mode === 'login' ? "First time here?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className={clsx('font-semibold', 'text-volt hover:underline underline-offset-4')}
          >
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;