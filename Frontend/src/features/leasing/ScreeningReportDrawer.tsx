import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { ScreeningCheck } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  User, Shield, ShieldAlert, CheckCircle, AlertTriangle, XCircle, 
  Download, FileText, Loader2, ArrowRight, X, Calendar, Play, FastForward, Clock
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { downloadRealFile } from '../../utils/fileDownload';

interface ScreeningReportDrawerProps {
  screening: ScreeningCheck | null;
  onClose: () => void;
}

export const ScreeningReportDrawer: React.FC<ScreeningReportDrawerProps> = ({ screening, onClose }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [dialogInfo, setDialogInfo] = React.useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: '',
    description: '',
  });

  const handleDownloadReport = async (reportType: string) => {
    if (!screening?.documentUrl) {
      setDialogInfo({
        open: true,
        title: 'No Document Attached',
        description: `No digital ${reportType} file has been uploaded for this applicant yet.`,
      });
      return;
    }

    const res = await downloadRealFile({
      name: `${screening.applicantName || 'Applicant'}_${reportType.replace(/\s+/g, '_')}`,
      fileUrl: screening.documentUrl,
    });

    if (res.success) {
      setDialogInfo({
        open: true,
        title: 'Download Started',
        description: `The file "${res.filename}" is downloading. Please check your browser's download folder.`,
      });
    } else {
      setDialogInfo({
        open: true,
        title: 'Download Failed',
        description: 'Unable to download file. Please check your network connection.',
      });
    }
  };

  const generateReportMutation = useMutation({
    mutationFn: () => api.screening.generateReport(screening?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-checks-list'] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => api.screening.approve(screening?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-checks-list'] });
      alert('Applicant approved! Converting to active Resident. Redirecting to lease creation...');
      onClose();
      navigate({ to: '/leasing/leases' });
    },
  });

  const declineMutation = useMutation({
    mutationFn: () => api.screening.decline(screening?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-checks-list'] });
      alert('Application declined. Adverse action notice generated.');
      onClose();
    },
  });

  if (!screening) return null;

  const isTenantSubmitted = Boolean(
    screening.authorized ||
    screening.dob ||
    screening.screeningStatus === 'Processing' ||
    screening.screeningStatus === 'Pending Approval' ||
    screening.screeningStatus === 'Completed' ||
    screening.screeningStatus === 'Approved' ||
    screening.screeningStatus === 'Declined' ||
    (screening as any).status === 'Processing' ||
    (screening as any).status === 'Pending Approval' ||
    (screening as any).status === 'Completed'
  );

  const isPendingDecision =
    (screening.screeningStatus === 'Pending Approval' ||
     screening.screeningStatus === 'Completed' ||
     (screening as any).status === 'Pending Approval' ||
     (screening as any).status === 'Completed' ||
     Boolean(screening.documentUrl)) &&
    screening.screeningStatus !== 'Approved' &&
    screening.screeningStatus !== 'Declined' &&
    (screening as any).status !== 'Approved' &&
    (screening as any).status !== 'Declined';

  const getVerificationStatusColor = (status: string) => {
    if (status === 'Verified') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25';
    if (status === 'Failed') return 'text-rose-500 bg-rose-500/10 border-rose-500/25';
    return 'text-amber-500 bg-amber-500/10 border-amber-500/25';
  };

  const getRecommendationColor = (rec?: string) => {
    if (rec === 'Approved') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (rec === 'Conditional') return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    if (rec === 'Review Recommended') return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    if (rec === 'Declined') return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
    return 'text-muted-foreground bg-secondary/15';
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-card border-l shadow-2xl flex flex-col z-50 text-xs font-semibold text-foreground animate-slide-in">
      
      {/* HEADER */}
      <div className="p-4 border-b flex justify-between items-center bg-secondary/10 shrink-0">
        <div>
          <h3 className="font-extrabold text-sm uppercase tracking-wide">Screening Report Statement</h3>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">APPLICANT: {screening.applicantName} • PROVIDER: {screening.screeningProvider || 'TransUnion'}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/20 transition">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* REPORT CONTENT BODY */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* SUMMARY CARD */}
        <Card className="p-5 border bg-secondary/5 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[9px] uppercase text-muted-foreground">Applicant Name</span>
            <p className="text-sm font-bold text-foreground mt-0.5">{screening.applicantName}</p>
            <p className="text-muted-foreground text-[10px] mt-0.5">{screening.applicantEmail} • {screening.applicantPhone}</p>
          </div>
          <div>
            <span className="text-[9px] uppercase text-muted-foreground">Location Applied</span>
            <p className="text-sm font-bold text-foreground mt-0.5">{screening.propertyName}</p>
            <p className="text-muted-foreground text-[10px] mt-0.5">Unit Number: {screening.unitNumber}</p>
          </div>
          <div className="border-t pt-2.5 col-span-2 grid grid-cols-3 gap-2 text-[10px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Sent: {screening.invitationSentAt}</span>
            {screening.consentSubmittedAt && <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Consent: {screening.consentSubmittedAt}</span>}
            {screening.reportGeneratedAt && <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Report: {screening.reportGeneratedAt}</span>}
          </div>
        </Card>

        {/* DECISION ACTION NEEDED BANNER */}
        {isPendingDecision && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="font-extrabold text-foreground text-xs">Pending Approval (Decision Required)</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  Verification details and documents are ready. Please review below and Accept (Approve) or Reject (Decline) the applicant.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-600 border border-amber-500/30 whitespace-nowrap">
              Action Required
            </span>
          </div>
        )}

        {/* IDENTITY VERIFICATION */}
        <div className="space-y-2">
          <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b pb-1">Identity verification</h4>
          <div className="p-3.5 bg-secondary/15 rounded-xl border border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-extrabold">Identity Check</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Verify Date of Birth matches applicant profile records.</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] border font-black ${getVerificationStatusColor(screening.identityVerificationStatus || (screening.authorized ? 'Verified' : 'Pending'))}`}>
                {screening.identityVerificationStatus || (screening.authorized ? 'Verified' : 'Pending')}
              </span>
            </div>
            {screening.dob && (
              <div className="border-t border-border/40 pt-2 text-[10px] font-bold">
                <div>
                  <span className="text-[8px] uppercase text-muted-foreground">Date of Birth</span>
                  <p className="text-foreground">{screening.dob || '—'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TENANT UPLOADED DOCUMENT (SINGLE POLISHED CARD) */}
        <div className="space-y-2">
          <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b pb-1">Verification Document</h4>
          {screening.documentUrl ? (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/15 text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{screening.documentName || 'Identity_Proof_Document.pdf'}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Uploaded by applicant for background verification and identity proof.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(screening.documentUrl, '_blank')}
                className="text-primary border-primary/30 hover:bg-primary/10 font-bold py-1.5 h-9 text-xs flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> View / Download
              </Button>
            </div>
          ) : (
            <div className="p-4 bg-secondary/15 border border-border/40 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="font-bold text-foreground text-xs">No verification document uploaded yet</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">The applicant has not submitted their ID or verification document.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* DRAWER FOOTER ACTIONS */}
      <div className="p-4 border-t bg-secondary/15 flex items-center justify-between gap-2 shrink-0">
        <div>
          {!isTenantSubmitted && (
            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Waiting for tenant submission
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={approveMutation.isPending || declineMutation.isPending || generateReportMutation.isPending}>Close</Button>
          
          {/* RUN CHECK & SKIP BUTTONS - ONLY WHEN STATUS IS PENDING AND NOT YET READY FOR FINAL DECISION */}
          {!isPendingDecision && (screening.screeningStatus === 'Pending' || screening.screeningStatus === 'Pending Documents' || (screening as any).status === 'Pending' || (screening as any).status === 'Pending Documents') && (
            <>
              <Button
                variant="outline"
                onClick={() => approveMutation.mutate()}
                className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 border-amber-500/30 font-bold flex items-center gap-1"
                disabled={approveMutation.isPending || generateReportMutation.isPending}
                title="Skip screening check and directly approve applicant"
              >
                {approveMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FastForward className="w-3.5 h-3.5" />
                )}
                Skip & Approve
              </Button>
              <Button
                onClick={() => generateReportMutation.mutate()}
                className="bg-[#0066ff] hover:bg-[#0052cc] text-white font-bold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isTenantSubmitted || generateReportMutation.isPending}
                title={!isTenantSubmitted ? "Tenant has not submitted screening details & consent yet" : "Run Check & Generate Report"}
              >
                {generateReportMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {!isTenantSubmitted ? 'Waiting for Tenant Submission' : 'Run Check & Generate Report'}
              </Button>
            </>
          )}

          {/* APPROVE (ACCEPT) / DECLINE (REJECT) BUTTONS - WHEN READY FOR MANAGER DECISION */}
          {isPendingDecision && (
            <>
              <Button
                onClick={() => declineMutation.mutate()}
                className="text-rose-500 hover:bg-rose-500/10 border-rose-500/30 font-bold"
                variant="outline"
                disabled={approveMutation.isPending || declineMutation.isPending}
              >
                {declineMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                Decline Application
              </Button>
              <Button
                onClick={() => approveMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1"
                disabled={approveMutation.isPending || declineMutation.isPending}
              >
                {approveMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                Approve Applicant
              </Button>
            </>
          )}

          {/* STATUS DISPLAY WHEN ALREADY APPROVED OR DECLINED - NO ACTION BUTTONS */}
          {(screening.screeningStatus === 'Approved' || (screening as any).status === 'Approved') && (
            <span className="text-xs font-black text-emerald-500 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <CheckCircle className="w-4 h-4" /> Applicant Approved
            </span>
          )}

          {(screening.screeningStatus === 'Declined' || (screening as any).status === 'Declined') && (
            <span className="text-xs font-black text-rose-500 flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <XCircle className="w-4 h-4" /> Application Declined
            </span>
          )}
        </div>
      </div>

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
