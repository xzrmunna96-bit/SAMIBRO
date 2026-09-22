import React, { useState, useEffect } from 'react';
import { Search, Copy, Check, Clock, Globe, Shield, RefreshCw } from 'lucide-react';

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
  }, []); // EMPTY dependency array to prevent any setState infinite update loops!

  const handleCopy = (id: string, text: string, type: 'num' | 'code' | 'all') => {
    navigator.clipboard.writeText(text);
    const uniqueId = `${id}-${type}`;
    setCopiedId(uniqueId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getServiceBadgeClass = (service: string) => {
    const s = service.toLowerCase();
    if (s.includes('whatsapp')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('telegram')) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (s.includes('google')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('facebook')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (s.includes('tinder')) return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getCountryBadgeClass = (country: string) => {
    const c = country.toLowerCase();
    if (c.includes('bangladesh')) return 'bg-green-50 text-green-700 border-green-200';
    if (c.includes('united kingdom') || c.includes('uk')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (c.includes('united states') || c.includes('usa')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
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

  const formatTime = (time: number | string) => {
    try {
      const d = new Date(time);
      if (isNaN(d.getTime())) return String(time);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return String(time);
    }
  };

  return (
    <div id="live-sms-view" className="space-y-6">
      
      {/* Search & Filtering Panel */}
      <div id="filter-controls" className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-slate-200 p-4 shadow-sm">
        
        {/* Left Side: Search Bar */}
        <div className="relative w-full md:w-96" id="search-bar-container">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            id="search-hits-input"
            type="text"
            placeholder="Search by number, OTP code, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 focus:border-slate-900 focus:outline-none transition-colors"
          />
        </div>

        {/* Right Side: Service Filter and Manual Refresh */}
        <div id="filter-service-container" className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            id="filter-service-select"
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 focus:border-slate-900 focus:outline-none bg-white font-medium"
          >
            {services.map(s => (
              <option key={s} value={s}>{s} Channels</option>
            ))}
          </select>

          <button
            id="refresh-hits-btn"
            type="button"
            onClick={fetchHits}
            disabled={loading}
            className="p-2 border border-slate-200 hover:border-slate-900 text-slate-700 hover:text-slate-950 bg-white transition-colors disabled:opacity-50 flex items-center justify-center"
            title="Refresh Live Stream"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Main Stream Table */}
      <div id="hits-table-card" className="bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h3 className="font-serif text-lg font-bold text-slate-950">Live Stream Logs</h3>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Real-Time Sync active</p>
        </div>

        {filteredHits.length === 0 ? (
          <div id="no-hits-placeholder" className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center mx-auto mb-4 bg-slate-50 animate-pulse">
              <Clock className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="font-serif text-base font-bold text-slate-900 mb-1">No Real-Time Logs Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Waiting for incoming messages to be received by active gateway channels. There are no dummy/fake hits configured.
            </p>
          </div>
        ) : (
          <div id="table-responsive" className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Time</th>
                  <th className="px-6 py-3.5">Sender Mobile</th>
                  <th className="px-6 py-3.5">Service</th>
                  <th className="px-6 py-3.5">Region</th>
                  <th className="px-6 py-3.5">Message Content</th>
                  <th className="px-6 py-3.5 text-center">OTP Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredHits.map((hit) => (
                  <tr key={hit.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {formatTime(hit.time)}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-900 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span>{hit.number}</span>
                        <button
                          id={`copy-num-${hit.id}`}
                          type="button"
                          onClick={() => handleCopy(hit.id, hit.number, 'num')}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-sm transition-colors"
                          title="Copy Mobile"
                        >
                          {copiedId === `${hit.id}-num` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 border text-xs font-bold rounded-full ${getServiceBadgeClass(hit.service)}`}>
                        {hit.service}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 border text-xs font-bold rounded-full ${getCountryBadgeClass(hit.country)}`}>
                        <Globe className="w-3 h-3 mr-1" />
                        {hit.country}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-md break-words font-normal">
                      <div className="flex items-start justify-between space-x-2">
                        <span>{hit.message}</span>
                        <button
                          id={`copy-msg-${hit.id}`}
                          type="button"
                          onClick={() => handleCopy(hit.id, hit.message, 'all')}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-sm transition-colors flex-shrink-0"
                          title="Copy Full Message"
                        >
                          {copiedId === `${hit.id}-all` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {hit.code ? (
                        <div className="inline-flex items-center space-x-1.5 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-sm">
                          <Shield className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-mono font-bold text-emerald-800 text-sm tracking-wider">{hit.code}</span>
                          <button
                            id={`copy-code-${hit.id}`}
                            type="button"
                            onClick={() => handleCopy(hit.id, hit.code, 'code')}
                            className="p-0.5 hover:bg-emerald-100 text-emerald-600 rounded-sm transition-colors"
                            title="Copy Code"
                          >
                            {copiedId === `${hit.id}-code` ? (
                              <Check className="w-3 h-3 text-emerald-700" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
