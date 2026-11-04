import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { Application } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Eye, Check, X, ArrowRight, ShieldAlert, FileText, Play, Loader2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

export const ApplicationsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // Queries
  const { data: applications = [], isLoading, error } = useQuery({
    queryKey: ['applications-list'],
    queryFn: () => api.leasing.getApplications(),
  });

  const acceptAndScreenMutation = useMutation({
    mutationFn: async (app: Application) => {
      const names = (app.tenantName || 'Applicant').trim().split(' ');
      const first = names[0] || 'Applicant';
      const last = names.slice(1).join(' ') || 'Tenant';

      // 1. Mark Application as Approved in DB
      await api.leasing.updateApplication(app.id, { status: 'Approved' });

      // 2. Automatically create screening check in the backend
      try {
        await api.screening.create({
          email: app.email,
          firstName: first,
          lastName: last,
          propertyName: app.propertyName,
          unitNumber: app.unitNumber,
          status: 'Processing',
        });
      } catch (e) {
        console.warn('Screening auto-create warning:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications-list'] });
      queryClient.invalidateQueries({ queryKey: ['screening-checks-list'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setSelectedApp(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.leasing.updateApplication(id, { status: 'Rejected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications-list'] });
      setSelectedApp(null);
    },
  });

  const filteredApps = applications.filter((app: any) => {
    if (!app) return false;
    const q = (searchQuery || '').toLowerCase().trim();
    const nameStr = `${app.tenantName || ''} ${app.applicantName || ''}`.trim().toLowerCase();
    const propStr = String(app.propertyName || '').toLowerCase();
    const unitStr = String(app.unitNumber || '').toLowerCase();
    const emailStr = String(app.email || '').toLowerCase();
    const matchesSearch = !q ||
      nameStr.includes(q) ||
      propStr.includes(q) ||
      unitStr.includes(q) ||
      emailStr.includes(q);

    const matchesStatus = !statusFilter ||
      String(app.status || '').toLowerCase().replace(/[\s_-]/g, '') === statusFilter.toLowerCase().replace(/[\s_-]/g, '');

    return matchesSearch && matchesStatus;
  });

  const columns: ColumnDef<Application>[] = [
    {
      accessorKey: 'tenantName',
      header: t('pmApplications.applicant'),
      id: 'applicant',
      cell: ({ row }) => (
        <span
          onClick={() => setSelectedApp(row.original)}
          className="font-bold text-primary hover:underline cursor-pointer"
        >
          {row.original.tenantName}
        </span>
      ),
    },
    { accessorKey: 'propertyName', header: t('pmApplications.interestedProperty'), id: 'property' },
    { accessorKey: 'unitNumber', header: t('pmApplications.unit'), id: 'unit' },
    { 
      accessorKey: 'submittedDate', 
      header: t('pmApplications.submissionDate'), 
      id: 'submittedDate',
      cell: ({ row }) => {
        const dateStr = row.original.submittedDate;
        if (!dateStr) return '—';
        return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      }
    },
    {
      accessorKey: 'rentProposed',
      header: t('pmApplications.proposedRent'),
      id: 'rentProposed',
      cell: ({ row }) => <span className="font-semibold">${Number(row.original.rentProposed || 0).toLocaleString()}</span>,
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
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={() => setSelectedApp(row.original)} title="Review Application">
            <Eye className="w-4 h-4" />
          </Button>
          {row.original.status === 'Pending' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => acceptAndScreenMutation.mutate(row.original)}
                title="Accept & Send to Screening"
                className="text-emerald-500 hover:bg-emerald-500/10"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => rejectMutation.mutate(row.original.id)}
                title="Reject Application"
                className="text-rose-500 hover:bg-rose-500/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('pmApplications.title')}
        description={t('pmApplications.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('nav.leasing'), href: '/leasing/leads' },
          { label: t('pmApplications.title') },
        ]}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('pmApplications.searchPlaceholder')}
        filters={[
          {
            key: 'status',
            value: statusFilter,
            placeholder: 'All Statuses',
            options: [
              { label: 'Pending', value: 'Pending' },
              { label: 'Approved', value: 'Approved' },
              { label: 'Rejected', value: 'Rejected' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'status') setStatusFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('');
        }}
      />

      <DataTable columns={columns} data={filteredApps} loading={isLoading} error={error ? error.message : null} />

      {/* APPLICANT REVIEW DRAWER / DIALOG */}
      <FormDialog
        open={!!selectedApp}
        onOpenChange={(open) => !open && setSelectedApp(null)}
        title="Application Review"
      >
        {selectedApp && (
          <div className="space-y-6 pt-3 text-xs font-semibold text-foreground">
            <div className="flex items-center space-x-3 p-4 bg-secondary/30 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                {(selectedApp.tenantName || 'A').charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-sm">{selectedApp.tenantName}</h4>
                <p className="text-muted-foreground text-[10px]">{selectedApp.email}</p>
              </div>
            </div>

            {/* HIGHLIGHTED PROPERTY, UNIT & RENT CARD */}
            <div className="p-3.5 bg-gradient-to-br from-primary/10 via-primary/5 to-indigo-500/5 border border-primary/20 rounded-xl grid grid-cols-3 gap-3">
              <div>
                <p className="text-[9px] uppercase font-black text-primary/75 tracking-wider">Property Interest</p>
                <p className="text-xs font-bold text-foreground mt-0.5 truncate">{selectedApp.propertyName}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-black text-primary/75 tracking-wider">Unit Number</p>
                <p className="text-xs font-bold text-primary mt-0.5">{selectedApp.unitNumber || 'TBD'}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">Proposed Rent</p>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ${Number(selectedApp.rentProposed || 0).toLocaleString()}/mo
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-bold">Application Status</p>
                <div className="mt-0.5">
                  <StatusBadge status={selectedApp.status} />
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-bold">Submission Date</p>
                <p className="text-foreground font-semibold mt-0.5">
                  {selectedApp.submittedDate ? selectedApp.submittedDate.split('T')[0] : 'Today'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-bold">Contact Email</p>
                <p className="text-foreground font-semibold mt-0.5">{selectedApp.email}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t">
              <Button variant="outline" onClick={() => setSelectedApp(null)}>Close</Button>
              
              <div className="flex items-center space-x-2">
                {selectedApp.status === 'Pending' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => rejectMutation.mutate(selectedApp.id)}
                      disabled={rejectMutation.isPending || acceptAndScreenMutation.isPending}
                      className="text-rose-500 hover:bg-rose-500/10 border-rose-500/30"
                    >
                      {rejectMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      Reject
                    </Button>
                    <Button
                      onClick={() => acceptAndScreenMutation.mutate(selectedApp)}
                      disabled={acceptAndScreenMutation.isPending || rejectMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {acceptAndScreenMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                      Accept & Send to Screening
                    </Button>
                  </>
                )}

                {selectedApp.status === 'Approved' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedApp(null);
                        navigate({ to: '/leasing/screening' });
                      }}
                      className="text-primary hover:bg-primary/10"
                    >
                      View in Screening
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedApp(null);
                        navigate({ to: '/leases/new' });
                      }}
                    >
                      Convert to Lease
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  );
};
export default ApplicationsPage;
