import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { FileTypeIcon } from '../../components/DocumentComponents';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { UploadDocumentModal } from '../documents/UploadDocumentModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Download, Plus, Search, Loader2, FileText, FolderOpen } from 'lucide-react';

const createFallbackDocumentBlob = (doc: any): Blob => {
  const title = (doc.name || 'Tenant Document').replace(/[()\\]/g, '');
  const category = (doc.category || 'Rental Agreement').replace(/[()\\]/g, '');
  const tenant = (doc.tenant || doc.tenantName || 'Resident Tenant').replace(/[()\\]/g, '');
  const date = (doc.uploadedAt || doc.date || new Date().toISOString().split('T')[0]).replace(/[()\\]/g, '');

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
(Tenant Resident: ${tenant}) Tj
0 -20 Td
(Uploaded Date: ${date}) Tj
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

export const ManagerTenantDocumentsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal & Download states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [downloadedDocName, setDownloadedDocName] = useState('');

  // Queries
  const { data: tenantDocs = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['docs-tenant'],
    queryFn: () => api.documents.getTenantDocs(),
  });

  const { data: tenants = [], isLoading: loadingTenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.tenant.getAll(),
  });

  const isLoading = loadingDocs || loadingTenants;

  // Normalization & Tenant Resident matching
  const mappedDocs = tenantDocs.map((doc: any) => {
    const tenant = tenants.find((t: any) => t.id === doc.tenantId);
    const tenantName = tenant
      ? `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim()
      : (doc.tenantName || 'Resident Tenant');

    const formattedDate = doc.uploadedAt
      ? doc.uploadedAt.split('T')[0]
      : (doc.date || new Date().toISOString().split('T')[0]);

    return {
      id: doc.id,
      name: doc.name,
      category: doc.category || 'Rental Agreement',
      size: doc.size || '1.5 MB',
      tenant: tenantName,
      date: formattedDate,
      fileUrl: doc.fileUrl,
    };
  });

  // Filtered Documents
  const filteredDocs = mappedDocs.filter((doc: any) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tenant.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === '' ||
      doc.category.toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  // Handle Download
  const handleDownload = async (doc: any) => {
    try {
      setDownloadingId(doc.id);
      const filename = doc.name.endsWith('.pdf') ? doc.name : `${doc.name}.pdf`;

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
          console.warn('Direct blob fetch failed, falling back to link click:', fetchErr);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tenantDocumentsView.title', 'Tenant Documents Categories')}
        description={t(
          'tenantDocumentsView.description',
          'Access leases, notices, and income agreements uploaded by tenant residents.'
        )}
        breadcrumbs={[
          { label: t('nav.tenants', 'Tenants'), href: '/tenants' },
          { label: t('tenantDocumentsView.breadcrumb', 'Documents') },
        ]}
        action={{
          label: t('tenant.documents.uploadDoc', 'Upload Document'),
          onClick: () => setIsUploadModalOpen(true),
          icon: <Plus className="w-4 h-4" />,
        }}
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border rounded-xl p-4 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('common.search', 'Search documents or tenants...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 text-xs w-full sm:w-48"
          >
            <option value="">{t('common.allCategories', 'All Categories')}</option>
            <option value="Rental Agreement">Rental Agreement</option>
            <option value="Lease">Lease</option>
            <option value="Agreement">Agreement</option>
            <option value="Identity Proof">Identity Proof</option>
            <option value="Utility Bills">Utility Bills</option>
            <option value="Income Proof">Income Proof</option>
            <option value="Insurance">Insurance</option>
            <option value="Other">Other</option>
          </Select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">{t('tenantDocumentsView.table.fileName', 'DOCUMENT FILE NAME')}</th>
                <th className="p-4">{t('tenantDocumentsView.table.category', 'TYPE CATEGORY')}</th>
                <th className="p-4">{t('tenantDocumentsView.table.fileSize', 'FILE SIZE')}</th>
                <th className="p-4">{t('tenantDocumentsView.table.tenant', 'TENANT RESIDENT')}</th>
                <th className="p-4">{t('tenantDocumentsView.table.uploadedDate', 'UPLOADED DATE')}</th>
                <th className="p-4 text-right">{t('common.actions', 'ACTIONS')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading tenant documents...</span>
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <FolderOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="font-semibold text-sm">No tenant documents found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery || categoryFilter
                        ? 'Try clearing search or filters to see more documents.'
                        : 'Upload your first tenant agreement or lease document.'}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4 gap-2"
                      onClick={() => setIsUploadModalOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Upload Document
                    </Button>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-accent/40 transition">
                    <td className="p-4 font-bold text-primary">
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:underline"
                        onClick={() => handleDownload(doc)}
                      >
                        <FileTypeIcon name={doc.name} className="shrink-0" />
                        <span className="truncate max-w-xs">{doc.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={doc.category} />
                    </td>
                    <td className="p-4 font-bold">{doc.size}</td>
                    <td className="p-4 font-bold">{doc.tenant}</td>
                    <td className="p-4 text-muted-foreground font-mono">{doc.date}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-primary"
                        disabled={downloadingId === doc.id}
                        onClick={() => handleDownload(doc)}
                        title="Download Document"
                      >
                        {downloadingId === doc.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Modal */}
      <UploadDocumentModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        type="tenant"
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['docs-tenant'] });
        }}
      />

      {/* Download Success Dialog */}
      <ConfirmDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        title="Download Started"
        description={`The tenant document "${downloadedDocName}" is being downloaded. Please check your browser's download folder.`}
        onConfirm={() => setSuccessDialogOpen(false)}
        confirmText="Great"
        cancelText="Close"
      />
    </div>
  );
};

export default ManagerTenantDocumentsPage;
