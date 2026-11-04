import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { getSocket } from '../../utils/socket';
import { Button } from '../ui/Button';
import { X, Send, Check, CheckCheck, Loader2, MessageSquare, User } from 'lucide-react';
import clsx from 'clsx';

interface QuickChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  participantType: 'TENANT' | 'OWNER' | 'STAFF';
  participantId: string;
  participantName: string;
  subtitle?: string;
}

export const QuickChatDrawer: React.FC<QuickChatDrawerProps> = ({
  isOpen,
  onClose,
  participantType,
  participantId,
  participantName,
  subtitle,
}) => {
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Initialize or find conversation thread
  useEffect(() => {
    if (isOpen && participantId) {
      api.chat
        .initConversation({ participantType, participantId })
        .then((conv: any) => {
          if (conv && conv.id) {
            setConversationId(conv.id);
          }
        })
        .catch((err) => console.error('Failed to init conversation:', err));
    } else {
      setConversationId(null);
    }
  }, [isOpen, participantId, participantType]);

  // 2. Fetch live messages for active conversation
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: () => (conversationId ? api.chat.getMessages(conversationId) : Promise.resolve([])),
    enabled: !!conversationId,
    refetchInterval: 3000, // Backup polling alongside Socket.io
  });

  // 3. Setup real-time Socket.io listeners
  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    socket.emit('join:conversation', conversationId);

    // Mark messages as read when drawer is open
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
        // Auto mark as read if received while looking at thread
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

  // Scroll to bottom on new messages
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-all">
      <div className="w-full max-w-md bg-card text-foreground h-full shadow-2xl border-l border-border flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">{participantName}</h3>
              <p className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {subtitle || participantType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
          {isLoading && messages.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground space-y-2">
              <MessageSquare className="w-10 h-10 opacity-30" />
              <p className="text-xs font-semibold">No messages yet.</p>
              <p className="text-[11px]">Send a message to start this real-time discussion.</p>
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
                      'max-w-[80%] p-3 rounded-2xl text-xs font-medium leading-relaxed break-words shadow-xs',
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

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex items-center gap-2 shrink-0">
          <input
            type="text"
            className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            placeholder="Type your message..."
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

      </div>
    </div>
  );
};
export default QuickChatDrawer;

