import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const OwnerReportsPage: React.FC = () => {
  const { t } = useTranslation();
  // Queries
  const { data: reports = null, isLoading } = useQuery({ 
    queryKey: ['owner-reports-summary'], 
    queryFn: () => api.ownerReports.getAll() 
  });
  const { data: statements = [] } = useQuery({
    queryKey: ['owner-statements-list'],
    queryFn: () => api.ownerStatements.getAll(),
  });
  const { data: financials = [] } = useQuery({
    queryKey: ['owner-financials-list'],
    queryFn: () => api.ownerFinancials.getAll(),
  });

  const handleDownloadReportPDF = (type: 'income' | 'expense' | 'performance' | 'distribution') => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);

      if (type === 'income') {
        doc.text('OWNER INCOME SUMMARY REPORT', 14, 18);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated on: ${new Date().toLocaleString()} | Period: Current Fiscal Year`, 14, 25);

        const incomeItems = financials.filter((f: any) => f.type === 'Income');
        const rows = incomeItems.map((item: any) => [
          item.date || 'N/A',
          item.propertyName || 'Property',
          item.tenantName || 'Resident',
          `$${(Number(item.amount) || 0).toLocaleString()}`,
          item.status || 'Cleared',
        ]);

        autoTable(doc, {
          startY: 32,
          head: [['Posting Date', 'Property', 'Tenant / Source', 'Amount (USD)', 'Status']],
          body: rows.length > 0 ? rows : [['N/A', 'All Properties', 'Operating Rent', `$${(reports?.revenue || 0).toLocaleString()}`, 'Recorded']],
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 3.5 },
        });

        doc.save(`owner_income_summary_${new Date().toISOString().split('T')[0]}.pdf`);
      } else if (type === 'expense') {
        doc.text('OWNER EXPENSE & OPERATING COST SUMMARY', 14, 18);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated on: ${new Date().toLocaleString()} | Period: Current Fiscal Year`, 14, 25);

        const expenseItems = financials.filter((f: any) => f.type === 'Expense');
        const rows = expenseItems.map((item: any) => [
          item.date || 'N/A',
          item.propertyName || 'Property',
          item.tenantName || 'Vendor / Partner',
          item.category || 'Utilities',
          `$${(Number(item.amount) || 0).toLocaleString()}`,
          item.status || 'Cleared',
        ]);

        autoTable(doc, {
          startY: 32,
          head: [['Date', 'Property', 'Vendor / Payee', 'Category', 'Expense Cost', 'Audit Status']],
          body: rows.length > 0 ? rows : [['Current Period', 'Assigned Asset', 'Operating / Utilities', 'General Maintenance', `$${(reports?.expenses || 0).toLocaleString()}`, 'Audited']],
          theme: 'striped',
          headStyles: { fillColor: [244, 63, 94], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 3.5 },
        });

        doc.save(`owner_expense_summary_${new Date().toISOString().split('T')[0]}.pdf`);
      } else if (type === 'performance') {
        doc.text('PORTFOLIO PROPERTY PERFORMANCE REPORT', 14, 18);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated on: ${new Date().toLocaleString()} | Live Portfolio Analysis`, 14, 25);

        const rows = statements.map((s: any) => [
          s.propertyName,
          `$${(Number(s.income || s.totalIncome) || 0).toLocaleString()}`,
          `-$${(Number(s.expenses || s.totalExpenses) || 0).toLocaleString()}`,
          `$${(Number(s.netDistribution) || 0).toLocaleString()}`,
          s.status || 'Published',
        ]);

        autoTable(doc, {
          startY: 32,
          head: [['Property Asset', 'Gross Revenue', 'Operating Cost', 'Net Distribution Payout', 'Status']],
          body: rows.length > 0 ? rows : [['Portfolio Properties', `$${(reports?.revenue || 0).toLocaleString()}`, `-$${(reports?.expenses || 0).toLocaleString()}`, `$${(reports?.distribution || 0).toLocaleString()}`, 'Published']],
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 3.5 },
        });

        doc.save(`owner_property_performance_${new Date().toISOString().split('T')[0]}.pdf`);
      } else {
        doc.text('OWNER DISTRIBUTION PAYOUT REPORT', 14, 18);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated on: ${new Date().toLocaleString()} | ACH & Direct Deposit Records`, 14, 25);

        const distItems = financials.filter((f: any) => f.type === 'Distribution');
        const rows = distItems.map((item: any) => [
          item.date || 'N/A',
          item.propertyName || 'Portfolio Payout',
          'Direct Deposit / ACH',
          `$${(Number(item.amount) || 0).toLocaleString()}`,
          item.status || 'Completed',
        ]);

        autoTable(doc, {
          startY: 32,
          head: [['Transfer Date', 'Period / Allocation', 'Payout Method', 'Amount Transferred', 'Status']],
          body: rows.length > 0 ? rows : [['Current Period', 'Net Portfolio Payout', 'ACH Direct Deposit', `$${(reports?.distribution || 0).toLocaleString()}`, 'Completed']],
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 3.5 },
        });

        doc.save(`owner_distribution_report_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (err) {
      console.warn('PDF generation failed:', err);
      window.print();
    }
  };

  if (isLoading || !reports) {
    return <LoadingSkeleton type="card" />;
  }

  const reportsList = [
    { 
      key: 'income' as const,
      title: t('owner.reports.incomeSummary.title'), 
      desc: t('owner.reports.incomeSummary.desc') 
    },
    { 
      key: 'expense' as const,
      title: t('owner.reports.expenseSummary.title'), 
      desc: t('owner.reports.expenseSummary.desc') 
    },
    { 
      key: 'performance' as const,
      title: t('owner.reports.propertyPerformance.title'), 
      desc: t('owner.reports.propertyPerformance.desc') 
    },
    { 
      key: 'distribution' as const,
      title: t('owner.reports.distributionReport.title'), 
      desc: t('owner.reports.distributionReport.desc') 
    },
  ];

  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title={t('owner.reports.title')}
        description={t('owner.reports.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/owner' },
          { label: t('owner.nav.reports') },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Reports Directory */}
        <Card className="p-6 border bg-card space-y-4">
          <h3 className="font-extrabold text-sm uppercase border-b pb-2 tracking-wider">{t('owner.reports.availableReports')}</h3>
          <div className="divide-y space-y-3 text-xs font-semibold">
            {reportsList.map((r) => (
              <div key={r.key} className="pt-3 flex justify-between items-center">
                <div>
                  <p className="font-bold">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{r.desc}</p>
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDownloadReportPDF(r.key)} 
                    title={`Download ${r.title} PDF`}
                    className="hover:text-primary hover:bg-primary/10"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick summary sheet */}
        <Card className="p-6 border bg-card space-y-4">
          <h3 className="font-extrabold text-sm uppercase border-b pb-2 tracking-wider">{t('owner.reports.annualSummary')}</h3>
          <div className="space-y-3.5 text-xs font-semibold">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">{t('owner.reports.operatingIncome')}</span>
              <span className="text-emerald-500 font-bold">${(reports.revenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b pb-2 text-rose-500">
              <span>{t('owner.reports.operatingExpenses')}</span>
              <span>-${(reports.expenses || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">{t('owner.reports.portfolioOccupancy')}</span>
              <span>{reports.occupancy || 0}%</span>
            </div>
            <div className="flex justify-between pt-1 text-sm font-black uppercase">
              <span>{t('owner.reports.totalPayouts')}</span>
              <span className="text-emerald-500">${(reports.distribution || 0).toLocaleString()}</span>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};
export default OwnerReportsPage;
