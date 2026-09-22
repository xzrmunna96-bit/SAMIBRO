import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Copy, 
  Check, 
  Clock, 
  Globe, 
  Shield, 
  RefreshCw, 
  Volume2, 
  Trash2, 
  Download, 
  Mail, 
  MessageSquare, 
  Send, 
  Chrome, 
  Facebook, 
  Flame, 
  Plus,
  MessageCircle
} from 'lucide-react';

export interface SmsHit {
  id: string;
  number: string;
  message: string;
  time: number | string;
  service: string;
  country: string;
  code: string;
  source: string;
}

export default function LiveTestSmsView() {
  const [smsHits, setSmsHits] = useState<SmsHit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState('All');
  const [perPage, setPerPage] = useState(200);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const fetchHits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/live-stream');
      if (res.ok) {
        const data = await res.json();
        setSmsHits(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    
    const poll = async () => {
      try {
        const res = await fetch('/api/live-stream');
        if (res.ok) {
          const data = await res.json();
          if (active) {
            setSmsHits(data);
          }
        }
      } catch (e) {
        // silent skip
      }
    };

    poll();
    const intervalId = setInterval(poll, 3000); // Poll every 3 seconds

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleCopy = (id: string, text: string, type: 'num' | 'code' | 'all') => {
    navigator.clipboard.writeText(text);
    const uniqueId = `${id}-${type}`;
    setCopiedId(uniqueId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = async () => {
    if (window.confirm("Are you sure you want to clear the live stream logs?")) {
      try {
        await fetch('/api/live-stream', { method: 'DELETE' });
        setSmsHits([]);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(smsHits, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sms_hits_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Helper to mask phone numbers exactly like the screenshots (e.g., 261343XXXX)
  const maskPhoneNumber = (num: string) => {
    if (!num) return 'Unknown';
    if (num.length <= 4) return num;
    return num.slice(0, -4) + 'XXXX';
  };

  // Country Flag Emoji Map
  const getCountryFlag = (country: string) => {
    const c = country.toLowerCase();
    if (c.includes('madagascar')) return '🇲🇬';
    if (c.includes('togo')) return '🇹🇬';
    if (c.includes('bangladesh') || c.includes('bd')) return '🇧🇩';
    if (c.includes('united kingdom') || c.includes('uk')) return '🇬🇧';
    if (c.includes('united states') || c.includes('usa')) return '🇺🇸';
    if (c.includes('india')) return '🇮🇳';
    if (c.includes('pakistan')) return '🇵🇰';
    return '🌐';
  };

  // Country Carrier Map to simulate real carrier strings from the screenshots
  const getCountryCarrier = (country: string) => {
    const c = country.toLowerCase();
    if (c.includes('madagascar')) return 'Telma Madagascar';
    if (c.includes('togo')) return 'Moov Togo GSM';
    if (c.includes('bangladesh')) return 'Teletalk BD';
    if (c.includes('united kingdom') || c.includes('uk')) return 'EE Limited';
    if (c.includes('united states') || c.includes('usa')) return 'T-Mobile US';
    return 'GSM Carrier';
  };

  const getServiceIconAndColor = (service: string) => {
    const s = service.toLowerCase();
    if (s.includes('whatsapp')) return { icon: MessageSquare, colorClass: 'text-emerald-500 bg-emerald-50 border-emerald-200' };
    if (s.includes('telegram')) return { icon: Send, colorClass: 'text-sky-500 bg-sky-50 border-sky-200' };
    if (s.includes('google')) return { icon: Chrome, colorClass: 'text-blue-500 bg-blue-50 border-blue-200' };
    if (s.includes('facebook')) return { icon: Facebook, colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
    if (s.includes('tinder')) return { icon: Flame, colorClass: 'text-rose-500 bg-rose-50 border-rose-200' };
    return { icon: MessageCircle, colorClass: 'text-slate-500 bg-slate-50 border-slate-200' };
  };

  // Extract unique services for filtering
  const services = ['All', ...Array.from(new Set(smsHits.map(h => h.service).filter(Boolean)))];

  const filteredHits = smsHits.filter(hit => {
    const matchesSearch = 
      hit.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hit.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hit.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hit.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hit.code.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesService = filterService === 'All' || hit.service === filterService;

    return matchesSearch && matchesService;
  });

  const formatAbsoluteTime = (time: number | string) => {
    try {
      const d = new Date(time);
      if (isNaN(d.getTime())) return String(time);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch (e) {
      return String(time);
    }
  };

  return (
    <div id="live-sms-view-restored" className="space-y-6">
      
      {/* 1. TODAY'S MESSAGES Card (Exactly matching Screenshot 2) */}
      <div id="metric-card-todays-messages" className="bg-white border border-slate-200 p-6 shadow-xs flex items-center justify-between rounded-lg">
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Today's Messages</span>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{smsHits.length}</span>
            <span className="bg-emerald-500/10 text-emerald-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block">
              Today
            </span>
          </div>
          <p className="text-xs text-slate-500">Total Received Live Messages</p>
        </div>
        <div className="w-12 h-12 bg-slate-50 border border-slate-100 flex items-center justify-center rounded-lg text-emerald-500 shadow-xs">
          <Mail className="w-6 h-6 stroke-[1.5]" />
        </div>
      </div>

      {/* 2. Live Test SMS Feed Header Box */}
      <div className="bg-white border border-slate-200 p-6 shadow-sm rounded-lg space-y-6">
        
        {/* Header Title and Sound Status */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-lg text-slate-900 tracking-tight">Live Test SMS Feed</h3>
            <span className="bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
              SUPER X SMS
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 border rounded-sm transition-colors ${soundEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
              title="Toggle Audio Notifications"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold uppercase px-2 py-1 rounded-full flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span>Connected</span>
            </span>
          </div>
        </div>

        {/* Control Button Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-500 text-white text-xs font-bold uppercase px-3 py-1.5 rounded-sm flex items-center space-x-1 tracking-wider shadow-xs animate-pulse">
              <span>((•)) LIVE</span>
            </span>
            <button 
              onClick={fetchHits}
              disabled={loading}
              className="px-3.5 py-1.5 border border-slate-200 hover:border-slate-900 text-slate-700 hover:text-slate-950 bg-white font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button 
              onClick={handleClear}
              className="px-3.5 py-1.5 border border-slate-200 hover:border-slate-900 text-slate-700 hover:text-slate-950 bg-white font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            <button 
              onClick={handleExport}
              className="px-3.5 py-1.5 border border-slate-200 hover:border-slate-900 text-slate-700 hover:text-slate-950 bg-white font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 focus:border-slate-900 focus:outline-none bg-white font-bold uppercase tracking-wide"
            >
              {services.map(s => (
                <option key={s} value={s}>{s} Channels</option>
              ))}
            </select>
          </div>
        </div>

        {/* Real-time Search Box */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by OTP code, phone number, service, message, o..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 focus:border-slate-950 focus:outline-none transition-all placeholder-slate-400 font-medium"
          />
        </div>

        {/* Details & Pagination Stats */}
        <div className="flex flex-wrap items-center justify-between pt-2 text-xs text-slate-500 font-semibold uppercase tracking-wider border-t border-slate-100">
          <div className="flex items-center space-x-3">
            <span>Per page</span>
            <select 
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="border border-slate-200 bg-white px-2 py-1 text-slate-700 focus:outline-none rounded-none"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
          <div className="flex items-center space-x-3">
            <button disabled className="px-2.5 py-1 border border-slate-100 text-slate-300 bg-slate-50 text-xs rounded-sm">
              &lt; Prev
            </button>
            <span className="text-slate-600 font-bold">Page 1 of 1</span>
            <button disabled className="px-2.5 py-1 border border-slate-100 text-slate-300 bg-slate-50 text-xs rounded-sm">
              Next &gt;
            </button>
          </div>
          <div>
            <span className="text-slate-800 font-bold">{filteredHits.length}</span> / {smsHits.length} messages
          </div>
        </div>

        {/* 3. Messages List Cards (Replaces the generic table to match Screenshot 2) */}
        {filteredHits.length === 0 ? (
          <div id="no-hits-placeholder" className="py-16 text-center">
            <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center mx-auto mb-4 bg-slate-50 animate-pulse">
              <Clock className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="font-serif text-base font-bold text-slate-900 mb-1">No Active Stream Logs Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Waiting for real-time messages to arrive from FoxSms, PlusOneTel, or SevenOneTel channels.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {filteredHits.slice(0, perPage).map((hit) => {
              const serviceConfig = getServiceIconAndColor(hit.service);
              const ServiceIcon = serviceConfig.icon;
              return (
                <div 
                  key={hit.id} 
                  id={`sms-card-${hit.id}`}
                  className="bg-white border border-slate-200 p-4 rounded-md shadow-xs space-y-3 relative overflow-hidden hover:border-slate-300 transition-all duration-200"
                >
                  
                  {/* Top Header Row (Flag, Country, Carrier Network, Absolute Time) */}
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg leading-none">{getCountryFlag(hit.country)}</span>
                      <span className="text-slate-900 uppercase tracking-wider">{hit.country}</span>
                      <span className="bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-sm font-semibold text-[10px]">
                        {getCountryCarrier(hit.country)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <span className="text-slate-500 font-bold">1s ago</span>
                      <span>{formatAbsoluteTime(hit.time)}</span>
                    </div>
                  </div>

                  {/* Sender Number and Service badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs">
                    <div className="flex items-center space-x-3">
                      
                      {/* Masked Sender Number */}
                      <div className="font-mono text-slate-900 font-bold bg-slate-50 border border-slate-100 px-2.5 py-1 flex items-center space-x-1.5">
                        <span>{maskPhoneNumber(hit.number)}</span>
                        <button
                          onClick={() => handleCopy(hit.id, hit.number, 'num')}
                          className="hover:bg-slate-200 p-0.5 rounded-sm transition-colors text-slate-400 hover:text-slate-700"
                          title="Copy Mobile"
                        >
                          {copiedId === `${hit.id}-num` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Service Brand Badge */}
                      <span className={`inline-flex items-center px-2 py-1 border text-[11px] font-bold rounded-sm space-x-1 ${serviceConfig.colorClass}`}>
                        <ServiceIcon className="w-3.5 h-3.5" />
                        <span>{hit.service}</span>
                      </span>

                    </div>

                    {/* Copy Message Action Button */}
                    <button
                      onClick={() => handleCopy(hit.id, hit.message, 'all')}
                      className="inline-flex items-center text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider space-x-1"
                    >
                      <span>Copy Message</span>
                      {copiedId === `${hit.id}-all` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Monospace Message Content Box */}
                  <div className="bg-slate-50 border border-slate-100 p-3 text-xs font-mono text-slate-800 leading-relaxed font-semibold">
                    {hit.message}
                  </div>

                  {/* Circle action Plus Button bottom right */}
                  <div className="absolute bottom-3.5 right-3.5">
                    <button className="w-6 h-6 bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center rounded-full transition-all shadow-xs">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
