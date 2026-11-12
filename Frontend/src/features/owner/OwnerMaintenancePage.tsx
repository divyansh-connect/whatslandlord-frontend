import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { MaintenanceRequest } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { RequestPriorityBadge } from '../../components/MaintenanceComponents';
import { Eye } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

import { getFormattedRequestNumber } from '../../utils/format';

export const OwnerMaintenancePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Queries
  const { data: maintenance = [], isLoading } = useQuery({ queryKey: ['owner-maintenance-list'], queryFn: () => api.ownerMaintenance.getAll() });

  const filteredMaint = maintenance.filter((m: any) =>
    (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.propertyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.tenantName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'id', header: t('owner.maintenance.requestNo'), id: 'id', cell: ({ row }) => <span className="font-bold">{getFormattedRequestNumber(row.original, row.index)}</span> },
    { 
      accessorKey: 'date', 
      header: 'Submitted Date', 
      id: 'date',
      cell: ({ row }) => {
        const d = row.original.date || row.original.createdAt;
        return <span className="font-semibold text-muted-foreground">{d ? String(d).split('T')[0] : '2026-08-04'}</span>;
      }
    },
    { accessorKey: 'title', header: t('owner.maintenance.subjectIssue'), id: 'title', cell: ({ row }) => <span className="font-bold text-foreground">{row.original.title}</span> },
    { 
      accessorKey: 'propertyName', 
      header: t('owner.maintenance.locationProperty'), 
      id: 'property',
      cell: ({ row }) => <span>{row.original.propertyName} • Unit {row.original.unitNumber || 'Unassigned'}</span>
    },
    { accessorKey: 'tenantName', header: 'Resident', id: 'tenant', cell: ({ row }) => <span className="font-semibold text-muted-foreground">{row.original.tenantName || 'Resident'}</span> },
    {
      accessorKey: 'estimatedCost',
      header: 'Manager Quote',
      id: 'estimatedCost',
      cell: ({ row }) => <span className="font-bold text-muted-foreground">${(row.original.estimatedCost || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'actualCost',
      header: 'Actual / Final Cost',
      id: 'actualCost',
      cell: ({ row }) => {
        const est = Number(row.original.estimatedCost || 0);
        const act = Number(row.original.actualCost || row.original.cost || 0);
        const extra = Number(row.original.extraExpenses || row.original.extraCost || 0);
        const displayActual = act > 0 ? act : (row.original.status === 'Completed' ? est : (est > 0 ? est : 0));
        return (
          <div>
            <span className="font-extrabold text-foreground">${displayActual.toLocaleString()}</span>
            {extra > 0 && (
              <span className="ml-1.5 text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                +${extra.toLocaleString()} Materials
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: t('owner.maintenance.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: t('owner.maintenance.actions'),
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(row.original)} title="View Progress">
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('owner.maintenance.title')}
        description={t('owner.maintenance.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/owner' },
          { label: t('nav.maintenance') },
        ]}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('owner.maintenance.searchPlaceholder')}
        onReset={() => setSearchQuery('')}
      />

      <DataTable columns={columns} data={filteredMaint.slice(0, 100)} loading={isLoading} />

      {/* COMPREHENSIVE DETAIL DIALOG */}
      <FormDialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)} title={t('owner.maintenance.dialogTitle')}>
        {selectedRequest && (
          <div className="space-y-4 pt-2 text-xs font-semibold text-foreground">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <p className="font-extrabold text-sm uppercase">Ticket {getFormattedRequestNumber(selectedRequest)}</p>
                <p className="text-muted-foreground font-bold mt-0.5">{selectedRequest.title}</p>
              </div>
              <StatusBadge status={selectedRequest.status} />
            </div>

            <div className="space-y-1.5">
              <p className="text-muted-foreground text-[10px] uppercase font-black">Issue Diagnostics & Description</p>
              <p className="leading-relaxed bg-secondary/15 p-3 rounded-xl border font-medium">{selectedRequest.description || 'No detailed diagnostics description provided.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-secondary/10 p-3 rounded-xl border">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-black">Property & Unit Location</p>
                <p className="font-extrabold">{selectedRequest.propertyName} • Unit {selectedRequest.unitNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase font-black">Resident / Tenant</p>
                <p className="font-extrabold">{selectedRequest.tenantName || 'Resident'}</p>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="border-t pt-3 space-y-2">
              <p className="text-muted-foreground text-[10px] uppercase font-black tracking-wider">Financial Breakdown & Budget Variance</p>
              <div className="grid grid-cols-3 gap-3 bg-secondary/20 p-3 rounded-xl border text-center">
                <div>
                  <p className="text-[9.5px] text-muted-foreground uppercase font-black">Manager Quote</p>
                  <p className="font-black text-sm text-foreground">${(selectedRequest.estimatedCost || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9.5px] text-muted-foreground uppercase font-black">Actual Final Cost</p>
                  <p className="font-black text-sm text-emerald-400">
                    ${((selectedRequest.actualCost || selectedRequest.cost || 0) + (selectedRequest.extraExpenses || selectedRequest.extraCost || 0)).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[9.5px] text-muted-foreground uppercase font-black">Extra Variance</p>
                  <p className={`font-black text-sm ${(selectedRequest.extraExpenses || selectedRequest.extraCost || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    +${(selectedRequest.extraExpenses || selectedRequest.extraCost || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {selectedRequest.resolutionNotes && (
              <div className="border-t pt-3">
                <p className="text-muted-foreground text-[10px] uppercase">Resolution Notes</p>
                <p className="font-medium text-xs italic mt-0.5 text-foreground">"{selectedRequest.resolutionNotes}"</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t pt-3">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase">Assigned Vendor / Staff</p>
                <p className="font-bold">{selectedRequest.assignedVendorName || 'Maintenance Contractor'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase">Submission Date</p>
                <p className="font-bold">{selectedRequest.date}</p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedRequest(null)} className="font-bold">Close</Button>
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  );
};
export default OwnerMaintenancePage;
