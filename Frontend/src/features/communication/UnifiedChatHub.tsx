import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { getSocket } from '../../utils/socket';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { FormDialog } from '../../components/FormDialog';
import {
  MessageSquare,
  Send,
  User,
  Check,
  CheckCheck,
  Search,
  Plus,
  Loader2,
  Users,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import clsx from 'clsx';

export const UnifiedChatHub: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TENANT' | 'OWNER' | 'STAFF'>('ALL');
  const [inputText, setInputText] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch conversations
  const { data: conversations = [], isLoading: loadConvs } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: () => api.chat.getConversations(),
    refetchInterval: 8000,
  });

  // 2. Fetch contacts for new chat modal
  const { data: contacts = [] } = useQuery({
    queryKey: ['chat-contacts'],
    queryFn: () => api.chat.getContacts(),
    enabled: isNewChatModalOpen,
  });

  // Filter conversations
  const filteredConversations = conversations.filter((c: any) => {
    const matchesSearch =
      (c.participantName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || c.participantType === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Active conversation
  const activeConversation =
    conversations.find((c: any) => c.id === selectedConvId) ||
    (filteredConversations.length > 0 ? filteredConversations[0] : null);

  const activeConvId = activeConversation?.id;

  // 3. Fetch messages for active conversation
  const { data: messages = [], isLoading: loadMsgs } = useQuery({
    queryKey: ['chat-messages', activeConvId],
    queryFn: () => (activeConvId ? api.chat.getMessages(activeConvId) : Promise.resolve([])),
    enabled: !!activeConvId,
    refetchInterval: 3000,
  });

  // 4. Real-time Socket.io listeners
  useEffect(() => {
    const socket = getSocket();

    if (activeConvId) {
      socket.emit('join:conversation', activeConvId);
      api.chat.markAsRead(activeConvId).catch(() => {});
      socket.emit('message:read', { conversationId: activeConvId });
    }

    const handleNewMessage = (newMsg: any) => {
      // If message is for currently active thread, append it
      if (newMsg.conversationId === activeConvId) {
        queryClient.setQueryData(['chat-messages', activeConvId], (old: any[] = []) => {
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
        socket.emit('message:read', { conversationId: activeConvId });
      }

      // Update conversations list in real-time
      queryClient.setQueryData(['chat-conversations'], (old: any[] = []) => {
        return old.map((conv) => {
          if (conv.id === newMsg.conversationId) {
            return {
              ...conv,
              lastMessage: newMsg.body,
              lastMessageAt: newMsg.createdAt,
              lastMessageStatus: newMsg.status,
              isLastMessageMine: newMsg.isMine,
              unreadCount: newMsg.conversationId === activeConvId ? 0 : (conv.unreadCount || 0) + 1,
            };
          }
          return conv;
        });
      });
    };

    const handleStatusUpdate = ({ messageId, status }: { messageId: string; status: string }) => {
      queryClient.setQueryData(['chat-messages', activeConvId], (old: any[] = []) =>
        old.map((m) => (m.id === messageId ? { ...m, status } : m))
      );
    };

    const handleReadReceipt = ({ conversationId: readConvId }: { conversationId: string }) => {
      if (readConvId === activeConvId) {
        queryClient.setQueryData(['chat-messages', activeConvId], (old: any[] = []) =>
          old.map((m) => (m.isMine ? { ...m, status: 'READ' } : m))
        );
      }
    };

    const handleConnect = () => {
      if (activeConvId) {
        socket.emit('join:conversation', activeConvId);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('message:new', handleNewMessage);
    socket.on('message:status', handleStatusUpdate);
    socket.on('message:read_receipt', handleReadReceipt);

    return () => {
      if (activeConvId) {
        socket.emit('leave:conversation', activeConvId);
      }
      socket.off('connect', handleConnect);
      socket.off('message:new', handleNewMessage);
      socket.off('message:status', handleStatusUpdate);
      socket.off('message:read_receipt', handleReadReceipt);
    };
  }, [activeConvId, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (text: string) => {
      if (!activeConvId) throw new Error('No active conversation');
      return api.chat.sendMessage(activeConvId, text);
    },
    onMutate: async (newText: string) => {
      await queryClient.cancelQueries({ queryKey: ['chat-messages', activeConvId] });
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        conversationId: activeConvId,
        body: newText,
        status: 'SENT',
        createdAt: new Date().toISOString(),
        isMine: true,
      };
      queryClient.setQueryData(['chat-messages', activeConvId], (old: any[] = []) => [...old, optimisticMsg]);
      return { tempId };
    },
    onSuccess: (savedMsg, _variables, context) => {
      queryClient.setQueryData(['chat-messages', activeConvId], (old: any[] = []) => {
        if (!context?.tempId) return old;
        return old.map((m) => (m.id === context.tempId ? { ...savedMsg, isMine: true } : m));
      });
      queryClient.invalidateQueries({ queryKey: ['chat-messages', activeConvId] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sendMutation.isPending) return;
    const text = inputText.trim();
    setInputText('');
    sendMutation.mutate(text);
  };

  // Start new conversation from modal
  const handleStartConversation = async (contact: any) => {
    try {
      const conv = await api.chat.initConversation({
        participantType: contact.participantType,
        participantId: contact.id,
      });
      setIsNewChatModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      if (conv && conv.id) {
        setSelectedConvId(conv.id);
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  return (
    <div className="space-y-4 text-foreground flex flex-col h-[calc(100vh-120px)]">
      <PageHeader
        title="Communication Hub"
        description="Unified real-time in-app messaging with your tenants, owners, and maintenance staff."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Communication' },
        ]}
        action={{
          label: 'New Discussion',
          onClick: () => setIsNewChatModalOpen(true),
          icon: <Plus className="w-4 h-4" />,
        }}
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 border border-border bg-card rounded-2xl overflow-hidden shadow-xs">
        
        {/* LEFT COLUMN: CONVERSATION LIST (4 cols) */}
        <div className="lg:col-span-4 border-r border-border flex flex-col bg-card/60">
          
          {/* Search & Filters */}
          <div className="p-3.5 border-b border-border space-y-2.5 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search chats, residents, units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-input bg-background text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto text-[11px] font-bold">
              {(['ALL', 'TENANT', 'OWNER', 'STAFF'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setRoleFilter(filter)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg border transition capitalize',
                    roleFilter === filter
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground border-transparent'
                  )}
                >
                  {filter.toLowerCase()}s
                </button>
              ))}
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {loadConvs ? (
              <div className="p-4 space-y-3">
                <LoadingSkeleton type="table" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center space-y-2">
                <MessageSquare className="w-8 h-8 opacity-30" />
                <p className="text-xs font-semibold">No discussions found.</p>
                <Button size="sm" variant="outline" onClick={() => setIsNewChatModalOpen(true)} className="mt-2 text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Start New Discussion
                </Button>
              </div>
            ) : (
              filteredConversations.map((c: any) => {
                const isSelected = c.id === activeConvId;
                const timeStr = c.lastMessageAt
                  ? new Date(c.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : '';

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvId(c.id)}
                    className={clsx(
                      'w-full text-left p-3.5 flex items-start space-x-3 transition',
                      isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/40'
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">
                      <User className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate text-foreground">{c.participantName}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">{timeStr}</span>
                      </div>

                      <p className="text-[11px] font-semibold text-primary/80 mt-0.5 truncate">{c.subtitle}</p>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground font-medium truncate max-w-[180px]">
                          {c.isLastMessageMine && <span className="font-semibold text-foreground">You: </span>}
                          {c.lastMessage || 'No messages yet'}
                        </p>

                        {c.unreadCount > 0 && (
                          <span className="w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold flex items-center justify-center shrink-0">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CONVERSATION THREAD (8 cols) */}
        <div className="lg:col-span-8 flex flex-col bg-card h-full">
          {activeConversation ? (
            <>
              {/* Active Header */}
              <div className="p-3.5 border-b border-border flex items-center justify-between bg-card shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">{activeConversation.participantName}</h3>
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {activeConversation.subtitle} • {activeConversation.participantRole}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] bg-secondary border border-border px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-muted-foreground">
                    SaaS Verified
                  </span>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/15">
                {loadMsgs && messages.length === 0 ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2">
                    <MessageSquare className="w-10 h-10 opacity-30" />
                    <p className="text-xs font-bold">No messages in this discussion yet.</p>
                    <p className="text-[11px]">Type a message below to begin.</p>
                  </div>
                ) : (
                  messages.map((m: any) => {
                    const isMine = m.isMine;
                    const timeStr = m.createdAt
                      ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now';

                    return (
                      <div key={m.id} className={clsx('flex flex-col text-xs', isMine ? 'items-end' : 'items-start')}>
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

              {/* Input Form */}
              <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  placeholder="Type a message to resident/owner..."
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
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
              <MessageSquare className="w-12 h-12 opacity-30" />
              <p className="text-sm font-bold text-foreground">Select a conversation</p>
              <p className="text-xs max-w-xs text-center text-muted-foreground">
                Choose a contact from the left sidebar or start a new discussion to begin live messaging.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* NEW CHAT MODAL */}
      <FormDialog
        open={isNewChatModalOpen}
        onOpenChange={setIsNewChatModalOpen}
        title="Start New Discussion"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-muted-foreground font-medium">
            Select a verified tenant, owner, or staff member from your portfolio directory:
          </p>
          <div className="max-h-72 overflow-y-auto space-y-2 divide-y divide-border/40 pr-1">
            {contacts.map((contact: any) => (
              <div key={contact.id} className="pt-2 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-foreground">{contact.name}</h4>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    {contact.subtitle} • {contact.role} {contact.phone ? `• ${contact.phone}` : ''}
                  </p>
                </div>
                <Button size="sm" onClick={() => handleStartConversation(contact)} className="text-xs font-bold">
                  Chat
                </Button>
              </div>
            ))}
          </div>
        </div>
      </FormDialog>

    </div>
  );
};
export default UnifiedChatHub;

