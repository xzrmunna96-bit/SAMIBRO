import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, QrCode, Copy, Check, Lock, Smartphone, Key, RefreshCw, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface TwoFactorAuthCardProps {
  userEmail: string;
  userName?: string;
}

// Helper: Convert Base32 string to Uint8Array for RFC 6238 TOTP
function base32ToBytes(base32: string): Uint8Array {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  let hex = "";
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");
  for (let i = 0; i < cleaned.length; i++) {
    const val = base32chars.indexOf(cleaned.charAt(i));
    if (val < 0) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    const chunk = bits.substring(i, i + 4);
    hex += parseInt(chunk, 2).toString(16);
  }
  if (hex.length % 2 !== 0) hex = hex.substring(0, hex.length - 1);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Generate RFC 6238 TOTP 6-digit code for a given Base32 secret and time window offset
async function generateTotpCode(secretBase32: string, timeStepOffset: number = 0): Promise<string> {
  try {
    const keyBytes = base32ToBytes(secretBase32);
    if (keyBytes.length === 0) return "";
    
    const counter = Math.floor(Date.now() / 1000 / 30) + timeStepOffset;
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(0, 0, false);
    view.setUint32(4, counter, false);

    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: { name: "SHA-1" } },
      false,
      ["sign"]
    );

    const signature = await window.crypto.subtle.sign("HMAC", cryptoKey, buffer);
    const sigBytes = new Uint8Array(signature);
    const offset = sigBytes[sigBytes.length - 1] & 0xf;
    const binary =
      ((sigBytes[offset] & 0x7f) << 24) |
      ((sigBytes[offset + 1] & 0xff) << 16) |
      ((sigBytes[offset + 2] & 0xff) << 8) |
      (sigBytes[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');
    return otp;
  } catch (err) {
    return "";
  }
}

// Generate valid 16-char Base32 secret key
const generateBase32Secret = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < 16; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
};

export function TwoFactorAuthCard({ userEmail, userName }: TwoFactorAuthCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [enabled2FA, setEnabled2FA] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storageKey = `superx_2fa_${userEmail.toLowerCase()}`;
    const saved = localStorage.getItem(storageKey);
    let currentSecret = '';

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEnabled2FA(!!parsed.enabled);
        if (parsed.secret) currentSecret = parsed.secret;
      } catch {}
    }

    if (!currentSecret) {
      currentSecret = generateBase32Secret();
    }
    setSecretKey(currentSecret);
  }, [userEmail]);

  const saveState = (status: boolean, secret: string) => {
    const storageKey = `superx_2fa_${userEmail.toLowerCase()}`;
    localStorage.setItem(storageKey, JSON.stringify({ enabled: status, secret }));
  };

  const otpAuthUrl = `otpauth://totp/SUPER%20X%20SMS:${encodeURIComponent(userEmail)}?secret=${secretKey}&issuer=SUPER%20X%20SMS`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(otpAuthUrl)}&color=16-185-129&bgcolor=15-23-42`;

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');
    setVerifySuccess('');

    const cleanInput = totpCode.trim();
    if (!cleanInput || cleanInput.length !== 6) {
      setVerifyError('Please enter valid 6-digit Authenticator code.');
      return;
    }

    setLoading(true);

    try {
      // Real-time verification against current, previous, and next 30-second time windows
      const [codeCurrent, codePrev, codeNext] = await Promise.all([
        generateTotpCode(secretKey, 0),
        generateTotpCode(secretKey, -1),
        generateTotpCode(secretKey, 1),
      ]);

      const isValid = (cleanInput === codeCurrent || cleanInput === codePrev || cleanInput === codeNext);

      if (isValid) {
        setEnabled2FA(true);
        saveState(true, secretKey);
        setVerifySuccess('Real-time 2FA Activated Successfully! Google Authenticator is linked.');
        setTotpCode('');
      } else {
        setVerifyError('Invalid 2FA code. Please check your Google Authenticator app time sync and try again.');
      }
    } catch (err) {
      setVerifyError('Error verifying 2FA code.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !enabled2FA;
    setEnabled2FA(nextState);
    saveState(nextState, secretKey);
    if (!nextState) {
      setVerifySuccess('');
      setVerifyError('2FA Disabled.');
    } else {
      setVerifySuccess('2FA Activated.');
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secretKey);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg text-white">
      {/* Compact Header Bar */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between gap-3 bg-slate-900 hover:bg-slate-800/80 transition cursor-pointer text-left select-none border-b border-slate-800"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">2FA Security (Google Authenticator)</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                enabled2FA 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {enabled2FA ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isExpanded ? 'Click to minimize 2FA settings' : 'Scan QR code with Authenticator app to enable'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 shrink-0">
          <span>{isExpanded ? 'Hide' : 'Setup'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-slate-950/60 border-t border-slate-800/50 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <span className="text-xs text-slate-300 font-medium">Real-time 2FA Setup Parameters</span>
            <button
              onClick={handleToggle2FA}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition cursor-pointer border ${
                enabled2FA
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {enabled2FA ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Real-time QR Code Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col items-center justify-center text-center space-y-2.5">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>Authenticator QR Code</span>
              </span>

              <div className="p-2 bg-slate-950 border border-slate-800 rounded-xl">
                <img
                  src={qrCodeImageUrl}
                  alt="2FA QR Code"
                  className="w-28 h-28 object-contain rounded-lg"
                />
              </div>

              {/* Secret Key Box */}
              <div className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 space-y-1">
                <span className="text-[10px] text-slate-400 block font-mono">Secret Key:</span>
                <div className="flex items-center justify-between gap-1 font-mono text-xs text-emerald-300 font-bold">
                  <span className="select-all truncate">{secretKey}</span>
                  <button
                    onClick={copySecret}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] shrink-0 transition cursor-pointer"
                  >
                    {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Verification Form Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white border-b border-slate-800 pb-2">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verify 2FA Code</span>
              </div>

              <form onSubmit={handleVerifyTotp} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">
                    Enter 6-digit Authenticator code:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-center text-base font-mono font-bold text-emerald-300 tracking-widest focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase shadow transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Verify & Enable</span>
                </button>
              </form>

              {verifySuccess && (
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{verifySuccess}</span>
                </div>
              )}

              {verifyError && (
                <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
