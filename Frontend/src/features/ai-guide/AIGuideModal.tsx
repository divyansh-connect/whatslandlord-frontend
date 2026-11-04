import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, Play, Pause, RotateCcw, Volume2, VolumeX, X, 
  CheckCircle2, Loader2, Radio, Zap
} from 'lucide-react';
import { MASTER_GUIDES } from './aiGuideData';
import { GuideLanguage } from './types';

interface AIGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageKey: string;
}

export const AIGuideModal: React.FC<AIGuideModalProps> = ({
  isOpen,
  onClose,
  pageKey,
}) => {
  const [lang, setLang] = useState<GuideLanguage>('en');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [mounted, setMounted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrls = useRef<Record<string, string>>({});
  const progressBarRef = useRef<HTMLDivElement>(null);

  const guide = MASTER_GUIDES[pageKey] || MASTER_GUIDES['new-property'];
  const title = guide.title[lang];
  const subtitle = guide.subtitle[lang];
  const steps = guide.steps[lang];

  // Set mounted for SSR/Portal safety
  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background body scrolling completely when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Stop audio on close or language switch
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveStepIndex(0);
  };

  useEffect(() => {
    if (!isOpen) {
      stopAudio();
    }
  }, [isOpen]);

  useEffect(() => {
    stopAudio();
  }, [lang, pageKey]);

  useEffect(() => {
    return () => {
      stopAudio();
      Object.values(audioBlobUrls.current).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.pause();
      }
      setIsPlaying(false);
      return;
    }

    if (audioRef.current && audioRef.current.src && audioRef.current.currentTime > 0 && !audioRef.current.ended) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    const cacheKey = `${pageKey}-${lang}`;

    if (audioBlobUrls.current[cacheKey]) {
      playAudioBlob(audioBlobUrls.current[cacheKey]);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1') + '/ai-guide/speech';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageKey,
          lang,
          voice: 'nova',
        }),
      });

      if (!response.ok) {
        throw new Error('TTS Service response was not ok');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      audioBlobUrls.current[cacheKey] = objectUrl;
      playAudioBlob(objectUrl);
    } catch (err) {
      console.warn('[AIGuide] OpenAI live streaming fallback triggered:', err);
      fallbackToBrowserSpeech();
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const playAudioBlob = (url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.src = url;
    audio.playbackRate = playbackSpeed;
    audio.muted = isMuted;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 32);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && steps.length > 0) {
        const stepProgress = Math.min(
          Math.floor((audio.currentTime / audio.duration) * steps.length),
          steps.length - 1
        );
        setActiveStepIndex(stepProgress);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveStepIndex(0);
    };

    audio.onerror = () => {
      fallbackToBrowserSpeech();
    };

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      fallbackToBrowserSpeech();
    });
  };

  const fallbackToBrowserSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Audio playback is not supported on this browser.');
      return;
    }

    window.speechSynthesis.cancel();

    const fullScript = `${title}. ${subtitle}. ` + steps
      .map((s) => `Step ${s.stepNumber}: ${s.title}. ${s.description}`)
      .join(' ');

    const utterance = new SpeechSynthesisUtterance(fullScript);
    utterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
    utterance.rate = playbackSpeed;

    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(lang === 'es' ? 'es' : 'en'));
    if (match) utterance.voice = match;

    const approxDuration = fullScript.split(' ').length / (2.5 * playbackSpeed);
    setDuration(approxDuration);

    utterance.onstart = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setActiveStepIndex(0);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSpeedToggle = () => {
    const speeds = [1, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleReplay = () => {
    stopAudio();
    setTimeout(() => {
      handleTogglePlay();
    }, 150);
  };

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) {
      audioRef.current.muted = next;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = pct * duration;
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  if (!isOpen || !mounted) return null;

  // Use createPortal to mount directly on document.body (Guarantees true viewport fixed positioning!)
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
      
      {/* 1. Backdrop Overlay: Soft Translucent Frosted Glass (Page stays visible underneath) */}
      <div 
        className="fixed inset-0 bg-slate-950/35 backdrop-blur-[6px] transition-all duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* 2. Ambient Lighting Glow Behind the Modal */}
      <div className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-gradient-to-b from-indigo-500/15 via-purple-500/10 to-transparent blur-3xl opacity-40" />

      {/* 3. Luxury Modal Card Container */}
      <div className="relative w-full max-w-2xl bg-card/95 dark:bg-slate-900/95 border border-indigo-500/30 dark:border-indigo-400/20 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_30px_0_rgba(99,102,241,0.15)] overflow-hidden flex flex-col max-h-[88vh] z-10 animate-in zoom-in-95 duration-200">
        
        {/* Top Iridescent Neon Line */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-indigo-500 via-purple-500 to-pink-500 shrink-0 shadow-sm" />

        {/* --- FIXED HEADER (NEVER SCROLLS) --- */}
        <div className="px-5 sm:px-6 pt-5 pb-3.5 border-b border-border/60 shrink-0 bg-card/80 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center justify-between">
            
            {/* Left AI Identity Badge */}
            <div className="flex items-center space-x-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/30">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-4 h-4 animate-pulse text-indigo-400" />
                  </div>
                </div>
                {isPlaying && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black tracking-widest uppercase bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                    AI INTELLIGENT WALKTHROUGH
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                    LIVE
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight truncate mt-0.5">
                  {title}
                </h3>
              </div>
            </div>

            {/* Right: Language Pill & Close */}
            <div className="flex items-center space-x-2 shrink-0">
              
              {/* Premium Segmented Glass Language Switcher */}
              <div className="flex items-center bg-muted/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-border/80 shadow-inner">
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center space-x-1 ${
                    lang === 'en'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span>🇬🇧</span>
                  <span>EN</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLang('es')}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center space-x-1 ${
                    lang === 'es'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span>🇪🇸</span>
                  <span>ES</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-border"
                title="Close guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* --- FIXED LUXURY AUDIO PLAYER CARD (ALWAYS VISIBLE) --- */}
        <div className="px-5 sm:px-6 py-3.5 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent border-b border-border/50 shrink-0">
          <div className="p-3.5 rounded-2xl bg-card/90 dark:bg-slate-900/90 border border-indigo-500/25 shadow-lg shadow-indigo-950/20 backdrop-blur-md space-y-2.5">
            
            <div className="flex items-center justify-between gap-3">
              
              {/* Play / Pause with Glowing Apple/Siri Orb Style */}
              <div className="flex items-center space-x-3.5">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  disabled={isLoadingAudio}
                  className={`relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95 group shrink-0 ${
                    isPlaying
                      ? 'bg-gradient-to-tr from-rose-500 to-pink-600 text-white shadow-rose-500/35 ring-4 ring-rose-500/20'
                      : 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-indigo-500/35 hover:scale-105 ring-4 ring-indigo-500/20'
                  }`}
                  title={isPlaying ? 'Pause Guide' : 'Play Voice Guide'}
                >
                  {isLoadingAudio ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5 group-hover:scale-110 transition-transform" />
                  )}
                </button>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-foreground tracking-tight">
                      {isPlaying 
                        ? (lang === 'es' ? 'Reproduciendo audio...' : 'Speaking guide...') 
                        : (lang === 'es' ? 'Escuchar Guía con Voz AI' : 'Listen with AI Voice')}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 font-extrabold border border-indigo-500/30">
                      Nova AI
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono font-medium mt-0.5">
                    {formatTime(currentTime)} / {formatTime(duration || 45)}
                  </div>
                </div>
              </div>

              {/* Live Spectrum Waveform Visualizer (12 Dancing Bars) */}
              <div className="hidden sm:flex items-center space-x-1 h-9 px-3.5 rounded-xl bg-muted/60 dark:bg-slate-800/60 border border-border/50">
                {[35, 70, 95, 55, 80, 100, 65, 85, 45, 90, 60, 40].map((height, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      isPlaying
                        ? 'bg-gradient-to-t from-cyan-400 via-indigo-500 to-pink-500 animate-pulse'
                        : 'bg-muted-foreground/25'
                    }`}
                    style={{
                      height: isPlaying ? `${Math.max(25, (height * (i % 2 === 0 ? 1 : 0.75)))}%` : '25%',
                      animationDuration: `${400 + (i % 4) * 150}ms`,
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                ))}
              </div>

              {/* Controls: Speed, Replay, Mute */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSpeedToggle}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-black bg-muted/80 dark:bg-slate-800 text-foreground hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors border border-border"
                  title="Toggle Playback Speed"
                >
                  {playbackSpeed}x
                </button>
                <button
                  type="button"
                  onClick={handleReplay}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-border"
                  title="Restart Audio"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleMuteToggle}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-border"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Clickable Progress Scrubbing Bar */}
            <div 
              ref={progressBarRef}
              onClick={handleSeek}
              className="w-full bg-muted/80 dark:bg-slate-800 h-2 rounded-full overflow-hidden cursor-pointer relative group"
              title="Click to seek"
            >
              <div 
                className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 h-full rounded-full transition-all duration-150 relative shadow-sm"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

          </div>
        </div>

        {/* --- SCROLLABLE CONTENT BODY (ONLY STEPS SCROLL!) --- */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-3.5 custom-scrollbar">
          
          {/* Subtitle / Context Note */}
          <div className="flex items-center space-x-2 text-xs text-muted-foreground bg-muted/30 dark:bg-slate-800/30 p-2.5 rounded-xl border border-border/40">
            <Zap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <p className="leading-relaxed">
              {subtitle}
            </p>
          </div>

          <div className="space-y-2.5">
            {steps.map((step, idx) => {
              const isActive = activeStepIndex === idx && isPlaying;
              return (
                <div
                  key={step.stepNumber}
                  onClick={() => setActiveStepIndex(idx)}
                  className={`relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start space-x-3.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border-indigo-500 shadow-lg shadow-indigo-500/15 ring-1 ring-indigo-500/40 translate-x-1'
                      : 'bg-card/70 dark:bg-slate-900/60 border-border/80 hover:border-indigo-500/40 hover:bg-muted/40 hover:translate-x-0.5'
                  }`}
                >
                  {/* Left Glow Indicator for Active Step */}
                  {isActive && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full" />
                  )}

                  {/* Step Number Badge */}
                  <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                    isActive
                      ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30 scale-105'
                      : 'bg-muted/80 dark:bg-slate-800 text-muted-foreground border border-border'
                  }`}>
                    0{step.stepNumber}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-sm font-extrabold tracking-tight ${
                        isActive ? 'text-indigo-400' : 'text-foreground'
                      }`}>
                        {step.title}
                      </h4>
                      {isActive && (
                        <span className="flex items-center text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping mr-1.5" />
                          Speaking
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed font-normal">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- FIXED FOOTER (NEVER SCROLLS) --- */}
        <div className="px-5 sm:px-6 py-3.5 bg-card/90 dark:bg-slate-900/90 border-t border-border/70 shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">{lang === 'es' ? 'Pasos oficiales de WhatsLandlord' : 'Verified WhatsLandlord steps'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-xs hover:opacity-95 shadow-md shadow-indigo-500/25 active:scale-95 transition-all"
          >
            {lang === 'es' ? 'Entendido, Cerrar' : 'Got it, Close'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
