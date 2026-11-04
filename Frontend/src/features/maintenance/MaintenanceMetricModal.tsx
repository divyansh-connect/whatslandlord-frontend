import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/StatusBadge';
import { RequestPriorityBadge } from '../../components/MaintenanceComponents';
import { 
  Wrench, Clock, CheckCircle2, DollarSign, AlertCircle, 
  FileSpreadsheet, FileText, Search, X, ExternalLink, Eye 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type MaintenanceMetricType = 
  | 'openRequests' 
  | 'workOrdersInProgress' 
  | 'completedThisMonth' 
  | 'totalMaintenanceCost';

interface MaintenanceMetricModalProps {
  open: boolean;
  onClose: () => void;
  metricType: MaintenanceMetricType | null;
  summaryData?: {
    openRequests: number;
    emergencyRequests: number;
    workOrdersInProgress: number;
    completedThisMonth: number;
    totalMaintenanceCost: number;
  };
}

export const MaintenanceMetricModal: React.FC<MaintenanceMetricModalProps> = ({
  open,
  onClose,
  metricType,
  summaryData,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch Real Service Requests
  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['service-requests-list'],
    queryFn: () => api.serviceRequests.getAll(),
    enabled: open,
  });

  // 2. Fetch Real Work Orders
  const { data: workOrders = [], isLoading: loadingWorkOrders } = useQuery({
    queryKey: ['work-orders-list'],
    queryFn: () => api.workOrders.getAll(),
    enabled: open,
  });

  // Reset search term when modal opens/closes
  React.useEffect(() => {
    if (!open) setSearchTerm('');
  }, [open]);

  const modalConfig = useMemo(() => {
    if (!metricType) return null;

    switch (metricType) {
      // 1. OPEN REQUESTS
      case 'openRequests': {
        const activeRequests = requests.filter((r: any) => 
          r.status !== 'Completed' && r.status !== 'Cancelled'
        );

        const formattedList = activeRequests.map((r: any, idx: number) => ({
          id: r.id,
          requestNumber: r.requestNumber || `#${idx + 1}`,
          title: r.title || r.issue || 'Service Request',
          propertyName: r.propertyName || (r.property ? r.property.name : 'Property'),
          unitNumber: r.unitNumber || (r.unit?.unitNumber ? `Unit ${r.unit.unitNumber}` : 'General'),
          tenantName: r.tenantName || (r.tenant ? `${r.tenant.firstName || ''} ${r.tenant.lastName || ''}`.trim() : 'Resident'),
          priority: r.priority || 'Medium',
          status: r.status || 'Open',
          createdAt: r.createdAt ? (typeof r.createdAt === 'string' && r.createdAt.includes('T') ? r.createdAt.split('T')[0] : r.createdAt) : 'N/A',
          type: 'ticket',
        }));

        return {
          title: 'Open Service Requests',
          subtitle: `${formattedList.length} Active Service Requests`,
          icon: <Wrench className="w-5 h-5 text-primary" />,
          accentBg: 'bg-primary/10 text-primary border-primary/20',
          columns: [
            { header: 'Request #', accessorKey: 'requestNumber' },
            { header: 'Title / Issue', accessorKey: 'title' },
            { header: 'Property & Unit', accessorKey: 'propertyUnit' },
            { header: 'Resident', accessorKey: 'tenantName' },
            { header: 'Submitted', accessorKey: 'createdAt' },
            { header: 'Priority', accessorKey: 'priority' },
            { header: 'Status', accessorKey: 'status' },
            { header: 'Action', accessorKey: 'action' },
          ],
          data: formattedList,
        };
      }

      // 2. WORK ORDERS IN PROGRESS
      case 'workOrdersInProgress': {
        const inProgressWos = workOrders.filter((w: any) => 
          ['In Progress', 'InProgress', 'In_Progress'].includes(w.status)
        );

        const formattedList = inProgressWos.map((w: any, idx: number) => ({
          id: w.id,
          workOrderNumber: w.workOrderNumber || `#WO-${1001 + idx}`,
          title: w.title || w.issue || 'Maintenance Work Order',
          propertyName: w.propertyName || (w.property ? w.property.name : 'Property'),
          unitNumber: w.unitNumber || (w.unit?.unitNumber ? `Unit ${w.unit.unitNumber}` : 'Unit 101'),
          vendorName: w.assignedTechnician || w.vendorName || 'Unassigned Technician',
          scheduledDate: w.scheduledDate || (w.createdAt ? (typeof w.createdAt === 'string' && w.createdAt.includes('T') ? w.createdAt.split('T')[0] : w.createdAt) : 'N/A'),
          status: w.status || 'In Progress',
          type: 'work_order',
        }));

        return {
          title: 'Work Orders In Progress',
          subtitle: `${formattedList.length} Assigned / Active Repairs`,
          icon: <Clock className="w-5 h-5 text-amber-500" />,
          accentBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          columns: [
            { header: 'Work Order #', accessorKey: 'workOrderNumber' },
            { header: 'Title / Issue', accessorKey: 'title' },
            { header: 'Property & Unit', accessorKey: 'propertyUnit' },
            { header: 'Assigned Tech', accessorKey: 'vendorName' },
            { header: 'Scheduled Date', accessorKey: 'scheduledDate' },
            { header: 'Status', accessorKey: 'status' },
            { header: 'Action', accessorKey: 'action' },
          ],
          data: formattedList,
        };
      }

      // 3. COMPLETED THIS MONTH
      case 'completedThisMonth': {
        const completedWos = workOrders
          .filter((w: any) => ['Completed', 'Resolved', 'Closed'].includes(w.status))
          .map((w: any, idx: number) => ({
            id: w.id,
            referenceNumber: w.workOrderNumber || `#WO-${1001 + idx}`,
            itemType: 'Work Order',
            title: w.title || w.issue || 'Work Order',
            propertyName: w.propertyName || (w.property ? w.property.name : 'Property'),
            unitNumber: w.unitNumber || (w.unit?.unitNumber ? `Unit ${w.unit.unitNumber}` : 'General'),
            resolvedBy: w.assignedTechnician || w.vendorName || 'Technician',
            resolvedDate: w.scheduledDate || (w.updatedAt ? w.updatedAt.split('T')[0] : 'Completed'),
            status: 'Completed',
            type: 'work_order',
          }));

        const completedReqs = requests
          .filter((r: any) => ['Completed', 'Resolved'].includes(r.status))
          .map((r: any, idx: number) => ({
            id: r.id,
            referenceNumber: r.requestNumber || `#${idx + 1}`,
            itemType: 'Service Request',
            title: r.title || r.issue || 'Service Request',
            propertyName: r.propertyName || (r.property ? r.property.name : 'Property'),
            unitNumber: r.unitNumber || (r.unit?.unitNumber ? `Unit ${r.unit.unitNumber}` : 'General'),
            resolvedBy: r.tenantName || 'Resolved',
            resolvedDate: r.updatedAt ? r.updatedAt.split('T')[0] : (r.createdAt ? r.createdAt.split('T')[0] : 'Completed'),
            status: 'Completed',
            type: 'ticket',
          }));

        const formattedList = [...completedWos, ...completedReqs];

        return {
          title: 'Completed Maintenance',
          subtitle: `${formattedList.length} Resolved Work Orders & Tickets`,
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          accentBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          columns: [
            { header: 'Ref #', accessorKey: 'referenceNumber' },
            { header: 'Type', accessorKey: 'itemType' },
            { header: 'Title / Issue', accessorKey: 'title' },
            { header: 'Property & Unit', accessorKey: 'propertyUnit' },
            { header: 'Resolved By / Date', accessorKey: 'resolvedBy' },
            { header: 'Status', accessorKey: 'status' },
            { header: 'Action', accessorKey: 'action' },
          ],
          data: formattedList,
        };
      }

      // 4. TOTAL MAINTENANCE COST
      case 'totalMaintenanceCost': {
        const costWos = workOrders
          .filter((w: any) => (Number(w.actualCost) > 0 || Number(w.estimatedCost) > 0 || Number(w.cost) > 0))
          .map((w: any, idx: number) => {
            const actual = Number(w.actualCost || w.cost || 0);
            const est = Number(w.estimatedCost || 0);
            return {
              id: w.id,
              workOrderNumber: w.workOrderNumber || `#WO-${1001 + idx}`,
              title: w.title || w.issue || 'Maintenance Work Order',
              propertyName: w.propertyName || (w.property ? w.property.name : 'Property'),
              unitNumber: w.unitNumber || (w.unit?.unitNumber ? `Unit ${w.unit.unitNumber}` : 'Unit 101'),
              vendorName: w.assignedTechnician || w.vendorName || 'Contractor / Vendor',
              estimatedCost: `$${est.toLocaleString()}`,
              actualCost: `$${actual.toLocaleString()}`,
              status: w.status || 'Completed',
              type: 'work_order',
            };
          });

        const totalSum = workOrders.reduce((sum: number, w: any) => sum + (Number(w.actualCost) || Number(w.cost) || 0), 0);

        return {
          title: 'Maintenance Cost Ledger',
          subtitle: `$${totalSum.toLocaleString()} Total Recorded Maintenance Costs`,
          icon: <DollarSign className="w-5 h-5 text-rose-500" />,
          accentBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
          columns: [
            { header: 'Work Order #', accessorKey: 'workOrderNumber' },
            { header: 'Title / Issue', accessorKey: 'title' },
            { header: 'Property & Unit', accessorKey: 'propertyUnit' },
            { header: 'Vendor / Tech', accessorKey: 'vendorName' },
            { header: 'Est. Cost', accessorKey: 'estimatedCost' },
            { header: 'Actual Cost', accessorKey: 'actualCost' },
            { header: 'Status', accessorKey: 'status' },
            { header: 'Action', accessorKey: 'action' },
          ],
          data: costWos,
        };
      }

      default:
        return null;
    }
  }, [metricType, requests, workOrders]);

  // Filter items by search query
  const filteredData = useMemo(() => {
    if (!modalConfig?.data) return [];
    if (!searchTerm.trim()) return modalConfig.data;

    const term = searchTerm.toLowerCase().trim();
    return modalConfig.data.filter((item: any) => {
      return Object.values(item).some((val) => 
        String(val || '').toLowerCase().includes(term)
      );
    });
  }, [modalConfig, searchTerm]);

  // Export to Excel
  const handleExportExcel = () => {
    if (!modalConfig || filteredData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MaintenanceData');
    XLSX.writeFile(workbook, `${modalConfig.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!modalConfig || filteredData.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(modalConfig.title, 14, 15);
    doc.setFontSize(10);
    doc.text(modalConfig.subtitle, 14, 22);

    const headers = modalConfig.columns
      .filter((c) => c.accessorKey !== 'action')
      .map((c) => c.header);

    const rows = filteredData.map((item: any) =>
      modalConfig.columns
        .filter((c) => c.accessorKey !== 'action')
        .map((c) => {
          if (c.accessorKey === 'propertyUnit') {
            return `${item.propertyName} • ${item.unitNumber}`;
          }
          return item[c.accessorKey] || '';
        })
    );

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 28,
      styles: { fontSize: 8 },
    });

    doc.save(`${modalConfig.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleItemClick = (item: any) => {
    onClose();
    if (item.type === 'ticket') {
      navigate({ to: `/maintenance/requests/${item.id}` });
    } else {
      navigate({ to: `/maintenance/work-orders/${item.id}` });
    }
  };

  const isLoading = loadingRequests || loadingWorkOrders;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-5xl md:max-w-6xl h-[88vh] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 border-b flex-shrink-0 bg-secondary/5 pr-14">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-xl border ${modalConfig?.accentBg || 'bg-primary/10 text-primary'}`}>
                {modalConfig?.icon || <Wrench className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-foreground">
                  {modalConfig?.title || 'Maintenance Metric Details'}
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-muted-foreground mt-0.5">
                  {modalConfig?.subtitle || 'View real maintenance records and navigate directly to details.'}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticket, property, resident, vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-background w-full"
              />
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={filteredData.length === 0}
                className="h-9 text-xs font-bold gap-1.5 rounded-xl border bg-background hover:bg-secondary/40 shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>Excel</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={filteredData.length === 0}
                className="h-9 text-xs font-bold gap-1.5 rounded-xl border bg-background hover:bg-secondary/40 shrink-0"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>PDF</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body / Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold">Loading live maintenance records...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm font-bold text-foreground">No records found</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                There are no matching items for this maintenance metric.
              </p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-x-auto shadow-sm bg-background">
              <table className="w-full min-w-[760px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-secondary/20 border-b text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                    {modalConfig?.columns.map((col) => (
                      <th key={col.accessorKey} className="px-4 py-3">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredData.map((row: any) => (
                    <tr
                      key={row.id}
                      onClick={() => handleItemClick(row)}
                      className="hover:bg-primary/5 cursor-pointer transition-colors group"
                    >
                      {modalConfig?.columns.map((col) => {
                        const val = row[col.accessorKey];

                        // Request or Work Order reference
                        if (['requestNumber', 'workOrderNumber', 'referenceNumber'].includes(col.accessorKey)) {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 font-mono font-bold text-primary whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 group-hover:underline">
                                {val}
                                <ExternalLink className="w-3 h-3 text-primary opacity-50 group-hover:opacity-100" />
                              </span>
                            </td>
                          );
                        }

                        // Property & Unit
                        if (col.accessorKey === 'propertyUnit') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3">
                              <span className="font-bold text-foreground block">{row.propertyName}</span>
                              <span className="text-[11px] text-muted-foreground font-semibold">{row.unitNumber}</span>
                            </td>
                          );
                        }

                        // Priority Badge
                        if (col.accessorKey === 'priority') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 whitespace-nowrap">
                              <RequestPriorityBadge priority={row.priority} />
                            </td>
                          );
                        }

                        // Status Badge
                        if (col.accessorKey === 'status') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 whitespace-nowrap">
                              <StatusBadge status={row.status} />
                            </td>
                          );
                        }

                        // Costs
                        if (['estimatedCost', 'actualCost'].includes(col.accessorKey)) {
                          return (
                            <td key={col.accessorKey} className={`px-4 py-3 font-bold whitespace-nowrap ${col.accessorKey === 'actualCost' ? 'text-rose-500' : 'text-foreground'}`}>
                              {val}
                            </td>
                          );
                        }

                        // Action Column
                        if (col.accessorKey === 'action') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleItemClick(row)}
                                className="h-7 px-2.5 text-[10px] font-bold rounded-lg border bg-background hover:bg-primary hover:text-primary-foreground gap-1 transition-all"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </Button>
                            </td>
                          );
                        }

                        // General Text Columns (Title, Resident, Tech, Dates)
                        return (
                          <td key={col.accessorKey} className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">
                            {val || 'N/A'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-secondary/5 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold">
            Showing {filteredData.length} records • Click any record to view details
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl font-bold h-8">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceMetricModal;
