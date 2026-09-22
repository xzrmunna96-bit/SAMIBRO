import React, { useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import LoggedInDashboard from './components/LoggedInDashboard';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'admin' | 'subadmin' | 'user';
  status: 'active' | 'pending' | 'suspended';
  accountCode: string;
  apiKey: string;
  apiUnlocked: boolean;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('super_x_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('super_x_user');
      }
    }
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('super_x_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('super_x_user');
  };

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200">
      {user ? (
        <LoggedInDashboard user={user} onLogout={handleLogout} />
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </div>
  );
}
