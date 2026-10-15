import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../services/reportApi';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { Button } from '../../../components/ui/Button';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { apiClient } from '../../../api/client';
import { downloadRealFile } from '../../../utils/fileDownload';

export const ExportCenter: React.FC = () => {
  const { data: exportsData, isLoading } = useQuery({
    queryKey: ['export-center-list'],
    queryFn: () => reportApi.getExports({ page: 1, limit: 100 }),
  });

  const exports = exportsData?.data || [];

  const handleDownload = async (fileUrl: string | null, fileName?: string) => {
    if (!fileUrl) return;
    let downloadUrl = fileUrl.trim();
    if (!downloadUrl.startsWith('http://') && !downloadUrl.startsWith('https://')) {
      const baseURL = import.meta.env.VITE_API_URL || 'https://doorloop-backend-production-5d5d.up.railway.app/api/v1';
      const serverHost = baseURL.replace('/api/v1', '');
      downloadUrl = `${serverHost}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
    }
    await downloadRealFile({ name: fileName, fileUrl: downloadUrl });
  };

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'fileName', header: 'Export Filename', id: 'name' },
    { accessorKey: 'fileType', header: 'File Format', id: 'type' },
    {
      accessorKey: 'createdAt',
      header: 'Created Date',
      id: 'createdAt',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      accessorKey: 'status',
      header: 'Job Status',
      id: 'status',
      cell: ({ getValue }) => {
        const val = getValue() as string;
        if (val === 'Processing') {
          return (
            <span className="inline-flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Processing
            </span>
          );
        }
        if (val === 'Completed') {
          return (
            <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Completed
            </span>
          );
        }
        return (
          <span className="inline-flex items-center text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">
            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Failed
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Download',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={row.original.status !== 'Completed' || !row.original.fileUrl}
            onClick={() => handleDownload(row.original.fileUrl, row.original.fileName)}
            className="text-xs font-semibold flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export Center"
        description="Monitor status of report CSV/PDF file exports requests."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reports' }, { label: 'Exports' }]}
      />

      <DataTable columns={columns} data={exports} loading={isLoading} />
    </div>
  );
};
export default ExportCenter;
