"use client";

import { useAuth } from "../context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useToast } from "../context/ToastContext";
import { useState } from "react";
import { Menu, X, Sparkles, LogOut, LogIn, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Header() {
  const { user, logout, login } = useAuth();
  const pathname = usePathname();
  const { showToast } = useToast();
  const [imgError, setImgError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function getInitials(nameOrEmail: string) {
    if (!nameOrEmail) return "?";
    const name = nameOrEmail.split("@")[0];
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  const handleLogout = () => {
    logout();
    showToast("Logged out successfully!", "success");
    setMenuOpen(false);
  };

  return (
    <motion.header
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(5, 7, 15, 0.8)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
              <Sparkles className="w-5 h-5 text-white" />
              {/* Shine sweep */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)', transform: 'skewX(-20deg)' }} />
            </div>
            <div>
              <p className="font-bold text-white text-base leading-tight tracking-tight">
                GifGen<span className="gradient-text">AI</span>
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">AI-Powered GIF Studio</p>
            </div>
          </Link>

          {/* Desktop right side */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <>
                {/* User info pill */}
                {/* History Link */}
                <Link href="/history"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    pathname === '/history' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  History
                </Link>

                {/* User info pill */}
                <Link href="/profile"
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {user.image && !imgError ? (
                    <img
                      src={user.image}
                      alt={user.name || user.email}
                      className="w-6 h-6 rounded-full"
                      style={{ border: '1.5px solid rgba(139,92,246,0.5)' }}
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
                      {getInitials(user.name || user.email)}
                    </div>
                  )}
                  <span className="text-sm text-slate-300 font-medium max-w-[120px] truncate">
                    {user.name || user.email}
                  </span>
                </Link>

                {/* Logout button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </>
            ) : (
              pathname !== "/login" && pathname !== "/register" && (
                <button
                  onClick={login}
                  className="btn-gradient"
                >
                  <LogIn className="w-3.5 h-3.5 relative z-10" />
                  <span>Sign In</span>
                </button>
              )
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-4 h-4 text-slate-300" /> : <Menu className="w-4 h-4 text-slate-300" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="sm:hidden overflow-hidden"
            >
              <div className="py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {user ? (
                  <div className="space-y-3">
                    {/* User pill mobile */}
                    <div className="flex items-center gap-3 px-1">
                      {user.image && !imgError ? (
                        <img src={user.image} alt={user.name || user.email}
                          className="w-8 h-8 rounded-full"
                          style={{ border: '2px solid rgba(139,92,246,0.4)' }}
                          onError={() => setImgError(true)} />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
                          {getInitials(user.name || user.email)}
                        </div>
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">{user.name}</p>
                        <p className="text-slate-500 text-xs">{user.email}</p>
                      </div>
                    </div>

                    <button onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-red-400 transition-all border border-red-500/10 mb-3"
                      style={{ background: 'rgba(239,68,68,0.08)' }}>
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>

                    <Link href="/history" onClick={() => setMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-slate-300 transition-all border border-white/5"
                      style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <History className="w-4 h-4" /> Studio History
                    </Link>
                  </div>
                ) : (
                  pathname !== "/login" && pathname !== "/register" && (
                    <button onClick={() => { login(); setMenuOpen(false); }}
                      className="btn-gradient w-full justify-center">
                      <LogIn className="w-4 h-4 relative z-10" /><span>Sign In</span>
                    </button>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}