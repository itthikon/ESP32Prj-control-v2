import React, { useState } from "react";
import { Lock, User, Eye, EyeOff, ShieldCheck, KeyRound, Cpu, Terminal, AlertCircle, RefreshCw } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (username: string, role: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default system credentials
  const defaultUser = "admin";
  const defaultPass = "admin1234";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้งาน");
      return;
    }
    if (!password) {
      setError("กรุณากรอกรหัสผ่าน");
      return;
    }

    setIsSubmitting(true);

    try {
      // Try to log in via real backend API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (response.ok) {
        const data = await response.json();
        onLoginSuccess(data.username, data.role);
        return;
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || "ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");
        setIsSubmitting(false);
        return;
      }
    } catch (apiErr) {
      console.warn("API login failed, falling back to simulated localStorage authentication:", apiErr);
      
      // Fallback: Check localStorage custom users (for offline / simulator mode)
      setTimeout(() => {
        const localUsersJson = localStorage.getItem("esp32_custom_users");
        let authenticated = false;
        let detectedRole = "viewer";

        if (localUsersJson) {
          try {
            const customUsers = JSON.parse(localUsersJson);
            const matched = customUsers.find(
              (u: any) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
            );
            if (matched) {
              authenticated = true;
              detectedRole = matched.role;
            }
          } catch (e) {
            console.error("Failed to parse custom users:", e);
          }
        }

        // Check fallback defaults
        if (!authenticated) {
          if (username.toLowerCase() === defaultUser && password === defaultPass) {
            authenticated = true;
            detectedRole = "admin";
          } else if (username.toLowerCase() === "operator" && password === "operator1234") {
            authenticated = true;
            detectedRole = "operator";
          } else if (username.toLowerCase() === "viewer" && password === "viewer1234") {
            authenticated = true;
            detectedRole = "viewer";
          }
        }

        if (authenticated) {
          onLoginSuccess(username, detectedRole);
        } else {
          setError("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง! (กรุณาใช้บัญชีที่ถูกต้อง)");
          setIsSubmitting(false);
        }
      }, 600);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 relative overflow-hidden" id="login-container">
      {/* Background ambient light effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-slate-800/85 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 transition-all">
        
        {/* Header decoration */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 bg-blue-500/10 text-blue-400 rounded-2xl mb-3 border border-blue-500/20 shadow-inner">
            <Cpu className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            ESP32 IoT Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            ระบบตรวจสอบและควบคุมอุปกรณ์ผ่านเครือข่ายภายใน (Local LAN)
          </p>
        </div>

        {/* Warning / Notice about 24-hour expiration */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 mb-6 flex gap-2.5 items-start">
          <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-xs text-slate-200 block">นโยบายความปลอดภัยของระบบ</span>
            <span className="text-[10px] text-slate-400 leading-relaxed block">
              เซสชันการลงชื่อเข้าใช้งานของคุณมีอายุจำกัด <b>24 ชั่วโมง (1 วัน)</b> ระบบจะบังคับให้ลงชื่อเข้าใช้ใหม่โดยอัตโนมัติเมื่อพ้นกำหนดเพื่อความปลอดภัย
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs rounded-2xl p-3.5 mb-5 flex gap-2.5 items-center">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">ชื่อผู้ใช้งาน (Username)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 hover:bg-slate-900/80 focus:bg-slate-900 text-sm text-white placeholder-slate-500 border border-slate-700 focus:border-blue-500 rounded-xl transition-all outline-none focus:ring-1 focus:ring-blue-500/30"
                placeholder="กรอกชื่อผู้ใช้งาน..."
                id="login-username-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">รหัสผ่าน (Password)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900/50 hover:bg-slate-900/80 focus:bg-slate-900 text-sm text-white placeholder-slate-500 border border-slate-700 focus:border-blue-500 rounded-xl transition-all outline-none focus:ring-1 focus:ring-blue-500/30"
                placeholder="กรอกรหัสผ่าน..."
                id="login-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                id="toggle-password-btn"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-98 transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            id="submit-login-btn"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังเข้าสู่ระบบ...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>เข้าสู่ระบบแดชบอร์ด</span>
              </>
            )}
          </button>
        </form>

        {/* Credentials helper card */}
        <div className="mt-6 pt-5 border-t border-slate-700/60">
          <span className="font-bold text-[11px] text-slate-300 block mb-2 flex items-center gap-1">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>🔑 บัญชีผู้ใช้เริ่มต้นสำหรับทดสอบสิทธิ์</span>
          </span>
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/40 text-[10px] sm:text-xs text-slate-400 space-y-2 font-mono">
            <div className="flex justify-between items-center pb-1 border-b border-slate-800">
              <span className="text-blue-300 font-bold">แอดมิน (Admin)</span>
              <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">admin / admin1234</span>
            </div>
            <div className="flex justify-between items-center pb-1 border-b border-slate-800">
              <span className="text-emerald-300 font-bold">ผู้ควบคุม (Operator)</span>
              <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">operator / operator1234</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-amber-300 font-bold">ผู้เข้าชม (Viewer)</span>
              <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">viewer / viewer1234</span>
            </div>
          </div>
        </div>

      </div>

      {/* Humble branding */}
      <p className="text-[11px] text-slate-500 mt-6 select-none font-medium">
        ESP32 IoT Embedded Dashboard • Local Security Portal
      </p>
    </div>
  );
}
