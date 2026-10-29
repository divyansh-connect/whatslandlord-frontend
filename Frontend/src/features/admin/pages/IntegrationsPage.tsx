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
  
  // Test Connection States
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch real integrations from backend
  const { data: dbIntegrations = [], isLoading } = useQuery<IntegrationItem[]>({
    queryKey: ['integrations-marketplace-list'],
    queryFn: () => api.integrations.getAll(),
  });

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
    ? dbIntegrations
    : dbIntegrations.filter((i) => i.category === activeCategory);

  const openConfigModal = (integration: IntegrationItem) => {
    setSelectedIntegration(integration);
    setAccountSidValue(integration.accountSid || '');
    setSenderIdValue(integration.senderId || '');
    setAuthTokenValue(integration.hasToken ? '******' : '');
    setEnableStatus(integration.status || 'Inactive');
    setShowAuthToken(false);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!selectedIntegration?.provider) return;
    const isPayment = ['STRIPE', 'AUTHORIZE_NET', 'RAZORPAY'].includes(selectedIntegration.provider);
    if (!accountSidValue || (!isPayment && !senderIdValue) || !authTokenValue) {
      setTestResult({ success: false, message: 'Please fill in all credentials before testing.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.integrations.test(selectedIntegration.provider, {
        accountSid: accountSidValue,
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

  const handleSave = () => {
    if (!selectedIntegration?.provider) return;
    const isPayment = ['STRIPE', 'AUTHORIZE_NET', 'RAZORPAY'].includes(selectedIntegration.provider);
    if (!accountSidValue || (!isPayment && !senderIdValue)) {
      alert(isPayment ? 'Key / ID is required.' : 'Account ID and Sender ID are required.');
      return;
    }

    saveMutation.mutate({
      provider: selectedIntegration.provider,
      accountSid: accountSidValue,
      senderId: isPayment ? 'N/A' : (senderIdValue || 'N/A'),
      authToken: authTokenValue,
      status: enableStatus,
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
              <div className="flex justify-between items-center bg-secondary/30 p-3 rounded-xl border border-border/55">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Enable Integration</span>
                <select
                  value={enableStatus}
                  onChange={(e) => setEnableStatus(e.target.value)}
                  className="bg-card border border-border text-foreground text-xs font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer focus:border-primary"
                >
                  <option value="Active">Active (Connected)</option>
                  <option value="Inactive">Inactive (Disabled)</option>
                </select>
              </div>

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
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Twilio Sender Number / Service SID</label>
                      <Input 
                        placeholder="e.g. +1415XXXXXXX or MGXXXXXXXXXXXXXXXX" 
                        value={senderIdValue}
                        onChange={(e) => setSenderIdValue(e.target.value)}
                        autoComplete="off"
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
                          className="pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">WhatsApp Business Account ID</label>
                      <Input 
                        placeholder="e.g. 294829583028385" 
                        value={senderIdValue}
                        onChange={(e) => setSenderIdValue(e.target.value)}
                        autoComplete="off"
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
                          className="pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                          className="pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                          className="pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                          className="pr-10"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAuthToken(!showAuthToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showAuthToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
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
            <div className="p-6 border-t border-border/80 bg-secondary/15 flex justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="text-xs font-bold h-9 hover:bg-secondary/40"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Testing API...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-primary" />
                    Test Connection
                  </>
                )}
              </Button>

              <div className="flex gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIntegration(null)}
                  className="text-xs font-semibold h-9"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="text-xs font-semibold h-9"
                >
                  {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                  Save Credentials
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsPage;
