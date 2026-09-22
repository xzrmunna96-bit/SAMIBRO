import React, { useState, useEffect, useRef } from 'react';
import { User } from '../App';
import LiveTestSmsView, { SmsHit } from './LiveTestSmsView';
import { 
  LogOut, Shield, Settings, Key, Send, Users, Activity, Sliders, MessageSquare, 
  Megaphone, Plus, Trash2, Power, Eye, EyeOff, Check, Copy, UserCheck, UserMinus, 
  ToggleLeft, ToggleRight, Radio, Menu, Bell, RefreshCw, Lock, ChevronDown, ChevronUp,
  User as UserIcon, Globe, Phone, List, Server, Cpu
} from 'lucide-react';

interface LoggedInDashboardProps {
  user: User;
  onLogout: () => void;
}

interface GatewayConfig {
  id: string;
  name: string;
  type: 'voltx' | 'fox' | 'plusonetel' | 'sevenonetel';
  url: string;
  apiKey: string;
  slug: string;
  status: 'active' | 'inactive';
}

interface ChatMsg {
  id: string;
  sender: string;
  role: string;
  text: string;
  time: number;
}

interface AppTarget {
  id: string;
  name: string;
  count: number;
}

export default function LoggedInDashboard({ user, onLogout }: LoggedInDashboardProps) {
  // Navigation matches original items in Screenshot 1
  const [activeTab, setActiveTab] = useState<'stream' | 'dashboard' | 'chat' | 'gateways' | 'users' | 'settings' | 'history'>('stream');
  
  // Digital Clock state
  const [timeStr, setTimeStr] = useState('21:07:25');
  
  // UI Notice Bar visibility
  const [noticeVisible, setNoticeVisible] = useState(true);

  // States for user profiles
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [testSystemOpen, setTestSystemOpen] = useState(true);
  
  // Global/Admin States
  const [accountsList, setAccountsList] = useState<User[]>([]);
  const [gatewaysList, setGatewaysList] = useState<GatewayConfig[]>([]);
  const [chatsList, setChatsList] = useState<ChatMsg[]>([]);
  const [marqueeText, setMarqueeText] = useState('SMS Portal - Premium Carrier Rates');
  const [appsList, setAppsList] = useState<AppTarget[]>([]);
  const [globalSmsHits, setGlobalSmsHits] = useState<SmsHit[]>([]);

  // Form states for new gateway
  const [newGateName, setNewGateName] = useState('');
  const [newGateType, setNewGateType] = useState<'voltx' | 'fox' | 'plusonetel' | 'sevenonetel'>('voltx');
  const [newGateUrl, setNewGateUrl] = useState('');
  const [newGateKey, setNewGateKey] = useState('');
  const [newGateSlug, setNewGateSlug] = useState('');

  // Support chat state
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Live Digital Clock updating
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Load Admin/Stats Data
  const fetchData = async () => {
    try {
      // Load gateways
      const gRes = await fetch('/api/api-configs');
      if (gRes.ok) setGatewaysList(await gRes.json());

      // Load marquee
      const mRes = await fetch('/api/marquee');
      if (mRes.ok) {
        const data = await mRes.json();
        setMarqueeText(data.text || 'SMS Portal - Premium Carrier Rates');
      }

      // Load top apps
      const aRes = await fetch('/api/top-apps');
      if (aRes.ok) setAppsList(await aRes.json());

      // Load chats
      const cRes = await fetch('/api/chats');
      if (cRes.ok) setChatsList(await cRes.json());

      // Load global hits to count stats
      const hRes = await fetch('/api/live-stream');
      if (hRes.ok) setGlobalSmsHits(await hRes.json());

      if (user.role === 'admin') {
        // Load accounts list
        const accRes = await fetch('/api/accounts');
        if (accRes.ok) setAccountsList(await accRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000); // Poll server updates every 4 seconds
    return () => clearInterval(interval);
  }, [user.role]);

  useEffect(() => {
    // Scroll to bottom of chat
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatsList, activeTab]);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Admin account action (Approve/Suspend/Toggle API)
  const handleUpdateAccount = async (id: string, updates: Partial<User>) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setAccountsList(prev => prev.map(acc => acc.id === id ? { ...acc, ...updates } as User : acc));
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Admin Gateway configuration
  const handleSaveGateways = async (updatedList: GatewayConfig[]) => {
    try {
      const res = await fetch('/api/api-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList)
      });
      if (res.ok) {
        setGatewaysList(updatedList);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddGateway = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGateName || !newGateUrl) return;

    const newGate: GatewayConfig = {
      id: "gate_" + Math.random().toString(36).substring(7),
      name: newGateName,
      type: newGateType,
      url: newGateUrl,
      apiKey: newGateKey,
      slug: newGateSlug,
      status: 'active'
    };

    const updated = [...gatewaysList, newGate];
    handleSaveGateways(updated);

    // Reset Form
    setNewGateName('');
    setNewGateUrl('');
    setNewGateKey('');
    setNewGateSlug('');
  };

  const handleDeleteGateway = (id: string) => {
    const updated = gatewaysList.filter(g => g.id !== id);
    handleSaveGateways(updated);
  };

  const handleToggleGatewayStatus = (id: string) => {
    const updated = gatewaysList.map(g => g.id === id ? { ...g, status: g.status === 'active' ? 'inactive' : 'active' } : g) as GatewayConfig[];
    handleSaveGateways(updated);
  };

  // Support Chat
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: user.name,
          role: user.role,
          text: chatInput
        })
      });
      if (res.ok) {
        const newMsg = await res.json();
        setChatsList(prev => [...prev, newMsg]);
        setChatInput('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Marquee Save
  const handleSaveMarquee = async () => {
    try {
      await fetch('/api/marquee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: marqueeText })
      });
      alert('Marquee updated successfully!');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="dashboard-layout" className="min-h-screen flex flex-col bg-[#F3F4F8] text-slate-800 font-sans">
      
      {/* 1. Global Custom Header Bar (Exactly matching Sidebar Top on Desktop & Screenshot 1) */}
      <header id="top-branding-bar" className="bg-[#0B1528] border-b border-slate-800 text-white px-4 py-3 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          {/* Hamburger Menu outline cyan */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 border border-cyan-500/40 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 rounded-sm bg-slate-900/40 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-baseline space-x-2">
            <span className="font-serif text-lg font-black tracking-widest text-white uppercase">
              SUPER <span className="text-cyan-400">X</span> SMS
            </span>
          </div>
        </div>

        {/* Header Right Widgets: Live Clock, Notifications, Logout */}
        <div className="flex items-center space-x-3">
          
          {/* Digital Timer (Matches green font in Screenshot 1) */}
          <div className="border border-slate-800 px-3 py-1 bg-slate-950/80 text-teal-400 font-mono text-sm rounded-sm font-bold tracking-widest flex items-center space-x-1.5 shadow-inner">
            <Clock className="w-3.5 h-3.5 animate-pulse text-teal-500" />
            <span>{timeStr}</span>
          </div>

          {/* Notification bell */}
          <button className="p-1.5 border border-slate-800 hover:border-slate-700 bg-slate-950/40 text-slate-300 hover:text-white rounded-sm transition-all relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
          </button>

          {/* Quick Logout icon button */}
          <button 
            onClick={onLogout}
            className="p-1.5 border border-slate-800 hover:border-rose-900 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded-sm transition-all"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Framework Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* 2. Dark Navy Sidebar (Exactly matching Sidebar design from Screenshot 1) */}
        {sidebarOpen && (
          <aside id="sidebar-nav-panel" className="w-full md:w-64 bg-[#0B1528] text-slate-200 border-r border-slate-800 flex flex-col justify-between shrink-0">
            <div className="flex-1 overflow-y-auto">
              
              {/* Profile card block inside sidebar */}
              <div className="p-4 border-b border-slate-800/80 bg-slate-950/30">
                <div className="flex items-center space-x-3">
                  {/* Verified badge with letter */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full border border-emerald-500 bg-slate-900 text-slate-100 flex items-center justify-center font-bold text-lg shadow-sm">
                      S
                    </div>
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center border border-slate-950">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-xs text-white truncate uppercase tracking-tight flex items-center space-x-1">
                      <span>SUPER X SMS MANAG...</span>
                    </h3>
                    <div className="inline-flex items-center space-x-1 mt-1 px-1.5 py-0.5 rounded-sm text-[8px] font-black bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 uppercase tracking-widest shadow-xs">
                      <span>👑 {user.role.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Inline Action Buttons */}
                <div className="flex items-center space-x-4 mt-2.5 pt-2.5 border-t border-slate-800/40 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <button onClick={() => setActiveTab('settings')} className="hover:text-white transition-colors">Profile</button>
                  <span className="text-slate-700">•</span>
                  <button onClick={onLogout} className="text-rose-400 hover:text-rose-300 transition-colors">Logout</button>
                </div>
              </div>

              {/* Account Pill with Refresh Icon (Exactly as shown in Screenshot 1) */}
              <div className="p-3 border-b border-slate-800/80 bg-slate-950/10 flex items-center justify-between">
                <div className="flex-1 bg-slate-900/60 border border-slate-800 px-2.5 py-1 text-slate-300 font-mono text-[11px] rounded-sm flex items-center justify-between">
                  <span className="text-slate-500 text-[10px] font-sans font-bold">Account:</span>
                  <span className="font-bold tracking-wider">{user.accountCode}</span>
                </div>
                <button 
                  onClick={fetchData}
                  className="ml-2 p-1 border border-slate-800 hover:border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white rounded-sm text-xs transition-colors"
                  title="Reload Stats"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Developer Status: LOCKED / UNLOCKED Badge */}
              <div className="p-3 border-b border-slate-800/80 bg-slate-950/10 flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Developer Status:</span>
                {user.apiUnlocked ? (
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 font-bold uppercase text-[9px] rounded-sm flex items-center space-x-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Unlocked</span>
                  </span>
                ) : (
                  <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 font-bold uppercase text-[9px] rounded-sm flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-amber-400" />
                    <span>Locked</span>
                  </span>
                )}
              </div>

              {/* Sidebar Links & Navigation Actions (Exactly matching Sidebar List from Screenshot 1) */}
              <nav className="p-3 space-y-1 text-xs">
                
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 font-bold tracking-wide uppercase text-[11px] transition-all rounded-sm ${
                    activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-xs font-extrabold' : 'text-slate-400 hover:bg-slate-900/40 hover:text-white'
                  }`}
                >
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => alert("Telegram Admin Bot is LOCKED. Please request gateway unlock to configure administrative bots.")}
                  className="w-full flex items-center justify-between px-3 py-2.5 font-bold tracking-wide uppercase text-[11px] text-slate-500 hover:text-slate-400 transition-all rounded-sm"
                >
                  <div className="flex items-center space-x-3">
                    <Sliders className="w-4 h-4" />
                    <span>Telegram Admin Bot</span>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-amber-500/70" />
                </button>

                <button
                  onClick={() => setActiveTab('chat')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 font-bold tracking-wide uppercase text-[11px] transition-all rounded-sm ${
                    activeTab === 'chat' ? 'bg-blue-600 text-white font-extrabold' : 'text-slate-400 hover:bg-slate-900/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="w-4 h-4 text-sky-400" />
                    <span>Live Support Chat</span>
                  </div>
                  <Lock className="w-3.5 h-3.5 text-amber-500/70" />
                </button>

                <button
                  onClick={() => alert("My Numbers channel is locked.")}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 font-bold tracking-wide uppercase text-[11px] text-slate-400 hover:bg-slate-900/40 hover:text-white rounded-sm"
                >
                  <Phone className="w-4 h-4 text-teal-400" />
                  <span>My Numbers</span>
                </button>

                <button
                  onClick={() => alert("Get Number gateway is locked.")}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 font-bold tracking-wide uppercase text-[11px] text-slate-400 hover:bg-slate-900/40 hover:text-white rounded-sm"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Get Number</span>
                </button>

                {/* Access List item with active count 176 (Matching Screenshot 1) */}
                <button
                  onClick={() => alert("Access List config loaded with 176 verified routing threads.")}
                  className="w-full flex items-center justify-between px-3 py-2.5 font-bold tracking-wide uppercase text-[11px] text-slate-400 hover:bg-slate-900/40 hover:text-white rounded-sm"
                >
                  <div className="flex items-center space-x-3">
                    <List className="w-4 h-4 text-blue-400" />
                    <span>Access List</span>
                  </div>
                  <span className="bg-blue-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                    176
                  </span>
                </button>

                <button
                  onClick={() => alert("Sender / Range analyzer is locked.")}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 font-bold tracking-wide uppercase text-[11px] text-slate-400 hover:bg-slate-900/40 hover:text-white rounded-sm"
                >
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>Sender / Range</span>
                </button>

                {/* Dropdown menu for Test System (Matching Screenshot 1) */}
                <div className="space-y-1">
                  <button 
                    onClick={() => setTestSystemOpen(!testSystemOpen)}
                    className="w-full flex items-center justify-between px-3 py-2.5 font-bold tracking-wide uppercase text-[11px] text-slate-400 hover:bg-slate-900/40 hover:text-white rounded-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <Activity className="w-4 h-4 text-rose-400" />
                      <span>Test System</span>
                    </div>
                    {testSystemOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {testSystemOpen && (
                    <div className="pl-6 space-y-1 border-l border-slate-800 ml-5 py-1">
                      <button
                        onClick={() => setActiveTab('stream')}
                        className={`w-full flex items-center space-x-2 px-3 py-2 font-bold uppercase text-[10px] rounded-sm transition-all ${
                          activeTab === 'stream' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                        <span>Live Test SMS</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('history')}
                        className={`w-full flex items-center space-x-2 px-3 py-2 font-bold uppercase text-[10px] rounded-sm transition-all ${
                          activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 bg-slate-500 rounded-full"></span>
                        <span>SMS test history</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 font-bold tracking-wide uppercase text-[11px] transition-all rounded-sm ${
                    activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900/40 hover:text-white'
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-violet-400" />
                  <span>Profile</span>
                </button>

                {/* Admin Tab visible only if admin role */}
                {user.role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('gateways')}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 font-bold tracking-wide uppercase text-[11px] transition-all rounded-sm ${
                      activeTab === 'gateways' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900/40 hover:text-white'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-yellow-400" />
                    <span>Admin Controls</span>
                  </button>
                )}

                <button
                  onClick={onLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 font-bold tracking-wide uppercase text-[11px] text-rose-400 hover:bg-slate-900/40 hover:text-rose-200 transition-all rounded-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </nav>

            </div>

            {/* Sidebar bottom copyright matches Screenshot 1 */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
              SUPER X SMS &copy; 2026
            </div>
          </aside>
        )}

        {/* 3. Main Dashboard Workspace Content */}
        <main id="main-content" className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">
          
          {/* Breadcrumb row & Skype Info Block (Exactly matching Screenshot 2) */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center space-x-1.5">
              <span>Dashboard</span>
              <span>&gt;</span>
              <span>Test System</span>
              <span>&gt;</span>
              <span className="text-slate-900">
                {activeTab === 'stream' && 'Live Test SMS'}
                {activeTab === 'dashboard' && 'Operations Dashboard'}
                {activeTab === 'chat' && 'Support Portal Inbox'}
                {activeTab === 'settings' && 'Your Developer Profile'}
                {activeTab === 'gateways' && 'API Gateways Configuration'}
                {activeTab === 'history' && 'SMS Test History'}
              </span>
            </div>

            {/* Skype User circle avatar right block */}
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 bg-sky-500 text-white font-extrabold text-[11px] flex items-center justify-center rounded-full shadow-xs">
                S
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Skype</span>
            </div>
          </div>

          {/* 4. Top Custom Notice Card (Exactly matching Screenshot 2) */}
          {noticeVisible && (
            <div id="screenshot-notice-box" className="bg-slate-900 text-slate-100 p-3 flex items-center justify-between rounded-lg shadow-md border border-slate-800">
              <div className="flex items-center space-x-3 min-w-0 flex-1 text-xs">
                {/* Purple notice pill badge */}
                <span className="bg-indigo-600 text-white px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest rounded-sm shrink-0">
                  Notice
                </span>
                {/* Yellow gold code badge */}
                <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 text-[9px] font-extrabold font-mono rounded-sm shrink-0">
                  186277
                </span>
                <p className="font-bold truncate text-slate-300">
                  ⚡ {marqueeText}
                </p>
              </div>
              <button 
                onClick={() => setNoticeVisible(false)}
                className="text-slate-500 hover:text-white px-1.5 py-0.5 text-xs font-bold transition-colors"
                title="Dismiss Notice"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main Workspace Tabs Content */}
          <div id="tab-viewport-container">

            {/* View A: Live Test SMS Feed (Original screenshots focus) */}
            {activeTab === 'stream' && (
              <div className="space-y-6">
                <LiveTestSmsView />
              </div>
            )}

            {/* View B: Operations Dashboard (Statistics and active configs) */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 p-6 shadow-xs rounded-lg space-y-4">
                  <h3 className="font-serif text-lg font-bold text-slate-950">Operations Gateway Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 p-4 border border-slate-100 rounded-md">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Active Gateway Channels</span>
                      <span className="text-2xl font-extrabold text-slate-950">{gatewaysList.filter(g => g.status === 'active').length}</span>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-100 rounded-md">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Live SMS Memory Cache</span>
                      <span className="text-2xl font-extrabold text-slate-950">{globalSmsHits.length} Messages</span>
                    </div>
                    <div className="bg-slate-50 p-4 border border-slate-100 rounded-md">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Authenticated Clients</span>
                      <span className="text-2xl font-extrabold text-slate-950">{user.role === 'admin' ? accountsList.length : '1 Client'}</span>
                    </div>
                  </div>
                </div>

                {/* Top Apps Channel Metrics */}
                <div id="top-apps-module" className="bg-white border border-slate-200 p-6 shadow-xs rounded-lg">
                  <h3 className="font-serif text-lg font-bold text-slate-950 mb-4">Top SMS Target Channels</h3>
                  <div className="space-y-4">
                    {appsList.length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium">No SMS target metrics logged yet.</p>
                    ) : (
                      appsList.map(app => {
                        const maxCount = Math.max(...appsList.map(a => a.count), 1);
                        const percent = Math.min((app.count / maxCount) * 100, 100);
                        return (
                          <div key={app.id} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-700">{app.name}</span>
                              <span className="text-slate-500">{app.count} Hits</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-slate-900 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* View C: Profile and Developer Settings */}
            {activeTab === 'settings' && (
              <div id="settings-tab-screen" className="max-w-3xl space-y-6">
                
                {/* API Key Box */}
                <div id="api-key-card" className="bg-white border border-slate-200 p-6 shadow-xs rounded-lg">
                  <h3 className="font-serif text-lg font-bold text-slate-950 mb-2 flex items-center space-x-2">
                    <Key className="w-5 h-5 text-slate-700" />
                    <span>Private Access API Key</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    Use this API key in your third-party developer software to route real-time OTP checks and messages instantly.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Developer API Key
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-grow font-mono text-sm bg-slate-50 border border-slate-200 px-4 py-2.5 flex items-center justify-between select-all">
                          <span>{apiKeyVisible ? user.apiKey : '••••••••••••••••••••••••••••••••••••••••'}</span>
                          <button
                            id="toggle-api-visibility-btn"
                            type="button"
                            onClick={() => setApiKeyVisible(!apiKeyVisible)}
                            className="text-slate-400 hover:text-slate-900 transition-colors"
                          >
                            {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <button
                          id="copy-api-key-btn"
                          type="button"
                          onClick={() => handleCopyKey(user.apiKey)}
                          className="px-4 py-2.5 border border-slate-200 hover:border-slate-950 text-slate-700 hover:text-slate-950 bg-white font-bold text-sm uppercase transition-all flex items-center space-x-2"
                        >
                          {copiedKey ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy Key</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* API unlocked status / toggle unlock */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                          API Gateway Access Status
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${user.apiUnlocked ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <span className="text-sm font-bold text-slate-900">{user.apiUnlocked ? 'UNLOCKED / ACTIVE' : 'LOCKED'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API curl documentation box */}
                <div id="api-doc-card" className="bg-white border border-slate-200 p-6 shadow-xs rounded-lg">
                  <h3 className="font-serif text-lg font-bold text-slate-950 mb-2">Developer API Documentation</h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Retrieve live received messages in JSON format from any terminal or server code:
                  </p>

                  <div className="bg-slate-900 text-slate-200 font-mono text-xs p-4 overflow-x-auto border-l-4 border-slate-500">
                    <p className="text-slate-500"># Fetch live messages with curl</p>
                    <p className="mt-1">
                      curl -X GET "https://{window.location.host}/api/v1/sms?key={user.apiKey}"
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* View D: Admin Controls (Configure Gateways and Accounts) */}
            {activeTab === 'gateways' && user.role === 'admin' && (
              <div className="space-y-6">
                
                {/* Global Announcement Broadcaster */}
                <div id="marquee-editor-card" className="bg-white border border-slate-200 p-6 shadow-xs rounded-lg max-w-3xl">
                  <h3 className="font-serif text-lg font-bold text-slate-950 mb-2 flex items-center space-x-2">
                    <Megaphone className="w-5 h-5 text-slate-700" />
                    <span>Global Announcement Broadcaster</span>
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    The updated notice text will be broadcast globally across all headers in real-time.
                  </p>
                  <div className="space-y-4">
                    <textarea
                      rows={2}
                      value={marqueeText}
                      onChange={(e) => setMarqueeText(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm font-medium"
                      placeholder="Enter Global notice text..."
                    />
                    <button
                      onClick={handleSaveMarquee}
                      className="py-2 px-5 bg-slate-950 hover:bg-slate-850 text-white font-bold text-xs uppercase tracking-wider rounded-none"
                    >
                      Broadcast Announcement
                    </button>
                  </div>
                </div>

                {/* Add Gateway Form */}
                <div id="add-gateway-card" className="bg-white border border-slate-200 p-6 shadow-xs rounded-lg max-w-3xl">
                  <h3 className="font-serif text-lg font-bold text-slate-950 mb-4 flex items-center space-x-2">
                    <Sliders className="w-5 h-5 text-slate-800" />
                    <span>Add Live SMS Gateway Channel</span>
                  </h3>
                  <form onSubmit={handleAddGateway} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Gateway Channel Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. FoxSms Global Port"
                          value={newGateName}
                          onChange={(e) => setNewGateName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">API Class/Type</label>
                        <select
                          value={newGateType}
                          onChange={(e) => setNewGateType(e.target.value as 'voltx' | 'fox' | 'plusonetel' | 'sevenonetel')}
                          className="w-full px-3 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm bg-white"
                        >
                          <option value="voltx">VoltSMS / Voltx (Standard)</option>
                          <option value="fox">FoxSms (Alternative)</option>
                          <option value="plusonetel">PlusOneTel (+1Tel Portal)</option>
                          <option value="sevenonetel">SevenOneTel (71Tel Portal)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">API Endpoint URL</label>
                      <input
                        type="url"
                        required
                        placeholder="e.g. https://foxsms.org/api/v1/sms/history"
                        value={newGateUrl}
                        onChange={(e) => setNewGateUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">API Key/Token</label>
                        <input
                          type="text"
                          placeholder="e.g. KEY123X7"
                          value={newGateKey}
                          onChange={(e) => setNewGateKey(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Slug Parameter (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. 00"
                          value={newGateSlug}
                          onChange={(e) => setNewGateSlug(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm"
                        />
                      </div>
                    </div>
                    <button type="submit" className="py-2 px-5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-none flex items-center space-x-1.5">
                      <Plus className="w-4 h-4" />
                      <span>Deploy Gateway Channel</span>
                    </button>
                  </form>
                </div>

                {/* Gateway Pipelines List */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="font-serif text-lg font-bold text-slate-950">Active Gateway Pipelines</h3>
                  </div>
                  {gatewaysList.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 font-medium">
                      No active gateway channels configured yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {gatewaysList.map(gate => (
                        <div key={gate.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-serif text-base font-bold text-slate-950">{gate.name}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 border bg-indigo-50 border-indigo-200 text-indigo-700 uppercase rounded-full">
                                {gate.type}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase rounded-full ${gate.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                {gate.status}
                              </span>
                            </div>
                            <p className="font-mono text-xs text-slate-500 mt-1.5 break-all">{gate.url}</p>
                            <p className="text-xs text-slate-400 mt-1">Key: <span className="font-mono bg-slate-100 text-slate-700 px-1">{gate.apiKey || 'None'}</span> {gate.slug ? `| Slug: ${gate.slug}` : ''}</p>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleGatewayStatus(gate.id)}
                              className={`p-2 border rounded-none transition-colors ${gate.status === 'active' ? 'border-slate-200 hover:border-slate-900 text-slate-600 hover:text-slate-900' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGateway(gate.id)}
                              className="p-2 border border-slate-200 hover:border-rose-900 text-slate-600 hover:text-rose-700 rounded-none transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Manage Accounts panel inside Admin View */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h3 className="font-serif text-lg font-bold text-slate-950">Approve and Manage Enterprise Client Accounts</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                          <th className="px-6 py-3.5">Account Profile</th>
                          <th className="px-6 py-3.5">Code</th>
                          <th className="px-6 py-3.5">Username</th>
                          <th className="px-6 py-3.5">Status</th>
                          <th className="px-6 py-3.5">API Gateway Status</th>
                          <th className="px-6 py-3.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {accountsList.map(acc => (
                          <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{acc.name}</div>
                              <div className="text-xs text-slate-400 font-normal">{acc.email}</div>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs whitespace-nowrap text-slate-600">
                              {acc.accountCode}
                            </td>
                            <td className="px-6 py-4 text-slate-700">
                              {acc.username}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 border text-xs font-bold rounded-full ${
                                acc.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                              }`}>
                                {acc.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 border text-xs font-bold rounded-full ${
                                acc.apiUnlocked ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400'
                              }`}>
                                {acc.apiUnlocked ? 'Active Access' : 'Locked'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                {acc.status === 'pending' && (
                                  <button
                                    onClick={() => handleUpdateAccount(acc.id, { status: 'active' })}
                                    className="p-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all flex items-center space-x-1 font-bold text-xs"
                                  >
                                    <span>Approve</span>
                                  </button>
                                )}
                                {acc.status === 'active' && acc.id !== user.id && (
                                  <button
                                    onClick={() => handleUpdateAccount(acc.id, { status: 'suspended' })}
                                    className="p-1.5 border border-rose-100 hover:border-rose-300 bg-rose-50 text-rose-600 hover:text-rose-700 transition-all flex items-center space-x-1 font-bold text-xs"
                                  >
                                    <span>Suspend</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleUpdateAccount(acc.id, { apiUnlocked: !acc.apiUnlocked })}
                                  className={`p-1.5 border transition-all flex items-center space-x-1 font-bold text-xs ${
                                    acc.apiUnlocked ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-slate-200 hover:border-slate-900 text-slate-700'
                                  }`}
                                >
                                  <span>API {acc.apiUnlocked ? 'Lock' : 'Unlock'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* View E: Support Message Chat Lobby */}
            {activeTab === 'chat' && (
              <div id="chat-tab-screen" className="max-w-4xl bg-white border border-slate-200 shadow-sm flex flex-col h-[600px] rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-slate-950">Global Portal Support Lobby</h3>
                    <p className="text-xs text-slate-500">Ask administrative questions or request gateway unlock directly</p>
                  </div>
                </div>

                <div className="flex-grow p-6 overflow-y-auto space-y-4 bg-[#FAFBFD]">
                  {chatsList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">No Support Messages yet</p>
                    </div>
                  ) : (
                    chatsList.map((msg) => {
                      const isSelf = msg.sender === user.name;
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 mb-1">
                            <span className={msg.role === 'admin' ? 'text-rose-500' : 'text-slate-600'}>
                              {msg.sender} ({msg.role.toUpperCase()})
                            </span>
                            <span className="font-normal text-[10px] text-slate-400">
                              {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className={`max-w-md px-4 py-2.5 shadow-xs text-sm border leading-relaxed ${
                            isSelf 
                              ? 'bg-slate-900 border-slate-950 text-white' 
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendChat} className="p-4 border-t border-slate-200 bg-white flex items-center space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your message to support..."
                    className="flex-grow px-4 py-2.5 text-sm border border-slate-200 focus:border-slate-950 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-none transition-colors flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* View F: SMS Test History (Coming Soon layout matching aesthetic) */}
            {activeTab === 'history' && (
              <div className="bg-white border border-slate-200 p-6 shadow-xs rounded-lg text-center py-16 space-y-4">
                <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center mx-auto mb-4 bg-slate-50">
                  <List className="w-6 h-6 text-slate-400" />
                </div>
                <h4 className="font-serif text-base font-bold text-slate-900 mb-1">SMS Test History Log</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Historical routing records are kept for up to 30 days. To clear live logs immediately, use the active feed dashboard controls.
                </p>
              </div>
            )}

          </div>
        </main>

      </div>

      {/* 5. Floating Chat bubble Action Button (Exactly matching Screenshot 2) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => setActiveTab('chat')}
          className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center rounded-full shadow-lg hover:scale-105 transition-all focus:outline-none"
          title="Open Support Chat"
        >
          <MessageSquare className="w-6 h-6 fill-white" />
        </button>
      </div>

    </div>
  );
}
