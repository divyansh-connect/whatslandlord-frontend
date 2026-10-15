import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { Button } from '../../components/ui/Button';
import { Download } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const OwnerFinancialsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data: income = [] } = useQuery({ queryKey: ['owner-financials-list'], queryFn: () => api.ownerFinancials.getAll() });

  const filteredIncome = income.filter((item) =>
    item.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.propertyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'date', header: t('owner.financials.clearingDate'), id: 'date' },
    { accessorKey: 'propertyName', header: t('owner.financials.propertyManaged'), id: 'property', cell: ({ row }) => <span className="font-bold">{row.original.propertyName}</span> },
    { accessorKey: 'tenantName', header: t('owner.financials.tenantSource'), id: 'source' },
    {
      accessorKey: 'category',
      header: t('owner.financials.category'),
      id: 'category',
      cell: ({ row }) => <span className="font-bold text-[10px] bg-secondary px-2 py-0.5 rounded border uppercase">{row.original.category}</span>,
    },
    {
      accessorKey: 'amount',
      header: t('owner.financials.grossRevenue'),
      id: 'amount',
      cell: ({ row }) => <span className="font-extrabold text-emerald-500">${(Number(row.original.amount) || 0).toLocaleString()}</span>,
    },
  ];

  const handleDownloadLedgerPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text('OWNER INCOME & FINANCIAL LEDGER', 14, 18);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${filteredIncome.length}`, 14, 25);

      const headers = ['Clearing Date', 'Property', 'Tenant Source', 'Category', 'Gross Revenue'];
      const tableRows = filteredIncome.map((item: any) => [
        String(item.date || 'N/A'),
        String(item.propertyName || 'N/A'),
        String(item.tenantName || 'N/A'),
        String(item.category || 'Rent'),
        `$${(Number(item.amount) || 0).toLocaleString()}`,
      ]);

      autoTable(doc, {
        startY: 32,
        head: [headers],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
      });

      doc.save(`owner_financial_ledger_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.warn('PDF generation failed, falling back to window.print:', err);
      window.print();
    }
  };

  return (
    <div>
      <PageHeader
        title={t('owner.financials.title')}
        description={t('owner.financials.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/owner' },
          { label: t('owner.nav.financials') },
        ]}
      />

      <div className="flex justify-between items-center mb-3 text-xs font-semibold text-foreground">
        <span className="text-muted-foreground uppercase">{t('owner.financials.showing', { count: filteredIncome.length })}</span>
        <Button variant="outline" size="sm" onClick={handleDownloadLedgerPDF} className="flex items-center gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" /> Download / Print Ledger
        </Button>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('owner.financials.searchPlaceholder')}
        onReset={() => setSearchQuery('')}
      />

      <DataTable columns={columns} data={filteredIncome.slice(0, 100)} />
    </div>
  );
};
export default OwnerFinancialsPage;
