import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { downloadRealFile } from '../../utils/fileDownload';
import { 
  BookOpen, 
  Award, 
  Download, 
  Key, 
  Home, 
  User, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  Mail, 
  Phone, 
  Building,
  Info,
  CheckCircle,
  AlertTriangle,
  Gift,
  Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const TenantLeasePage: React.FC = () => {
  const { t } = useTranslation();
  const [msg, setMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTermMonths, setSelectedTermMonths] = useState(12);

  // Option 3: AI Lease Q&A Assistant State
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponseHistory, setAiResponseHistory] = useState<Array<{ q: string; a: string }>>([
    {
      q: 'What is my late fee grace period?',
      a: 'Rent is due on the 1st of every month. A grace period is provided until the 5th; after the 5th, a $50 late fee is automatically applied to your account balance.',
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAskLeaseAi = async (customQ?: string) => {
    const qToAsk = customQ || aiQuestion;
    if (!qToAsk.trim()) return;
    setAiLoading(true);
    try {
      const res: any = await api.tenantLeases.askAi(qToAsk);
      const answerText = res?.answer || res?.data?.answer || 'Please contact your property manager for detailed lease addendums.';
      setAiResponseHistory((prev) => [...prev, { q: qToAsk, a: answerText }]);
      if (!customQ) setAiQuestion('');
    } catch (e) {
      console.error('Lease AI Q&A failed:', e);
    } finally {
      setAiLoading(false);
    }
  };

  // Queries
  const { data: leases = [], isLoading, refetch } = useQuery({ 
    queryKey: ['tenant-leases-details'], 
    queryFn: () => api.tenantLeases.getAll() 
  });

  const { data: tenantDocs = [] } = useQuery({
    queryKey: ['tenant-documents-list'],
    queryFn: () => api.tenantDocuments.getAll(),
  });

  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogDescription, setDialogDescription] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Calculate dynamic end date based on selected months
  const calculatedEndDate = React.useMemo(() => {
    const rawLease = leases && leases.length > 0 ? leases[0] : null;
    const endDateStr = rawLease?.endDate || rawLease?.leaseEnd;
    if (!endDateStr) return 'N/A';
    const d = new Date(endDateStr);
    d.setMonth(d.getMonth() + selectedTermMonths);
    return d.toISOString().split('T')[0];
  }, [leases, selectedTermMonths]);

  if (isLoading) {
    return <LoadingSkeleton type="card" />;
  }

  const rawLease = leases && leases.length > 0 ? leases[0] : null;

  if (!rawLease) {
    return (
      <div className="p-6 text-center border rounded-xl bg-card text-muted-foreground">
        No active lease found.
      </div>
    );
  }

  // Normalize lease fields for backward compatibility and format compatibility
  const lease = {
    ...rawLease,
    leaseStart: rawLease.startDate ? new Date(rawLease.startDate).toISOString().split('T')[0] : rawLease.leaseStart || '',
    leaseEnd: rawLease.endDate ? new Date(rawLease.endDate).toISOString().split('T')[0] : rawLease.leaseEnd || '',
    rentAmount: rawLease.rentAmount || 0,
    securityDeposit: rawLease.depositAmount !== undefined ? rawLease.depositAmount : rawLease.securityDeposit || 0,
    status: rawLease.status || 'Active',
    tenantName: rawLease.tenant ? `${rawLease.tenant.firstName || ''} ${rawLease.tenant.lastName || ''}`.trim() : rawLease.tenantName || '',
    propertyName: rawLease.property?.name || rawLease.propertyName || 'Property',
    unitNumber: rawLease.unit ? `Unit ${rawLease.unit.unitNumber}` : rawLease.unitNumber || 'Unassigned Unit',
    renewal: rawLease.renewal || null,
  };

  const property = lease.property || {};
  const unit = lease.unit || {};
  const tenant = lease.tenant || {};
  const owner = property.owner || {};

  const handleAcceptRenewal = async () => {
    setActionLoading(true);
    try {
      await api.renewals.accept(lease.id, selectedTermMonths);
      setMsg('Renewal proposal accepted! Your agreement has been renewed successfully.');
      setTimeout(() => {
        refetch();
        setMsg('');
      }, 2000);
    } catch (e) {
      console.error(e);
      alert('Failed to accept renewal proposal.');
    }
    setActionLoading(false);
  };

  const handleDeclineRenewal = async () => {
    setActionLoading(true);
    try {
      await api.renewals.reject(lease.id);
      setMsg('Renewal declined. Your move-out checklist is now scheduled.');
      setTimeout(() => {
        refetch();
        setMsg('');
      }, 2000);
    } catch (e) {
      console.error(e);
      alert('Failed to decline renewal proposal.');
    }
    setActionLoading(false);
  };

  const handleDownloadLeaseAgreement = async () => {
    setIsDownloading(true);
    try {
      let targetDoc: any = null;

      // 1. Direct documentUrl from lease object
      if (rawLease?.documentUrl) {
        targetDoc = {
          name: rawLease.documentName || `Lease_Agreement_${lease.tenantName || 'Unit'}`.replace(/\s+/g, '_'),
          fileUrl: rawLease.documentUrl,
        };
      } 
      // 2. Find in tenantDocs
      else if (Array.isArray(tenantDocs) && tenantDocs.length > 0) {
        const found = tenantDocs.find((d: any) => {
          const cat = (d.category || '').toLowerCase();
          const name = (d.name || '').toLowerCase();
          return cat === 'lease' || cat === 'leasing' || cat === 'rental agreement' || name.includes('lease');
        });
        if (found && found.fileUrl) {
          targetDoc = found;
        } else {
          const anyDoc = tenantDocs.find((d: any) => d.fileUrl);
          if (anyDoc) {
            targetDoc = anyDoc;
          }
        }
      }

      if (!targetDoc || !targetDoc.fileUrl) {
        setDialogTitle('No Lease Document Uploaded');
        setDialogDescription('No digital lease agreement file has been uploaded for this unit yet. Please reach out to your property management office to request an uploaded copy.');
        setDownloadDialogOpen(true);
        return;
      }

      const res = await downloadRealFile(targetDoc);
      if (res.success) {
        setDialogTitle('Download Started');
        setDialogDescription(`The document "${res.filename}" is downloading. Please check your browser's download folder.`);
        setDownloadDialogOpen(true);
      } else {
        setDialogTitle('Download Incomplete');
        setDialogDescription('The file could not be retrieved from the server. Please verify your internet connection or contact the management office.');
        setDownloadDialogOpen(true);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 text-foreground max-w-5xl">
      <PageHeader
        title={t('tenantLease.title')}
        description={t('tenantLease.desc')}
        breadcrumbs={[
          { label: t('ai.breadcrumbs.home'), href: '/tenant' },
          { label: t('tenant.nav.lease') },
        ]}
      />

      {/* Success Notification Alert */}
      {msg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-bold flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0 animate-bounce" />
          <span>{msg}</span>
        </div>
      )}

      {/* RENEWAL OFFER ALERT CARDS */}
      {lease.renewal && lease.renewal.status === 'OFFER_SENT' && (
        <Card className="p-6 border-2 border-emerald-500/30 bg-emerald-500/5 rounded-2xl shadow-md space-y-4">
          <div className="flex items-start space-x-3.5">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Gift className="w-6 h-6 shrink-0" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm uppercase text-emerald-400">Lease Renewal Offer Received! 🎉</h3>
              <p className="text-xs text-muted-foreground">
                Your current lease agreement is set to expire on <strong className="text-foreground">{lease.leaseEnd}</strong>. The property management office has drafted a renewal offer:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-y border-emerald-500/10 py-4 my-2 text-xs font-semibold">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">Current Rent</span>
              <p className="font-extrabold text-base text-muted-foreground">${(Number(lease.rentAmount) || 0).toLocaleString()} / mo</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">New Proposed Rent</span>
              <p className="font-extrabold text-lg text-emerald-400">${(Number(lease.renewal.newRentAmount) || 0).toLocaleString()} / mo</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">Select Lease Term</span>
              <select
                value={selectedTermMonths}
                onChange={e => setSelectedTermMonths(Number(e.target.value))}
                className="w-full mt-0.5 p-2 rounded border border-emerald-500/20 bg-secondary/80 text-xs font-extrabold focus:outline-none"
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={9}>9 Months</option>
                <option value={12}>12 Months (1 Year)</option>
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">New Expiration Date</span>
              <p className="font-extrabold text-base text-foreground mt-2">{calculatedEndDate}</p>
            </div>
          </div>

          <div className="flex justify-end items-center space-x-3 pt-1">
            {actionLoading ? (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Processing agreement...</span>
              </div>
            ) : (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleDeclineRenewal}
                  className="bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-[10px] font-extrabold py-2 px-4"
                >
                  Decline & Vacate
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleAcceptRenewal}
                  className="bg-emerald-500 text-white hover:bg-emerald-600 text-[10px] font-extrabold py-2 px-4"
                >
                  Accept & Sign Lease
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      {lease.renewal && lease.renewal.status === 'ACCEPTED' && (
        <Card className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl flex items-center space-x-3 text-xs">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-muted-foreground font-semibold">
            Your lease renewal proposal has been accepted! Your contract will automatically roll over at the new rent rate of <strong className="text-emerald-400">${lease.renewal.newRentAmount}</strong> on lease expiration.
          </span>
        </Card>
      )}

      {lease.renewal && lease.renewal.status === 'REJECTED' && (
        <Card className="p-4 border border-rose-500/20 bg-rose-500/5 rounded-xl flex items-center space-x-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="text-muted-foreground font-semibold">
            Lease renewal offer was declined. Move-out scheduled for <strong className="text-rose-400">{lease.leaseEnd}</strong>.
          </span>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Lease Overview, Property & Unit details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Lease Status & Financials Overview */}
          <Card className="p-6 border bg-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 gap-4">
              <div className="flex items-center space-x-3">
                <BookOpen className="w-7 h-7 text-primary shrink-0" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase">{t('tenantLease.termDetails')}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-bold">
                    {t('tenantLease.start')}: {lease.leaseStart} • {t('tenantLease.end')}: {lease.leaseEnd}
                  </p>
                </div>
              </div>
              <div>
                <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${
                  lease.status === 'Active' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                    : lease.status === 'Pending_Move_In'
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                }`}>
                  {lease.status?.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
              <div className="space-y-1 bg-secondary/20 p-3 rounded-xl border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase">{t('tenantLease.monthlyRent')}</span>
                <p className="font-extrabold text-lg text-primary">${(Number(lease.rentAmount) || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-1 bg-secondary/20 p-3 rounded-xl border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase">{t('tenantLease.securityDeposit')}</span>
                <p className="font-extrabold text-lg">${(Number(lease.securityDeposit) || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-1 bg-secondary/20 p-3 rounded-xl border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase">Lease Duration</span>
                <p className="font-extrabold text-sm text-foreground/80 mt-1">12 Months</p>
              </div>
              <div className="space-y-1 bg-secondary/20 p-3 rounded-xl border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase">Next Due Date</span>
                <p className="font-extrabold text-sm text-foreground/80 mt-1">
                  {lease.status === 'Active' ? 'Aug 1, 2026' : 'On Move-In'}
                </p>
              </div>
            </div>
          </Card>

          {/* Property & Unit Details Card */}
          <Card className="p-6 border bg-card space-y-6">
            <div className="flex items-center space-x-3 border-b pb-4">
              <Home className="w-7 h-7 text-primary shrink-0" />
              <div>
                <h3 className="font-extrabold text-sm uppercase">Property & Unit Information</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-bold">
                  {property.name || lease.propertyName} — {lease.unitNumber || `Unit ${unit.unitNumber || ''}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Unit specifications */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase text-muted-foreground">Unit Specs</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center space-x-2 bg-secondary/10 p-2 rounded-lg">
                    <Bed className="w-4 h-4 text-primary shrink-0" />
                    <span><strong>{unit.bedrooms || '—'}</strong> Bedrooms</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-secondary/10 p-2 rounded-lg">
                    <Bath className="w-4 h-4 text-primary shrink-0" />
                    <span><strong>{unit.bathrooms || '—'}</strong> Bathrooms</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-secondary/10 p-2 rounded-lg">
                    <Maximize className="w-4 h-4 text-primary shrink-0" />
                    <span><strong>{unit.squareFootage || '—'}</strong> Sq Ft</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-secondary/10 p-2 rounded-lg">
                    <Building className="w-4 h-4 text-primary shrink-0" />
                    <span>Floor: <strong>{unit.floor !== undefined ? unit.floor : '—'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Property Details */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase text-muted-foreground">Property Location & Details</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">{property.streetAddress || property.address || '—'}</strong>
                      <br />
                      {property.city ? `${property.city}, ${property.state || ''} ${property.zip || ''}` : ''}
                      {property.country ? `, ${property.country}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Info className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Type: <strong className="text-foreground">{property.type || '—'}</strong></span>
                  </div>
                  {property.yearBuilt && (
                    <div className="flex items-center space-x-2">
                      <Info className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">Year Built: <strong className="text-foreground">{property.yearBuilt}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Included Utilities */}
          <Card className="p-6 border bg-card space-y-4">
            <h4 className="font-extrabold text-sm uppercase border-b pb-2">{t('tenantLease.includedUtilities')}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold">
              <span className="bg-secondary/40 border p-3 rounded-xl text-center text-foreground/80">{t('tenantLease.utilities.trash')}</span>
              <span className="bg-secondary/40 border p-3 rounded-xl text-center text-foreground/80">{t('tenantLease.utilities.sewage')}</span>
              <span className="bg-secondary/40 border p-3 rounded-xl text-center text-foreground/80">{t('tenantLease.utilities.pest')}</span>
              <span className="bg-secondary/40 border p-3 rounded-xl text-center text-foreground/80">Water & Gas</span>
            </div>
          </Card>

          {/* OPTION 3: 24/7 TENANT AI LEASE Q&A ASSISTANT WIDGET */}
          <Card className="p-6 border border-primary/30 bg-gradient-to-br from-card via-primary/5 to-secondary/20 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-primary/10 text-primary rounded-xl font-bold">🤖</span>
                <div>
                  <h4 className="font-extrabold text-sm uppercase text-foreground">24/7 AI Lease Assistant</h4>
                  <p className="text-[11px] text-muted-foreground font-semibold">Ask any question about your signed lease agreement</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-600 font-extrabold px-2.5 py-1 rounded-full uppercase">
                Live AI Help
              </span>
            </div>

            {/* Quick Sample Questions Chips */}
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Quick Frequently Asked Questions:</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAskLeaseAi('Are pets allowed in my unit?')}
                  disabled={aiLoading}
                  className="text-[11px] font-semibold bg-background hover:bg-primary/10 hover:text-primary border border-border/50 px-2.5 py-1 rounded-lg transition"
                >
                  🐾 Pets Allowed?
                </button>
                <button
                  type="button"
                  onClick={() => handleAskLeaseAi('What is the late fee grace period?')}
                  disabled={aiLoading}
                  className="text-[11px] font-semibold bg-background hover:bg-primary/10 hover:text-primary border border-border/50 px-2.5 py-1 rounded-lg transition"
                >
                  ⏰ Late Fee Policy?
                </button>
                <button
                  type="button"
                  onClick={() => handleAskLeaseAi('What utilities are included in my rent?')}
                  disabled={aiLoading}
                  className="text-[11px] font-semibold bg-background hover:bg-primary/10 hover:text-primary border border-border/50 px-2.5 py-1 rounded-lg transition"
                >
                  ⚡ Utilities Included?
                </button>
                <button
                  type="button"
                  onClick={() => handleAskLeaseAi('What is the notice period for move-out?')}
                  disabled={aiLoading}
                  className="text-[11px] font-semibold bg-background hover:bg-primary/10 hover:text-primary border border-border/50 px-2.5 py-1 rounded-lg transition"
                >
                  🔑 Move-out Notice?
                </button>
              </div>
            </div>

            {/* Chat History Box */}
            <div className="space-y-3 max-h-56 overflow-y-auto p-3.5 bg-card rounded-xl border border-border/40 font-semibold text-xs">
              {aiResponseHistory.map((item, idx) => (
                <div key={idx} className="space-y-1.5 border-b border-border/20 last:border-0 pb-2 last:pb-0">
                  <p className="text-primary font-bold text-[11px] flex items-center gap-1">
                    <span>Q:</span> {item.q}
                  </p>
                  <p className="text-foreground leading-relaxed text-xs bg-secondary/20 p-2.5 rounded-lg border border-border/30">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskLeaseAi();
              }}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                placeholder="Ask anything about rent, deposit, pets, or lease rules..."
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                className="flex-1 text-xs p-2.5 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
              />
              <Button type="submit" size="sm" disabled={aiLoading || !aiQuestion.trim()} className="h-9 px-3.5 text-xs font-bold flex items-center gap-1">
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ask AI'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right 1 Column: Landlord / Management, Actions, Tenant details */}
        <div className="space-y-6">
          
          {/* Landlord / Management Card */}
          <Card className="p-6 border bg-card space-y-4">
            <div className="flex items-center space-x-2 border-b pb-2">
              <User className="w-4.5 h-4.5 text-primary shrink-0" />
              <h4 className="font-extrabold uppercase">Landlord & Management</h4>
            </div>

            <div className="space-y-4 text-xs">
              {owner.name && (
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase">Property Owner</span>
                  <p className="font-bold text-foreground text-sm">{owner.name}</p>
                  {owner.email && (
                    <div className="flex items-center space-x-1.5 text-muted-foreground mt-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{owner.email}</span>
                    </div>
                  )}
                  {owner.phone && (
                    <div className="flex items-center space-x-1.5 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{owner.phone}</span>
                    </div>
                  )}
                </div>
              )}

              {property.managementCompany && (
                <div className="space-y-1 pt-2 border-t">
                  <span className="text-[10px] text-muted-foreground uppercase">Management Company</span>
                  <p className="font-bold text-foreground text-sm">{property.managementCompany}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Tenant Profile (Self) Details */}
          <Card className="p-6 border bg-card space-y-4">
            <div className="flex items-center space-x-2 border-b pb-2">
              <User className="w-4.5 h-4.5 text-primary shrink-0" />
              <h4 className="font-extrabold uppercase">Tenant Profile</h4>
            </div>
            <div className="space-y-2 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase">Full Name</span>
                <p className="font-bold text-foreground">{lease.tenantName || `${tenant.firstName || ''} ${tenant.lastName || ''}`}</p>
              </div>
              {tenant.email && (
                <div className="flex items-center space-x-1.5 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{tenant.email}</span>
                </div>
              )}
              {tenant.phone && (
                <div className="flex items-center space-x-1.5 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{tenant.phone}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Lease Actions & Document downloads */}
          <Card className="p-6 border bg-card space-y-4">
            <div className="flex items-center space-x-2 border-b pb-2">
              <Award className="w-4.5 h-4.5 text-primary shrink-0" />
              <h4 className="font-extrabold uppercase">{t('tenantLease.actionsTitle')}</h4>
            </div>

            <div className="space-y-3">
              <Button 
                size="sm" 
                disabled={isDownloading}
                className="w-full text-[11px] font-extrabold uppercase flex items-center justify-center gap-1.5 h-auto py-2.5 px-3 leading-tight text-center break-words text-primary-foreground" 
                onClick={handleDownloadLeaseAgreement}
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <Download className="w-3.5 h-3.5 shrink-0" />
                )} 
                <span>{t('tenantLease.download')}</span>
              </Button>
              <Button size="sm" variant="outline" className="w-full text-[11px] font-extrabold uppercase flex items-center justify-center gap-1.5 h-auto py-2.5 px-3 leading-tight text-center break-words" onClick={() => alert('Contacting leasing office...')}>
                <Key className="w-3.5 h-3.5 shrink-0" /> <span>{t('tenantLease.requestRenewal')}</span>
              </Button>
            </div>
          </Card>

        </div>

      </div>

      <ConfirmDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        title={dialogTitle}
        description={dialogDescription}
        onConfirm={() => setDownloadDialogOpen(false)}
        confirmText="OK"
        cancelText="Close"
      />
    </div>
  );
};

export default TenantLeasePage;
