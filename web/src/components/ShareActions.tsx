"use client";

import React, { useState } from 'react';
import { Twitter, Send, Link, Check, Download } from 'lucide-react';

interface ShareActionsProps {
  gifId: string;
  gifUrl: string;
  caption: string;
  baseUrl: string;
}

export function ShareActions({ gifId, gifUrl, caption, baseUrl }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${baseUrl}/gif/${gifId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out this AI GIF: " + caption)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const shareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent("Check out this AI GIF: " + caption + " " + shareUrl)}`, '_blank');
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button 
          onClick={shareTwitter}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] transition-all gap-2 group"
        >
          <Twitter className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Twitter</span>
        </button>
        
        <button 
          onClick={shareWhatsApp}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] transition-all gap-2 group"
        >
          <Send className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-wider">WhatsApp</span>
        </button>

        <button 
          onClick={copyLink}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-300 transition-all gap-2 group"
        >
          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Link className="w-5 h-5 group-hover:scale-110 transition-transform" />}
          <span className="text-[10px] font-bold uppercase tracking-wider">{copied ? 'Copied!' : 'Link'}</span>
        </button>

        <a 
          href={gifUrl}
          download={`gif-${gifId}.gif`}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all gap-2 group"
        >
          <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Download</span>
        </a>
      </div>

      <a 
        href="/"
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-center shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
      >
        <span>✨ Create Your Own AI GIF</span>
      </a>
    </div>
  );
}
