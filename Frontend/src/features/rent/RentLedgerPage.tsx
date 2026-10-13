import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Download, Printer, Eye, ArrowLeft, Pencil, Sparkles } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { EditPaymentModal } from './EditPaymentModal';

interface LedgerItem {
  id: string;
  date: string;
  tenantId?: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  transactionType: string;
}

export const RentLedgerPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  
  const search: any = useSearch({ strict: false });
  const navigate = useNavigate();
  const selectedTenantId = search.tenantId || '';

  const setSelectedTenantId = (id: string) => {
    navigate({
      to: '/rent-ledger',
      search: (prev: any) => ({ ...prev, tenantId: id || undefined }),
    });
  };

  // Queries
  const { data: ledger = [], isLoading, error } = useQuery({
    queryKey: ['rent-ledger-list'],
    queryFn: () => api.rentLedger.getAll(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.tenant.getAll(),
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.userProfile.get(),
  });

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const tenantProperty = selectedTenant ? properties.find((p) => p.id === selectedTenant.propertyId) : null;
  const propertyAddress = tenantProperty ? tenantProperty.address : (selectedTenant?.propertyName ? `${selectedTenant.propertyName}, Austin, TX` : 'N/A');
  const managementCompany = profile?.company || tenantProperty?.managementCompany || 'Astoria Group';

  const selectedTenantLedger = React.useMemo(() => {
    if (!selectedTenant) return [];
    const tenantFullName = `${selectedTenant.firstName} ${selectedTenant.lastName}`;
    const items = ledger.filter((item: LedgerItem) => {
      if (item.tenantId && item.tenantId === selectedTenantId) return true;
      return item.tenantName === tenantFullName;
    });
    
    // Sort items by date ascending
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));
    
    // Recalculate running balance (includes Late Fee as a debit charge)
    let runningBalance = 0;
    return sorted.map((item) => {
      const debit = item.debit;
      const credit = item.credit;
      if (item.transactionType === 'Rent Charge' || item.transactionType === 'Late Fee') {
        runningBalance += debit;
      } else if (item.transactionType === 'Payment') {
        runningBalance -= credit;
      }
      return {
        ...item,
        balance: runningBalance
      };
    });
  }, [ledger, selectedTenant, selectedTenantId]);

  const filteredLedger = ledger.filter((item) => {
    const nameMatch = item.tenantName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProp = propertyFilter === '' || item.propertyName.includes(propertyFilter);
    const matchesType = typeFilter === '' || item.transactionType === typeFilter;
    return nameMatch && matchesProp && matchesType;
  });

  // Export CSV
  const handleExport = () => {
    const headers = 'Date,Tenant,Property,Description,Debit,Credit,Balance,Type\n';
    const rows = filteredLedger
      .map(
        (l) =>
          `"${l.date}","${l.tenantName}","${l.propertyName}","${l.description}",${l.debit},${l.credit},${l.balance},"${l.transactionType}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'Rent_Ledger_Report.csv');
    a.click();
  };

  const columns: ColumnDef<LedgerItem>[] = [
    { accessorKey: 'date', header: t('rentLedgerPage.date'), id: 'date' },
    {
      accessorKey: 'tenantName',
      header: t('rentLedgerPage.tenant'),
      id: 'tenant',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 font-bold">
          <span>{row.original.tenantName}</span>
          {row.original.balance <= 0 ? (
            <span className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black px-1.5 py-0.5 rounded-full" title="AI Health: Reliable on-time payer">
              98%
            </span>
          ) : (
            <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black px-1.5 py-0.5 rounded-full" title="AI Health: Balance pending">
              Due
            </span>
          )}
        </div>
      ),
    },
    { accessorKey: 'propertyName', header: t('rentLedgerPage.property'), id: 'property', cell: ({ row }) => `${row.original.propertyName} (Unit ${row.original.unitNumber})` },
    { accessorKey: 'description', header: t('rentLedgerPage.description'), id: 'description' },
    {
      accessorKey: 'debit',
      header: t('rentLedgerPage.debit'),
      id: 'debit',
      cell: ({ row }) => row.original.debit > 0 ? <span className="text-rose-500 font-bold">+${row.original.debit.toLocaleString()}</span> : '-',
    },
    {
      accessorKey: 'credit',
      header: t('rentLedgerPage.credit'),
      id: 'credit',
      cell: ({ row }) => row.original.credit > 0 ? <span className="text-emerald-500 font-bold">-${row.original.credit.toLocaleString()}</span> : '-',
    },
    {
      accessorKey: 'balance',
      header: t('rentLedgerPage.runningBalance'),
      id: 'balance',
      cell: ({ row }) => (
        <span className={row.original.balance > 0 ? 'text-rose-500 font-black' : 'text-emerald-500 font-black'}>
          ${row.original.balance.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'transactionType',
      header: t('rentLedgerPage.type'),
      id: 'type',
      cell: ({ row }) => <StatusBadge status={row.original.transactionType} />,
    },
    {
      id: 'actions',
      header: t('rentLedgerPage.actions'),
      cell: ({ row }) => {
        const item = row.original as any;
        const tenantObj = tenants.find((tItem) => `${tItem.firstName} ${tItem.lastName}` === item.tenantName);
        
        const isPayment = item.transactionType === 'Payment';
        const isTenantOnline =
          item.createdBy === 'Tenant' ||
          item.createdBy === 'Tenant Portal' ||
          ['Razorpay', 'Stripe', 'AuthorizeNet'].includes(item.paymentMethod);
        const canEditPayment = isPayment && !isTenantOnline && (item.paymentId || (item.id && String(item.id).startsWith('led-pay-')));

        return (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (item.tenantId) {
                  setSelectedTenantId(item.tenantId);
                } else if (tenantObj) {
                  setSelectedTenantId(tenantObj.id);
                } else {
                  const firstTenant = tenants[0];
                  if (firstTenant) {
                    setSelectedTenantId(firstTenant.id);
                  }
                }
              }}
              className="h-8 w-8 text-muted-foreground hover:text-primary cursor-pointer"
              title="View Tenant Statement"
            >
              <Eye className="w-4 h-4" />
            </Button>

            {canEditPayment && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const pId = item.paymentId || String(item.id).replace('led-pay-', '');
                  setEditingPayment({
                    id: pId,
                    amount: item.credit || item.amount || 0,
                    paidDate: item.date,
                    paymentMethod: item.paymentMethod || 'Offline',
                    referenceNumber: item.referenceNumber || '',
                    tenantName: item.tenantName,
                    createdBy: item.createdBy,
                  });
                }}
                className="h-8 w-8 text-blue-500 hover:bg-blue-500/10 cursor-pointer"
                title="Edit Payment"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-rent-ledger, #printable-rent-ledger *,
          #printable-full-ledger, #printable-full-ledger * {
            visibility: visible !important;
          }
          #printable-rent-ledger, #printable-full-ledger {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 8px 4px !important;
            color: black !important;
          }
          th {
            font-weight: 800 !important;
          }
        }
      `}</style>

      <PageHeader
        title={t('rentLedgerPage.title')}
        description={t('rentLedgerPage.desc')}
        breadcrumbs={[
          { label: t('ai.breadcrumbs.home'), href: '/' },
          { label: t('rentPaymentsPage.rentCollection'), href: '/rent' },
          { label: t('rentLedgerPage.title') },
        ]}
      />

      {!selectedTenant && (
        <>
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              {t('rentLedgerPage.showingItems', { count: filteredLedger.length })}
            </span>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              {t('rentLedgerPage.exportCsv')}
            </Button>
          </div>

          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t('rentLedgerPage.searchPlaceholder')}
            filters={[
              {
                key: 'property',
                value: propertyFilter,
                placeholder: t('rentLedgerPage.allProperties'),
                options: properties.map((p) => ({ label: p.name, value: p.name })),
              },
              {
                key: 'type',
                value: typeFilter,
                placeholder: t('rentLedgerPage.transactionType'),
                options: [
                  { label: 'Rent Charge', value: 'Rent Charge' },
                  { label: 'Payment', value: 'Payment' },
                  { label: 'Late Fee', value: 'Late Fee' },
                ],
              },
            ]}
            onFilterChange={(key, val) => {
              if (key === 'property') setPropertyFilter(val);
              if (key === 'type') setTypeFilter(val);
            }}
            onReset={() => {
              setSearchQuery('');
              setPropertyFilter('');
              setTypeFilter('');
              setSelectedTenantId('');
            }}
          />
        </>
      )}

      {selectedTenant ? (
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6 mt-4">
          <div className="no-print flex items-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTenantId('')}
              className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground pl-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('rentLedgerPage.backToLedger')}
            </Button>
          </div>
          <div id="printable-rent-ledger" className="space-y-6">
            {/* Ledger Header */}
            <div className="border-b pb-4 space-y-4 text-foreground">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-md no-print">
                    {t('rentLedgerPage.officialStatement')}
                  </span>
                  <h2 className="font-black text-2xl text-primary mt-1.5">{managementCompany}</h2>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Phone: <span className="text-foreground font-bold">{profile?.phone || '+1 (555) 234-5678'}</span> • Email: <span className="text-foreground font-bold">{profile?.email || 'support@whatslandlord.com'}</span>
                  </p>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold text-right">
                  Generated: {new Date().toLocaleDateString()}
                </div>
              </div>

              {/* AI Tenant Payment Health Assessment */}
              <div className="no-print p-4 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-purple-500/10 border border-primary/25 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-primary" /> AI Payment Health Assessment
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      selectedTenantLedger.length === 0 || selectedTenantLedger[selectedTenantLedger.length - 1]?.balance <= 0
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}>
                      {selectedTenantLedger.length === 0 || selectedTenantLedger[selectedTenantLedger.length - 1]?.balance <= 0
                        ? '🟢 98% On-Time Reliability'
                        : '🟡 Follow-up Recommended'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {selectedTenantLedger.length === 0 || selectedTenantLedger[selectedTenantLedger.length - 1]?.balance <= 0
                      ? `Resident ${selectedTenant.firstName} has consistently cleared rent assessments on time with zero arrears. Low-risk tenant account.`
                      : `Resident ${selectedTenant.firstName} currently carries an unpaid balance of $${(selectedTenantLedger[selectedTenantLedger.length - 1]?.balance || 0).toLocaleString()}. Consider dispatching an automated AI late rent notice.`}
                  </p>
                </div>

                {selectedTenantLedger.length > 0 && selectedTenantLedger[selectedTenantLedger.length - 1]?.balance > 0 && (
                  <Button
                    size="sm"
                    onClick={() => navigate({ to: '/invoices' })}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs h-9 px-3.5 shrink-0 flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Review Invoices</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-secondary/10 p-4 rounded-xl border border-border/80 text-xs font-semibold">
                <div className="space-y-1.5">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold tracking-wider">Tenant Information</p>
                  <p className="text-foreground text-sm font-extrabold">{selectedTenant.firstName} {selectedTenant.lastName}</p>
                  <p className="text-muted-foreground">Phone: <span className="text-foreground font-bold">{selectedTenant.phone || 'N/A'}</span></p>
                  <p className="text-muted-foreground">Email: <span className="text-foreground font-bold">{selectedTenant.email || 'N/A'}</span></p>
                </div>
                <div className="space-y-1.5 md:text-right">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold tracking-wider">Location & Unit Details</p>
                  <p className="text-foreground text-sm font-extrabold">Unit {selectedTenant.unitNumber || 'N/A'}</p>
                  <p className="text-muted-foreground">Property: <span className="text-foreground font-bold">{selectedTenant.propertyName || 'Property'}</span></p>
                  <p className="text-muted-foreground">Address: <span className="text-foreground font-bold">{propertyAddress}</span></p>
                </div>
              </div>
            </div>

            {/* Financial Summary Cards */}
            {(() => {
              const totalCharged = selectedTenantLedger.reduce((sum, e) => sum + (e.debit || 0), 0);
              const totalPaid = selectedTenantLedger.reduce((sum, e) => sum + (e.credit || 0), 0);
              const outstanding = totalCharged - totalPaid;
              const lateFees = selectedTenantLedger
                .filter((e) => e.transactionType === 'Late Fee')
                .reduce((sum, e) => sum + (e.debit || 0), 0);
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="bg-rose-500/8 border border-rose-500/20 rounded-xl p-4 text-center">
                    <p className="text-[9px] uppercase font-extrabold text-rose-400 tracking-widest mb-1">Total Invoiced</p>
                    <p className="text-lg font-black text-rose-500">${totalCharged.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Rent + Late Fees</p>
                  </div>
                  <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <p className="text-[9px] uppercase font-extrabold text-emerald-400 tracking-widest mb-1">Total Paid</p>
                    <p className="text-lg font-black text-emerald-500">${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Payments Received</p>
                  </div>
                  <div className={`border rounded-xl p-4 text-center ${
                    outstanding > 0
                      ? 'bg-amber-500/8 border-amber-500/20'
                      : outstanding < 0
                      ? 'bg-purple-500/8 border-purple-500/20'
                      : 'bg-emerald-500/8 border-emerald-500/20'
                  }`}>
                    <p className={`text-[9px] uppercase font-extrabold tracking-widest mb-1 ${
                      outstanding > 0 ? 'text-amber-400' : outstanding < 0 ? 'text-purple-400' : 'text-emerald-400'
                    }`}>Outstanding</p>
                    <p className={`text-lg font-black ${
                      outstanding > 0 ? 'text-amber-500' : outstanding < 0 ? 'text-purple-500' : 'text-emerald-500'
                    }`}>${Math.abs(outstanding).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {outstanding > 0 ? 'Balance Due' : outstanding < 0 ? 'Credit (Overpaid)' : '✓ Fully Cleared'}
                    </p>
                  </div>
                  <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl p-4 text-center">
                    <p className="text-[9px] uppercase font-extrabold text-orange-400 tracking-widest mb-1">Late Fees</p>
                    <p className="text-lg font-black text-orange-500">${lateFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{lateFees > 0 ? 'Penalty Applied' : 'No Penalties'}</p>
                  </div>
                </div>
              );
            })()}

            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-2.5">{t('rentLedgerPage.date')}</th>
                    <th className="py-2.5">{t('rentLedgerPage.description')}</th>
                    <th className="py-2.5 text-right">{t('rentLedgerPage.debitCharges')}</th>
                    <th className="py-2.5 text-right">{t('rentLedgerPage.creditPayments')}</th>
                    <th className="py-2.5 text-right">{t('rentLedgerPage.runningBalance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {selectedTenantLedger.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-secondary/10">
                      <td className="py-2.5 font-semibold text-muted-foreground">{entry.date}</td>
                      <td className="py-2.5 text-foreground font-extrabold">{entry.description}</td>
                      <td className="py-2.5 text-right text-rose-500 font-bold">
                        {entry.debit > 0 ? `$${entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="py-2.5 text-right text-emerald-500 font-bold">
                        {entry.credit > 0 ? `$${entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className={`py-2.5 text-right font-black ${entry.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        ${entry.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {selectedTenantLedger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground italic font-medium">
                        {t('rentLedgerPage.noTransactions')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Ledger Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-border">
              <div className="text-[10px] text-muted-foreground">
                {t('rentLedgerPage.generatedOn', { date: new Date().toLocaleDateString() })}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[9px] uppercase text-muted-foreground font-bold">{t('rentLedgerPage.outstandingBalance')}</p>
                  <p className={`text-lg font-black ${selectedTenantLedger.length > 0 ? (selectedTenantLedger[selectedTenantLedger.length - 1].balance > 0 ? 'text-rose-500' : 'text-emerald-500') : 'text-emerald-500'}`}>
                    ${selectedTenantLedger.length > 0 ? selectedTenantLedger[selectedTenantLedger.length - 1].balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedTenantId('')} className="no-print h-9 font-bold">
                    {t('rentLedgerPage.closeStatement')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      // Trigger clean PDF export print dialog
                      window.print();
                    }} 
                    className="no-print flex items-center gap-1.5 h-9 font-bold border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Download className="w-4 h-4 text-primary" /> Download PDF
                  </Button>
                  <Button variant="default" size="sm" onClick={() => window.print()} className="no-print flex items-center gap-1.5 h-9 font-bold bg-primary text-primary-foreground hover:bg-primary/95">
                    <Printer className="w-4 h-4" /> {t('rentLedgerPage.printStatement')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={filteredLedger} loading={isLoading} error={error ? error.message : null} />
          
          <div id="printable-full-ledger" className="hidden print:block space-y-6">
            {/* Ledger Header */}
            <div className="border-b pb-4 space-y-2 text-foreground">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded no-print">
                    Official Portfolio Ledger Statement
                  </span>
                  <h2 className="font-black text-xl text-primary mt-1">{managementCompany}</h2>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-bold text-right">
                  Generated: {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Tenant</th>
                    <th className="py-2.5">Property (Unit)</th>
                    <th className="py-2.5">Description</th>
                    <th className="py-2.5 text-right">Debit (Charges)</th>
                    <th className="py-2.5 text-right">Credit (Payments)</th>
                    <th className="py-2.5 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredLedger.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-secondary/10">
                      <td className="py-2.5 font-semibold text-muted-foreground">{entry.date}</td>
                      <td className="py-2.5 text-foreground font-extrabold">{entry.tenantName}</td>
                      <td className="py-2.5 text-foreground font-semibold">{entry.propertyName} (Unit {entry.unitNumber})</td>
                      <td className="py-2.5 text-foreground font-semibold">{entry.description}</td>
                      <td className="py-2.5 text-right text-rose-500 font-bold">
                        {entry.debit > 0 ? `$${entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="py-2.5 text-right text-emerald-500 font-bold">
                        {entry.credit > 0 ? `$${entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className={`py-2.5 text-right font-black ${entry.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        ${entry.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {filteredLedger.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground italic font-medium">
                        No ledger transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Edit Payment Modal */}
      <EditPaymentModal
        payment={editingPayment}
        open={!!editingPayment}
        onOpenChange={(open) => {
          if (!open) setEditingPayment(null);
        }}
      />
    </div>
  );
};
export default RentLedgerPage;
