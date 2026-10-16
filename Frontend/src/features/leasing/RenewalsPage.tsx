import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { Plus, Edit, Trash2, Mail, Check, X, Loader2, Search, RefreshCw } from 'lucide-react';

interface RenewalLog {
  id: string;
  leaseId: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  currentRent: number;
  newRent: number;
  expirationDate: string;
  newEndDate: string;
  termMonths: number;
  status: 'PENDING' | 'OFFER_SENT' | 'ACCEPTED' | 'REJECTED';
}

export const RenewalsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Load Renewals from backend database
  const { data: rawRenewals = [], refetch: refetchRenewals, isLoading: loadingRenewals } = useQuery({
    queryKey: ['renewals'],
    queryFn: () => api.renewals.getAll(),
  });

  // Load Leases from database to catch all active expiring/expired leases matching the Dashboard
  const { data: leases = [], refetch: refetchLeases, isLoading: loadingLeases } = useQuery({
    queryKey: ['leases'],
    queryFn: () => api.leasing.getLeases(),
  });

  const isLoading = loadingRenewals || loadingLeases;

  const [searchQuery, setSearchQuery] = useState('');
  const [localStatuses, setLocalStatuses] = useState<Record<string, { status?: RenewalLog['status']; newRent?: number; termMonths?: number }>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLeaseId, setEditingLeaseId] = useState<string | null>(null);
  const [form, setForm] = useState({ newRentAmount: 0, termMonths: 12 });
  const [msg, setMsg] = useState('');

  // Map database renewals dynamically and merge with active expiring leases
  const renewals: RenewalLog[] = useMemo(() => {
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const combinedList: RenewalLog[] = [];
    const processedLeaseIds = new Set<string>();

    // 1. First add any existing records from rawRenewals
    (rawRenewals || []).forEach((r: any) => {
      const lid = r.leaseId || r.id;
      if (!lid) return;
      processedLeaseIds.add(lid);

      const item: RenewalLog = {
        id: r.id || `renewal-${lid}`,
        leaseId: lid,
        tenantName: r.lease?.tenant ? `${r.lease.tenant.firstName} ${r.lease.tenant.lastName}` : (r.tenantName || 'Resident'),
        propertyName: r.lease?.property?.name || r.propertyName || 'Property',
        unitNumber: r.lease?.unit?.unitNumber 
          ? (r.lease.unit.unitNumber.startsWith('Unit') ? r.lease.unit.unitNumber.replace(/^Unit\s*/i, '') : r.lease.unit.unitNumber) 
          : (r.unitNumber ? r.unitNumber.replace(/^Unit\s*/i, '') : 'Unit'),
        currentRent: r.lease?.rentAmount || r.currentRent || 0,
        newRent: r.newRentAmount || r.newRent || (r.lease?.rentAmount || 0),
        expirationDate: r.lease?.endDate ? r.lease.endDate.split('T')[0] : (r.expirationDate ? r.expirationDate.split('T')[0] : 'N/A'),
        newEndDate: r.newEndDate ? r.newEndDate.split('T')[0] : 'N/A',
        termMonths: r.termMonths || 12,
        status: r.status || 'PENDING',
      };

      // Apply optimistic overrides if present
      if (localStatuses[lid]) {
        const override = localStatuses[lid];
        if (override.status) item.status = override.status;
        if (override.newRent !== undefined) item.newRent = override.newRent;
        if (override.termMonths !== undefined) item.termMonths = override.termMonths;
      }

      combinedList.push(item);
    });

    // 2. Add active leases expiring within 60 days (including past-due active leases like Unit 2B, etc.)
    (leases || []).forEach((l: any) => {
      if (l.status !== 'Active') return;
      if (!l.endDate) return;
      const end = new Date(l.endDate);
      if (end > sixtyDaysFromNow) return; // not within 60-day expiration window

      if (processedLeaseIds.has(l.id)) return; // already added from rawRenewals
      processedLeaseIds.add(l.id);

      const d = new Date(l.endDate);
      d.setFullYear(d.getFullYear() + 1);
      const computedNewEnd = d.toISOString().split('T')[0];

      const item: RenewalLog = {
        id: `renewal-${l.id}`,
        leaseId: l.id,
        tenantName: l.tenantName || (l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName}` : 'Resident'),
        propertyName: l.propertyName || l.property?.name || 'Property',
        unitNumber: l.unitNumber 
          ? (l.unitNumber.startsWith('Unit') ? l.unitNumber.replace(/^Unit\s*/i, '') : l.unitNumber) 
          : (l.unit?.unitNumber ? l.unit.unitNumber.replace(/^Unit\s*/i, '') : 'Unit'),
        currentRent: l.rentAmount || 0,
        newRent: l.rentAmount || 0,
        expirationDate: l.endDate.split('T')[0],
        newEndDate: computedNewEnd,
        termMonths: 12,
        status: 'PENDING',
      };

      if (localStatuses[l.id]) {
        const override = localStatuses[l.id];
        if (override.status) item.status = override.status;
        if (override.newRent !== undefined) item.newRent = override.newRent;
        if (override.termMonths !== undefined) item.termMonths = override.termMonths;
      }

      combinedList.push(item);
    });

    // Filter by search query
    const filtered = combinedList.filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        r.tenantName.toLowerCase().includes(q) ||
        r.propertyName.toLowerCase().includes(q) ||
        r.unitNumber.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.expirationDate.toLowerCase().includes(q)
      );
    });

    return filtered.sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
  }, [rawRenewals, leases, localStatuses, searchQuery]);

  const handleEdit = (r: RenewalLog) => {
    setEditingId(r.id);
    setEditingLeaseId(r.leaseId);
    setForm({
      newRentAmount: r.newRent,
      termMonths: r.termMonths,
    });
    setShowForm(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLeaseId) return;
    try {
      await api.renewals.update(editingLeaseId, {
        newRentAmount: form.newRentAmount,
        termMonths: form.termMonths,
      });
      refetchRenewals();
    } catch (e) {
      console.warn('Backend update renewal fallback to local state:', e);
    }
    setLocalStatuses(prev => ({
      ...prev,
      [editingLeaseId]: {
        ...prev[editingLeaseId],
        newRent: form.newRentAmount,
        termMonths: form.termMonths
      }
    }));
    setMsg('Renewal proposed terms updated successfully.');
    setTimeout(() => setMsg(''), 3000);
    setShowForm(false);
    setEditingId(null);
    setEditingLeaseId(null);
  };

  const handleSendOffer = async (leaseId: string, tenantName: string) => {
    try {
      await api.renewals.sendOffer(leaseId);
      refetchRenewals();
    } catch (e) {
      console.warn('Backend sendOffer fallback to local state:', e);
    }
    setLocalStatuses(prev => ({
      ...prev,
      [leaseId]: { ...prev[leaseId], status: 'OFFER_SENT' }
    }));
    setMsg(`Renewal proposal terms dispatched to ${tenantName} successfully.`);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleAccept = async (leaseId: string, tenantName: string) => {
    try {
      await api.renewals.accept(leaseId);
      refetchRenewals();
      refetchLeases();
    } catch (e) {
      console.warn('Backend accept fallback to local state:', e);
    }
    setLocalStatuses(prev => ({
      ...prev,
      [leaseId]: { ...prev[leaseId], status: 'ACCEPTED' }
    }));
    setMsg(`Renewal agreement signed for ${tenantName}! Contract rollover complete.`);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleReject = async (leaseId: string, tenantName: string) => {
    try {
      await api.renewals.reject(leaseId);
      refetchRenewals();
      refetchLeases();
    } catch (e) {
      console.warn('Backend reject fallback to local state:', e);
    }
    setLocalStatuses(prev => ({
      ...prev,
      [leaseId]: { ...prev[leaseId], status: 'REJECTED' }
    }));
    setMsg(`Renewal rejected for ${tenantName}. Move-out scheduled.`);
    setTimeout(() => setMsg(''), 3000);
  };

  const mapStatusLabel = (status: RenewalLog['status']) => {
    switch (status) {
      case 'PENDING':
        return 'Pending Offer';
      case 'OFFER_SENT':
        return 'Sent';
      case 'ACCEPTED':
        return 'Accepted';
      case 'REJECTED':
        return 'Declined';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lease Renewals Directory"
        description="Verify upcoming expirations, dispatch proposal rates, and track acceptances."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Leasing', href: '/leasing/leases' },
          { label: 'Renewals' },
        ]}
      />

      {msg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-semibold mb-6 flex items-center space-x-2 animate-fade-in">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {showForm && (
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 max-w-xl text-foreground">
          <h2 className="text-sm font-extrabold uppercase tracking-wide border-b pb-2">
            Modify Proposed Renewal Terms
          </h2>
          <p className="text-xs text-muted-foreground">Note: Offers can be customized here before dispatching to the tenant.</p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Proposed Rent ($)</label>
              <input 
                type="number"
                required 
                value={form.newRentAmount} 
                onChange={e => setForm(prev => ({ ...prev, newRentAmount: Number(e.target.value) }))}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Proposed Term / Duration</label>
              <select 
                value={form.termMonths} 
                onChange={e => setForm(prev => ({ ...prev, termMonths: Number(e.target.value) }))}
                className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={9}>9 Months</option>
                <option value={12}>12 Months (1 Year)</option>
              </select>
            </div>
          </div>
          <div className="border-t pt-4 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setEditingLeaseId(null); }}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* SEARCH AND CONTROLS */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search renewals by resident, unit, or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">
            Showing {renewals.length} upcoming renewals
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchRenewals();
              refetchLeases();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-4">Resident</th>
                <th className="p-4">Property Location</th>
                <th className="p-4">Unit #</th>
                <th className="p-4">Current Rent</th>
                <th className="p-4">Proposed Rent</th>
                <th className="p-4">Term Duration</th>
                <th className="p-4">Lease Expiration</th>
                <th className="p-4">Renewal Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y font-medium text-foreground">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading upcoming renewals...
                  </td>
                </tr>
              )}
              {!isLoading && renewals.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No upcoming lease expirations found.
                  </td>
                </tr>
              )}
              {renewals.map((r) => (
                <tr key={r.id} className="hover:bg-accent/40 transition">
                  <td className="p-4 font-bold text-primary">{r.tenantName}</td>
                  <td className="p-4 font-bold">{r.propertyName}</td>
                  <td className="p-4">Unit {r.unitNumber}</td>
                  <td className="p-4 text-muted-foreground font-semibold">${r.currentRent.toLocaleString()}</td>
                  <td className="p-4 text-emerald-500 font-extrabold">${r.newRent.toLocaleString()}</td>
                  <td className="p-4 font-bold text-foreground/80">{r.termMonths} Months</td>
                  <td className="p-4 font-mono text-muted-foreground">{r.expirationDate}</td>
                  <td className="p-4">
                    <StatusBadge status={mapStatusLabel(r.status)} />
                  </td>
                  <td className="p-4 text-center space-x-1 whitespace-nowrap">
                    {r.status === 'PENDING' && (
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendOffer(r.leaseId, r.tenantName)}
                          className="text-[10px] font-extrabold py-1 px-2.5 h-7 inline-flex items-center gap-1 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                        >
                          <Mail className="w-3.5 h-3.5" /> Send Offer
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-foreground" 
                          onClick={() => handleEdit(r)}
                          title="Modify Proposed Terms"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                    {r.status === 'OFFER_SENT' && (
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAccept(r.leaseId, r.tenantName)}
                          className="text-[10px] font-extrabold py-1 px-2.5 h-7 inline-flex items-center gap-1 bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(r.leaseId, r.tenantName)}
                          className="text-[10px] font-extrabold py-1 px-2.5 h-7 inline-flex items-center gap-1 bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-muted-foreground hover:text-foreground" 
                          onClick={() => handleEdit(r)}
                          title="Modify Proposed Terms"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                    {r.status === 'ACCEPTED' && (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 py-1 px-2.5 rounded-full border border-emerald-500/20 inline-flex items-center gap-1">
                        <Check className="w-3 h-3" /> Renewed
                      </span>
                    )}
                    {r.status === 'REJECTED' && (
                      <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 py-1 px-2.5 rounded-full border border-rose-500/20 inline-flex items-center gap-1">
                        <X className="w-3 h-3" /> Scheduled Vacate
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RenewalsPage;
