import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { OwnerStatement } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Eye, Printer, Download } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const OwnerStatementsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatement, setSelectedStatement] = useState<OwnerStatement | null>(null);

  // Queries
  const { data: statements = [], isLoading } = useQuery({ queryKey: ['owner-statements-list'], queryFn: () => api.ownerStatements.getAll() });

  const filteredStatements = statements.filter((s) =>
    s.propertyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadStatementPDF = (stmt: OwnerStatement) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text('OWNER FINANCIAL STATEMENT', 14, 18);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Property: ${stmt.propertyName} | Period: ${stmt.period}`, 14, 25);
      doc.text(`Generated on: ${new Date().toLocaleString()} | Status: ${stmt.status}`, 14, 30);

      const rows = [
        ['Operating Revenues (Gross Income)', `$${(Number(stmt.income || (stmt as any).totalIncome) || 0).toLocaleString()}`],
        ['Operating Expenses', `-$${(Number(stmt.expenses || (stmt as any).totalExpenses) || 0).toLocaleString()}`],
        ['Net Distribution Payout', `$${(Number(stmt.netDistribution) || 0).toLocaleString()}`],
      ];

      autoTable(doc, {
        startY: 36,
        head: [['Line Item Description', 'Amount (USD)']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
      });

      const cleanProp = stmt.propertyName.replace(/\s+/g, '_').toLowerCase();
      const cleanPeriod = stmt.period.replace(/\s+/g, '_').toLowerCase();
      doc.save(`statement_${cleanProp}_${cleanPeriod}.pdf`);
    } catch (err) {
      console.warn('PDF download failed:', err);
    }
  };

  const columns: ColumnDef<OwnerStatement>[] = [
    { accessorKey: 'period', header: t('ownerStatementsPage.period'), id: 'period' },
    { accessorKey: 'propertyName', header: t('ownerStatementsPage.propertyLocation'), id: 'property', cell: ({ row }) => <span className="font-bold">{row.original.propertyName}</span> },
    {
      accessorKey: 'income',
      header: t('ownerStatementsPage.grossIncome'),
      id: 'income',
      cell: ({ row }) => <span>${(Number(row.original.income || (row.original as any).totalIncome) || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'expenses',
      header: t('ownerStatementsPage.totalExpenses'),
      id: 'expenses',
      cell: ({ row }) => <span className="text-rose-500 font-semibold">${(Number(row.original.expenses || (row.original as any).totalExpenses) || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'netDistribution',
      header: t('ownerStatementsPage.netDistribution'),
      id: 'netDistribution',
      cell: ({ row }) => <span className="font-extrabold text-emerald-500">${(Number(row.original.netDistribution) || 0).toLocaleString()}</span>,
    },
    {
      accessorKey: 'status',
      header: t('ownerStatementsPage.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      header: t('ownerStatementsPage.actions'),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSelectedStatement(row.original)} title={t('ownerStatementsPage.viewDetail')}>
            <Eye className="w-4.5 h-4.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDownloadStatementPDF(row.original)} title="Download PDF Statement">
            <Download className="w-4 h-4 text-primary" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('ownerStatementsPage.title')}
        description={t('ownerStatementsPage.desc')}
        breadcrumbs={[
          { label: t('ownerStatementsPage.home'), href: '/owner' },
          { label: t('ownerStatementsPage.statements') },
        ]}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('ownerStatementsPage.searchPlaceholder')}
        onReset={() => setSearchQuery('')}
      />

      <DataTable columns={columns} data={filteredStatements.slice(0, 100)} loading={isLoading} />

      {/* DETAIL DIALOG */}
      <FormDialog open={!!selectedStatement} onOpenChange={(open) => !open && setSelectedStatement(null)} title={t('ownerStatementsPage.reportTitle')}>
        {selectedStatement && (
          <div className="space-y-6 pt-3 text-xs font-semibold text-foreground">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h4 className="font-extrabold text-sm uppercase">{t('ownerStatementsPage.statementSheet')}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase">{t('ownerStatementsPage.periodLabel')} {selectedStatement.period}</p>
              </div>
              <StatusBadge status={selectedStatement.status} />
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">{t('ownerStatementsPage.managedAsset')}</p>
              <p className="font-bold text-sm">{selectedStatement.propertyName}</p>
            </div>

            <div className="space-y-3.5 pt-3.5 border-t">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('ownerStatementsPage.operatingRevenues')}</span>
                <span className="text-emerald-500 font-bold">${(Number(selectedStatement.income || (selectedStatement as any).totalIncome) || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('ownerStatementsPage.operatingExpenses')}</span>
                <span className="text-rose-500 font-bold">-${(Number(selectedStatement.expenses || (selectedStatement as any).totalExpenses) || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-dashed text-sm font-black uppercase">
                <span>{t('ownerStatementsPage.netPayout')}</span>
                <span className="text-emerald-500">${(Number(selectedStatement.netDistribution) || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedStatement(null)}>{t('ownerStatementsPage.close')}</Button>
              <Button variant="outline" onClick={() => window.print()} className="flex items-center gap-1.5">
                <Printer className="w-4 h-4" /> {t('ownerStatementsPage.printStatement')}
              </Button>
              <Button onClick={() => handleDownloadStatementPDF(selectedStatement)} className="flex items-center gap-1.5">
                <Download className="w-4 h-4" /> Download PDF
              </Button>
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  );
};
export default OwnerStatementsPage;
