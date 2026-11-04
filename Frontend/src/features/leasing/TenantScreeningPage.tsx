import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { ScreeningCheck } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/ui/Button';
import { RequestScreeningModal } from './RequestScreeningModal';
import { ScreeningReportDrawer } from './ScreeningReportDrawer';
import { Eye, Plus, Play, Loader2, FastForward } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

export const TenantScreeningPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedScreening, setSelectedScreening] = useState<ScreeningCheck | null>(null);

  // Queries
  const { data: screenings = [], isLoading, error } = useQuery({
    queryKey: ['screening-checks-list'],
    queryFn: () => api.screening.getAll(),
  });

  const generateReportMutation = useMutation({
    mutationFn: (id: string) => api.screening.generateReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-checks-list'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  const skipScreeningMutation = useMutation({
    mutationFn: (id: string) => api.screening.generateReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-checks-list'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  const filteredScreenings = screenings.filter((s) => {
    const nameMatch = (s.applicantName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (s.applicantEmail || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPackage = packageFilter === '' || s.screeningPackage === packageFilter;
    const matchesStatus = statusFilter === '' || s.screeningStatus === statusFilter;

    return (nameMatch || emailMatch) && matchesPackage && matchesStatus;
  });

  const columns: ColumnDef<ScreeningCheck>[] = [
    { 
      accessorKey: 'applicantName', 
      header: t('pmScreening.applicantName'), 
      id: 'applicantName', 
      cell: ({ row }) => <span className="font-bold">{row.original.applicantName}</span> 
    },
    { accessorKey: 'applicantEmail', header: t('pmScreening.email'), id: 'email' },
    { accessorKey: 'propertyName', header: t('pmLeasing.property'), id: 'property' },
    { accessorKey: 'unitNumber', header: t('pmLeasing.unit'), id: 'unit' },
    { accessorKey: 'screeningPackage', header: t('pmScreening.package'), id: 'package' },
    { 
      accessorKey: 'screeningStatus', 
      header: t('pmScreening.screeningStatus'), 
      id: 'screeningStatus',
      cell: ({ row }) => <StatusBadge status={row.original.screeningStatus} />
    },
    {
      id: 'actions',
      header: t('pmLeasing.actions'),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedScreening(row.original)}
            title="View Screening Report"
            className="h-7 w-7"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title={t('pmScreening.title')}
        description={t('pmScreening.desc')}
        breadcrumbs={[{ label: t('header.home'), href: '/' }, { label: t('nav.leasing'), href: '/leasing' }, { label: t('pmScreening.title') }]}
        action={{
          label: t('pmScreening.requestScreening'),
          onClick: () => setIsModalOpen(true),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search applicants or email..."
        filters={[
          {
            key: 'package',
            value: packageFilter,
            placeholder: 'All Packages',
            options: [
              { label: 'Basic Check', value: 'Basic' },
              { label: 'Comprehensive Check', value: 'Comprehensive' },
            ],
          },
          {
            key: 'status',
            value: statusFilter,
            placeholder: 'All Statuses',
            options: [
              { label: 'Pending', value: 'Pending' },
              { label: 'Processing', value: 'Processing' },
              { label: 'Pending Approval', value: 'Pending Approval' },
              { label: 'Completed', value: 'Completed' },
              { label: 'Approved', value: 'Approved' },
              { label: 'Declined', value: 'Declined' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'package') setPackageFilter(val);
          if (key === 'status') setStatusFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setPackageFilter('');
          setStatusFilter('');
        }}
      />

      <DataTable
        columns={columns}
        data={filteredScreenings}
        loading={isLoading}
        error={error ? error.message : null}
      />

      {/* REQUEST DIALOG MODAL */}
      <RequestScreeningModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      {/* SCREENING DETAIL REPORT DRAWER */}
      <ScreeningReportDrawer
        screening={selectedScreening}
        onClose={() => setSelectedScreening(null)}
      />
    </div>
  );
};
export default TenantScreeningPage;
