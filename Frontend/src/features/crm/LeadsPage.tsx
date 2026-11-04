import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { Lead } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { KanbanBoard } from '../../components/KanbanBoard';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  Plus, Eye, Kanban, Table, Calendar, Clock, 
  UserCheck, Loader2 
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

export const LeadsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'calendar'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Dialog triggers
  const [tourLead, setTourLead] = useState<Lead | null>(null);
  const [tourTime, setTourTime] = useState('');
  
  const [convertLead, setConvertLead] = useState<Lead | null>(null);

  // Queries
  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.leasing.getLeads(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  // Mutations
  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => {
      const targetLead = leads.find((l) => l.id === id);
      return api.leasing.createLead({
        id,
        status,
        email: targetLead?.email,
        name: targetLead?.name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (lead: Lead) => {
      const resolvedName = lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unnamed Lead';
      let resolvedProperty = lead.property || lead.propertyName || 'Unknown Property';
      let resolvedUnit = 'Unit 101';

      if (resolvedProperty.includes(' · Unit ')) {
        const parts = resolvedProperty.split(' · Unit ');
        resolvedProperty = parts[0];
        resolvedUnit = `Unit ${parts[1]}`;
      } else if (resolvedProperty.includes(' · ')) {
        const parts = resolvedProperty.split(' · ');
        resolvedProperty = parts[0];
        resolvedUnit = parts[1];
      } else if (lead.notes && lead.notes.includes('Unit:')) {
        const match = lead.notes.match(/Unit:\s*([^\s|]+)/i);
        if (match && match[1]) resolvedUnit = match[1].startsWith('Unit') ? match[1] : `Unit ${match[1]}`;
      }

      // Create an Application in DB
      await api.leasing.createApplication({
        tenantName: resolvedName,
        email: lead.email,
        propertyName: resolvedProperty,
        unitNumber: resolvedUnit,
        rentProposed: lead.budget || 1500,
        status: 'Pending',
      });

      // Update lead status to 'Application Sent'
      return api.leasing.createLead({
        id: lead.id,
        status: 'Application Sent',
        email: lead.email,
        name: resolvedName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['applications-list'] });
      setConvertLead(null);
      // Automatically redirect to the applications list page
      navigate({ to: '/leasing/applications' });
    },
  });

  const filteredLeads = leads.filter((l) => {
    const leadName = (l.name || `${l.firstName || ''} ${l.lastName || ''}`).toLowerCase();
    const leadEmail = String(l.email || '').toLowerCase();
    const leadPhone = String(l.phone || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = !query || leadName.includes(query) || leadEmail.includes(query) || leadPhone.includes(query);

    const propName = (l.property || l.propertyName || '').toLowerCase();
    const selectedProp = properties.find((p) => p.id === propertyFilter);
    const selectedPropName = selectedProp ? selectedProp.name.toLowerCase() : '';
    const matchesProp = propertyFilter === '' || 
      l.propertyOfInterestId === propertyFilter || 
      (selectedPropName && propName.includes(selectedPropName)) ||
      propName === propertyFilter.toLowerCase();

    const matchesStatus = statusFilter === '' || String(l.status || '').toLowerCase() === statusFilter.toLowerCase();
    return nameMatch && matchesProp && matchesStatus;
  });

  // Kanban Pipeline Stages mapping
  const pipelineStages = [
    { label: t('pmLeads.stageNew'), value: 'New' },
    { label: t('pmLeads.stageContacted'), value: 'Contacted' },
    { label: t('pmLeads.stageTourScheduled'), value: 'Tour Scheduled' },
    { label: t('pmLeads.stageAppSent'), value: 'Application Sent' },
    { label: 'Negotiating', value: 'Negotiating' },
    { label: 'Lease Signed', value: 'Lease Signed' },
    { label: 'Lost', value: 'Lost' },
  ];

  // Convert leads list to KanbanItem format
  const kanbanItems = filteredLeads.map((l) => {
    const budgetVal = l.budget ?? 1500;
    const resolvedName = l.name || `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Unnamed Lead';
    const resolvedProperty = l.property || l.propertyName || 'Unknown Property';
    const resolvedDate = l.moveInDate || l.createdAt;
    const resolvedPriority = l.priority || 'Medium';

    return {
      id: l.id,
      title: resolvedName,
      subtitle: resolvedProperty,
      budget: budgetVal,
      date: resolvedDate,
      status: l.status,
      priority: resolvedPriority,
    };
  });

  const tableColumns: ColumnDef<Lead>[] = [
    {
      accessorKey: 'name',
      header: t('pmApplications.applicant'),
      id: 'name',
      cell: ({ row }) => {
        const resolvedName = row.original.name || `${row.original.firstName || ''} ${row.original.lastName || ''}`.trim() || 'Unnamed Lead';
        return (
          <span
            onClick={() => navigate({ to: `/leads/${row.original.id}` })}
            className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
          >
            {resolvedName}
          </span>
        );
      },
    },
    { accessorKey: 'email', header: t('pmScreening.email'), id: 'email' },
    { accessorKey: 'phone', header: t('owners.phone'), id: 'phone' },
    {
      accessorKey: 'property',
      header: t('pmApplications.interestedProperty'),
      id: 'property',
      cell: ({ row }) => row.original.property || row.original.propertyName || 'Unknown Property'
    },
    {
      accessorKey: 'status',
      header: t('pmApplications.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: t('pmApplications.actions'),
      cell: ({ row }) => (
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: `/leads/${row.original.id}` })} title="View Lead">
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTourLead(row.original)}
            className="text-amber-500 hover:bg-amber-500/10"
            title="Schedule Tour"
          >
            <Clock className="w-4 h-4" />
          </Button>
          {row.original.status !== 'Lease Signed' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConvertLead(row.original)}
              className="text-emerald-500 hover:bg-emerald-500/10"
              title="Convert Resident"
            >
              <UserCheck className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('pmLeads.title')}
        description={t('pmLeads.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('nav.leasing'), href: '/leasing' },
          { label: t('pmLeads.title') },
        ]}
        action={{
          label: t('pmLeads.addLead'),
          onClick: () => navigate({ to: '/leads/new' }),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      {/* VIEW TOGGLES */}
      <div className="flex justify-between items-center mb-5 bg-card/65 p-2 rounded-xl border border-border/80">
        <span className="text-xs font-bold text-muted-foreground uppercase pl-2">
          {t('pmLeads.pipelineViewMode')}
        </span>
        <div className="flex space-x-1">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <Kanban className="w-3.5 h-3.5" /> {t('pmLeads.kanbanBoard')}
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <Table className="w-3.5 h-3.5" /> {t('pmLeads.tableDirectory')}
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="text-xs font-bold flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" /> {t('pmLeads.toursCalendar')}
          </Button>
        </div>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search leads by name..."
        filters={[
          {
            key: 'property',
            value: propertyFilter,
            placeholder: 'All Properties',
            options: properties.map((p) => ({ label: p.name, value: p.id })),
          },
          {
            key: 'status',
            value: statusFilter,
            placeholder: 'All Stages',
            options: pipelineStages.map((s) => ({ label: s.label, value: s.value })),
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'property') setPropertyFilter(val);
          if (key === 'status') setStatusFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setPropertyFilter('');
          setStatusFilter('');
        }}
      />

      {/* VIEW CONDITIONAL RENDERING */}
      {viewMode === 'kanban' && (
        <KanbanBoard
          columns={pipelineStages}
          items={kanbanItems}
          onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status: status as any })}
          onItemClick={(id) => navigate({ to: `/leads/${id}` })}
        />
      )}

      {viewMode === 'table' && (
        <DataTable columns={tableColumns} data={filteredLeads} loading={isLoading} error={error ? error.message : null} />
      )}

      {viewMode === 'calendar' && (
        <Card className="p-8 text-center border-border">
          <Calendar className="w-8 h-8 text-muted-foreground/60 mx-auto mb-4 animate-bounce-slow" />
          <h4 className="font-bold text-sm">Tour Appointments Calendar</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Showing 4 viewings scheduled today. Check lead detail dashboard timelines to update viewing slots.
          </p>
        </Card>
      )}

      {/* TOUR SCHEDULE MODAL */}
      <FormDialog
        open={!!tourLead}
        onOpenChange={(open) => !open && setTourLead(null)}
        title="Schedule Viewing Tour"
      >
        {tourLead && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">Select date/time slot for {tourLead.firstName} {tourLead.lastName}.</p>
            <Input type="datetime-local" value={tourTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTourTime(e.target.value)} />
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" onClick={() => setTourLead(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  updateStatusMutation.mutate({ id: tourLead.id, status: 'Tour Scheduled' });
                  setTourLead(null);
                }}
                disabled={!tourTime}
              >
                Schedule Tour
              </Button>
            </div>
          </div>
        )}
      </FormDialog>

      {/* CONVERT LEAD MODAL */}
      <FormDialog
        open={!!convertLead}
        onOpenChange={(open) => !open && setConvertLead(null)}
        title="Convert Lead to Resident Tenant"
      >
        {convertLead && (
          <div className="space-y-4 pt-2 text-xs font-semibold">
            <p className="text-muted-foreground">
              Are you sure you want to promote {convertLead.name || `${convertLead.firstName || ''} ${convertLead.lastName || ''}`} to an application?
              This will create a verified application record for tenant screening.
            </p>

            {/* VISUALLY STUNNING PROPERTY, UNIT & RENT SUMMARY CARD */}
            <div className="p-3.5 bg-gradient-to-br from-primary/10 via-primary/5 to-indigo-500/5 border border-primary/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase text-primary/75 tracking-wider">Property & Unit Target</span>
                  <p className="text-xs font-bold text-foreground">
                    {convertLead.property || convertLead.propertyName || 'Property Interest'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">Budget / Rent</span>
                  <p className="text-xs font-black text-foreground">
                    ${Number(convertLead.budget || 1500).toLocaleString()}/mo
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setConvertLead(null)}>Cancel</Button>
              <Button
                onClick={() => convertMutation.mutate(convertLead)}
                disabled={convertMutation.isPending}
              >
                {convertMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirm Promotion
              </Button>
            </div>
          </div>
        )}
      </FormDialog>

    </div>
  );
};
export default LeadsPage;
