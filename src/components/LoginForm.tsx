import React, { useState, useEffect } from 'react';
import { User } from '../App';
import { Lock, Mail, User as UserIcon, LogIn, ClipboardCheck, AlertCircle } from 'lucide-react';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('SUPER X SMS gateway is online.');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/marquee')
      .then(res => res.json())
      .then(data => {
        if (data && data.text) setNotice(data.text);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (isLogin) {
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Login failed.');
        }
        onLogin(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, username, password })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed.');
        }
        setSuccessMsg(data.message || 'Registration successful. Waiting for Approval.');
        setIsLogin(true);
        setPassword('');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex flex-col justify-between bg-[#FAFAFA] text-slate-800">
      {/* Top Banner Notice */}
      <div id="marquee-header" className="bg-slate-900 text-slate-100 py-3 px-4 overflow-hidden border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center space-x-3 text-sm font-medium">
          <span className="flex-shrink-0 bg-emerald-500 text-emerald-950 px-2 py-0.5 text-xs font-bold uppercase rounded-sm">Notice</span>
          <p className="animate-pulse">{notice}</p>
        </div>
      </div>

      {/* Main Content Card */}
      <div id="login-card-section" className="flex-grow flex items-center justify-center p-6 my-8">
        <div id="login-card" className="w-full max-w-md bg-white border border-slate-200 shadow-sm p-8 rounded-none">
          
          {/* Header Typography */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl font-extrabold tracking-tight text-slate-950 mb-2">
              SUPER X SMS
            </h1>
            <p className="text-sm text-slate-500">
              {isLogin ? 'Sign in to access your secure SMS gateway' : 'Register for an enterprise SMS account'}
            </p>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              id="login-tab-btn"
              type="button"
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors ${
                isLogin
                  ? 'border-slate-950 text-slate-950'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
              onClick={() => {
                setIsLogin(true);
                setError(null);
                setSuccessMsg(null);
              }}
            >
              Log In
            </button>
            <button
              id="register-tab-btn"
              type="button"
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors ${
                !isLogin
                  ? 'border-slate-950 text-slate-950'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
              onClick={() => {
                setIsLogin(false);
                setError(null);
                setSuccessMsg(null);
              }}
            >
              Register
            </button>
          </div>

          {/* Notifications */}
          {error && (
            <div id="error-alert" className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-2 rounded-none">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div id="success-alert" className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start space-x-2 rounded-none">
              <ClipboardCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div id="form-group-name">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      id="input-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div id="form-group-email">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      id="input-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div id="form-group-username">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  id="input-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin_munna"
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm transition-all"
                />
              </div>
            </div>

            <div id="form-group-password">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  id="input-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm transition-all"
                />
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm uppercase tracking-wider transition-colors disabled:opacity-50 mt-2 rounded-none flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                </>
              )}
            </button>
          </form>

          {isLogin && (
            <div id="demo-credentials-box" className="mt-6 pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Demo Access Credentials</p>
              <p className="text-xs text-slate-500">
                Username: <span className="font-mono bg-slate-100 text-slate-800 px-1 py-0.5 rounded-sm">admin_munna</span> Password: <span className="font-mono bg-slate-100 text-slate-800 px-1 py-0.5 rounded-sm">Password123</span>
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Footer Design */}
      <div id="login-footer" className="py-6 border-t border-slate-200 text-center text-xs text-slate-400 bg-white">
        &copy; {new Date().getFullYear()} SUPER X SMS Routing Gateway. All Rights Reserved.
      </div>
    </div>
  );
}
