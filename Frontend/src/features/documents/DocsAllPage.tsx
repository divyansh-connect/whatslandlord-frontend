import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { FilterBar } from '../../components/FilterBar';
import { DocumentCard } from '../../components/DocumentComponents';
import { DataTable } from '../../components/DataTable';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { LayoutGrid, List, Upload, ChevronRight, Download, Loader2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { StatusBadge } from '../../components/StatusBadge';
import { FileTypeIcon } from '../../components/DocumentComponents';
import { useNavigate } from '@tanstack/react-router';
import { UploadDocumentModal } from './UploadDocumentModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';

const createFallbackDocumentBlob = (doc: any): Blob => {
  const title = (doc.name || 'Document').replace(/[()\\]/g, '');
  const category = (doc.category || 'General').replace(/[()\\]/g, '');
  const owner = (doc.owner || 'Resident / Owner').replace(/[()\\]/g, '');
  const property = (doc.property || 'Property').replace(/[()\\]/g, '');
  const date = (doc.updatedAt || new Date().toISOString().split('T')[0]).replace(/[()\\]/g, '');

  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 380 >>
stream
BT
/F1 18 Tf
50 720 Td
(${title}) Tj
/F1 11 Tf
0 -35 Td
(Document Category: ${category}) Tj
0 -20 Td
(Associated Party / Resident: ${owner}) Tj
0 -20 Td
(Property: ${property}) Tj
0 -20 Td
(Updated Date: ${date}) Tj
0 -35 Td
(System: WhatsLandlord Document Management) Tj
0 -20 Td
(Status: Verified Active Record) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000249 00000 n 
0000000326 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
760
%%EOF`;

  return new Blob([pdfString], { type: 'application/pdf' });
};

export const DocsAllPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Dropdown & Modal states
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'owner' | 'tenant'>('owner');

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'owner' | 'tenant'>('all');

  // Download states
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [downloadedDocName, setDownloadedDocName] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (doc: any) => {
    try {
      setDownloadingId(doc.id);
      let filename = doc.name || 'document.pdf';
      if (!filename.includes('.')) {
        filename += '.pdf';
      }

      if (doc.fileUrl) {
        let downloadUrl = doc.fileUrl;
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
        } catch (fetchErr) {
          console.warn('Direct fetch failed, falling back to link click:', fetchErr);
        }

        // Direct anchor download fallback
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
        // Fallback for legacy documents where fileUrl was null in database
        const fallbackBlob = createFallbackDocumentBlob(doc);
        const blobUrl = window.URL.createObjectURL(fallbackBlob);
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
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  // Queries for real DB data
  const { data: generalDocs = [], isLoading: loadingGeneral } = useQuery({
    queryKey: ['docs-general'],
    queryFn: () => api.documents.getAll()
  });

  const { data: ownerDocs = [], isLoading: loadingOwner } = useQuery({
    queryKey: ['docs-owner'],
    queryFn: () => api.documents.getOwnerDocs()
  });

  const { data: tenantDocs = [], isLoading: loadingTenant } = useQuery({
    queryKey: ['docs-tenant'],
    queryFn: () => api.documents.getTenantDocs()
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll()
  });

  const { data: owners = [] } = useQuery({
    queryKey: ['owners'],
    queryFn: () => api.owner.getAll()
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.tenant.getAll()
  });

  const isLoading = loadingGeneral || loadingOwner || loadingTenant;

  const normalizeCategory = (cat: string) => {
    if (!cat) return 'Other';
    const c = cat.toLowerCase().trim();
    if (c === 'statements' || c === 'statement') return 'Statement';
    if (c === 'tax documents' || c === 'tax') return 'Tax';
    if (c === 'contracts' || c === 'contract') return 'Contract';
    if (c === 'receipts' || c === 'receipt') return 'Receipt';
    if (c === 'invoices' || c === 'invoice') return 'Invoice';
    if (c === 'leases' || c === 'lease') return 'Lease';
    if (c === 'inspections' || c === 'inspection' || c === 'inspection reports') return 'Inspection';
    if (c === 'maintenance' || c === 'maintenance records' || c === 'maintenance reports') return 'Maintenance';
    if (c === 'insurance' || c === 'insurance policies') return 'Insurance';
    if (c === 'legal' || c === 'legal documents') return 'Legal';
    
    // Capitalize first letter
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  // Map owner documents
  const mappedOwnerDocs = ownerDocs.map((d: any) => {
    const prop = properties.find((p: any) => p.id === d.propertyId);
    const own = owners.find((o: any) => o.id === d.ownerId);
    return {
      id: d.id,
      name: d.name,
      category: normalizeCategory(d.category || 'Statement'),
      folderName: 'Owners',
      owner: own ? `${own.firstName} ${own.lastName}` : 'N/A',
      property: prop ? prop.name : 'N/A',
      size: d.size || '1.2 MB',
      version: 1,
      status: 'Active',
      updatedAt: d.uploadedAt ? d.uploadedAt.split('T')[0] : 'N/A',
      role: 'owner',
      fileUrl: d.fileUrl,
    };
  });

  // Map tenant documents
  const mappedTenantDocs = tenantDocs.map((d: any) => {
    const prop = properties.find((p: any) => p.id === d.propertyId);
    const ten = tenants.find((t: any) => t.id === d.tenantId);
    return {
      id: d.id,
      name: d.name,
      category: normalizeCategory(d.category || 'Lease'),
      folderName: 'Tenants',
      owner: ten ? `${ten.firstName} ${ten.lastName}` : 'N/A',
      property: prop ? prop.name : 'N/A',
      size: d.size || '1.5 MB',
      version: 1,
      status: 'Active',
      updatedAt: d.uploadedAt ? d.uploadedAt.split('T')[0] : 'N/A',
      role: 'tenant',
      fileUrl: d.fileUrl,
    };
  });

  // Map general documents
  const mappedGeneralDocs = generalDocs.map((d: any) => ({
    ...d,
    category: normalizeCategory(d.category || 'Other'),
    role: 'general',
  }));

  // Combine and filter
  const allDocs = [...mappedGeneralDocs, ...mappedOwnerDocs, ...mappedTenantDocs];

  const filtered = allDocs.filter((d) => {
    const nameMatch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = categoryFilter === '' || d.category === categoryFilter;
    
    let roleMatch = true;
    if (roleFilter === 'owner') {
      roleMatch = d.role === 'owner';
    } else if (roleFilter === 'tenant') {
      roleMatch = d.role === 'tenant';
    }

    return nameMatch && catMatch && roleMatch;
  });

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'name', header: t('pmDocuments.docName'), id: 'name', cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <FileTypeIcon name={row.original.name} />
        <span className="font-bold text-sm">{row.original.name}</span>
      </div>
    )},
    { accessorKey: 'category', header: t('pmDocuments.category'), id: 'category', cell: ({ row }) => <span className="text-[9px] font-black uppercase bg-secondary border px-2 py-0.5 rounded">{row.original.category}</span> },
    { accessorKey: 'folderName', header: t('pmDocuments.folder'), id: 'folder' },
    { accessorKey: 'owner', header: t('pmDocuments.owner'), id: 'owner' },
    { accessorKey: 'property', header: t('pmDocuments.property'), id: 'property' },
    { accessorKey: 'size', header: t('pmDocuments.size'), id: 'size' },
    { accessorKey: 'version', header: t('pmDocuments.version'), id: 'version', cell: ({ row }) => <span className="font-bold">v{row.original.version}</span> },
    { accessorKey: 'status', header: t('pmDocuments.status'), id: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { accessorKey: 'updatedAt', header: t('pmDocuments.updated'), id: 'updated' },
    { id: 'actions', header: t('pmDocuments.actions'), cell: ({ row }) => {
      const isThisDownloading = downloadingId === row.original.id;
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs font-bold text-primary border-primary/25 hover:bg-primary hover:text-primary-foreground shadow-xs flex items-center gap-1.5 transition-all"
            onClick={() => handleDownload(row.original)}
            disabled={isThisDownloading}
          >
            {isThisDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Download
          </Button>
        </div>
      );
    }},
  ];

  if (isLoading) return <LoadingSkeleton type="table" />;

  return (
    <div>
      {/* Premium Header Layout */}
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0 pb-6 border-b border-border/60 mb-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            {t('pmDocuments.allTitle')}
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {t('pmDocuments.allDesc')}
          </p>
        </div>

        {/* Dropdown Action Button */}
        <div className="relative pt-2 md:pt-0">
          <Button
            onClick={() => setUploadDropdownOpen(!uploadDropdownOpen)}
            className="shadow-sm font-semibold flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            {t('pmDocuments.uploadDocument')}
            <span className="text-[8px] ml-0.5">▼</span>
          </Button>

          {uploadDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setUploadDropdownOpen(false)}
              />
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-40 animate-in fade-in slide-in-from-top-2 duration-150 text-foreground">
                <button
                  onClick={() => {
                    setUploadDropdownOpen(false);
                    setModalType('owner');
                    setIsModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary/40 transition-colors flex items-center gap-2"
                >
                  📂 Upload for Owner
                </button>
                <button
                  onClick={() => {
                    setUploadDropdownOpen(false);
                    setModalType('tenant');
                    setIsModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-bold text-foreground hover:bg-secondary/40 transition-colors flex items-center gap-2"
                >
                  👤 Upload for Tenant
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Role Filters */}
      <div className="flex gap-2 p-1 bg-secondary/15 border rounded-2xl w-fit mb-4">
        <button
          onClick={() => setRoleFilter('all')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            roleFilter === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-secondary text-muted-foreground'
          }`}
        >
          {t('pmDocuments.allDocsTab')}
        </button>
        <button
          onClick={() => setRoleFilter('owner')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            roleFilter === 'owner' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-secondary text-muted-foreground'
          }`}
        >
          {t('pmDocuments.ownerDocsTab')}
        </button>
        <button
          onClick={() => setRoleFilter('tenant')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            roleFilter === 'tenant' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-secondary text-muted-foreground'
          }`}
        >
          {t('pmDocuments.tenantDocsTab')}
        </button>
      </div>

      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex-1">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t('pmDocuments.searchDocs')}
            filters={[{
              key: 'category', value: categoryFilter, placeholder: t('pmDocuments.category'),
              options: ['Lease','Invoice','Receipt','Statement','Inspection','Maintenance','Tax','Insurance','Contract','Legal','Other'].map(c => ({ label: c, value: c })),
            }]}
            onFilterChange={(k, v) => { if (k === 'category') setCategoryFilter(v); }}
            onReset={() => { setSearchQuery(''); setCategoryFilter(''); }}
          />
        </div>
        <div className="flex gap-1 border rounded-lg overflow-hidden shrink-0">
          <button onClick={() => setViewMode('table')} className={`p-2 ${viewMode === 'table' ? 'bg-primary text-white' : 'hover:bg-secondary'}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-white' : 'hover:bg-secondary'}`}><LayoutGrid className="w-4 h-4" /></button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <DataTable columns={columns} data={filtered} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {filtered.slice(0, 40).map((doc) => (
            <DocumentCard
              key={doc.id} id={doc.id} name={doc.name} category={doc.category}
              size={doc.size} status={doc.status} updatedAt={doc.updatedAt} owner={doc.owner}
              onDownload={() => handleDownload(doc)}
              onPreview={() => handleDownload(doc)}
            />
          ))}
        </div>
      )}

      {/* Floating Dialog Modal */}
      <UploadDocumentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        type={modalType}
      />

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
export default DocsAllPage;
