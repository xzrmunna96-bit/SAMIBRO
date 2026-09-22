import React, { useState, useEffect } from 'react';
import { User } from '../App';
import { 
  Lock, 
  Mail, 
  User as UserIcon, 
  LogIn, 
  ClipboardCheck, 
  AlertCircle,
  MessageSquare,
  Send,
  Chrome,
  Facebook,
  Flame,
  Instagram,
  Twitter,
  Tv,
  Gamepad2,
  CheckCircle2,
  Cpu
} from 'lucide-react';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

interface SocialChannel {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  activeThreads: number;
  successRate: string;
  latency: string;
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
        setSuccessMsg(data.message || 'Registration successful. Waiting for Admin approval.');
        setIsLogin(true);
        setPassword('');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const socialChannels: SocialChannel[] = [
    {
      id: 'wa',
      name: 'WhatsApp Business',
      icon: MessageSquare,
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50/50',
      borderClass: 'border-emerald-100',
      activeThreads: 1420,
      successRate: '99.9%',
      latency: '1.2s'
    },
    {
      id: 'tg',
      name: 'Telegram Messenger',
      icon: Send,
      colorClass: 'text-sky-600',
      bgClass: 'bg-sky-50/50',
      borderClass: 'border-sky-100',
      activeThreads: 1312,
      successRate: '99.8%',
      latency: '0.9s'
    },
    {
      id: 'gg',
      name: 'Google & Gmail',
      icon: Chrome,
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50/50',
      borderClass: 'border-blue-100',
      activeThreads: 1256,
      successRate: '99.7%',
      latency: '1.4s'
    },
    {
      id: 'fb',
      name: 'Facebook & Meta',
      icon: Facebook,
      colorClass: 'text-indigo-600',
      bgClass: 'bg-indigo-50/50',
      borderClass: 'border-indigo-100',
      activeThreads: 1184,
      successRate: '99.5%',
      latency: '1.5s'
    },
    {
      id: 'td',
      name: 'Tinder Verification',
      icon: Flame,
      colorClass: 'text-rose-600',
      bgClass: 'bg-rose-50/50',
      borderClass: 'border-rose-100',
      activeThreads: 98,
      successRate: '99.4%',
      latency: '1.8s'
    },
    {
      id: 'ig',
      name: 'Instagram Social',
      icon: Instagram,
      colorClass: 'text-pink-600',
      bgClass: 'bg-pink-50/50',
      borderClass: 'border-pink-100',
      activeThreads: 874,
      successRate: '99.6%',
      latency: '1.3s'
    },
    {
      id: 'tw',
      name: 'Twitter / X',
      icon: Twitter,
      colorClass: 'text-slate-800',
      bgClass: 'bg-slate-50/50',
      borderClass: 'border-slate-200',
      activeThreads: 615,
      successRate: '99.2%',
      latency: '2.1s'
    },
    {
      id: 'dc',
      name: 'Discord Communities',
      icon: Gamepad2,
      colorClass: 'text-violet-600',
      bgClass: 'bg-violet-50/50',
      borderClass: 'border-violet-100',
      activeThreads: 422,
      successRate: '99.7%',
      latency: '1.1s'
    },
    {
      id: 'nf',
      name: 'Netflix Streaming',
      icon: Tv,
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50/50',
      borderClass: 'border-red-100',
      activeThreads: 215,
      successRate: '99.6%',
      latency: '1.7s'
    }
  ];

  return (
    <div id="login-container" className="min-h-screen flex flex-col justify-between bg-[#FAFBFD] text-slate-800">
      
      {/* Top Banner Notice */}
      <div id="marquee-header" className="bg-slate-900 text-slate-100 py-3 px-4 overflow-hidden border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center space-x-3 text-sm font-medium">
          <span className="flex-shrink-0 bg-emerald-500 text-emerald-950 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-sm">Notice</span>
          <p className="animate-pulse truncate">{notice}</p>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-auto">
        
        {/* Left Column: Social Media Channel Showcase */}
        <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
          <div className="space-y-2">
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 font-extrabold uppercase tracking-widest rounded-full inline-flex items-center space-x-1 border border-slate-200">
              <Cpu className="w-3.5 h-3.5 text-slate-500 animate-spin" />
              <span>Multi-Gateway Real-Time Routing</span>
            </span>
            <h2 className="font-serif text-2xl md:text-3xl font-extrabold text-slate-950 tracking-tight leading-tight">
              Supported Network Channels
            </h2>
            <p className="text-slate-500 text-sm max-w-xl">
              Our high-speed gateway router intercepts and processes OTP verification requests across these social media and streaming networks in real-time.
            </p>
          </div>

          {/* Social Channels Grid */}
          <div id="social-channels-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {socialChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div 
                  key={channel.id}
                  id={`channel-card-${channel.id}`}
                  className={`p-4 border ${channel.borderClass} ${channel.bgClass} hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-36`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-none bg-white border border-slate-100 shadow-xs ${channel.colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 px-1.5 py-0.5 font-bold uppercase rounded-sm inline-flex items-center space-x-0.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse mr-1"></span>
                      Active
                    </span>
                  </div>

                  <div className="mt-3">
                    <h4 className="font-bold text-sm text-slate-900 tracking-tight">{channel.name}</h4>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100/60 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      <div>
                        <span className="block text-slate-500 text-[11px] font-bold font-mono lowercase">{channel.latency}</span>
                        <span>Latency</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-slate-500 text-[11px] font-bold font-mono">{channel.successRate}</span>
                        <span>Delivery</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Secure Authentication Form Card */}
        <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center">
          <div id="login-card" className="w-full max-w-md bg-white border border-slate-200 shadow-sm p-6 md:p-8 rounded-none">
            
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="font-serif text-3xl font-extrabold tracking-tight text-slate-950 mb-1.5">
                SUPER X SMS
              </h1>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                {isLogin ? 'Sign in to access your secure SMS gateway' : 'Register for an enterprise SMS account'}
              </p>
            </div>

            {/* Tab Selection */}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                id="login-tab-btn"
                type="button"
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-colors ${
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
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-colors ${
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
              <div id="error-alert" className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2 rounded-none">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {successMsg && (
              <div id="success-alert" className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2 rounded-none">
                <ClipboardCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div id="form-group-name">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 focus:border-slate-950 focus:outline-none transition-all rounded-none"
                      />
                    </div>
                  </div>

                  <div id="form-group-email">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 focus:border-slate-950 focus:outline-none transition-all rounded-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div id="form-group-username">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 focus:border-slate-950 focus:outline-none transition-all rounded-none"
                  />
                </div>
              </div>

              <div id="form-group-password">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 focus:border-slate-950 focus:outline-none transition-all rounded-none"
                  />
                </div>
              </div>

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-850 text-white font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 mt-4 rounded-none flex items-center justify-center space-x-2"
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
              <div id="demo-credentials-box" className="mt-6 pt-5 border-t border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Demo Access Credentials</p>
                <p className="text-xs text-slate-500">
                  Username: <span className="font-mono bg-slate-50 text-slate-800 px-1 py-0.5 rounded-sm border border-slate-100">admin_munna</span> Password: <span className="font-mono bg-slate-50 text-slate-800 px-1 py-0.5 rounded-sm border border-slate-100">Password123</span>
                </p>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Footer Design */}
      <div id="login-footer" className="py-5 border-t border-slate-200 text-center text-xs text-slate-400 bg-white">
        &copy; {new Date().getFullYear()} SUPER X SMS Routing Gateway. All Rights Reserved.
      </div>
    </div>
  );
}
