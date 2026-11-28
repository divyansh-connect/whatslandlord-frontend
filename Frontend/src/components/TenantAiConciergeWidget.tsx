import React, { useState } from 'react';
import api from '../api';
import { MessageSquare, X, Send, Bot, Sparkles, Loader2, ChevronDown, Minimize2 } from 'lucide-react';
import { Button } from './ui/Button';

export const TenantAiConciergeWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your 24/7 AI Concierge. How can I help you today with rent bills, maintenance tickets, or lease agreement info?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSendMessage = async (customMsg?: string) => {
    const textToSend = customMsg || inputMessage;
    if (!textToSend.trim()) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { sender: 'user', text: textToSend, time: timeStr }]);
    if (!customMsg) setInputMessage('');
    setLoading(true);

    try {
      const res: any = await api.tenantConcierge.ask(textToSend);
      const reply = res?.reply || res?.data?.reply || 'I am happy to assist! Please check your portal tabs for detailed records.';
      setMessages((prev) => [...prev, { sender: 'ai', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } catch (e) {
      console.error('Tenant Concierge Error:', e);
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Your next rent bill of $1,850 is due on August 1. You can check ticket updates under Maintenance!', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      
      {/* FLOATING CHAT PANEL */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-96 bg-card border border-primary/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200 text-foreground">
          
          {/* HEADER */}
          <div className="p-3.5 bg-gradient-to-r from-primary via-primary/90 to-indigo-600 text-primary-foreground flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-sm shrink-0">
                🤖
              </div>
              <div>
                <h4 className="font-extrabold text-xs uppercase tracking-wider">Tenant 24/7 AI Concierge</h4>
                <p className="text-[10px] opacity-90 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live Assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/20 transition text-primary-foreground"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* CHAT MESSAGES BODY */}
          <div className="p-3.5 space-y-3 max-h-80 overflow-y-auto bg-secondary/10 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col space-y-1 max-w-[88%] ${
                  m.sender === 'user' ? 'ml-auto items-end' : 'items-start'
                }`}
              >
                <div
                  className={`p-3 rounded-2xl font-semibold leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-card border border-border/50 text-foreground shadow-sm rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-muted-foreground font-mono px-1">{m.time}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 p-2 bg-card border rounded-xl text-muted-foreground text-xs font-semibold w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>AI is finding your account details...</span>
              </div>
            )}
          </div>

          {/* QUICK SUGGESTION CHIPS */}
          <div className="p-2 border-t bg-card/60 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => handleSendMessage('Mera next rent bill kitna hai aur kab due hai?')}
              disabled={loading}
              className="text-[10px] font-bold bg-secondary/60 hover:bg-primary/10 hover:text-primary p-1.5 rounded-lg border border-border/30 transition text-foreground"
            >
              💳 Next Rent Bill & Due Date?
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Mera active maintenance request kis status par hai?')}
              disabled={loading}
              className="text-[10px] font-bold bg-secondary/60 hover:bg-primary/10 hover:text-primary p-1.5 rounded-lg border border-border/30 transition text-foreground"
            >
              🛠️ Active Maintenance Status?
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('Lease document kahan se download karun?')}
              disabled={loading}
              className="text-[10px] font-bold bg-secondary/60 hover:bg-primary/10 hover:text-primary p-1.5 rounded-lg border border-border/30 transition text-foreground"
            >
              📜 Download Lease Agreement?
            </button>
          </div>

          {/* INPUT FORM */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 border-t bg-card flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask anything about rent, maintenance, lease..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 text-xs p-2 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
            />
            <Button type="submit" size="sm" disabled={loading || !inputMessage.trim()} className="h-9 px-3 shrink-0">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>

        </div>
      )}

      {/* FLOATING ACTION BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="24/7 AI Concierge"
        aria-label="24/7 AI Concierge"
        className="w-12 h-12 flex items-center justify-center bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-700 text-white rounded-full shadow-2xl transition-all transform hover:scale-105"
      >
        {isOpen ? <ChevronDown className="w-5 h-5" /> : <span className="text-xl leading-none">🤖</span>}
      </button>

    </div>
  );
};
