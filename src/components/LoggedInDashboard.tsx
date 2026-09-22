import React, { useState, useEffect, useRef } from 'react';
import { User } from '../App';
import LiveTestSmsView, { SmsHit } from './LiveTestSmsView';
import { 
  LogOut, Shield, Settings, Key, Send, Users, Activity, Sliders, MessageSquare, 
  Megaphone, Plus, Trash2, Power, Eye, EyeOff, Check, Copy, UserCheck, UserMinus, ToggleLeft, ToggleRight, Radio
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
  const [activeTab, setActiveTab] = useState<'stream' | 'settings' | 'gateways' | 'users' | 'chat'>('stream');
  
  // States for user profiles
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Global/Admin States
  const [accountsList, setAccountsList] = useState<User[]>([]);
  const [gatewaysList, setGatewaysList] = useState<GatewayConfig[]>([]);
  const [chatsList, setChatsList] = useState<ChatMsg[]>([]);
  const [marqueeText, setMarqueeText] = useState('');
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
        setMarqueeText(data.text || '');
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
    } catch (e) {
      console.error(e);
    }
  };

  // Request Unlock for User APIs
  const handleRequestUnlock = () => {
    const supportRequestText = `Hello Admin, I would like to request API gateway access for my account ${user.username} (${user.accountCode}). Please approve!`;
    fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: user.name,
        role: user.role,
        text: supportRequestText
      })
    }).then(res => {
      if (res.ok) {
        alert("Unlock request sent to Admin via Support Chat!");
        fetchData();
      }
    });
  };

  return (
    <div id="dashboard-layout" className="min-h-screen flex flex-col md:flex-row bg-[#FAFBFD] text-slate-800 font-sans">
      
      {/* Sidebar Navigation */}
      <div id="sidebar-nav" className="w-full md:w-64 bg-slate-900 text-slate-200 flex flex-col justify-between border-r border-slate-800">
        
        <div id="sidebar-top">
          {/* Logo & Portal Info */}
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-none bg-white text-slate-950 font-serif font-extrabold flex items-center justify-center text-xl shadow-sm">
              X
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold tracking-tight text-white leading-none">SUPER X SMS</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Routing Gateway</p>
            </div>
          </div>

          {/* Profile Quick Summary */}
          <div className="p-4 bg-slate-950/40 border-b border-slate-800 text-xs">
            <p className="text-slate-400 font-medium">Signed in as:</p>
            <p className="text-white font-bold truncate mt-0.5">{user.name}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-wider bg-slate-900 px-1.5 py-0.5 rounded-sm inline-block">
              {user.role} Code: {user.accountCode}
            </p>
          </div>

          {/* Tab Buttons */}
          <div className="p-3 space-y-1">
            <button
              id="tab-stream-btn"
              type="button"
              className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === 'stream' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('stream')}
            >
              <Activity className="w-4 h-4" />
              <span>Live SMS Stream</span>
            </button>

            <button
              id="tab-chat-btn"
              type="button"
              className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === 'chat' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Support Chat</span>
            </button>

            {user.role === 'admin' && (
              <>
                <button
                  id="tab-gateways-btn"
                  type="button"
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === 'gateways' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  onClick={() => setActiveTab('gateways')}
                >
                  <Sliders className="w-4 h-4" />
                  <span>API Gateways</span>
                </button>

                <button
                  id="tab-users-btn"
                  type="button"
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === 'users' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  onClick={() => setActiveTab('users')}
                >
                  <Users className="w-4 h-4" />
                  <span>Manage Users</span>
                </button>
              </>
            )}

            <button
              id="tab-settings-btn"
              type="button"
              className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="w-4 h-4" />
              <span>API Keys & Info</span>
            </button>
          </div>
        </div>

        {/* Logout Section */}
        <div id="sidebar-bottom" className="p-3 border-t border-slate-800">
          <button
            id="logout-btn"
            type="button"
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 text-sm font-semibold text-rose-400 hover:text-rose-200 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>

      {/* Main Content Area */}
      <div id="main-content" className="flex-1 flex flex-col justify-between overflow-hidden min-h-screen">
        
        {/* Top Navbar */}
        <div id="top-navbar" className="bg-white border-b border-slate-200 py-4 px-6 md:px-8 flex items-center justify-between shadow-xs">
          <h1 className="font-serif text-2xl font-black text-slate-950 capitalize">
            {activeTab === 'stream' && 'Live SMS Dashboard'}
            {activeTab === 'chat' && 'Support Message Inbox'}
            {activeTab === 'gateways' && 'API Gateway Manager'}
            {activeTab === 'users' && 'Account & Permissions Manager'}
            {activeTab === 'settings' && 'Your Developer Portal'}
          </h1>

          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>System Operational</span>
          </div>
        </div>

        {/* Core Screen Views */}
        <div id="screen-viewport" className="flex-grow p-6 md:p-8 overflow-y-auto">

          {/* Tab 1: Live SMS Stream View */}
          {activeTab === 'stream' && (
            <div id="stream-tab-screen" className="space-y-6">
              
              {/* Stats Highlights Header */}
              <div id="stats-highlight-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div id="stat-card-total-hits" className="bg-white border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Channels</span>
                    <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                  </div>
                  <h3 className="font-serif text-3xl font-extrabold text-slate-950">
                    {gatewaysList.filter(g => g.status === 'active').length}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Total active SMS gateway fetchers</p>
                </div>

                <div id="stat-card-approved" className="bg-white border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live SMS Logs</span>
                    <Activity className="w-4 h-4 text-indigo-500" />
                  </div>
                  <h3 className="font-serif text-3xl font-extrabold text-slate-950">
                    {globalSmsHits.length}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Real-time incoming SMS count in memory</p>
                </div>

                <div id="stat-card-status" className="bg-white border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Account Status</span>
                    <Shield className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="font-serif text-xl font-extrabold text-slate-950 capitalize flex items-center space-x-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    <span>{user.status}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">API Key: <span className="font-mono bg-slate-100 px-1 rounded-sm">{user.apiUnlocked ? 'Unlocked' : 'Locked'}</span></p>
                </div>

              </div>

              {/* Top Apps visual horizontal list */}
              <div id="top-apps-module" className="bg-white border border-slate-200 p-6 shadow-xs">
                <h3 className="font-serif text-lg font-bold text-slate-950 mb-4">Top SMS Target Channels</h3>
                <div className="space-y-4">
                  {appsList.map(app => {
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
                  })}
                </div>
              </div>

              {/* Live received messages stream logs list */}
              <LiveTestSmsView />

            </div>
          )}

          {/* Tab 2: Settings / API Key Portal View */}
          {activeTab === 'settings' && (
            <div id="settings-tab-screen" className="max-w-3xl space-y-6">
              
              {/* API Key Box */}
              <div id="api-key-card" className="bg-white border border-slate-200 p-6 shadow-xs">
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

                    {!user.apiUnlocked && (
                      <button
                        id="request-unlock-btn"
                        type="button"
                        onClick={handleRequestUnlock}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-colors rounded-none"
                      >
                        Request API Gateway Unlock
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* API curl documentation box */}
              <div id="api-doc-card" className="bg-white border border-slate-200 p-6 shadow-xs">
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

          {/* Tab 3: Admin API Gateway Manager View */}
          {activeTab === 'gateways' && user.role === 'admin' && (
            <div id="gateways-tab-screen" className="space-y-6">
              
              {/* Add New Gateway Form */}
              <div id="add-gateway-card" className="bg-white border border-slate-200 p-6 shadow-xs max-w-3xl">
                <h3 className="font-serif text-lg font-bold text-slate-950 mb-4">Add Live SMS Gateway Channel</h3>
                
                <form id="add-gateway-form" onSubmit={handleAddGateway} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div id="gate-name-group">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Gateway Channel Name
                      </label>
                      <input
                        id="gate-name-input"
                        type="text"
                        required
                        placeholder="e.g. VoltSMS Global Channel"
                        value={newGateName}
                        onChange={(e) => setNewGateName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm"
                      />
                    </div>

                    <div id="gate-type-group">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Channel API Class/Type
                      </label>
                      <select
                        id="gate-type-select"
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

                  <div id="gate-url-group">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      API Endpoint URL
                    </label>
                    <input
                      id="gate-url-input"
                      type="url"
                      required
                      placeholder="e.g. https://voltsms.store/api/v1/sms/history"
                      value={newGateUrl}
                      onChange={(e) => setNewGateUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div id="gate-key-group">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        API Key/Token
                      </label>
                      <input
                        id="gate-key-input"
                        type="text"
                        placeholder="e.g. M7ANNWJY6B2"
                        value={newGateKey}
                        onChange={(e) => setNewGateKey(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm"
                      />
                    </div>

                    <div id="gate-slug-group">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Slug Parameter (Optional)
                      </label>
                      <input
                        id="gate-slug-input"
                        type="text"
                        placeholder="e.g. 00"
                        value={newGateSlug}
                        onChange={(e) => setNewGateSlug(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  <button
                    id="add-gate-submit"
                    type="submit"
                    className="py-2 px-5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-none flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Deploy Gateway</span>
                  </button>
                </form>
              </div>

              {/* Current Active Gateways */}
              <div id="gateways-list-card" className="bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="font-serif text-lg font-bold text-slate-950">Active Gateway Pipelines</h3>
                </div>

                {gatewaysList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    No active gateways configured. SMS streams are empty.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {gatewaysList.map(gate => (
                      <div key={gate.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-serif text-base font-bold text-slate-950">{gate.name}</h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase rounded-full ${
                              gate.type === 'voltx' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                              gate.type === 'fox' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                              gate.type === 'plusonetel' ? 'bg-pink-50 border-pink-200 text-pink-700' :
                              'bg-teal-50 border-teal-200 text-teal-700'
                            }`}>
                              {gate.type}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 border uppercase rounded-full ${gate.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                              {gate.status}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-slate-500 mt-1.5 break-all">{gate.url}</p>
                          <p className="text-xs text-slate-400 mt-1">Key: <span className="font-mono bg-slate-100 text-slate-700 px-1">{gate.apiKey || 'None'}</span> {gate.slug ? `| Slug: ${gate.slug}` : ''}</p>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            id={`toggle-gate-status-${gate.id}`}
                            type="button"
                            onClick={() => handleToggleGatewayStatus(gate.id)}
                            className={`p-2 border rounded-none transition-colors ${gate.status === 'active' ? 'border-slate-200 hover:border-slate-900 text-slate-600 hover:text-slate-900' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                            title={gate.status === 'active' ? 'Deactivate Channel' : 'Activate Channel'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            id={`delete-gate-${gate.id}`}
                            type="button"
                            onClick={() => handleDeleteGateway(gate.id)}
                            className="p-2 border border-slate-200 hover:border-rose-900 text-slate-600 hover:text-rose-700 rounded-none transition-colors"
                            title="Delete Channel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Global Marquee Notice Editor */}
              <div id="marquee-editor-card" className="bg-white border border-slate-200 p-6 shadow-xs max-w-3xl">
                <h3 className="font-serif text-lg font-bold text-slate-950 mb-2 flex items-center space-x-2">
                  <Megaphone className="w-5 h-5 text-slate-700" />
                  <span>Update Global Announcement Announcement Notice</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  The updated notice banner text will be broadcast globally across all user and admin panels in real-time.
                </p>

                <div className="space-y-4">
                  <textarea
                    id="marquee-textarea"
                    rows={2}
                    value={marqueeText}
                    onChange={(e) => setMarqueeText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-slate-950 focus:outline-none text-sm font-medium"
                    placeholder="Enter Global notice text..."
                  />
                  <button
                    id="save-marquee-btn"
                    type="button"
                    onClick={handleSaveMarquee}
                    className="py-2 px-5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-none"
                  >
                    Broadcast Announcement
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Tab 4: Admin Accounts View */}
          {activeTab === 'users' && user.role === 'admin' && (
            <div id="users-tab-screen" className="bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="font-serif text-lg font-bold text-slate-950">Approved and Pending Enterprise Accounts</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                      <th className="px-6 py-3.5">Account Profile</th>
                      <th className="px-6 py-3.5">Code</th>
                      <th className="px-6 py-3.5">Username</th>
                      <th className="px-6 py-3.5">Account Status</th>
                      <th className="px-6 py-3.5">API Gateway Access</th>
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
                            acc.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            acc.status === 'suspended' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                            'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {acc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 border text-xs font-bold rounded-full ${
                            acc.apiUnlocked ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}>
                            {acc.apiUnlocked ? 'Access Active' : 'Locked'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            {acc.status === 'pending' && (
                              <button
                                id={`approve-user-${acc.id}`}
                                type="button"
                                onClick={() => handleUpdateAccount(acc.id, { status: 'active' })}
                                className="p-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all flex items-center space-x-1 font-bold text-xs"
                                title="Approve Account"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {acc.status === 'active' && acc.id !== user.id && (
                              <button
                                id={`suspend-user-${acc.id}`}
                                type="button"
                                onClick={() => handleUpdateAccount(acc.id, { status: 'suspended' })}
                                className="p-1.5 border border-rose-100 hover:border-rose-300 bg-rose-50 text-rose-600 hover:text-rose-700 transition-all flex items-center space-x-1 font-bold text-xs"
                                title="Suspend Account"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                <span>Suspend</span>
                              </button>
                            )}

                            {acc.status === 'suspended' && (
                              <button
                                id={`unsuspend-user-${acc.id}`}
                                type="button"
                                onClick={() => handleUpdateAccount(acc.id, { status: 'active' })}
                                className="p-1.5 border border-slate-200 hover:border-slate-900 bg-slate-50 text-slate-700 hover:text-slate-950 transition-all flex items-center space-x-1 font-bold text-xs"
                                title="Unsuspend Account"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Activate</span>
                              </button>
                            )}

                            {acc.status !== 'pending' && (
                              <button
                                id={`toggle-api-${acc.id}`}
                                type="button"
                                onClick={() => handleUpdateAccount(acc.id, { apiUnlocked: !acc.apiUnlocked })}
                                className={`p-1.5 border transition-all flex items-center space-x-1 font-bold text-xs ${
                                  acc.apiUnlocked ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-slate-200 hover:border-slate-900 text-slate-700'
                                }`}
                                title={acc.apiUnlocked ? 'Lock API' : 'Unlock API'}
                              >
                                {acc.apiUnlocked ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                <span>API {acc.apiUnlocked ? 'Lock' : 'Unlock'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Support Chat View */}
          {activeTab === 'chat' && (
            <div id="chat-tab-screen" className="max-w-4xl bg-white border border-slate-200 shadow-sm flex flex-col h-[600px] rounded-none overflow-hidden">
              
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-950">Global Portal Support Lobby</h3>
                  <p className="text-xs text-slate-500">Ask administrative questions or request gateway unlock directly</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div id="chat-messages-container" className="flex-grow p-6 overflow-y-auto space-y-4 bg-[#FAFBFD]">
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

              {/* Chat Input */}
              <form id="chat-input-form" onSubmit={handleSendChat} className="p-4 border-t border-slate-200 bg-white flex items-center space-x-2">
                <input
                  id="chat-message-input"
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your message to support..."
                  className="flex-grow px-4 py-2.5 text-sm border border-slate-200 focus:border-slate-950 focus:outline-none"
                />
                <button
                  id="send-chat-submit"
                  type="submit"
                  className="p-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-none transition-colors flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>
          )}

        </div>

        {/* Global Footer */}
        <div id="viewport-footer" className="bg-white border-t border-slate-200 py-4 px-6 md:px-8 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} SUPER X SMS Routing Gateway. Active developer channels are fully persistent.
        </div>

      </div>

    </div>
  );
}
