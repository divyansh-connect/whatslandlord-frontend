import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { MaintenanceRequest } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { RequestPriorityBadge } from '../../components/MaintenanceComponents';
import { Eye, Plus, Loader2, Phone, Mail, MessageSquare, Send } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { extractPreferredVisit, cleanDescription } from '../../utils/maintenanceHelpers';

export const TenantMaintenancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newText, setNewText] = useState('');

  const postMessageMutation = useMutation({
    mutationFn: (text: string) => {
      return api.serviceRequests.update(selectedRequest?.id || '', {
        newMessage: {
          senderName: 'Sarah Connor (Resident)',
          role: 'Tenant',
          text,
        }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-maintenance-list'] });
      setSelectedRequest(data as any);
      setNewText('');
    }
  });

  // Form states
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent' | 'Emergency'>('Medium');
  const [description, setDescription] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  // Queries
  const { data: maintenance = [], isLoading } = useQuery({ queryKey: ['tenant-maintenance-list'], queryFn: () => api.tenantMaintenance.getAll() });

  // AI Troubleshooting state
  const [aiTips, setAiTips] = useState<{ tips: string[]; category: string; emergencyAlert: boolean; suggestionTitle: string } | null>(null);
  const [loadingTips, setLoadingTips] = useState(false);

  const fetchAiTroubleshooting = async () => {
    if (!title && !description) return;
    setLoadingTips(true);
    try {
      const result: any = await api.serviceRequests.troubleshoot({ title, description });
      const data = result?.data || result;
      setAiTips(data);
    } catch (e) {
      console.warn('AI Troubleshooting failed:', e);
    } finally {
      setLoadingTips(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const trimmedPref = preferredTime?.trim() || '';
      const descWithPref = trimmedPref
        ? `${description ? description.trim() + '\n\n' : ''}[Preferred Visit: ${trimmedPref}]`
        : description;

      return api.tenantMaintenance.create({
        title,
        priority,
        description: descWithPref,
        preferredTime: trimmedPref,
        scheduledDate: trimmedPref,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-maintenance-list'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['service-requests-list'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['staff-work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders-list'] });
      setIsFormOpen(false);
      setTitle('');
      setDescription('');
      setPreferredTime('');
      setAiTips(null);
    },
  });

  const filteredMaint = (maintenance || []).filter((m: any) =>
    (m?.title || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );


  const columns: ColumnDef<MaintenanceRequest>[] = [
    {
      accessorKey: 'date',
      header: t('tenantMaintenance.submittedDate'),
      id: 'date',
      cell: ({ row }) => {
        const val = row.original.date || row.original.createdAt;
        return <span className="font-semibold text-muted-foreground">{val ? String(val).split('T')[0] : '2026-08-04'}</span>;
      },
    },
    { accessorKey: 'title', header: t('tenantMaintenance.subjectIssue'), id: 'title', cell: ({ row }) => <span className="font-bold">{row.original.title}</span> },
    {
      accessorKey: 'priority',
      header: t('tenantMaintenance.priority'),
      id: 'priority',
      cell: ({ row }) => <RequestPriorityBadge priority={row.original.priority as any} />,
    },
    {
      accessorKey: 'status',
      header: t('tenantMaintenance.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: t('tenantMaintenance.actions'),
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(row.original)} title={t('tenantMaintenance.viewProgress')}>
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('tenantMaintenance.title')}
        description={t('tenantMaintenance.desc')}
        breadcrumbs={[
          { label: t('ai.breadcrumbs.home'), href: '/tenant' },
          { label: t('tenant.nav.maintenance') },
        ]}
        action={{
          label: t('tenantMaintenance.createRequest'),
          onClick: () => setIsFormOpen(true),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('tenantMaintenance.searchPlaceholder')}
        onReset={() => setSearchQuery('')}
      />

      <DataTable columns={columns} data={filteredMaint} loading={isLoading} />

      {/* DETAIL DIALOG */}
      <FormDialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)} title={t('tenantMaintenance.detailsTitle')}>
        {selectedRequest && (
          <div className="space-y-4 pt-2 text-xs font-semibold text-foreground">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <p className="font-extrabold text-sm uppercase">{t('tenantMaintenance.requestDetails')}</p>
                <p className="text-muted-foreground mt-0.5">{selectedRequest.title}</p>
              </div>
              <StatusBadge status={selectedRequest.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/10 rounded-lg border text-xs">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-bold">Submitted Date</p>
                <p className="font-bold text-foreground mt-0.5">{selectedRequest.date || selectedRequest.createdAt || '2026-08-04'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-bold">Property & Unit</p>
                <p className="font-bold text-foreground mt-0.5">{selectedRequest.propertyName || 'property 1'} • {(selectedRequest as any).unitName || selectedRequest.unitNumber || 'Unit room 1b'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-muted-foreground text-[10px] uppercase">{t('tenantMaintenance.description')}</p>
              <p className="leading-relaxed bg-secondary/15 p-3 rounded-lg border font-medium">{cleanDescription(selectedRequest.description)}</p>
            </div>

            {selectedRequest.status === 'Completed' && (selectedRequest.notes || selectedRequest.resolutionNotes) && (
              <div className="space-y-2">
                <p className="text-muted-foreground text-[10px] uppercase">Resolution Notes</p>
                <p className="leading-relaxed bg-emerald-500/5 text-emerald-600 p-3 rounded-lg border border-emerald-500/10 font-medium italic">
                  "{selectedRequest.notes || selectedRequest.resolutionNotes}"
                </p>
              </div>
            )}

            {extractPreferredVisit(selectedRequest) && (
              <div>
                <p className="text-muted-foreground text-[10px] uppercase">{t('tenantMaintenance.preferredTime')}</p>
                <p className="font-bold text-amber-600 dark:text-amber-400">{extractPreferredVisit(selectedRequest)}</p>
              </div>
            )}

            {/* Discussion / Comments thread */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-muted-foreground text-[10px] uppercase font-black">{t('tenantMaintenance.discussionUpdates')}</p>
              
              <div className="space-y-2.5 max-h-52 overflow-y-auto p-3 bg-secondary/15 rounded-lg border flex flex-col">
                {selectedRequest.messages && selectedRequest.messages.length > 0 ? (
                  selectedRequest.messages.map((m) => (
                    <div 
                      key={m.id} 
                      className={`flex flex-col space-y-0.5 p-2.5 rounded-lg max-w-[85%] text-xs font-semibold ${
                        m.role === 'Tenant' ? 'bg-primary/10 border border-primary/20 self-end ml-auto' : 'bg-card border self-start'
                      }`}
                    >
                      <div className="flex justify-between items-center gap-4 border-b border-border/20 pb-0.5 mb-0.5">
                        <span className="font-black uppercase text-[9px] text-primary">{m.senderName}</span>
                        <span className="text-[8px] text-muted-foreground font-mono">{m.timestamp}</span>
                      </div>
                      <p className="text-foreground leading-relaxed font-semibold">{m.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-muted-foreground italic text-center font-semibold">{t('tenantMaintenance.noDiscussions')}</p>
                )}
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newText.trim()) {
                    postMessageMutation.mutate(newText);
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder={t('tenantMaintenance.askQuestion')}
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  className="flex-1 text-xs p-2 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                  required
                />
                <Button type="submit" size="sm" disabled={postMessageMutation.isPending || !newText.trim()} className="flex items-center gap-1 h-8">
                  <Send className="w-3 h-3" /> {t('tenantMaintenance.send')}
                </Button>
              </form>
            </div>

            {/* Landlord contact channels */}
            <div className="border-t pt-4 mt-4 space-y-3">
              <p className="text-[10px] text-muted-foreground uppercase font-black">{t('tenantMaintenance.directContact')}</p>
              <div className="flex gap-2 pt-1 font-bold text-xs">
                <a 
                  href={`sms:5550199`} 
                  className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-secondary/20 hover:bg-secondary/40 border border-border/40 rounded-xl transition text-foreground"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  <span>{t('tenantMaintenance.sms')}</span>
                </a>
                <a 
                  href={`mailto:manager@apexpm.com`} 
                  className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-secondary/20 hover:bg-secondary/40 border border-border/40 rounded-xl transition text-foreground"
                >
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>{t('tenantMaintenance.email')}</span>
                </a>
                <a 
                  href={`https://wa.me/${((selectedRequest as any).managerPhone || (selectedRequest as any).phone || '').replace(/\D/g, '') || '15550199'}?text=${encodeURIComponent(`Hi Property Manager, I am contacting you regarding maintenance request: ${selectedRequest.title}`)}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-xl transition text-foreground"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t('tenantMaintenance.whatsapp')}</span>
                </a>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>{t('tenantMaintenance.close')}</Button>
            </div>
          </div>
        )}
      </FormDialog>

      {/* CREATE REQUEST DIALOG */}
      <FormDialog open={isFormOpen} onOpenChange={setIsFormOpen} title={t('tenantMaintenance.submitRepair')}>
        <div className="space-y-4 pt-2 text-xs font-semibold text-foreground">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">{t('tenantMaintenance.problemSummary')}</label>
            <Input placeholder={t('tenantMaintenance.problemPlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">{t('tenantMaintenance.priorityLevel')}</label>
              <Select value={priority} onChange={(e: any) => setPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">{t('tenantMaintenance.preferredWindow')}</label>
              <Input 
                list="preferred-visit-options"
                placeholder={t('tenantMaintenance.preferredPlaceholder')} 
                value={preferredTime} 
                onChange={(e) => setPreferredTime(e.target.value)} 
              />
              <datalist id="preferred-visit-options">
                <option value="Monday" />
                <option value="Tuesday" />
                <option value="Wednesday" />
                <option value="Thursday" />
                <option value="Friday" />
                <option value="Saturday" />
                <option value="Sunday" />
                <option value="Monday (Morning 8am - 12pm)" />
                <option value="Monday (Afternoon 12pm - 5pm)" />
                <option value="Tuesday (Morning 8am - 12pm)" />
                <option value="Tuesday (Afternoon 12pm - 5pm)" />
                <option value="Wednesday (Morning 8am - 12pm)" />
                <option value="Wednesday (Afternoon 12pm - 5pm)" />
                <option value="Thursday (Morning 8am - 12pm)" />
                <option value="Thursday (Afternoon 12pm - 5pm)" />
                <option value="Friday (Morning 8am - 12pm)" />
                <option value="Friday (Afternoon 12pm - 5pm)" />
                <option value="Weekend (Flexible)" />
                <option value="Anytime / Emergency" />
              </datalist>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-muted-foreground uppercase">{t('tenantMaintenance.inDepthDescription')}</label>
              {(title || description) && (
                <button
                  type="button"
                  onClick={fetchAiTroubleshooting}
                  disabled={loadingTips}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 transition"
                >
                  {loadingTips ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                  <span>Get AI DIY Tips</span>
                </button>
              )}
            </div>
            <textarea
              className="w-full min-h-[90px] p-2.5 rounded-lg border bg-card text-foreground"
              placeholder={t('tenantMaintenance.descriptionPlaceholder')}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (aiTips) setAiTips(null);
              }}
            />
          </div>

          {/* AI DIY TROUBLESHOOTING BOX */}
          {aiTips && (
            <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-primary/5 to-emerald-500/10 rounded-xl border border-amber-500/30 space-y-2.5 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  🤖 {aiTips.suggestionTitle || 'AI DIY Troubleshooting Tips'}
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  Try Before Submitting
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                Try these 3 simple troubleshooting steps. If these fix your issue, you can cancel this ticket!
              </p>
              <ul className="space-y-1.5 pl-1">
                {aiTips.tips.map((tip, idx) => (
                  <li key={idx} className="text-xs flex items-start gap-2 bg-background/80 p-2 rounded-lg border border-border/40">
                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-foreground font-semibold leading-tight">{tip}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center pt-1 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => {
                    alert('Great! Request canceled. We are glad your issue is resolved!');
                    setIsFormOpen(false);
                    setAiTips(null);
                  }}
                  className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 underline"
                >
                  ✓ Issue Fixed! Cancel Ticket
                </button>
                <span className="text-[10px] text-muted-foreground italic">Or click 'Submit Request' below if still broken</span>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => { setIsFormOpen(false); setAiTips(null); }}>{t('tenantMaintenance.cancel')}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title || !description || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('tenantMaintenance.submitRequest')}
            </Button>
          </div>

        </div>
      </FormDialog>
    </div>
  );
};
export default TenantMaintenancePage;
