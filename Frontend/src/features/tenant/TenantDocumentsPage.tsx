import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Download, FileText, Plus, UploadCloud, Loader2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { downloadRealFile } from '../../utils/fileDownload';

export const TenantDocumentsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Upload modal states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileCategory, setFileCategory] = useState('Rental Agreement');
  const [customCategory, setCustomCategory] = useState('');

  // Download states
  const [dialogInfo, setDialogInfo] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: '',
    description: '',
  });

  const handleDownload = async (doc: any) => {
    if (!doc || !doc.fileUrl) {
      setDialogInfo({
        open: true,
        title: 'No Document File',
        description: `No file is currently attached to "${doc?.name || 'this document'}". Please contact your property manager to upload a copy.`,
      });
      return;
    }

    const res = await downloadRealFile(doc);
    if (res.success) {
      setDialogInfo({
        open: true,
        title: 'Download Started',
        description: `The file "${res.filename}" is downloading. Please check your browser's download folder.`,
      });
    } else {
      setDialogInfo({
        open: true,
        title: 'Download Error',
        description: 'Unable to download file. Please check your internet connection or try again later.',
      });
    }
  };

  // Queries
  const { data: documents = [], isLoading } = useQuery({ queryKey: ['tenant-documents-list'], queryFn: () => api.tenantDocuments.getAll() });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.tenantDocuments.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-documents-list'] });
      queryClient.invalidateQueries({ queryKey: ['docs-tenant'] });
      setIsOpen(false);
      setFileName('');
      setSelectedFile(null);
      setFileCategory('Rental Agreement');
      setCustomCategory('');
    },
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !fileName) return;

    const finalCategory = fileCategory === 'Other' ? customCategory || 'Other' : fileCategory;
    let finalName = fileName.trim() || selectedFile?.name || 'Tenant_Document';
    const fileExt = selectedFile?.name.includes('.') ? selectedFile.name.split('.').pop() : '';
    if (fileExt && !finalName.includes('.')) {
      finalName = `${finalName}.${fileExt}`;
    }

    const formData = new FormData();
    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    formData.append('name', finalName);
    formData.append('category', finalCategory);

    uploadMutation.mutate(formData);
  };

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!fileName) {
        setFileName(file.name);
      }
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter ? doc.category.toLowerCase() === categoryFilter.toLowerCase() : true;
    return matchesSearch && matchesCategory;
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: t('tenant.documents.documentName', 'Document Name'),
      id: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-bold text-foreground">
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <span className="cursor-pointer hover:underline text-primary" onClick={() => handleDownload(row.original)}>
            {row.original.name}
          </span>
        </div>
      ),
    },
    { accessorKey: 'category', header: t('tenant.documents.category', 'Category'), id: 'category' },
    { accessorKey: 'uploadedAt', header: t('tenant.documents.uploadedDate', 'Uploaded Date'), id: 'uploadedAt' },
    { accessorKey: 'size', header: t('tenant.documents.size', 'File Size'), id: 'size' },
    {
      id: 'actions',
      header: t('tenant.documents.actions', 'Actions'),
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => handleDownload(row.original)} title={t('tenant.documents.download', 'Download file')}>
          <Download className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('tenant.documents.title', 'My Document Files')}
        description={t('tenant.documents.desc', 'Verify copy of leases agreement sheets, payment invoices receipt logs, and insurance documents.')}
        breadcrumbs={[
          { label: t('header.home', 'Home'), href: '/tenant' },
          { label: t('tenant.nav.documents', 'Documents') },
        ]}
        action={{
          label: t('tenant.documents.uploadDoc', 'Upload Document'),
          onClick: () => setIsOpen(true),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('tenant.documents.searchPlaceholder', 'Search files by name...')}
        filters={[
          {
            key: 'category',
            value: categoryFilter,
            placeholder: t('tenant.documents.categoryPlaceholder', 'Document Category'),
            options: [
              { label: t('tenant.documents.categories.lease', 'Lease'), value: 'Lease' },
              { label: t('tenant.documents.categories.receipts', 'Receipts'), value: 'Receipts' },
              { label: t('tenant.documents.categories.notices', 'Notices'), value: 'Notices' },
              { label: t('tenant.documents.categories.community', 'Community Documents'), value: 'Community Documents' },
              { label: t('tenant.documents.categories.insurance', 'Insurance'), value: 'Insurance' },
              { label: t('tenant.documents.categories.inspection', 'Inspection Reports'), value: 'Inspection Reports' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'category') setCategoryFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setCategoryFilter('');
        }}
      />

      <DataTable columns={columns} data={filteredDocs} loading={isLoading} />

      {/* UPLOAD DIALOG */}
      <FormDialog open={isOpen} onOpenChange={setIsOpen} title={t('tenant.documents.uploadTitle', 'Upload New Document')}>
        <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2 text-xs font-semibold text-foreground">
          <div 
            onClick={handleDropzoneClick}
            className="border-2 border-dashed border-border rounded-2xl p-6 text-center space-y-2 hover:border-primary/50 transition cursor-pointer"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".pdf,.png,.jpg,.jpeg"
            />
            <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="font-bold">{selectedFile ? selectedFile.name : 'Drag and drop file here or click to browse'}</p>
            <p className="text-[10px] text-muted-foreground">{selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to change file` : 'PDF, PNG, JPG up to 5MB'}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Document Title</label>
            <Input required placeholder="E.g., Renter Insurance Policy" value={fileName} onChange={e => setFileName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Category</label>
            <Select value={fileCategory} onChange={e => setFileCategory(e.target.value)}>
              <option value="Rental Agreement">Rental Agreement</option>
              <option value="Identity Proof">Identity Proof (Govt ID)</option>
              <option value="Income Proof">Proof of Income</option>
              <option value="Utility Bills">Utility Bills</option>
              <option value="Insurance">Renter's Insurance</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          {fileCategory === 'Other' && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Custom Category Name</label>
              <Input required placeholder="E.g., Bank Statement" value={customCategory} onChange={e => setCustomCategory(e.target.value)} />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Upload File
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* DOWNLOAD / STATUS DIALOG */}
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
export default TenantDocumentsPage;
