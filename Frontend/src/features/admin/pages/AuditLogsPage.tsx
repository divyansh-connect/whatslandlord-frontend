import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import { PageHeader } from '../../../components/PageHeader';
import { AuditTimeline } from '../components/AuditTimeline';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Download } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { t } = useTranslation();
  const [moduleFilter, setModuleFilter] = useState('All');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => api.auditLogs.getAll(),
  });

  const filtered = moduleFilter === 'All'
    ? logs
    : logs.filter((l) => l.module === moduleFilter);

  const handleExport = () => {
    if (!filtered || filtered.length === 0) {
      return;
    }
    const headers = ['ID', 'Timestamp', 'User', 'Action', 'Target Object', 'Module', 'IP Address', 'Status'];
    const rows = filtered.map((l: any) => [
      String(l.id || ''),
      String(l.timestamp || ''),
      `"${String(l.user || '').replace(/"/g, '""')}"`,
      `"${String(l.action || '').replace(/"/g, '""')}"`,
      `"${String(l.object || '').replace(/"/g, '""')}"`,
      String(l.module || ''),
      String(l.ip || ''),
      String(l.status || '')
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Audit_Logs_${moduleFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 150);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platformSecurity.auditLogs.title')}
        description={t('platformSecurity.auditLogs.description')}
        breadcrumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('platformSecurity.security') },
          { label: t('platformSecurity.auditLogs.breadcrumb') }
        ]}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border p-4 rounded-xl">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-muted-foreground">{t('platformSecurity.auditLogs.filterModule')}</span>
          <Select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
            <option value="All">{t('platformSecurity.auditLogs.allModules')}</option>
            <option value="Security">{t('platformSecurity.auditLogs.moduleSecurity')}</option>
            <option value="Properties">{t('platformSecurity.auditLogs.moduleProperties')}</option>
            <option value="Administration">{t('platformSecurity.auditLogs.moduleAdmin')}</option>
          </Select>
        </div>
        <Button onClick={handleExport} className="bg-primary text-primary-foreground font-semibold flex items-center gap-1.5 w-full sm:w-auto">
          <Download className="w-4 h-4" /> {t('platformSecurity.auditLogs.exportCsv')}
        </Button>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground">{t('platformSecurity.auditLogs.loading')}</div>
      ) : (
        <AuditTimeline logs={filtered} />
      )}
    </div>
  );
};
export default AuditLogsPage;
