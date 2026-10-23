import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  Wallet, DollarSign, TrendingUp, AlertCircle, 
  FileSpreadsheet, FileText, Search, X, ExternalLink 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type AccountingMetricType = 
  | 'cashBalance' 
  | 'totalIncome' 
  | 'totalExpenses' 
  | 'netProfit';

interface AccountingMetricModalProps {
  open: boolean;
  onClose: () => void;
  metricType: AccountingMetricType | null;
  summaryData?: {
    cashBalance: number;
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
  };
}

export const AccountingMetricModal: React.FC<AccountingMetricModalProps> = ({
  open,
  onClose,
  metricType,
  summaryData,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch Real Chart of Accounts
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['coa-accounts-list'],
    queryFn: () => api.accounts.getAll(),
    enabled: open,
  });

  // 2. Fetch Real Expenses
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['accounting-modal-expenses'],
    queryFn: () => api.expenses.getAll(),
    enabled: open && (metricType === 'totalExpenses' || metricType === 'netProfit'),
  });

  // 3. Fetch Real Recorded Income
  const { data: income = [], isLoading: loadingIncome } = useQuery({
    queryKey: ['income-list'],
    queryFn: () => api.income.getAll(),
    enabled: open && (metricType === 'totalIncome' || metricType === 'netProfit'),
  });

  // 4. Fetch Real Payments (Income Inflow)
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['accounting-modal-payments'],
    queryFn: () => api.payments.getAll(),
    enabled: open && (metricType === 'totalIncome' || metricType === 'netProfit'),
  });

  // Reset search term when modal opens/closes
  React.useEffect(() => {
    if (!open) setSearchTerm('');
  }, [open]);

  // Compute live totals from real data
  const realAssetSum = accounts.filter((a: any) => a.accountType === 'Assets').reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
  const realIncomeSum = accounts.filter((a: any) => a.accountType === 'Income' || a.accountType === 'Revenue').reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
  const realExpensesSum = accounts.filter((a: any) => a.accountType === 'Expenses').reduce((sum: number, a: any) => sum + (a.balance || 0), 0);
  const realNetProfit = realIncomeSum - realExpensesSum;

  const displayCashBalance = summaryData?.cashBalance ?? realAssetSum;
  const displayIncome = summaryData?.totalIncome ?? realIncomeSum;
  const displayExpenses = summaryData?.totalExpenses ?? realExpensesSum;
  const displayNetProfit = summaryData?.netProfit ?? realNetProfit;

  const modalConfig = useMemo(() => {
    if (!metricType) return null;

    switch (metricType) {
      // 1. CASH ACCOUNT BALANCE
      case 'cashBalance': {
        const assetAccounts = accounts
          .filter((a: any) => a.accountType === 'Assets')
          .map((a: any) => ({
            id: a.id,
            accountNumber: a.accountNumber || '1010',
            accountName: a.accountName || 'Cash Asset Account',
            accountType: 'Current Asset',
            balance: `$${(a.balance || 0).toLocaleString()}`,
            numericBalance: a.balance || 0,
            status: a.isActive !== false ? 'Active' : 'Inactive',
          }));

        const defaultCashRow = [
          {
            id: 'cash-net',
            accountNumber: 'CASH-01',
            accountName: 'Net Operating Cash Balance (Inflows - Outflows)',
            accountType: 'Liquid Holding',
            balance: `$${displayCashBalance.toLocaleString()}`,
            numericBalance: displayCashBalance,
            status: 'Active',
          }
        ];

        const rows = assetAccounts.length > 0 ? assetAccounts : defaultCashRow;

        const filtered = rows.filter((item: any) =>
          item.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.accountType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          title: 'Cash Account Balance Matrix',
          description: 'Live Chart of Accounts liquid assets, bank balances, and escrow holdings',
          icon: <Wallet className="w-6 h-6 text-emerald-500" />,
          badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          count: `$${displayCashBalance.toLocaleString()}`,
          countLabel: 'Liquid Assets',
          data: filtered,
          rawData: rows,
          reportTitle: 'CASH_ACCOUNT_BALANCE_REPORT',
          columns: [
            { header: 'Account #', accessorKey: 'accountNumber' },
            { header: 'Account Name', accessorKey: 'accountName' },
            { header: 'Classification', accessorKey: 'accountType' },
            { header: 'Current Balance', accessorKey: 'balance' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 2. TOTAL INCOME YTD
      case 'totalIncome': {
        const incomeAccounts = accounts
          .filter((a: any) => a.accountType === 'Income' || a.accountType === 'Revenue')
          .map((a: any) => ({
            id: a.id,
            accountNumber: a.accountNumber || '4010',
            accountName: a.accountName || 'Operating Revenue',
            accountType: 'Operating Revenue',
            balance: `$${(a.balance || 0).toLocaleString()}`,
            numericBalance: a.balance || 0,
            status: a.isActive !== false ? 'Active' : 'Inactive',
          }));

        const recordedIncomeRows = income.map((i: any) => ({
          id: i.id,
          accountNumber: i.category || 'Income',
          accountName: `${i.category} - ${i.propertyName || 'Property'} (${i.tenantName || 'Resident'})`,
          accountType: i.sourceType || 'Revenue',
          balance: `$${(Number(i.amount) || 0).toLocaleString()}`,
          numericBalance: Number(i.amount) || 0,
          status: i.status || 'Cleared',
        }));

        const rows = incomeAccounts.length > 0 ? incomeAccounts : recordedIncomeRows;

        const filtered = rows.filter((item: any) =>
          item.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.accountType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          title: 'Operating Income YTD Matrix',
          description: 'Real-time operating revenue accounts, rental incomes, and fee receipts',
          icon: <DollarSign className="w-6 h-6 text-emerald-500" />,
          badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          count: `$${displayIncome.toLocaleString()}`,
          countLabel: 'Total Income',
          data: filtered,
          rawData: rows,
          reportTitle: 'OPERATING_INCOME_YTD_REPORT',
          columns: [
            { header: 'Account Code / Category', accessorKey: 'accountNumber' },
            { header: 'Revenue Stream / Source', accessorKey: 'accountName' },
            { header: 'Classification', accessorKey: 'accountType' },
            { header: 'Amount', accessorKey: 'balance' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 3. TOTAL EXPENSES YTD
      case 'totalExpenses': {
        const expenseAccounts = accounts
          .filter((a: any) => a.accountType === 'Expenses')
          .map((a: any) => ({
            id: a.id,
            accountNumber: a.accountNumber || '5010',
            accountName: a.accountName || 'Operating Expense',
            accountType: 'Operating Cost',
            balance: `$${(a.balance || 0).toLocaleString()}`,
            numericBalance: a.balance || 0,
            status: a.isActive !== false ? 'Active' : 'Inactive',
          }));

        const recordedExpenseRows = expenses.map((e: any) => ({
          id: e.id,
          accountNumber: e.category || 'Expense',
          accountName: `${e.category} - ${e.vendorName || 'Vendor'} (${e.propertyName || 'Property'})`,
          accountType: 'Operating Cost',
          balance: `$${(Number(e.amount) || 0).toLocaleString()}`,
          numericBalance: Number(e.amount) || 0,
          status: e.status || 'Cleared',
        }));

        const rows = expenseAccounts.length > 0 ? expenseAccounts : recordedExpenseRows;

        const filtered = rows.filter((item: any) =>
          item.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.accountType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          title: 'Operating Expenses YTD Matrix',
          description: 'Itemized Chart of Accounts expenses, maintenance costs, and administrative disbursements',
          icon: <DollarSign className="w-6 h-6 text-rose-500" />,
          badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          count: `$${displayExpenses.toLocaleString()}`,
          countLabel: 'Total Expenses',
          data: filtered,
          rawData: rows,
          reportTitle: 'OPERATING_EXPENSES_YTD_REPORT',
          columns: [
            { header: 'Account Code / Category', accessorKey: 'accountNumber' },
            { header: 'Expense Category / Details', accessorKey: 'accountName' },
            { header: 'Classification', accessorKey: 'accountType' },
            { header: 'Amount', accessorKey: 'balance' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 4. NET PROFIT MARGIN
      case 'netProfit': {
        const marginPct = displayIncome > 0 ? Math.round((displayNetProfit / displayIncome) * 100) : 0;
        const profitRows = [
          {
            id: 'np-1',
            financialSegment: 'Gross Operating Income (Revenues)',
            inflow: `$${displayIncome.toLocaleString()}`,
            outflow: '$0',
            netAmount: `$${displayIncome.toLocaleString()}`,
            marginRate: '100%',
            status: 'Optimal',
          },
          {
            id: 'np-2',
            financialSegment: 'Operating Expenses & Disbursements',
            inflow: '$0',
            outflow: `$${displayExpenses.toLocaleString()}`,
            netAmount: `-$${displayExpenses.toLocaleString()}`,
            marginRate: displayIncome > 0 ? `-${Math.round((displayExpenses / displayIncome) * 100)}%` : '0%',
            status: 'Cleared',
          },
          {
            id: 'np-3',
            financialSegment: 'Net Operating Profit (NOI)',
            inflow: `$${displayIncome.toLocaleString()}`,
            outflow: `$${displayExpenses.toLocaleString()}`,
            netAmount: `$${displayNetProfit.toLocaleString()}`,
            marginRate: `${marginPct}%`,
            status: displayNetProfit >= 0 ? 'Profitable' : 'Deficit',
          },
          {
            id: 'np-4',
            financialSegment: 'Liquid Asset Reserves',
            inflow: `$${displayCashBalance.toLocaleString()}`,
            outflow: '$0',
            netAmount: `$${displayCashBalance.toLocaleString()}`,
            marginRate: 'N/A',
            status: 'Active',
          },
        ];

        const filtered = profitRows.filter((item: any) =>
          item.financialSegment.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          title: 'Net Profit Margin Matrix',
          description: 'Comprehensive financial performance summary, revenue vs expenditure margins',
          icon: <TrendingUp className="w-6 h-6 text-emerald-500" />,
          badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          count: `$${displayNetProfit.toLocaleString()}`,
          countLabel: 'Net Margin',
          data: filtered,
          rawData: profitRows,
          reportTitle: 'NET_PROFIT_MARGIN_REPORT',
          columns: [
            { header: 'Financial Segment', accessorKey: 'financialSegment' },
            { header: 'Inflow', accessorKey: 'inflow' },
            { header: 'Outflow', accessorKey: 'outflow' },
            { header: 'Net Amount', accessorKey: 'netAmount' },
            { header: 'Margin %', accessorKey: 'marginRate' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      default:
        return null;
    }
  }, [metricType, accounts, searchTerm, displayCashBalance, displayIncome, displayExpenses, displayNetProfit]);

  if (!open || !modalConfig) return null;

  const isLoading = loadingAccounts || loadingExpenses || loadingPayments;

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
                <p className="text-xs font-semibold">Loading matrix details...</p>
              </div>
            ) : modalConfig.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 text-muted-foreground">
                <AlertCircle className="w-10 h-10 text-muted-foreground/50" />
                <p className="font-extrabold text-sm text-foreground">No Records Found</p>
                <p className="text-xs max-w-xs">
                  {searchTerm ? `No results match your search "${searchTerm}".` : 'No live records found for this accounting category.'}
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

                        // Code / ID
                        if (col.accessorKey === 'accountNumber') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 font-mono font-bold text-primary">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  if (metricType === 'totalIncome') {
                                    navigate({ to: '/accounting/income' });
                                  } else if (metricType === 'totalExpenses') {
                                    navigate({ to: '/accounting/expenses' });
                                  } else {
                                    navigate({ to: '/accounting/chart-of-accounts' });
                                  }
                                }}
                                className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 text-left font-mono font-bold group"
                                title="View in Accounting Directory"
                              >
                                <span>{val}</span>
                                <ExternalLink className="w-3 h-3 text-primary opacity-60 group-hover:opacity-100" />
                              </button>
                            </td>
                          );
                        }

                        if (col.accessorKey === 'accountName' || col.accessorKey === 'financialSegment') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 font-bold text-foreground">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  if (metricType === 'totalIncome') {
                                    navigate({ to: '/accounting/income' });
                                  } else if (metricType === 'totalExpenses') {
                                    navigate({ to: '/accounting/expenses' });
                                  } else if (metricType === 'netProfit') {
                                    if (row.id === 'np-1') navigate({ to: '/accounting/income' });
                                    else if (row.id === 'np-2') navigate({ to: '/accounting/expenses' });
                                    else navigate({ to: '/accounting/chart-of-accounts' });
                                  } else {
                                    navigate({ to: '/accounting/chart-of-accounts' });
                                  }
                                }}
                                className="text-foreground hover:text-primary hover:underline cursor-pointer inline-flex items-center gap-1 text-left font-bold group"
                                title="View Accounting Breakdown"
                              >
                                <span>{val}</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                              </button>
                            </td>
                          );
                        }

                        // Currency
                        if (['balance', 'inflow', 'outflow', 'netAmount'].includes(col.accessorKey)) {
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
            <span>Real-time accounting financial ledger breakdown</span>
            <Button variant="outline" size="sm" onClick={onClose} className="px-6">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountingMetricModal;
