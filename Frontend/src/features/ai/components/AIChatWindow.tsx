import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { AIMessageBubble } from './AIMessageBubble';
import { AIResponseCard } from './AIResponseCard';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Send, Plus, Search, Trash2, Edit2, Download, Bot, Settings, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Message {
  id: string;
  sender: 'AI' | 'User';
  text: string;
  timestamp?: string;
  suggestedActions?: string[];
  relatedRecords?: string[];
}

interface AIChatWindowProps {
  moduleName: string;
  suggestedQuestions?: string[];
}

export const AIChatWindow: React.FC<AIChatWindowProps> = ({
  moduleName,
  suggestedQuestions = [],
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string>(() => {
    return (typeof window !== 'undefined' ? sessionStorage.getItem('whatslandlord_ai_chat_id') : '') || '';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: loadingConvs } = useQuery({
    queryKey: ['conversations-list', moduleName],
    queryFn: async () => {
      const res = await api.aiAssistant.getConversations();
      const filtered = res.filter((c: any) => c.module === moduleName || moduleName === 'General');
      const savedId = typeof window !== 'undefined' ? sessionStorage.getItem('whatslandlord_ai_chat_id') : null;
      if (savedId && filtered.some((c: any) => c.id === savedId)) {
        setSelectedChatId(savedId);
      } else if (filtered.length > 0 && !selectedChatId) {
        setSelectedChatId(filtered[0].id);
        if (typeof window !== 'undefined') sessionStorage.setItem('whatslandlord_ai_chat_id', filtered[0].id);
      }
      return filtered;
    },
  });

  // Query conversation messages from DB for selectedChatId
  const { data: conversationData, isLoading: loadingMessages } = useQuery({
    queryKey: ['conversation-messages', selectedChatId],
    queryFn: async () => {
      if (!selectedChatId) return { id: '', name: '', messages: [] };
      return await api.aiAssistant.getConversation(selectedChatId);
    },
    enabled: !!selectedChatId,
  });

  useEffect(() => {
    if (conversationData?.messages && conversationData.messages.length > 0) {
      setMessages(conversationData.messages);
    } else {
      setMessages([
        { id: 'welcome', sender: 'AI', text: t('ai.chat.hello', { moduleName }) }
      ]);
    }
  }, [conversationData, selectedChatId, moduleName, t]);

  const sendMessageMutation = useMutation({
    mutationFn: (msg: string) => api.aiAssistant.sendMessage(selectedChatId || 'default-chat', msg),
    onSuccess: (aiResponse) => {
      setMessages((prev) => [...prev, aiResponse]);
      setLoading(false);
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      if (selectedChatId) {
        queryClient.invalidateQueries({ queryKey: ['conversation-messages', selectedChatId] });
      }
    },
    onError: () => {
      setLoading(false);
    },
  });

  const createChatMutation = useMutation({
    mutationFn: () => api.aiAssistant.createConversation(),
    onSuccess: (newChat: any) => {
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      setSelectedChatId(newChat.id);
      if (typeof window !== 'undefined') sessionStorage.setItem('whatslandlord_ai_chat_id', newChat.id);
      setMessages([
        { id: 'welcome', sender: 'AI', text: t('ai.chat.hello', { moduleName }) }
      ]);
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: (id: string) => api.aiAssistant.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations-list'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-messages'] });
      setSelectedChatId('');
      if (typeof window !== 'undefined') sessionStorage.removeItem('whatslandlord_ai_chat_id');
      setMessages([
        { id: 'welcome', sender: 'AI', text: t('ai.chat.hello', { moduleName }) }
      ]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, sender: 'User', text: textToSend, timestamp: new Date().toISOString() },
    ]);
    setInput('');
    setLoading(true);
    sendMessageMutation.mutate(textToSend);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleExport = () => {
    const content = messages.map((m) => `${m.sender}: ${m.text}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${moduleName}_chat_export.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredConversations = (conversations || []).filter((c: any) =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[75vh] min-h-[500px]">
      {/* Left Pane - History */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-between overflow-hidden h-full">
        <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-1">
              <Bot className="w-4 h-4 text-primary" /> {t('ai.chat.discussions')}
            </h3>
            <Button size="sm" variant="outline" onClick={() => createChatMutation.mutate()} className="h-8 px-2 font-semibold">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder={t('ai.chat.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {loadingConvs ? (
              <span className="text-xs text-muted-foreground font-medium">{t('ai.chat.loadingHistory')}</span>
            ) : filteredConversations.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No discussions found
              </div>
            ) : (
              filteredConversations.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedChatId(c.id);
                    if (typeof window !== 'undefined') sessionStorage.setItem('whatslandlord_ai_chat_id', c.id);
                  }}
                  className={`group flex justify-between items-center p-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                    c.id === selectedChatId ? 'bg-primary/10 text-primary font-bold shadow-xs' : 'hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <span className="truncate flex-1 pr-2">{c.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this chat history?')) {
                        deleteChatMutation.mutate(c.id);
                      }
                    }}
                    title="Delete discussion"
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-500 transition p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Center Pane - Chat Stream */}
      <div className="lg:col-span-2 bg-card border border-border rounded-2xl flex flex-col justify-between overflow-hidden h-full">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-foreground capitalize">{moduleName} {t('ai.title')}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="font-semibold text-xs h-8 flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> {t('ai.chat.export')}
          </Button>
        </div>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length <= 1 && (
            <div className="text-center py-8 space-y-2">
              <Bot className="w-8 h-8 text-primary mx-auto opacity-75" />
              <p className="text-xs font-bold text-foreground">{t('ai.chat.agentReady')}</p>
              <p className="text-[10px] text-muted-foreground font-medium">{t('ai.chat.askQuestion')}</p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className="space-y-2">
              <AIMessageBubble
                sender={m.sender}
                text={m.text}
                timestamp={m.timestamp}
                onCopy={() => handleCopy(m.text)}
              />
            </div>
          ))}
          {loading && (
            <div className="flex items-center space-x-2 text-muted-foreground/60 text-xs p-3 animate-pulse">
              <Bot className="w-4 h-4 text-primary animate-bounce" />
              <span>{t('ai.chat.generating')}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-col space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.length > 4000) {
                alert('Message is too long. Limit is 4000 characters.');
                return;
              }
              handleSend(input);
            }}
            className="flex space-x-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!input.trim() || loading) return;
                  if (input.length > 4000) {
                    alert('Message is too long. Limit is 4000 characters.');
                    return;
                  }
                  handleSend(input);
                }
              }}
              placeholder={t('ai.chat.typeMessage')}
              disabled={loading}
              rows={1}
              maxLength={4000}
              className="flex-1 text-xs font-medium p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <div className="flex space-x-1.5">
              <Button type="button" variant="outline" size="sm" onClick={() => setInput('')} disabled={loading} className="font-semibold text-xs h-9">
                {t('ai.chat.clear')}
              </Button>
              <Button type="submit" disabled={loading || !input.trim()} className="bg-primary text-primary-foreground font-semibold flex items-center gap-1 h-9 text-xs">
                <Send className="w-4 h-4" /> {t('ai.chat.send')}
              </Button>
            </div>
          </form>
          {input.length > 3500 && (
            <span className="text-[10px] text-rose-500 font-bold self-end">
              {input.length} / 4000 characters
            </span>
          )}
        </div>
      </div>

      {/* Right Pane - Context Panel */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-6 overflow-y-auto h-full">
        <div>
          <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> {t('ai.chat.suggestedPrompts')}
          </h4>
          <div className="space-y-2">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="w-full text-left p-3 border border-border rounded-xl text-xs font-semibold hover:border-primary hover:bg-primary/5 transition text-foreground"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <h4 className="font-bold text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-1">
            <Settings className="w-3.5 h-3.5 text-primary" /> {t('ai.chat.parameters')}
          </h4>
          <div className="text-[11px] font-semibold text-muted-foreground space-y-1.5 bg-secondary/35 p-3 rounded-lg border border-border">
            <div className="flex justify-between">
              <span>{t('ai.chat.agentModel')}</span>
              <span className="text-foreground">WhatsLandlord-LLM-3.5</span>
            </div>
            <div className="flex justify-between">
              <span>{t('ai.chat.temperature')}</span>
              <span className="text-foreground">0.2 (Analytical)</span>
            </div>
            <div className="flex justify-between">
              <span>{t('ai.chat.knowledgeBase')}</span>
              <span className="text-emerald-600">{t('ai.chat.syncComplete')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default AIChatWindow;
