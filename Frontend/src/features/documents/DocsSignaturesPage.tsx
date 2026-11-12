import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SignatureStatusBadge, SignatureTimeline } from '../../components/DocumentComponents';
import { DocumentSigningViewerModal } from '../../components/DocumentSigningViewerModal';
import { Plus, Loader2, PenLine, PenTool, Eye } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

const WIZARD_STEPS = ['Select Document', 'Select Signers', 'Signature Fields', 'Message', 'Review', 'Send'];

export const DocsSignaturesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [documentName, setDocumentName] = useState('');
  const [signers, setSigners] = useState('');
  const [message, setMessage] = useState('');
  const [placedFields, setPlacedFields] = useState<Array<{ id: string; type: string; label: string; top: number; left: number }>>([
    { id: 'f1', type: 'signature', label: '✍️ Signature Spot', top: 72, left: 75 },
    { id: 'f2', type: 'date', label: '📅 Date Signed', top: 72, left: 25 },
  ]);

  // Interactive Signing Viewer state
  const [selectedSigningItem, setSelectedSigningItem] = useState<any | null>(null);

  const { data: sigs = [], isLoading } = useQuery({ queryKey: ['docs-signatures'], queryFn: () => api.signatures.getAll() });

  const sendMutation = useMutation({
    mutationFn: () => api.signatures.create({
      documentId: 'doc-1',
      documentName,
      requestedBy: 'Property Manager',
      signers: signers.split(',').map(s => s.trim()),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['docs-signatures'] }); setIsOpen(false); setStep(1); setDocumentName(''); setSigners(''); },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.signatures.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['docs-signatures'] }),
  });

  // Local state override for signed items so mockApi.ts remains completely untouched
  const [signedItemsMap, setSignedItemsMap] = useState<Record<string, { signatureDataUrl: string; signedAt: string }>>({});

  const handleCompleteSign = (id: string, signatureDataUrl: string) => {
    setSignedItemsMap(prev => ({
      ...prev,
      [id]: {
        signatureDataUrl,
        signedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      },
    }));
  };

  const filtered = sigs.map(item => {
    if (signedItemsMap[item.id]) {
      return {
        ...item,
        status: 'Signed',
        signatureDataUrl: signedItemsMap[item.id].signatureDataUrl,
        signedAt: signedItemsMap[item.id].signedAt,
      };
    }
    return item;
  }).filter(s => s.documentName.toLowerCase().includes(searchQuery.toLowerCase()));

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'sentAt', header: t('pmDocuments.sentDate'), id: 'date' },
    { accessorKey: 'documentName', header: t('pmDocuments.docName'), id: 'doc', cell: ({ row }) => <span className="font-bold text-foreground">{row.original.documentName}</span> },
    { accessorKey: 'requestedBy', header: t('pmDocuments.requestedBy'), id: 'by' },
    { accessorKey: 'expiresAt', header: t('pmDocuments.expires'), id: 'exp' },
    { accessorKey: 'status', header: t('pmDocuments.status'), id: 'status', cell: ({ row }) => <SignatureStatusBadge status={row.original.status} /> },
    { id: 'actions', header: t('pmDocuments.actions'), cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="text-[10px] h-7 px-2 font-bold bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
          onClick={() => setSelectedSigningItem(row.original)}
        >
          {row.original.status === 'Signed' ? (
            <><Eye className="w-3 h-3 mr-1" /> {t('pmDocuments.viewDoc')}</>
          ) : (
            <><PenTool className="w-3 h-3 mr-1" /> {t('pmDocuments.signNow')}</>
          )}
        </Button>
        {row.original.status === 'Sent' && (
          <Button variant="ghost" size="sm" className="text-[9px] h-7 text-rose-500 hover:bg-rose-500/10 font-bold" onClick={() => cancelMutation.mutate(row.original.id)}>
            Cancel
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pmDocuments.signaturesTitle')}
        description={t('pmDocuments.signaturesDesc')}
        breadcrumbs={[{ label: t('header.home'), href: '/' }, { label: t('nav.documents'), href: '/documents' }, { label: t('pmDocuments.signaturesTitle') }]}
        action={{ label: t('pmDocuments.requestSignature'), onClick: () => setIsOpen(true), icon: <Plus className="w-4 h-4" /> }}
      />
      <FilterBar searchQuery={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder={t('pmDocuments.searchSignatures')} onReset={() => setSearchQuery('')} />
      <DataTable columns={columns} data={filtered} loading={isLoading} />

      {/* Interactive Paper Signing Viewer Modal */}
      {selectedSigningItem && (
        <DocumentSigningViewerModal
          open={!!selectedSigningItem}
          onOpenChange={(open) => { if (!open) setSelectedSigningItem(null); }}
          requestItem={selectedSigningItem}
          onCompleteSign={handleCompleteSign}
        />
      )}

      {/* 6-Step Signature Request Wizard */}
      <FormDialog open={isOpen} onOpenChange={setIsOpen} title={`Signature Request Wizard — Step ${step} of 6`}>
        <div className="space-y-5 pt-2 text-xs font-semibold text-foreground">
          <SignatureTimeline steps={WIZARD_STEPS.map((label, i) => ({ label, done: i + 1 < step, active: i + 1 === step }))} />

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase">1. Select Document from System Templates</label>
                <Select
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="font-bold text-xs"
                >
                  <option value="">-- Choose a PDF Document / Template --</option>
                  <option value="Lease_Agreement_Unit_304.pdf">📄 Lease_Agreement_Unit_304.pdf (Oakridge Heights)</option>
                  <option value="Commercial_Lease_Downtown_Plaza.pdf">📄 Commercial_Lease_Downtown_Plaza.pdf</option>
                  <option value="Tenant_MoveIn_Inspection_Report.pdf">📄 Tenant_MoveIn_Inspection_Report.pdf</option>
                  <option value="Vendor_Maintenance_Contract_2026.pdf">📄 Vendor_Maintenance_Contract_2026.pdf</option>
                  <option value="Owner_Management_Agreement.pdf">📄 Owner_Management_Agreement.pdf</option>
                </Select>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-border/60" />
                <span className="flex-shrink mx-3 text-[9px] font-extrabold uppercase text-muted-foreground">OR Drag & Drop / Browse PDF</span>
                <div className="flex-grow border-t border-border/60" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-muted-foreground uppercase">2. Drag & Drop or Browse PDF File</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      setDocumentName(file.name);
                    }
                  }}
                  className="border-2 border-dashed border-primary/50 hover:border-primary rounded-xl p-5 text-center bg-primary/5 hover:bg-primary/10 transition cursor-pointer relative group"
                >
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setDocumentName(file.name);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    id="wizard-pdf-upload"
                  />
                  <div className="space-y-1 pointer-events-none">
                    <p className="text-xs font-extrabold text-primary flex items-center justify-center gap-1.5">
                      <span className="text-lg">📁</span> Drag & Drop PDF here or Click to Browse
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold">Supports any PDF document from your device</p>
                  </div>
                </div>
              </div>

              {/* Selected File Banner */}
              {documentName ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base">📄</span>
                    <span className="truncate">Selected: {documentName}</span>
                  </div>
                  <span className="text-[9px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full uppercase shrink-0">READY</span>
                </div>
              ) : (
                <p className="text-[10px] text-amber-500 font-bold text-center">* Please select a document or upload a PDF to continue.</p>
              )}
            </div>
          )}
          {step === 2 && <div className="space-y-2"><label className="text-[10px] font-bold text-muted-foreground uppercase">Signer Emails (comma-separated)</label><Input placeholder="tenant@email.com, owner@email.com" value={signers} onChange={(e) => setSigners(e.target.value)} /></div>}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-secondary/30 p-3 rounded-xl border">
                <div>
                  <p className="font-extrabold text-xs text-foreground">Interactive Signature Field Placement</p>
                  <p className="text-[10px] text-muted-foreground">Click or drag fields onto the document preview sheet below.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-7 font-bold bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
                    onClick={() => {
                      const newId = `field-${Date.now()}`;
                      setPlacedFields(prev => [...prev, { id: newId, type: 'signature', label: '✍️ Signature Spot', top: 65, left: 50 }]);
                    }}
                  >
                    + Add Signature Spot
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-7 font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                    onClick={() => {
                      const newId = `field-${Date.now()}`;
                      setPlacedFields(prev => [...prev, { id: newId, type: 'date', label: '📅 Date Signed', top: 65, left: 15 }]);
                    }}
                  >
                    + Add Date Spot
                  </Button>
                </div>
              </div>

              {/* Document Paper Sheet Preview with Draggable Placement Targets */}
              <div className="relative border border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 p-6 shadow-inner min-h-[360px] max-h-[400px] overflow-hidden select-none font-sans">
                {/* Simulated Paper Background */}
                <div className="space-y-3 opacity-60 pointer-events-none">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-extrabold text-xs uppercase text-slate-800 dark:text-slate-200">DOCUMENT PREVIEW — {documentName || 'Lease_Agreement.pdf'}</span>
                    <span className="text-[9px] font-bold text-slate-400">Page 1 of 1</span>
                  </div>
                  <div className="space-y-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
                    <p>THIS AGREEMENT made by and between Management Company (&quot;Landlord&quot;) and Tenant.</p>
                    <p>1. Tenant agrees to terms, conditions, and monthly rental obligations as specified in the lease ledger.</p>
                    <p>2. Property: Designated leased property unit as described in contract schedule.</p>
                    <div className="h-16 bg-slate-100 dark:bg-slate-900 rounded-lg border border-dashed" />
                  </div>
                </div>

                {/* PLACED SIGNATURE FIELDS (Interactive & Draggable) */}
                {placedFields.map((field) => (
                  <div
                    key={field.id}
                    style={{ top: `${field.top}%`, left: `${field.left}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 p-2.5 rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur text-primary shadow-lg cursor-move transition-transform active:scale-95 group flex items-center gap-2"
                  >
                    <PenLine className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider">{field.label}</p>
                      <p className="text-[8px] text-muted-foreground font-bold">Required Signer Spot</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPlacedFields(prev => prev.filter(f => f.id !== field.id))}
                      className="ml-2 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold hover:scale-110 transition opacity-80 group-hover:opacity-100"
                      title="Remove field"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold">
                <span>Total Fields Placed: {placedFields.length}</span>
                <span className="text-emerald-500">✓ Fields will be assigned to signers in Step 4</span>
              </div>
            </div>
          )}
          {step === 4 && <div className="space-y-2"><label className="text-[10px] font-bold text-muted-foreground uppercase">Message to Signers</label><textarea className="w-full min-h-[100px] p-3 rounded-xl border bg-card text-foreground font-semibold" placeholder="Please review and sign the attached document..." value={message} onChange={(e) => setMessage(e.target.value)} /></div>}
          {step === 5 && <div className="space-y-2 bg-secondary/15 p-4 rounded-xl border"><p><strong>Document:</strong> {documentName}</p><p><strong>Signers:</strong> {signers}</p><p><strong>Message:</strong> {message || '—'}</p></div>}
          {step === 6 && <div className="space-y-2"><p className="text-muted-foreground">Click <strong>Send Request</strong> to dispatch signature invitations to all listed recipients.</p></div>}

          <div className="flex justify-between items-center pt-4 border-t">
            {step > 1 ? <Button variant="outline" onClick={() => setStep(p => p - 1)}>Back</Button> : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setIsOpen(false); setStep(1); }}>Cancel</Button>
              {step < 6 ? <Button onClick={() => setStep(p => p + 1)} disabled={step === 1 && !documentName}>Continue</Button>
                : <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>{sendMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Send Request</Button>}
            </div>
          </div>
        </div>
      </FormDialog>
    </div>
  );
};
export default DocsSignaturesPage;
