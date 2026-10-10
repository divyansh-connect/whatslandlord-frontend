import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { OwnerDocument } from '../../types';
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

export const OwnerDocumentsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Upload modal states
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileCategory, setFileCategory] = useState('Statements');
  const [customCategory, setCustomCategory] = useState('');

  // Download states
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [downloadedDocName, setDownloadedDocName] = useState('');

  const handleDownload = async (doc: OwnerDocument) => {
    if (doc.fileUrl) {
      let downloadUrl = doc.fileUrl;
      const filename = doc.name.endsWith('.pdf') ? doc.name : `${doc.name}.pdf`;

      if (downloadUrl.includes('res.cloudinary.com') && downloadUrl.includes('/upload/')) {
        downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
      }

      try {
        const response = await fetch(downloadUrl);
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
          }, 100);
          setDownloadedDocName(filename);
          setSuccessDialogOpen(true);
          return;
        }
      } catch (e) {
        console.warn('Fetch blob download failed, falling back to direct link:', e);
      }

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 100);
      setDownloadedDocName(filename);
      setSuccessDialogOpen(true);
    } else {
      alert(`No download URL available for ${doc.name}`);
    }
  };

  // Queries
  const { data: documents = [], isLoading } = useQuery({ queryKey: ['owner-documents-list'], queryFn: () => api.ownerDocuments.getAll() });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.ownerDocuments.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-documents-list'] });
      queryClient.invalidateQueries({ queryKey: ['docs-owner'] });
      setIsOpen(false);
      setFileName('');
      setSelectedFile(null);
      setFileCategory('Statements');
      setCustomCategory('');
    },
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !fileName) return;

    const finalCategory = fileCategory === 'Other' ? customCategory || 'Other' : fileCategory;
    const finalName = fileName.trim() || selectedFile?.name || 'Owner_Document.pdf';

    const formData = new FormData();
    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    formData.append('name', finalName.endsWith('.pdf') ? finalName : `${finalName}.pdf`);
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

  const columns: ColumnDef<OwnerDocument>[] = [
    {
      accessorKey: 'name',
      header: t('owner.documents.documentName'),
      id: 'name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <span className="font-bold cursor-pointer hover:underline text-primary" onClick={() => handleDownload(row.original)}>
            {row.original.name}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: t('owner.documents.category'),
      id: 'category',
      cell: ({ row }) => (
        <span className="font-bold text-[10px] bg-secondary px-2 py-0.5 rounded border uppercase">
          {row.original.category}
        </span>
      ),
    },
    { accessorKey: 'uploadedAt', header: t('owner.documents.uploadedDate'), id: 'uploadedAt' },
    { accessorKey: 'size', header: t('owner.documents.size'), id: 'size' },
    {
      id: 'actions',
      header: t('owner.documents.actions'),
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => handleDownload(row.original)} title={t('owner.documents.download')}>
          <Download className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('owner.documents.title')}
        description={t('owner.documents.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/owner' },
          { label: t('owner.nav.documents') },
        ]}
        action={{
          label: t('owner.documents.uploadDoc'),
          onClick: () => setIsOpen(true),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('owner.documents.searchPlaceholder')}
        filters={[
          {
            key: 'category',
            value: categoryFilter,
            placeholder: t('owner.documents.categoryPlaceholder'),
            options: [
              { label: t('owner.documents.categories.statements'), value: 'Statements' },
              { label: t('owner.documents.categories.tax'), value: 'Tax Documents' },
              { label: t('owner.documents.categories.contracts'), value: 'Contracts' },
              { label: t('owner.documents.categories.insurance'), value: 'Insurance' },
              { label: t('owner.documents.categories.photos'), value: 'Property Photos' },
              { label: t('owner.documents.categories.maintenance'), value: 'Maintenance Reports' },
              { label: t('owner.documents.categories.inspection'), value: 'Inspection Reports' },
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

      <DataTable columns={columns} data={filteredDocs.slice(0, 100)} loading={isLoading} />

      {/* UPLOAD DIALOG */}
      <FormDialog open={isOpen} onOpenChange={setIsOpen} title={t('owner.documents.uploadTitle')}>
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
            <Input required placeholder="E.g., Year End Tax Statement" value={fileName} onChange={e => setFileName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Category</label>
            <Select value={fileCategory} onChange={e => setFileCategory(e.target.value)}>
              <option value="Statements">Statements</option>
              <option value="Tax Documents">Tax Documents</option>
              <option value="Contracts">Contracts</option>
              <option value="Insurance">Insurance</option>
              <option value="Property Photos">Property Photos</option>
              <option value="Maintenance Reports">Maintenance Reports</option>
              <option value="Inspection Reports">Inspection Reports</option>
              <option value="Other">Other</option>
            </Select>
          </div>

          {fileCategory === 'Other' && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Custom Category Name</label>
              <Input required placeholder="E.g., Bank Payout Slip" value={customCategory} onChange={e => setCustomCategory(e.target.value)} />
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

      {/* DOWNLOAD SUCCESS DIALOG */}
      <ConfirmDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        title="Download Started"
        description={`The document "${downloadedDocName}" is being downloaded. Please check your browser's download folder.`}
        onConfirm={() => setSuccessDialogOpen(false)}
        confirmText="Great"
        cancelText="Close"
      />
    </div>
  );
};
export default OwnerDocumentsPage;
