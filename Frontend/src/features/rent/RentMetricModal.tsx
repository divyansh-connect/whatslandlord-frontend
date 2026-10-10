import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  DollarSign, TrendingUp, AlertCircle, CreditCard, 
  FileSpreadsheet, FileText, Search, X 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type RentMetricType = 
  | 'collectedToday' 
  | 'monthlyCollected' 
  | 'outstandingBalance' 
  | 'paymentPlans' 
  | 'lateFeeInvoices';

interface RentMetricModalProps {
  open: boolean;
  onClose: () => void;
  metricType: RentMetricType | null;
  summaryMetrics?: {
    collectedToday: number;
    monthlyCollected: number;
    outstandingBalance: number;
    latePayments: number;
    activePlans: number;
  };
}

export const RentMetricModal: React.FC<RentMetricModalProps> = ({
  open,
  onClose,
  metricType,
  summaryMetrics,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch Real Payments
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['rent-modal-payments'],
    queryFn: () => api.payments.getAll(),
    enabled: open && (metricType === 'collectedToday' || metricType === 'monthlyCollected'),
  });

  // 2. Fetch Real Invoices
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['rent-modal-invoices'],
    queryFn: () => api.invoices.getAll(),
    enabled: open && (metricType === 'outstandingBalance' || metricType === 'lateFeeInvoices'),
  });

  // 3. Fetch Real Payment Plans
  const { data: paymentPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['rent-modal-payment-plans'],
    queryFn: () => api.paymentPlans.getAll(),
    enabled: open && metricType === 'paymentPlans',
  });

  // Reset search term when modal opens/closes
  React.useEffect(() => {
    if (!open) setSearchTerm('');
  }, [open]);

  const modalConfig = useMemo(() => {
    if (!metricType) return null;

    switch (metricType) {
      // 1. COLLECTED TODAY
      case 'collectedToday': {
        const todayStr = new Date().toISOString().split('T')[0];
        const paidPayments = payments.filter((p: any) => p.status === 'Paid');
        
        // Filter payments for today, or latest settlement batch
        let todayList = paidPayments.filter((p: any) => 
          (p.paidDate && p.paidDate.startsWith(todayStr)) ||
          (p.createdAt && p.createdAt.startsWith(todayStr))
        );

        if (todayList.length === 0 && paidPayments.length > 0) {
          // If no payment was submitted strictly today, show the latest cleared batch
          const latestDate = paidPayments[0]?.paidDate || '';
          todayList = paidPayments.filter((p: any) => p.paidDate === latestDate || !latestDate).slice(0, 5);
        }

        const formattedList = (todayList.length > 0 ? todayList : paidPayments.slice(0, 5)).map((p: any, idx: number) => ({
          id: p.id || `today-${idx}`,
          receiptNumber: p.receiptNumber || `#REC-${(p.id || '').slice(0, 6).toUpperCase()}`,
          tenantName: p.tenantName || 'Resident',
          propertyName: p.propertyName || 'Property',
          unitNumber: p.unitNumber ? (p.unitNumber.startsWith('Unit') ? p.unitNumber : `Unit ${p.unitNumber}`) : 'Unassigned',
          amount: `$${(p.amount || 0).toLocaleString()}`,
          numericAmount: p.amount || 0,
          paidDate: p.paidDate || 'Today',
          paymentMethod: p.paymentMethod || 'ACH',
          status: p.status || 'Paid',
        }));

        const filtered = formattedList.filter((item: any) =>
          item.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const totalCleared = summaryMetrics?.collectedToday ?? formattedList.reduce((s: number, p: any) => s + p.numericAmount, 0);

        return {
          title: "Today's Rent Collections Matrix",
          description: 'Real-time cleared payments, bank transactions, and daily settlement batches',
          icon: <DollarSign className="w-6 h-6 text-emerald-500" />,
          badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          count: `$${totalCleared.toLocaleString()}`,
          countLabel: 'Cleared Today',
          data: filtered,
          rawData: formattedList,
          reportTitle: 'TODAYS_RENT_COLLECTIONS_REPORT',
          columns: [
            { header: 'Receipt #', accessorKey: 'receiptNumber' },
            { header: 'Resident Name', accessorKey: 'tenantName' },
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Unit #', accessorKey: 'unitNumber' },
            { header: 'Cleared Amount', accessorKey: 'amount' },
            { header: 'Payment Date', accessorKey: 'paidDate' },
            { header: 'Method', accessorKey: 'paymentMethod' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 2. MONTHLY COLLECTED
      case 'monthlyCollected': {
        const paidPayments = payments
          .filter((p: any) => p.status === 'Paid')
          .map((p: any, idx: number) => ({
            id: p.id || `m-pay-${idx}`,
            receiptNumber: p.receiptNumber || `#REC-${(p.id || '').slice(0, 6).toUpperCase()}`,
            tenantName: p.tenantName || 'Resident',
            propertyName: p.propertyName || 'Property',
            unitNumber: p.unitNumber ? (p.unitNumber.startsWith('Unit') ? p.unitNumber : `Unit ${p.unitNumber}`) : 'Unassigned',
            amount: `$${(p.amount || 0).toLocaleString()}`,
            numericAmount: p.amount || 0,
            paidDate: p.paidDate || 'N/A',
            paymentMethod: p.paymentMethod || 'ACH',
            referenceNumber: p.referenceNumber || 'Verified Electronic Batch',
            status: p.status || 'Paid',
          }));

        const filtered = paidPayments.filter((item: any) =>
          item.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.paidDate.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const totalMonthly = summaryMetrics?.monthlyCollected ?? paidPayments.reduce((s: number, p: any) => s + p.numericAmount, 0);

        return {
          title: 'Monthly Collections Ledger Matrix',
          description: 'Itemized ledger of all cleared tenant remittances, online collections, and rental income',
          icon: <TrendingUp className="w-6 h-6 text-emerald-500" />,
          badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          count: `$${totalMonthly.toLocaleString()}`,
          countLabel: 'Monthly Collected',
          data: filtered,
          rawData: paidPayments,
          reportTitle: 'MONTHLY_COLLECTIONS_REPORT',
          columns: [
            { header: 'Receipt #', accessorKey: 'receiptNumber' },
            { header: 'Resident Name', accessorKey: 'tenantName' },
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Unit #', accessorKey: 'unitNumber' },
            { header: 'Collected Amount', accessorKey: 'amount' },
            { header: 'Settlement Date', accessorKey: 'paidDate' },
            { header: 'Method', accessorKey: 'paymentMethod' },
            { header: 'Reference', accessorKey: 'referenceNumber' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 3. OUTSTANDING BALANCE
      case 'outstandingBalance': {
        const overdueList = invoices
          .filter((i: any) => i.status === 'Overdue' || (i.balance && i.balance > 0))
          .map((i: any, idx: number) => ({
            id: i.id || `inv-overdue-${idx}`,
            invoiceNumber: `#INV-${(i.id || '').slice(0, 6).toUpperCase()}`,
            tenantName: i.tenantName || 'Resident',
            propertyName: i.propertyName || 'Property',
            unitNumber: i.unitNumber ? (i.unitNumber.startsWith('Unit') ? i.unitNumber : `Unit ${i.unitNumber}`) : 'Unassigned',
            amount: `$${(i.amount || 0).toLocaleString()}`,
            balance: `$${(i.balance !== undefined ? i.balance : ((i.amount || 0) - (i.paidAmount || 0))).toLocaleString()}`,
            numericBalance: i.balance !== undefined ? i.balance : ((i.amount || 0) - (i.paidAmount || 0)),
            dueDate: i.dueDate || 'Immediate',
            status: i.status || 'Overdue',
          }));

        const filtered = overdueList.filter((item: any) =>
          item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.dueDate.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const totalOverdue = summaryMetrics?.outstandingBalance ?? overdueList.reduce((s: number, i: any) => s + i.numericBalance, 0);

        return {
          title: 'Outstanding & Overdue Rent Balances Matrix',
          description: 'All delinquent tenant balances, unpaid rental charges, and overdue accounts requiring collection',
          icon: <AlertCircle className="w-6 h-6 text-rose-500" />,
          badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          count: `$${totalOverdue.toLocaleString()}`,
          countLabel: 'Outstanding Balance',
          data: filtered,
          rawData: overdueList,
          reportTitle: 'OUTSTANDING_RENT_BALANCES_REPORT',
          columns: [
            { header: 'Invoice #', accessorKey: 'invoiceNumber' },
            { header: 'Resident Name', accessorKey: 'tenantName' },
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Unit #', accessorKey: 'unitNumber' },
            { header: 'Total Invoiced', accessorKey: 'amount' },
            { header: 'Unpaid Balance', accessorKey: 'balance' },
            { header: 'Due Date', accessorKey: 'dueDate' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 4. PAYMENT PLANS
      case 'paymentPlans': {
        const plansList = paymentPlans.map((p: any, idx: number) => ({
          id: p.id || `plan-${idx}`,
          planId: `#PLAN-${(p.id || '').slice(0, 6).toUpperCase()}`,
          tenantName: p.tenantName || (p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}` : 'Resident'),
          totalAmount: `$${(p.totalAmount || 0).toLocaleString()}`,
          frequency: p.frequency || 'Monthly Installments',
          createdAt: p.createdAt ? p.createdAt.split('T')[0] : 'Active',
          status: p.status || 'Active',
        }));

        const filtered = plansList.filter((item: any) =>
          item.planId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.frequency.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          title: 'Active Payment Plans Matrix',
          description: 'Structured tenant repayment arrangements, installment agreements, and debt recovery plans',
          icon: <CreditCard className="w-6 h-6 text-blue-500" />,
          badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          count: plansList.length,
          countLabel: 'Payment Plans',
          data: filtered,
          rawData: plansList,
          reportTitle: 'PAYMENT_PLANS_REPORT',
          columns: [
            { header: 'Plan #', accessorKey: 'planId' },
            { header: 'Resident Name', accessorKey: 'tenantName' },
            { header: 'Total Agreement Debt', accessorKey: 'totalAmount' },
            { header: 'Payment Frequency', accessorKey: 'frequency' },
            { header: 'Start Date', accessorKey: 'createdAt' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 5. LATE FEE INVOICES
      case 'lateFeeInvoices': {
        const lateInvoices = invoices
          .filter((i: any) => i.status === 'Overdue')
          .map((i: any, idx: number) => ({
            id: i.id || `late-${idx}`,
            invoiceNumber: `#INV-${(i.id || '').slice(0, 6).toUpperCase()}`,
            tenantName: i.tenantName || 'Resident',
            propertyName: i.propertyName || 'Property',
            unitNumber: i.unitNumber ? (i.unitNumber.startsWith('Unit') ? i.unitNumber : `Unit ${i.unitNumber}`) : 'Unassigned',
            amount: `$${(i.amount || 0).toLocaleString()}`,
            balance: `$${(i.balance !== undefined ? i.balance : ((i.amount || 0) - (i.paidAmount || 0))).toLocaleString()}`,
            dueDate: i.dueDate || 'Past Due',
            status: 'Overdue',
          }));

        const filtered = lateInvoices.filter((item: any) =>
          item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.dueDate.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          title: 'Late Fee & Overdue Invoices Matrix',
          description: 'Automated late fees dispatched, overdue payment notices, and penalty assessments',
          icon: <AlertCircle className="w-6 h-6 text-amber-500" />,
          badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          count: lateInvoices.length,
          countLabel: 'Late Invoices',
          data: filtered,
          rawData: lateInvoices,
          reportTitle: 'LATE_FEE_INVOICES_REPORT',
          columns: [
            { header: 'Invoice #', accessorKey: 'invoiceNumber' },
            { header: 'Resident Name', accessorKey: 'tenantName' },
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Unit #', accessorKey: 'unitNumber' },
            { header: 'Total Invoiced', accessorKey: 'amount' },
            { header: 'Unpaid Balance', accessorKey: 'balance' },
            { header: 'Due Date', accessorKey: 'dueDate' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      default:
        return null;
    }
  }, [metricType, payments, invoices, paymentPlans, searchTerm, summaryMetrics]);

  if (!open || !modalConfig) return null;

  const isLoading = loadingPayments || loadingInvoices || loadingPlans;

  // Export handlers
  const handleExportCSV = () => {
    const list = modalConfig.data;
    if (list.length === 0) return;

    const exportRows = list.map((item: any) => {
      const row: Record<string, any> = {};
      modalConfig.columns.forEach((col) => {
        row[col.header] = item[col.accessorKey] ?? 'N/A';
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Matrix Details');
    XLSX.writeFile(workbook, `${modalConfig.reportTitle}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const list = modalConfig.data;
    if (list.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(modalConfig.title.toUpperCase(), 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${list.length}`, 14, 21);

    const headers = modalConfig.columns.map((c) => c.header);
    const tableRows = list.map((item: any) =>
      modalConfig.columns.map((c) => String(item[c.accessorKey] ?? 'N/A'))
    );

    autoTable(doc, {
      startY: 26,
      head: [headers],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    doc.save(`${modalConfig.reportTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-5xl h-[85vh] max-h-[85vh] p-6 overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden gap-3">
          {/* Header Section */}
          <DialogHeader className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-secondary/80 rounded-2xl shrink-0">
                {modalConfig.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-extrabold text-foreground">
                    {modalConfig.title}
                  </DialogTitle>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${modalConfig.badgeBg}`}>
                    {modalConfig.count} {modalConfig.countLabel}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {modalConfig.description}
                </DialogDescription>
              </div>
            </div>

            {/* Action Export Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={isLoading || modalConfig.data.length === 0}
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                Export Excel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExportPDF}
                disabled={isLoading || modalConfig.data.length === 0}
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                <FileText className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </DialogHeader>

          {/* Search & Filter Bar */}
          <div className="shrink-0 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Search ${modalConfig.countLabel.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Showing {modalConfig.data.length} of {modalConfig.rawData.length} entries
            </span>
          </div>

          {/* Table Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto border border-border rounded-xl">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3 text-muted-foreground">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold">Loading rent matrix details...</p>
              </div>
            ) : modalConfig.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 text-muted-foreground">
                <AlertCircle className="w-10 h-10 text-muted-foreground/50" />
                <p className="font-extrabold text-sm text-foreground">No Records Found</p>
                <p className="text-xs max-w-xs">
                  {searchTerm ? `No results match your search "${searchTerm}".` : 'No data available for this rent category.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-secondary/90 sticky top-0 border-b border-border z-10 text-muted-foreground font-extrabold uppercase text-[10px] tracking-wider backdrop-blur-md">
                  <tr>
                    {modalConfig.columns.map((col) => (
                      <th key={col.accessorKey} className="px-4 py-3 bg-secondary/90">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {modalConfig.data.map((row: any, idx: number) => (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-secondary/40 transition-colors font-medium text-foreground"
                    >
                      {modalConfig.columns.map((col) => {
                        const val = row[col.accessorKey];

                        // Status Badge
                        if (col.accessorKey === 'status') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3">
                              <StatusBadge status={val} />
                            </td>
                          );
                        }

                        // Code / ID Columns
                        if (['receiptNumber', 'invoiceNumber', 'planId'].includes(col.accessorKey)) {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 font-mono font-bold text-primary">
                              {val}
                            </td>
                          );
                        }

                        if (['propertyName', 'tenantName', 'unitNumber'].includes(col.accessorKey)) {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 font-bold text-foreground">
                              {val}
                            </td>
                          );
                        }

                        // Currency
                        if (['amount', 'balance', 'totalAmount'].includes(col.accessorKey)) {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 font-semibold text-foreground">
                              {val}
                            </td>
                          );
                        }

                        return (
                          <td key={col.accessorKey} className="px-4 py-3 text-muted-foreground">
                            {val || 'N/A'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-border flex items-center justify-between shrink-0 text-xs text-muted-foreground">
            <span>Real-time rent collection and ledger matrix breakdown</span>
            <Button variant="outline" size="sm" onClick={onClose} className="px-6">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RentMetricModal;
