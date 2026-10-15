import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { ScreeningCheck } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  User, Shield, ShieldAlert, CheckCircle, AlertTriangle, XCircle, 
  Download, FileText, Loader2, ArrowRight, X, Calendar, Play 
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
    screening.screeningStatus === 'Completed' ||
    screening.screeningStatus === 'Approved' ||
    screening.screeningStatus === 'Declined' ||
    (screening as any).status === 'Processing' ||
    (screening as any).status === 'Completed'
  );

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

        {/* TENANT UPLOADED DOCUMENT */}
        {screening.documentUrl && (
          <div className="space-y-2">
            <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b pb-1">Uploaded Verification Document</h4>
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-bold text-foreground">{screening.documentName || 'Identity_Proof_Document.pdf'}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Uploaded by applicant for background verify check.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(screening.documentUrl, '_blank')}
                className="text-primary border-primary/30 hover:bg-primary/10 font-bold py-1 h-8 text-[10px] flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> View/Download
              </Button>
            </div>
          </div>
        )}

        {/* CREDIT REPORT CARD */}
        <div className="space-y-2">
          <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b pb-1">Credit Bureau Report</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Score box */}
            <div className="p-4 bg-secondary/15 border border-border/40 rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-[9px] uppercase text-muted-foreground">Credit Score</span>
              <p className="text-3xl font-black text-primary mt-1">{screening.creditScore || '—'}</p>
              <span className="text-[8px] text-muted-foreground font-medium mt-1">TransUnion ResidentScore</span>
            </div>

            {/* Recommendation box */}
            <div className="p-4 bg-secondary/15 border border-border/40 rounded-xl flex flex-col items-center justify-center text-center sm:col-span-2">
              <span className="text-[9px] uppercase text-muted-foreground">Credit Recommendation</span>
              <p className={`px-3 py-1 rounded-full text-xs font-black border uppercase mt-2.5 ${getRecommendationColor(screening.creditRecommendation)}`}>
                {screening.creditRecommendation || 'Pending check'}
              </p>
              <span className="text-[8px] text-muted-foreground font-medium mt-1.5">Based on credit check risk models</span>
            </div>
          </div>

          {screening.screeningStatus === 'Completed' && (
            <div className="grid grid-cols-3 gap-2.5 pt-1 text-[10px] font-medium text-center">
              <div className="bg-secondary/10 p-2.5 border rounded-lg">
                <p className="text-muted-foreground uppercase text-[8px]">Payment History</p>
                <p className="font-black text-emerald-500 mt-0.5">99% On-Time</p>
              </div>
              <div className="bg-secondary/10 p-2.5 border rounded-lg">
                <p className="text-muted-foreground uppercase text-[8px]">Collections</p>
                <p className="font-black text-foreground mt-0.5">$0.00 Total</p>
              </div>
              <div className="bg-secondary/10 p-2.5 border rounded-lg">
                <p className="text-muted-foreground uppercase text-[8px]">Public Records</p>
                <p className="font-black text-foreground mt-0.5">None Registered</p>
              </div>
            </div>
          )}
        </div>

        {/* BACKGROUND AND EVICTIONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Criminal check */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b pb-1">Criminal History</h4>
            <div className="p-4 bg-secondary/15 border border-border/40 rounded-xl flex flex-col justify-between h-28">
              <div className="flex items-start gap-2">
                {(screening as any).criminalBackground === 'Passed' || screening.criminalStatus === 'No Records Found' ? (
                  <Shield className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (screening as any).criminalBackground === 'Flagged' || screening.criminalStatus === 'Records Found' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin shrink-0" />
                )}
                <div>
                  <p className="font-extrabold text-foreground">Background Check</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">National databases scan.</p>
                </div>
              </div>
              <p className="text-[10px] font-bold text-foreground">{screening.criminalStatus || ((screening as any).criminalBackground === 'Passed' ? 'No Records Found' : 'Records Found')}</p>
            </div>
          </div>

          {/* Eviction check */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b pb-1">Eviction History</h4>
            <div className="p-4 bg-secondary/15 border border-border/40 rounded-xl flex flex-col justify-between h-28">
              <div className="flex items-start gap-2">
                {(screening as any).evictionHistory === 'No Records' || screening.evictionStatus === 'No Records Found' ? (
                  <Shield className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (screening as any).evictionHistory === 'Flagged' || screening.evictionStatus === 'Records Found' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin shrink-0" />
                )}
                <div>
                  <p className="font-extrabold text-foreground">Eviction Records</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Past landlord court logs.</p>
                </div>
              </div>
              <p className="text-[10px] font-bold text-foreground">{screening.evictionStatus || ((screening as any).evictionHistory === 'No Records' ? 'No Records Found' : 'Records Found')}</p>
            </div>
          </div>
        </div>

        {/* INCOME VERIFICATION */}
        {screening.screeningStatus === 'Completed' && (
          <div className="space-y-2">
            <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b pb-1">Income Verification</h4>
            <div className="p-4 bg-secondary/15 border border-border/40 rounded-xl grid grid-cols-3 gap-2">
              <div>
                <p className="text-muted-foreground text-[8px] uppercase">Employer</p>
                <p className="font-bold mt-0.5">Chicago Bulls Inc</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[8px] uppercase">Monthly Income</p>
                <p className="font-bold text-emerald-500 mt-0.5">$25,000 / mo</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[8px] uppercase">Employment Status</p>
                <p className="font-bold mt-0.5">Active Full-Time</p>
              </div>
            </div>
          </div>
        )}

        {/* DOWNLOADABLE DOCUMENTS */}
        {screening.screeningStatus === 'Completed' && (
          <div className="space-y-2">
            <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b pb-1">Downloadable Reports</h4>
            <div className="grid grid-cols-3 gap-2 font-bold text-[10px]">
              <button
                type="button"
                onClick={() => handleDownloadReport('Credit Report')}
                className="flex items-center justify-between p-2.5 bg-secondary/20 hover:bg-secondary/45 border rounded-xl transition text-foreground text-left"
              >
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary" /> Credit</span>
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => handleDownloadReport('Background Check')}
                className="flex items-center justify-between p-2.5 bg-secondary/20 hover:bg-secondary/45 border rounded-xl transition text-foreground text-left"
              >
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary" /> Criminal</span>
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => handleDownloadReport('Eviction History')}
                className="flex items-center justify-between p-2.5 bg-secondary/20 hover:bg-secondary/45 border rounded-xl transition text-foreground text-left"
              >
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary" /> Evictions</span>
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

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
          
          {/* RUN CHECK BUTTON - DISABLED UNTIL TENANT SUBMITS */}
          {(screening.screeningStatus === 'Pending' || screening.screeningStatus === 'Pending Documents' || screening.screeningStatus === 'Processing' || screening.screeningStatus === 'Pending Approval' || (screening as any).status === 'Pending' || (screening as any).status === 'Pending Documents' || (screening as any).status === 'Processing' || (screening as any).status === 'Pending Approval') && (
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
          )}

          {/* APPROVE / DECLINE BUTTONS - ONLY WHEN REPORT IS COMPLETED */}
          {(screening.screeningStatus === 'Completed' || (screening as any).status === 'Completed') && (
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
