import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { PageHeader } from '../../../components/PageHeader';
import { IntegrationCard } from '../components/IntegrationCard';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface IntegrationItem {
  id: string;
  name: string;
  provider?: string;
  category: string;
  description: string;
  status: string;
  logo: string;
  accountSid?: string;
  senderId?: string;
  hasToken?: boolean;
}

export const IntegrationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Modal states
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null);
  const [showAuthToken, setShowAuthToken] = useState(false);
  const [authTokenValue, setAuthTokenValue] = useState('');
  const [accountSidValue, setAccountSidValue] = useState('');
  const [senderIdValue, setSenderIdValue] = useState('');
  const [enableStatus, setEnableStatus] = useState('Inactive');
  const [isEditing, setIsEditing] = useState(false);
  
  // Test Connection States
  const [isTesting, setIsTesting] = useState(false);
  const [isVerifyingAndSaving, setIsVerifyingAndSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch real integrations from backend
  const { data: dbIntegrations = [], isLoading } = useQuery<IntegrationItem[]>({
    queryKey: ['integrations-marketplace-list'],
    queryFn: () => api.integrations.getAll(),
  });

  const mergedIntegrations = React.useMemo(() => {
    const DEFAULT_LIST: IntegrationItem[] = [
      {
        id: 'int-twilio',
        name: 'Twilio SMS',
        provider: 'TWILIO',
        category: 'Communications',
        description: 'Configure Twilio to send tenant notices, announcements, and booking alerts via SMS.',
        logo: '💬',
        status: 'Inactive',
        accountSid: '',
        senderId: '',
        hasToken: false,
      },
      {
        id: 'int-whatsapp',
        name: 'WhatsApp Business (Meta API)',
        provider: 'WHATSAPP',
        category: 'Communications',
        description: 'Configure Meta Cloud API to broadcast automated messages directly to tenant WhatsApp accounts.',
        logo: '📱',
        status: 'Inactive',
        accountSid: '',
        senderId: '',
        hasToken: false,
      },
      {
        id: 'int-sendgrid',
        name: 'Twilio SendGrid (Email)',
        provider: 'SENDGRID',
        category: 'Communications',
        description: 'Connect Twilio SendGrid to dispatch automated emails for tenant registrations, leases, and invoices.',
        logo: '📧',
        status: 'Inactive',
        accountSid: '',
        senderId: '',
        hasToken: false,
      },
      {
        id: 'int-stripe',
        name: 'Stripe Payments',
        provider: 'STRIPE',
        category: 'Payments',
        description: 'Connect Stripe to accept credit cards, debit cards, and Apple Pay from tenants directly.',
        logo: '💳',
        status: 'Inactive',
        accountSid: '',
        senderId: '',
        hasToken: false,
      },
      {
        id: 'int-authorizenet',
        name: 'Authorize.Net Merchant',
        provider: 'AUTHORIZE_NET',
        category: 'Payments',
        description: 'Configure Authorize.Net to process credit cards and electronic checks (eChecks) safely.',
        logo: '🔒',
        status: 'Inactive',
        accountSid: '',
        senderId: '',
        hasToken: false,
      },
      {
        id: 'int-razorpay',
        name: 'Razorpay Gateway',
        provider: 'RAZORPAY',
        category: 'Payments',
        description: 'Integrate Razorpay to accept UPI, netbanking, credit cards, and wallets from international/local tenants.',
        logo: '⚡',
        status: 'Inactive',
        accountSid: '',
        senderId: '',
        hasToken: false,
      },
    ];

    const list = Array.isArray(dbIntegrations) && dbIntegrations.length > 0 ? [...dbIntegrations] : DEFAULT_LIST;
    if (!list.some((i) => i.provider === 'SENDGRID')) {
      const commIdx = list.findIndex((i) => i.provider === 'WHATSAPP');
      const insertAt = commIdx !== -1 ? commIdx + 1 : 2;
      list.splice(insertAt, 0, {
        id: 'int-sendgrid',
        name: 'Twilio SendGrid (Email)',
        provider: 'SENDGRID',
        category: 'Communications',
        description: 'Connect Twilio SendGrid to dispatch automated emails for tenant registrations, leases, and invoices.',
        logo: '📧',
        status: 'Inactive',
        accountSid: '',
        senderId: '',
        hasToken: false,
      });
    }
    return list;
  }, [dbIntegrations]);

  const saveMutation = useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations-marketplace-list'] });
      setSelectedIntegration(null);
      setTestResult(null);
    },
    mutationFn: (data: { provider: string; accountSid: string; senderId: string; authToken?: string; status: string }) =>
      api.integrations.save(data.provider, data),
  });

  const filtered = activeCategory === 'All'
    ? mergedIntegrations
    : mergedIntegrations.filter((i) => i.category === activeCategory);

  const openConfigModal = (integration: IntegrationItem) => {
    const isConn = integration.status === 'Active' || integration.status === 'Connected';
    setSelectedIntegration(integration);
    setAccountSidValue(integration.accountSid || '');
    setSenderIdValue(integration.senderId || '');
    setAuthTokenValue(integration.hasToken ? '******' : '');
    setEnableStatus(integration.status || 'Inactive');
    setShowAuthToken(false);
    setTestResult(null);
    setIsEditing(!isConn);
  };

  const handleTestConnection = async () => {
    if (!selectedIntegration?.provider) return;
    const isPayment = ['STRIPE', 'AUTHORIZE_NET', 'RAZORPAY'].includes(selectedIntegration.provider);
    if (selectedIntegration.provider === 'SENDGRID') {
      if (!senderIdValue || !authTokenValue) {
        setTestResult({ success: false, message: 'Please provide both Sender Email and SendGrid API Key before testing.' });
        return;
      }
    } else if (!accountSidValue || (!isPayment && !senderIdValue) || !authTokenValue) {
      setTestResult({ success: false, message: 'Please fill in all credentials before testing.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.integrations.test(selectedIntegration.provider, {
        accountSid: accountSidValue || 'Property Management',
        senderId: isPayment ? 'N/A' : senderIdValue,
        authToken: authTokenValue,
      });
      setTestResult({ success: true, message: res.message || 'Connection successful!' });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Verification failed. Please check credentials.';
      setTestResult({ success: false, message: errMsg });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAutoVerifyAndSave = async () => {
    if (!selectedIntegration?.provider) return;
    const isPayment = ['STRIPE', 'AUTHORIZE_NET', 'RAZORPAY'].includes(selectedIntegration.provider);

    // Validate inputs
    if (selectedIntegration.provider === 'SENDGRID') {
      if (!senderIdValue || !authTokenValue) {
        setTestResult({ success: false, message: 'Verified Sender Email and SendGrid API Key are required.' });
        return;
      }
    } else if (!accountSidValue || (!isPayment && !senderIdValue) || !authTokenValue) {
      setTestResult({ success: false, message: 'Please fill in all required credentials.' });
      return;
    }

    setIsVerifyingAndSaving(true);
    setTestResult(null);

    try {
      // Step 1: Live verify with third party provider API
      await api.integrations.test(selectedIntegration.provider, {
        accountSid: accountSidValue || 'Property Management',
        senderId: isPayment ? 'N/A' : senderIdValue,
        authToken: authTokenValue,
      });

      // Step 2: Verification passed -> Auto set status to Active
      setTestResult({ success: true, message: 'Verification successful! Activating integration...' });
      
      saveMutation.mutate({
        provider: selectedIntegration.provider,
        accountSid: accountSidValue || 'Property Management',
        senderId: isPayment ? 'N/A' : (senderIdValue || 'N/A'),
        authToken: authTokenValue,
        status: 'Active',
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Authentication failed. Please verify credentials.';
      setTestResult({ success: false, message: errMsg });
    } finally {
      setIsVerifyingAndSaving(false);
    }
  };

  const handleDisconnect = () => {
    if (!selectedIntegration?.provider) return;
    if (!confirm(`Are you sure you want to disconnect ${selectedIntegration.name}?`)) return;

    saveMutation.mutate({
      provider: selectedIntegration.provider,
      accountSid: accountSidValue || 'Property Management',
      senderId: senderIdValue || 'N/A',
      authToken: '******',
      status: 'Inactive',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations Marketplace"
        description="Connect third party applications including payments processors, cloud databases, CRM utilities, and accounting frameworks."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Admin' }, { label: 'Integrations' }]}
      />

      {/* Category Tabs */}
      <div className="flex space-x-2 border-b border-border pb-2 overflow-x-auto">
        {['All', 'Communications', 'Payments'].map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className="font-semibold whitespace-nowrap"
          >
            {cat}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-8 h-8 text-primary animate-spin mr-2" />
          Loading integrations...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <IntegrationCard
              key={item.id}
              logo={item.logo}
              name={item.name}
              category={item.category}
              description={item.description}
              status={item.status === 'Active' ? 'Connected' : item.status}
              onToggle={() => openConfigModal(item)}
            />
          ))}
        </div>
      )}

      {/* Configuration Modal */}
      {selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden text-foreground">
            {/* Header */}
            <div className="p-6 border-b border-border/80 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{selectedIntegration.logo}</span>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">{selectedIntegration.name} Settings</h3>
                  <p className="text-xs text-muted-foreground font-medium">Configure credentials and sync status.</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedIntegration(null)}
                className="text-muted-foreground hover:text-foreground font-semibold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Status Banner */}
              <div className="flex justify-between items-center bg-secondary/30 p-3.5 rounded-xl border border-border/55">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Integration Status</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedIntegration.status === 'Active'
                      ? 'Credentials are saved, verified and service is live.'
                      : 'Inactive. Enter credentials and click Connect to verify.'}
                  </p>
                </div>
                {selectedIntegration.status === 'Active' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Connected & Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-secondary text-muted-foreground border border-border">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                    Inactive (Disconnected)
                  </span>
                )}
              </div>

              {selectedIntegration.status === 'Active' && !isEditing && (
                <div className="p-3 bg-muted/20 border border-border/60 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Inputs are locked to protect saved credentials.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="h-7 text-xs font-bold text-primary hover:bg-primary/10"
                  >
                    Edit Credentials
                  </Button>
                </div>
              )}

              {/* Form Input fields dynamically loaded per provider */}
              <div className="space-y-4">
                <input type="text" style={{ display: 'none' }} />
                <input type="password" style={{ display: 'none' }} />

                {selectedIntegration.provider === 'TWILIO' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Twilio Account SID</label>
                      <Input 
                        placeholder="e.g. ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" 
                        value={accountSidValue}
                        onChange={(e) => setAccountSidValue(e.target.value)}
                        autoComplete="off"
                        disabled={selectedIntegration.status === 'Active' && !isEditing}
                        className={selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Twilio Sender Number / Service SID</label>
                      <Input 
                        placeholder="e.g. +1415XXXXXXX or MGXXXXXXXXXXXXXXXX" 
                        value={senderIdValue}
                        onChange={(e) => setSenderIdValue(e.target.value)}
                        autoComplete="off"
                        disabled={selectedIntegration.status === 'Active' && !isEditing}
                        className={selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Twilio Auth Token</label>
                      <div className="relative">
                        <Input 
                          type={showAuthToken ? 'text' : 'password'}
                          disableTogglePassword
                          placeholder="Twilio Auth Token Secret"
                          value={authTokenValue}
                          onChange={(e) => setAuthTokenValue(e.target.value)}
                          className={`pr-10 ${selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}`}
                          autoComplete="new-password"
                          disabled={selectedIntegration.status === 'Active' && !isEditing}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          disabled={selectedIntegration.status === 'Active' && !isEditing}
                        >
                          {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {selectedIntegration.provider === 'WHATSAPP' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">WhatsApp Phone Number ID</label>
                      <Input 
                        placeholder="e.g. 104838592019485" 
                        value={accountSidValue}
                        onChange={(e) => setAccountSidValue(e.target.value)}
                        autoComplete="off"
                        disabled={selectedIntegration.status === 'Active' && !isEditing}
                        className={selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">WhatsApp Business Account ID</label>
                      <Input 
                        placeholder="e.g. 294829583028385" 
                        value={senderIdValue}
                        onChange={(e) => setSenderIdValue(e.target.value)}
                        autoComplete="off"
                        disabled={selectedIntegration.status === 'Active' && !isEditing}
                        className={selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">System User Access Token</label>
                      <div className="relative">
                        <Input 
                          type={showAuthToken ? 'text' : 'password'}
                          disableTogglePassword
                          placeholder="EAABw..." 
                          value={authTokenValue}
                          onChange={(e) => setAuthTokenValue(e.target.value)}
                          className={`pr-10 ${selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}`}
                          autoComplete="new-password"
                          disabled={selectedIntegration.status === 'Active' && !isEditing}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          disabled={selectedIntegration.status === 'Active' && !isEditing}
                        >
                          {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {selectedIntegration.provider === 'STRIPE' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Stripe Publishable Key</label>
                      <Input 
                        placeholder="e.g. pk_live_..." 
                        value={accountSidValue}
                        onChange={(e) => setAccountSidValue(e.target.value)}
                        autoComplete="off"
                        disabled={selectedIntegration.status === 'Active' && !isEditing}
                        className={selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Stripe Secret Key</label>
                      <div className="relative">
                        <Input 
                          type={showAuthToken ? 'text' : 'password'}
                          disableTogglePassword
                          placeholder="e.g. sk_live_..." 
                          value={authTokenValue}
                          onChange={(e) => setAuthTokenValue(e.target.value)}
                          className={`pr-10 ${selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}`}
                          autoComplete="new-password"
                          disabled={selectedIntegration.status === 'Active' && !isEditing}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          disabled={selectedIntegration.status === 'Active' && !isEditing}
                        >
                          {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {selectedIntegration.provider === 'AUTHORIZE_NET' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">API Login ID</label>
                      <Input 
                        placeholder="e.g. 5Ad2G98f..." 
                        value={accountSidValue}
                        onChange={(e) => setAccountSidValue(e.target.value)}
                        autoComplete="off"
                        disabled={selectedIntegration.status === 'Active' && !isEditing}
                        className={selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Transaction Key</label>
                      <div className="relative">
                        <Input 
                          type={showAuthToken ? 'text' : 'password'}
                          disableTogglePassword
                          placeholder="Authorize.Net Transaction Key" 
                          value={authTokenValue}
                          onChange={(e) => setAuthTokenValue(e.target.value)}
                          className={`pr-10 ${selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}`}
                          autoComplete="new-password"
                          disabled={selectedIntegration.status === 'Active' && !isEditing}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          disabled={selectedIntegration.status === 'Active' && !isEditing}
                        >
                          {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {selectedIntegration.provider === 'RAZORPAY' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Razorpay Key ID</label>
                      <Input 
                        placeholder="e.g. rzp_live_..." 
                        value={accountSidValue}
                        onChange={(e) => setAccountSidValue(e.target.value)}
                        autoComplete="off"
                        disabled={selectedIntegration.status === 'Active' && !isEditing}
                        className={selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Razorpay Key Secret</label>
                      <div className="relative">
                        <Input 
                          type={showAuthToken ? 'text' : 'password'}
                          disableTogglePassword
                          placeholder="Razorpay Key Secret" 
                          value={authTokenValue}
                          onChange={(e) => setAuthTokenValue(e.target.value)}
                          className={`pr-10 ${selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}`}
                          autoComplete="new-password"
                          disabled={selectedIntegration.status === 'Active' && !isEditing}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          disabled={selectedIntegration.status === 'Active' && !isEditing}
                        >
                          {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {selectedIntegration.provider === 'SENDGRID' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Sender From Name</label>
                      <Input 
                        placeholder="e.g. Property Management" 
                        value={accountSidValue}
                        onChange={(e) => setAccountSidValue(e.target.value)}
                        autoComplete="off"
                        disabled={selectedIntegration.status === 'Active' && !isEditing}
                        className={selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}
                      />
                      <p className="text-[11px] text-muted-foreground">The display name shown to tenants in their email inboxes.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Sender From Email (Verified in SendGrid) *</label>
                      <Input 
                        type="email"
                        placeholder="e.g. notifications@yourdomain.com" 
                        value={senderIdValue}
                        onChange={(e) => setSenderIdValue(e.target.value)}
                        autoComplete="off"
                        disabled={selectedIntegration.status === 'Active' && !isEditing}
                        className={selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}
                      />
                      <p className="text-[11px] text-muted-foreground">Must be a verified single sender or authenticated domain in SendGrid.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">SendGrid API Key *</label>
                      <div className="relative">
                        <Input 
                          type={showAuthToken ? 'text' : 'password'}
                          disableTogglePassword
                          placeholder="e.g. SG.xxxxxxxxxxxxxxxxxxxx" 
                          value={authTokenValue}
                          onChange={(e) => setAuthTokenValue(e.target.value)}
                          className={`pr-10 ${selectedIntegration.status === 'Active' && !isEditing ? 'bg-muted/40 cursor-not-allowed opacity-75' : ''}`}
                          autoComplete="new-password"
                          disabled={selectedIntegration.status === 'Active' && !isEditing}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          disabled={selectedIntegration.status === 'Active' && !isEditing}
                        >
                          {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">SendGrid API key with 'Mail Send' or Full Access permissions.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Live Test connection result box */}
              {testResult && (
                <div className={`p-4 rounded-xl border flex items-start space-x-3 text-xs leading-relaxed ${
                  testResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                  )}
                  <div>
                    <span className="font-bold">{testResult.success ? 'Success' : 'Validation Error'}</span>
                    <p className="mt-0.5">{testResult.message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border/80 bg-secondary/15 flex justify-between gap-3 items-center">
              {selectedIntegration.status === 'Active' && !isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={saveMutation.isPending}
                    className="text-xs font-bold h-9 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20"
                  >
                    Disconnect
                  </Button>
                  <div className="flex gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedIntegration(null)}
                      className="text-xs font-semibold h-9"
                    >
                      Close
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-semibold h-9"
                    >
                      Edit Credentials
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex justify-end gap-2.5 w-full">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedIntegration.status === 'Active') {
                        setIsEditing(false);
                      } else {
                        setSelectedIntegration(null);
                      }
                    }}
                    className="text-xs font-semibold h-9"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAutoVerifyAndSave}
                    disabled={isVerifyingAndSaving || saveMutation.isPending}
                    className="text-xs font-semibold h-9"
                  >
                    {isVerifyingAndSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Verifying & Connecting...
                      </>
                    ) : (
                      'Save & Connect'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsPage;
