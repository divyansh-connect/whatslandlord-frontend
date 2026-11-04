import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { getSocket } from '../../utils/socket';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import {
  MessageSquare,
  Send,
  Loader2,
  Mail,
  Building,
  Check,
  CheckCheck,
  User,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';

export const TenantMessagesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Tenant's Conversation with Property Management
  const { data: conversations = [], isLoading: loadConv } = useQuery({
    queryKey: ['chat-conversations-tenant'],
    queryFn: () => api.chat.getConversations(),
  });

  const activeConversation = conversations.length > 0 ? conversations[0] : null;
  const conversationId = activeConversation?.id;

  // 2. Fetch Messages for this conversation
  const { data: messages = [], isLoading: loadMsgs } = useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: () => (conversationId ? api.chat.getMessages(conversationId) : Promise.resolve([])),
    enabled: !!conversationId,
    refetchInterval: 3000,
  });

  // 3. Socket.io Live Listeners
  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    socket.emit('join:conversation', conversationId);
    api.chat.markAsRead(conversationId).catch(() => {});
    socket.emit('message:read', { conversationId });

    const handleNewMessage = (newMsg: any) => {
      if (newMsg.conversationId === conversationId) {
        queryClient.setQueryData(['chat-messages', conversationId], (old: any[] = []) => {
          if (old.some((m) => m.id === newMsg.id)) return old;
          const tempIndex = old.findIndex(
            (m) => m.id.startsWith('temp-') && m.body === newMsg.body && m.isMine
          );
          if (tempIndex !== -1) {
            const next = [...old];
            next[tempIndex] = { ...newMsg, isMine: true };
            return next;
          }
          return [...old, newMsg];
        });
        socket.emit('message:read', { conversationId });
      }
    };

    const handleStatusUpdate = ({ messageId, status }: { messageId: string; status: string }) => {
      queryClient.setQueryData(['chat-messages', conversationId], (old: any[] = []) =>
        old.map((m) => (m.id === messageId ? { ...m, status } : m))
      );
    };

    const handleReadReceipt = ({ conversationId: readConvId }: { conversationId: string }) => {
      if (readConvId === conversationId) {
        queryClient.setQueryData(['chat-messages', conversationId], (old: any[] = []) =>
          old.map((m) => (m.isMine ? { ...m, status: 'READ' } : m))
        );
      }
    };

    const handleConnect = () => {
      socket.emit('join:conversation', conversationId);
    };

    socket.on('connect', handleConnect);
    socket.on('message:new', handleNewMessage);
    socket.on('message:status', handleStatusUpdate);
    socket.on('message:read_receipt', handleReadReceipt);

    return () => {
      socket.emit('leave:conversation', conversationId);
      socket.off('connect', handleConnect);
      socket.off('message:new', handleNewMessage);
      socket.off('message:status', handleStatusUpdate);
      socket.off('message:read_receipt', handleReadReceipt);
    };
  }, [conversationId, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Send Message Mutation
  const sendMutation = useMutation({
    mutationFn: (text: string) => {
      if (!conversationId) throw new Error('No active conversation');
      return api.chat.sendMessage(conversationId, text);
    },
    onMutate: async (newText: string) => {
      await queryClient.cancelQueries({ queryKey: ['chat-messages', conversationId] });
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        conversationId,
        body: newText,
        status: 'SENT',
        createdAt: new Date().toISOString(),
        isMine: true,
      };
      queryClient.setQueryData(['chat-messages', conversationId], (old: any[] = []) => [...old, optimisticMsg]);
      return { tempId };
    },
    onSuccess: (savedMsg, _variables, context) => {
      queryClient.setQueryData(['chat-messages', conversationId], (old: any[] = []) => {
        if (!context?.tempId) return old;
        return old.map((m) => (m.id === context.tempId ? { ...savedMsg, isMine: true } : m));
      });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sendMutation.isPending) return;
    const text = inputText.trim();
    setInputText('');
    sendMutation.mutate(text);
  };

  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title={t('tenant.messages.title') || 'Messages & Management Office'}
        description="Direct real-time communication channel with your property management office."
        breadcrumbs={[
          { label: t('header.home') || 'Home', href: '/tenant' },
          { label: t('tenant.messages.title') || 'Messages' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Sidebar: Management Contact Card */}
        <Card className="md:col-span-1 p-5 border bg-card space-y-4 h-fit">
          <div className="flex items-center space-x-3 pb-3 border-b border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Management Office</h3>
              <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Connected
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs font-medium text-muted-foreground">
            <p className="leading-relaxed">
              Your messages are delivered directly to your assigned property manager in real time.
            </p>
            <div className="pt-2 flex items-center gap-2 text-foreground font-semibold">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>SaaS Verified Resident Channel</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-2">
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">Office Hours</span>
            <p className="text-xs font-bold text-foreground">Monday – Friday: 9:00 AM – 6:00 PM</p>
            <p className="text-[11px] text-muted-foreground font-medium">For maintenance emergencies, please call the emergency hotline.</p>
          </div>
        </Card>

        {/* Right Side: Live Chat Thread */}
        <Card className="md:col-span-2 border bg-card flex flex-col h-[560px] overflow-hidden shadow-xs">
          
          {/* Thread Header */}
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-card shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                <User className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-foreground">Property Manager Office</h4>
                <p className="text-[10px] text-muted-foreground font-semibold">Official Property Management</p>
              </div>
            </div>
            <span className="text-[10px] bg-secondary border border-border px-2 py-0.5 rounded font-bold text-muted-foreground">
              Encrypted Channel
            </span>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/15">
            {loadMsgs && messages.length === 0 ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2">
                <MessageSquare className="w-10 h-10 opacity-30" />
                <p className="text-xs font-bold">No messages yet.</p>
                <p className="text-[11px]">Send a message to your property manager below.</p>
              </div>
            ) : (
              messages.map((m: any) => {
                const isMine = m.isMine;
                const timeStr = m.createdAt
                  ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Just now';

                return (
                  <div key={m.id} className={clsx('flex flex-col text-xs', isMine ? 'items-end' : 'items-start')}>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold mb-1 px-1">
                      {isMine ? 'You' : 'Property Manager'}
                    </span>
                    <div
                      className={clsx(
                        'max-w-[75%] p-3 rounded-2xl text-xs font-medium leading-relaxed break-words shadow-xs',
                        isMine
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-card text-foreground border border-border rounded-tl-none'
                      )}
                    >
                      {m.body}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground font-medium px-1">
                      <span>{timeStr}</span>
                      {isMine && (
                        <span className="ml-0.5">
                          {m.status === 'READ' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500 stroke-[2.5]" />
                          ) : m.status === 'DELIVERED' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-muted-foreground stroke-[2]" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-muted-foreground stroke-[2]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Form */}
          <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex items-center gap-2 shrink-0">
            <input
              type="text"
              className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              placeholder="Type your message to property management..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!inputText.trim() || sendMutation.isPending}
              className="flex items-center gap-1.5 px-4 font-bold"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </Button>
          </form>

        </Card>

      </div>
    </div>
  );
};
export default TenantMessagesPage;
