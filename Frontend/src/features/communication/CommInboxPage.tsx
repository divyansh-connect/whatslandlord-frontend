import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { OwnerMessageThread } from '../../components/OwnerComponents';
import { MessageSquare, Send, Users, ShieldCheck } from 'lucide-react';

export const CommInboxPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Queries for real database contacts and messages
  const { data: contacts = [], isLoading: loadContacts } = useQuery({
    queryKey: ['direct-contacts'],
    queryFn: () => api.directMessages.getContacts(),
  });

  const { data: rawMessages = [], isLoading: loadMsgs } = useQuery({
    queryKey: ['direct-messages-inbox'],
    queryFn: () => api.directMessages.getAll(),
  });

  // Group real messages into active conversation threads
  const threadMap: Record<string, any[]> = {};
  (Array.isArray(rawMessages) ? rawMessages : []).forEach((m: any) => {
    const contact = m.contactName || (m.isOutbound ? m.recipient : m.sender) || 'Unknown';
    if (!threadMap[contact]) {
      threadMap[contact] = [];
    }
    threadMap[contact].push(m);
  });

  const activeThreads = Object.keys(threadMap).map((contactName, idx) => {
    const msgs = threadMap[contactName].sort(
      (a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
    const lastMsg = msgs[msgs.length - 1];
    const found = contacts.find((c: any) => c.name === contactName);

    return {
      id: `thread-${idx}-${contactName}`,
      contactName,
      role: found?.role || (contactName.includes('Manager') ? 'Property Manager' : 'Contact'),
      lastMessage: lastMsg?.body || lastMsg?.message || '',
      lastTime: lastMsg?.createdAt
        ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Recent',
      messages: msgs,
    };
  });

  const [selectedContactName, setSelectedContactName] = useState<string | null>(null);

  // If no contact explicitly selected, pick the first active thread if any exist
  const activeContact = selectedContactName || (activeThreads.length > 0 ? activeThreads[0].contactName : null);
  const currentThread = activeThreads.find((t) => t.contactName === activeContact);
  const foundActiveContact = contacts.find((c: any) => c.name === activeContact);

  // Thread messages formatted for OwnerMessageThread
  const threadMessages = (currentThread?.messages || []).map((m: any) => ({
    id: m.id,
    sender: m.sender || (m.isOutbound ? 'Property Manager Staff' : activeContact),
    body: m.body || m.message,
    timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now',
  }));

  // Mutation for sending replies
  const replyMutation = useMutation({
    mutationFn: (text: string) => {
      if (!activeContact) throw new Error('No contact selected');
      return api.directMessages.send({
        recipient: activeContact,
        body: text,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['direct-messages-inbox'] });
    },
  });

  // Modal State for New 1-to-1 Conversation
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatCategory, setNewChatCategory] = useState<'All' | 'Tenants' | 'Owners' | 'Staff'>('All');
  const [selectedModalContact, setSelectedModalContact] = useState<string>('');
  const [newChatMessage, setNewChatMessage] = useState<string>('');

  const filteredContacts = contacts.filter((c: any) => {
    if (newChatCategory === 'All') return true;
    if (newChatCategory === 'Tenants') return c.role === 'Tenant';
    if (newChatCategory === 'Owners') return c.role === 'Owner';
    if (newChatCategory === 'Staff') return (c.role || '').includes('Staff') || (c.role || '').includes('Manager');
    return true;
  });

  const handleStartNewConversation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModalContact || !newChatMessage.trim()) return;

    api.directMessages
      .send({
        recipient: selectedModalContact,
        body: newChatMessage.trim(),
      })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['direct-messages-inbox'] });
        setSelectedContactName(selectedModalContact);
        setIsNewChatOpen(false);
        setSelectedModalContact('');
        setNewChatMessage('');
      })
      .catch((err) => {
        console.error('Failed to send new chat message:', err);
      });
  };

  if (loadContacts || loadMsgs) {
    return <LoadingSkeleton type="card" />;
  }

  return (
    <div className="space-y-6 text-foreground h-[calc(100vh-140px)] flex flex-col">
      <PageHeader
        title={t('commInbox.title')}
        description={t('commInbox.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/communication' },
          { label: t('commInbox.title') },
        ]}
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        
        {/* LEFT COLUMN: Real Active Threads */}
        <Card className="lg:col-span-1 p-4 border bg-card flex flex-col overflow-y-auto space-y-3 shrink-0">
          <div className="flex justify-between items-center border-b pb-2">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground">
              Active Threads ({activeThreads.length})
            </h3>
            <Button size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => setIsNewChatOpen(true)}>
              + New Chat
            </Button>
          </div>

          <div className="space-y-2 text-xs font-semibold flex-1 overflow-y-auto">
            {activeThreads.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center h-48 space-y-2">
                <MessageSquare className="w-8 h-8 opacity-40 text-muted-foreground" />
                <p className="font-bold text-xs">No active conversations</p>
                <p className="text-[10px]">Click "+ New Chat" above to start a conversation with a tenant, owner, or staff.</p>
              </div>
            ) : (
              activeThreads.map((thread) => {
                const isSelected = activeContact === thread.contactName;
                return (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedContactName(thread.contactName)}
                    className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                      isSelected ? 'bg-primary/10 border-primary' : 'bg-secondary/15 hover:bg-secondary/35 border-border/40'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold truncate max-w-[130px]">{thread.contactName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                        {thread.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate w-full">{thread.lastMessage || 'No message snippet'}</p>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* CENTER COLUMN: Real Chat Thread */}
        <div className="lg:col-span-2 flex flex-col overflow-hidden">
          {activeContact ? (
            <OwnerMessageThread
              messages={threadMessages}
              onReply={(text) => replyMutation.mutate(text)}
            />
          ) : (
            <Card className="flex-1 p-8 border bg-card flex flex-col items-center justify-center text-center text-muted-foreground">
              <Users className="w-12 h-12 opacity-30 mb-3 text-primary" />
              <h3 className="font-bold text-sm text-foreground">No Conversation Selected</h3>
              <p className="text-xs max-w-sm mt-1">
                Select a thread from the left or click "+ New Chat" to choose a registered tenant, owner, or staff member.
              </p>
              <Button size="sm" className="mt-4" onClick={() => setIsNewChatOpen(true)}>
                + Start New Chat
              </Button>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Contact Details Profile */}
        <Card className="hidden lg:flex lg:col-span-1 p-5 border bg-card flex-col gap-4 text-xs font-semibold overflow-y-auto shrink-0">
          {activeContact ? (
            <>
              <div className="text-center border-b pb-4 space-y-2">
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center font-bold text-lg text-primary mx-auto">
                  {activeContact.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm uppercase">{activeContact}</h4>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">
                    {foundActiveContact?.role || currentThread?.role || 'Verified Account'}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase">Assigned Contact</span>
                  <p className="font-bold">{activeContact}</p>
                </div>
                {foundActiveContact?.email && (
                  <div className="space-y-1 border-t pt-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase">Email Address</span>
                    <p className="font-bold text-xs truncate">{foundActiveContact.email}</p>
                  </div>
                )}
                <div className="space-y-1 border-t pt-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase">Direct Channel</span>
                  <p className="font-bold">1-to-1 Private In-App Messaging</p>
                </div>
                <div className="space-y-1 border-t pt-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase">Channel Status</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    ● Live Connected
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-4">
              <ShieldCheck className="w-10 h-10 opacity-30 mb-2" />
              <p className="font-bold text-xs">Direct Channel Ready</p>
              <p className="text-[10px] mt-1">Select a contact to view their profile details.</p>
            </div>
          )}
        </Card>

      </div>

      {/* NEW 1-TO-1 CHAT MODAL - POPULATED FROM REAL DATABASE */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-base text-foreground">Start 1-to-1 Conversation</h3>
                <p className="text-xs text-muted-foreground">Select from registered Tenants, Owners, or Staff ({contacts.length} total)</p>
              </div>
              <button
                onClick={() => setIsNewChatOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 border-b pb-2">
              {(['All', 'Tenants', 'Owners', 'Staff'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setNewChatCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    newChatCategory === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/20 text-muted-foreground hover:bg-secondary/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Real Contacts List from Database */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {filteredContacts.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No registered contacts found in this category.
                </div>
              ) : (
                filteredContacts.map((c: any) => {
                  const isSelected = selectedModalContact === c.name;
                  return (
                    <button
                      key={c.id || c.name}
                      type="button"
                      onClick={() => setSelectedModalContact(c.name)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                        isSelected ? 'border-primary bg-primary/10' : 'border-border/50 hover:bg-secondary/20'
                      }`}
                    >
                      <div>
                        <p className="font-bold text-xs text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">
                          {c.role} {c.email ? `• ${c.email}` : ''}
                        </p>
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground text-[10px]'
                            : 'border-muted-foreground/40'
                        }`}
                      >
                        {isSelected ? '✓' : ''}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Message Area */}
            <form onSubmit={handleStartNewConversation} className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-muted-foreground uppercase">
                Initial Message:
              </label>
              <textarea
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                placeholder={
                  selectedModalContact
                    ? `Message to ${selectedModalContact}...`
                    : 'Select a contact above, then type message...'
                }
                className="w-full h-24 p-3 bg-secondary/15 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewChatOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!selectedModalContact || !newChatMessage.trim()}>
                  Send & Open Conversation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default CommInboxPage;
