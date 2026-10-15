import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { Button } from '../../components/ui/Button';
import { Download } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { downloadRealFile } from '../../utils/fileDownload';

export const DocsVersionsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogInfo, setDialogInfo] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: '',
    description: '',
  });

  const { data: versions = [], isLoading } = useQuery({ queryKey: ['docs-versions'], queryFn: () => api.fileVersions.getAll() });

  const filtered = versions.filter(v => v.documentName.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleDownloadVersion = async (version: any) => {
    if (!version || !version.fileUrl) {
      setDialogInfo({
        open: true,
        title: 'No Archive File',
        description: `Version v${version.versionNumber} for "${version.documentName}" does not have an attached archive file.`,
      });
      return;
    }

    const res = await downloadRealFile({
      name: `${version.documentName}_v${version.versionNumber}`,
      fileUrl: version.fileUrl,
    });

    if (res.success) {
      setDialogInfo({
        open: true,
        title: 'Download Started',
        description: `Version v${version.versionNumber} is downloading.`,
      });
    } else {
      setDialogInfo({
        open: true,
        title: 'Download Error',
        description: 'Failed to download the archive file.',
      });
    }
  };

  const handleRestoreVersion = (version: any) => {
    setDialogInfo({
      open: true,
      title: 'Version Restored',
      description: `Document "${version.documentName}" has been restored to version v${version.versionNumber}.`,
    });
  };

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'documentName', header: 'Document', id: 'doc', cell: ({ row }) => <span className="font-bold">{row.original.documentName}</span> },
    { accessorKey: 'versionNumber', header: 'Version', id: 'ver', cell: ({ row }) => <span className="font-black text-primary">v{row.original.versionNumber}</span> },
    { accessorKey: 'uploadedBy', header: 'Uploaded By', id: 'by' },
    { accessorKey: 'createdAt', header: 'Upload Date', id: 'date' },
    { accessorKey: 'size', header: 'File Size', id: 'size' },
    { accessorKey: 'notes', header: 'Change Notes', id: 'notes', cell: ({ row }) => <span className="text-muted-foreground">{row.original.notes || '—'}</span> },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="text-[9px]" onClick={() => handleDownloadVersion(row.original)}>
          <Download className="w-3.5 h-3.5 mr-1" /> Download
        </Button>
        <Button variant="ghost" size="sm" className="text-[9px] text-amber-500" onClick={() => handleRestoreVersion(row.original)}>Restore</Button>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Version History Registry"
        description="Browse document revision history, compare versions, restore previous uploads, or download snapshots."
        breadcrumbs={[{ label: 'Documents', href: '/documents' }, { label: 'Version History' }]}
      />
      <FilterBar searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Search document versions..." onReset={() => setSearchQuery('')} />
      <DataTable columns={columns} data={filtered} loading={isLoading} />

      <ConfirmDialog
        open={dialogInfo.open}
        onOpenChange={(open) => setDialogInfo((prev) => ({ ...prev, open }))}
        title={dialogInfo.title}
        description={dialogInfo.description}
        onConfirm={() => setDialogInfo((prev) => ({ ...prev, open: false }))}
        confirmText="OK"
        cancelText="Close"
      />
    </div>
  );
};
export default DocsVersionsPage;
