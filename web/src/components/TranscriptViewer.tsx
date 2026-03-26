import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Search,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TranscriptViewerProps {
  transcript: string;
  title?: string;
  onQuoteSelect?: (quote: string) => void;
  onDirectCaptionAdd?: (data: {
    text: string;
    startTime: number;
    endTime: number;
  }) => void;
}

export function TranscriptViewer({
  transcript,
  title = 'Full Transcript',
  onQuoteSelect,
  onDirectCaptionAdd,
}: TranscriptViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  if (!transcript) return null;

  const wordCount = transcript.trim().split(/\s+/).length;
  const readingTimeMin = Math.max(1, Math.round(wordCount / 200));

  const parseTimeToSeconds = (t: string) => {
    const parts = t.replace(/[\[\]]/g, '').split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  const handleCopyAll = useCallback(() => {
    navigator.clipboard.writeText(transcript).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [transcript]);

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else {
        setSearchQuery('');
      }
      return next;
    });
  }, []);

  const handleSendToPrompt = useCallback(
    (text: string, index: number) => {
      const cleanQuote = text
        .replace(/\[?\d{1,2}:\d{2}(?::\d{2})?\]?/g, '')
        .replace(/([A-Z][a-zA-Z\s]+:|Speaker \w+:)/g, '')
        .trim();

      const timestampsMatch = text.match(/\[?\d{1,2}:\d{2}(?::\d{2})?\]?/g);

      if (
        timestampsMatch &&
        timestampsMatch.length >= 1 &&
        onDirectCaptionAdd
      ) {
        const startTime = parseTimeToSeconds(timestampsMatch[0]);
        const endTime =
          timestampsMatch.length > 1
            ? parseTimeToSeconds(timestampsMatch[1])
            : startTime + 5;
        onDirectCaptionAdd({ text: cleanQuote, startTime, endTime });
      } else if (onQuoteSelect) {
        onQuoteSelect(cleanQuote);
      }

      setFlashIndex(index);
      setTimeout(() => setFlashIndex(null), 1500);
    },
    [onQuoteSelect, onDirectCaptionAdd]
  );

  // Highlight search matches in a text string
  const highlightSearch = (text: string): React.ReactNode => {
    if (!searchQuery.trim()) return text;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-amber-400/40 text-amber-100 rounded-sm px-0.5"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const sentences = useMemo(() => {
    return (
      transcript.match(/[^.?!]+[.?!]+(?:\s|$)|[^.?!]+$/g) || [transcript]
    );
  }, [transcript]);

  const searchMatchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    return (transcript.match(regex) || []).length;
  }, [transcript, searchQuery]);

  const textHasTime = (str: string) =>
    /\[?\d{1,2}:\d{2}(?::\d{2})?\]?/.test(str);

  const formatRichText = () => {
    return (
      <div className="leading-[1.9] text-[14.5px] text-slate-300/90 font-[system-ui]">
        {sentences.map((sentence, sIdx) => {
          const isFlashed = flashIndex === sIdx;
          const hasTime = textHasTime(sentence);

          return (
            <span
              key={sIdx}
              onClick={() => handleSendToPrompt(sentence, sIdx)}
              title={
                hasTime
                  ? 'Click to add as caption'
                  : 'Click to send to AI prompt'
              }
              className={`
                inline rounded-[4px] py-[1px] transition-all duration-200 cursor-pointer
                ${isFlashed
                  ? 'bg-emerald-500/25 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : 'hover:bg-violet-500/15 hover:text-white'
                }
              `}
            >
              {sentence
                .split(
                  /(\[?\d{1,2}:\d{2}(?::\d{2})?\]?|\bSpeaker \w+:|\b[A-Z][a-zA-Z\s]+:)/g
                )
                .map((part, i) => {
                  if (/^\[?\d{1,2}:\d{2}(?::\d{2})?\]?$/.test(part)) {
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center mx-1 px-1.5 py-[2px] rounded-md bg-cyan-500/10 text-cyan-300 font-mono text-[10.5px] font-semibold tracking-wider border border-cyan-500/15 select-none"
                      >
                        {part}
                      </span>
                    );
                  }
                  if (/^([A-Z][a-zA-Z\s]+:|Speaker \w+:)$/.test(part)) {
                    return (
                      <strong
                        key={i}
                        className="text-blue-400/90 font-semibold inline-block mr-1"
                      >
                        {highlightSearch(part)}
                      </strong>
                    );
                  }
                  return (
                    <span
                      key={i}
                      className={
                        isFlashed ? 'text-emerald-100 font-medium' : ''
                      }
                    >
                      {highlightSearch(part)}
                    </span>
                  );
                })}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-cyan-500/20 bg-gradient-to-br from-cyan-500/15 to-blue-500/10 shadow-lg shadow-cyan-500/5">
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white tracking-tight">
              {title}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-medium">
              <span>{wordCount.toLocaleString()} words</span>
              <span className="w-0.5 h-0.5 rounded-full bg-slate-600" />
              <span>{transcript.length.toLocaleString()} chars</span>
              <span className="w-0.5 h-0.5 rounded-full bg-slate-600" />
              <span>~{readingTimeMin} min read</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSearch}
            className={`p-2 rounded-lg transition-all duration-200 ${searchOpen
                ? 'bg-violet-500/20 text-violet-300'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            title="Search transcript"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopyAll}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200"
            title="Copy transcript"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 12 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="relative flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transcript..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-white/[0.04] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
                />
              </div>
              {searchQuery && (
                <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                  {searchMatchCount} match{searchMatchCount !== 1 ? 'es' : ''}
                </span>
              )}
              <button
                onClick={toggleSearch}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript Text Box */}
      <motion.div
        layout
        className="relative rounded-2xl overflow-hidden flex-1 border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-black/40 shadow-xl shadow-black/20"
      >
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        <motion.div
          ref={scrollRef}
          layout
          className={`px-6 py-5 overflow-y-auto scroll-smooth custom-scrollbar transition-[max-height] duration-500 ease-in-out ${isExpanded ? 'max-h-[600px]' : 'max-h-[220px]'
            }`}
        >
          {formatRichText()}
        </motion.div>

        {/* Fade-out gradient when collapsed */}
        <AnimatePresence>
          {!isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-12 left-0 right-0 h-20 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to bottom, transparent, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.9))',
              }}
            />
          )}
        </AnimatePresence>

        {/* Expand / Collapse Button */}
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (isExpanded && scrollRef.current) {
              scrollRef.current.scrollTop = 0;
            }
          }}
          className="w-full relative z-10 flex items-center justify-center gap-2 py-3 text-[12px] font-semibold text-slate-400 hover:text-white transition-all duration-200 border-t border-white/[0.06] bg-black/50 backdrop-blur-xl group"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-violet-400 group-hover:-translate-y-0.5 transition-transform" />
              <span>Collapse</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
              <span>Read Full Transcript</span>
            </>
          )}
        </button>
      </motion.div>

      {/* Copied toast */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-xl shadow-xl shadow-emerald-500/10"
          >
            <Check className="w-3.5 h-3.5" />
            Copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
