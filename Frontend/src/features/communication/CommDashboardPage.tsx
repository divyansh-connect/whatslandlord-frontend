import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { MessageSquare, Megaphone, Users, Mail } from 'lucide-react';

export const CommDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Real Queries from Database
  const { data: messages = [], isLoading: loadMsgs } = useQuery({
    queryKey: ['direct-messages-inbox'],
    queryFn: () => api.directMessages.getAll(),
  });

  const { data: contacts = [], isLoading: loadContacts } = useQuery({
    queryKey: ['direct-contacts'],
    queryFn: () => api.directMessages.getContacts(),
  });

  const { data: announcements = [], isLoading: loadAnn } = useQuery({
    queryKey: ['comm-announcements-list'],
    queryFn: () => api.announcements.getAll(),
  });

  if (loadMsgs || loadContacts || loadAnn) {
    return <LoadingSkeleton type="card" />;
  }

  // Calculate real thread count from actual messages
  const threadSet = new Set<string>();
  (Array.isArray(messages) ? messages : []).forEach((m: any) => {
    const contact = m.contactName || (m.isOutbound ? m.recipient : m.sender);
    if (contact) threadSet.add(contact);
  });

  const realActiveThreads = threadSet.size;
  const realTotalMessages = Array.isArray(messages) ? messages.length : 0;
  const realAnnouncements = Array.isArray(announcements) ? announcements.length : 0;
  const realContacts = Array.isArray(contacts) ? contacts.length : 0;

  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title={t('commDashboard.title')}
        description={t('commDashboard.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('nav.communication') },
        ]}
      />

      {/* QUICK ACTIONS BAR */}
      <div className="flex flex-wrap gap-2.5 p-3.5 bg-card border rounded-2xl">
        <Button size="sm" onClick={() => navigate({ to: '/communication/inbox' })} className="flex items-center gap-1">
          <MessageSquare className="w-4 h-4" /> {t('commDashboard.openInbox')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate({ to: '/communication/announcements' })} className="flex items-center gap-1">
          <Megaphone className="w-4 h-4" /> {t('commDashboard.publishAnnouncement')}
        </Button>
      </div>

      {/* 100% REAL METRIC GRID FROM DATABASE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border bg-card flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Active Conversation Threads</p>
            <p className="text-2xl font-black mt-1 text-primary">{realActiveThreads}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">Active 1-to-1 Discussions</span>
        </Card>

        <Card className="p-5 border bg-card flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Total In-App Messages</p>
            <p className="text-2xl font-black mt-1 text-emerald-500">{realTotalMessages}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">Database Logged Messages</span>
        </Card>

        <Card className="p-5 border bg-card flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Published Notice Bulletins</p>
            <p className="text-2xl font-black mt-1 text-indigo-500">{realAnnouncements}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">Active Community Notices</span>
        </Card>

        <Card className="p-5 border bg-card flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Registered Contacts</p>
            <p className="text-2xl font-black mt-1 text-primary">{realContacts}</p>
          </div>
          <span className="text-[10px] text-muted-foreground font-semibold mt-4">Tenants, Owners & Staff</span>
        </Card>
      </div>
    </div>
  );
};
export default CommDashboardPage;
