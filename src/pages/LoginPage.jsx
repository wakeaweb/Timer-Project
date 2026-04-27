import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@timeproject.app');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface p-8 rounded-2xl shadow-card border border-outline-variant/10 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg">
            <span className="material-symbols-outlined text-on-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              timer
            </span>
          </div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Time Project</h1>
          <p className="text-on-surface-variant text-sm mt-1 text-center">
            Hoş geldiniz! Lütfen admin hesabınızla giriş yapın.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-error-container text-on-error-container p-4 rounded-xl text-sm flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px]">error</span>
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface-variant ml-1" htmlFor="email">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface"
              placeholder="admin@timeproject.app"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface-variant ml-1" htmlFor="password">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl shadow-lg hover:bg-on-primary-fixed-variant transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-outline-variant/10 text-center">
          <p className="text-xs text-on-surface-variant italic">
            "Zaman, hayatın hammaddesidir."
          </p>
        </div>
      </div>
    </div>
  );
}
