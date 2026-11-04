import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { TenantAvatar } from '../../components/TenantAvatar';
import { DocumentUploader } from '../../components/DocumentUploader';
import { CommunicationPanel } from '../../components/CommunicationPanel';
import { QuickChatDrawer } from '../../components/chat/QuickChatDrawer';
import { Timeline, TimelineEvent } from '../../components/Timeline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { ColumnDef } from '@tanstack/react-table';
import { 
  User, Building, ShieldCheck, Mail, Phone, Calendar, Landmark,
  DollarSign, Wrench, CreditCard, Sparkles, FileText, ArrowLeft, Loader2, Check, Printer, MessageSquare 
} from 'lucide-react';

export const TenantDetailsPage: React.FC = () => {
  const { id } = useParams({ from: '/tenants/$id' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Queries
  const { data: tenant, isLoading: loadingTenant } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => api.tenant.getById(id),
  });

  const { data: allLeases = [] } = useQuery({ queryKey: ['leases'], queryFn: () => api.leasing.getLeases() });
  const { data: allPayments = [] } = useQuery({ queryKey: ['payments'], queryFn: () => api.rent.getAll() });
  const { data: allMaint = [] } = useQuery({ queryKey: ['maintenance-tickets'], queryFn: () => api.maintenance.getAll() });
  const { data: allDocs = [], refetch: refetchDocs } = useQuery({ queryKey: ['documents'], queryFn: () => api.document.getAll() });
  const { data: allProperties = [] } = useQuery({ queryKey: ['properties'], queryFn: () => api.property.getAll() });
  const { data: profile } = useQuery({ queryKey: ['user-profile'], queryFn: () => api.userProfile.get() });

  // Filtered/Associated items
  const lease = allLeases.find((l) => l.tenantId === id);
  const payments = allPayments.filter((p) => {
    if (!tenant) return false;
    if (tenant.unitId && p.unitId === tenant.unitId) return true;
    if (p.tenantId && p.tenantId === tenant.id) return true;
    if (!tenant.unitId && !p.unitId && p.tenantName === `${tenant.firstName} ${tenant.lastName}`) return true;
    return false;
  });
  const maintenance = allMaint.filter((m) => m.unitId === tenant?.unitId);
  const docs = allDocs.filter((d) => d.propertyId === tenant?.propertyId).map((d) => ({
    id: d.id,
    name: d.name,
    size: '180 KB',
    uploadedAt: d.uploadedAt || '2026-07-01',
    uploadedBy: 'Manager',
  }));

  const ledgerEntries = React.useMemo(() => {
    if (!payments || !payments.length) return [];
    const entries: Array<{
      date: string;
      desc: string;
      ref: string;
      debit: number;
      credit: number;
      balance: number;
    }> = [];

    // Sort payments by due date ascending
    const sortedPayments = [...payments].sort((a, b) => {
      const dateA = a.dueDate || '';
      const dateB = b.dueDate || '';
      return dateA.localeCompare(dateB);
    });

    let runningBalance = 0;

    sortedPayments.forEach((p) => {
      // 1. Charge Entry
      runningBalance += p.amount;
      entries.push({
        date: p.dueDate || '',
        desc: 'Rent Charge Assessment',
        ref: p.id ? p.id.replace('pay-', 'CHG-') : 'CHG-UNK',
        debit: p.amount,
        credit: 0,
        balance: runningBalance
      });

      // 2. Payment Entry (if Paid)
      if (p.status === 'Paid' && p.paidDate) {
        runningBalance -= p.amount;
        entries.push({
          date: p.paidDate || '',
          desc: `ACH Payment - Received (${p.paymentMethod || 'Bank'})`,
          ref: p.referenceNumber || (p.id ? p.id.replace('pay-', 'TXN-') : 'TXN-UNK'),
          debit: 0,
          credit: p.amount,
          balance: runningBalance
        });
      }
    });

    return entries.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateA.localeCompare(dateB);
    });
  }, [payments]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      api.document.create({
        name: file.name,
        type: 'ID',
        propertyId: tenant?.propertyId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  if (loadingTenant || !tenant) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Derived Balance / Details
  const balanceDue = (tenant.invoices || []).reduce((sum, inv) => {
    const invBal = (inv.status === 'Paid' || inv.status === 'PAID') ? 0 : (inv.balance !== undefined ? inv.balance : inv.amount);
    return sum + Number(invBal || 0);
  }, 0) + Number(tenant.previousBalance || tenant.openingBalance || 0);
  const hasBalance = balanceDue > 0;
  const monthlyRent = lease ? lease.rentAmount : 1400;

  const property = allProperties.find((p) => p.id === tenant?.propertyId);
  const propertyAddress = property ? property.address : (tenant?.propertyName ? `${tenant.propertyName}, Austin, TX` : 'N/A');
  const managementCompany = 
    (property?.managementCompany && !property.managementCompany.includes('Apex'))
      ? property.managementCompany
      : (profile?.company && !profile.company.includes('Apex'))
        ? profile.company
        : (profile?.company || (tenant as any)?.companyName || property?.managementCompany || 'Property Management');

  // Timeline events mock
  const timelineEvents: TimelineEvent[] = [
    { id: '1', title: 'Resident Move-In Completed', description: `Checked keys and signed checklists for unit ${tenant.unitNumber || '201'}`, time: '2026-05-15', by: 'Manager', icon: <Check className="w-4 h-4 text-emerald-500" /> },
    { id: '2', title: 'Lease Agreement Executed', description: `Lease contract bound to ${tenant.firstName} ${tenant.lastName}`, time: '2026-05-12', by: 'Leasing Agent', icon: <ShieldCheck className="w-4 h-4 text-primary" /> },
    { id: '3', title: 'Background Screening Approved', description: 'Credit score 740. Criminal and eviction check cleared.', time: '2026-05-10', by: 'Screening Service' },
    { id: '4', title: 'Application Submitted', description: 'Online registration complete.', time: '2026-05-08' },
  ];

  // Column definitions
  const payColumns: ColumnDef<any>[] = [
    { accessorKey: 'dueDate', header: 'Due Date', id: 'dueDate' },
    { accessorKey: 'amount', header: 'Rent Amount', id: 'amount', cell: ({ row }) => <span>${row.original.amount.toLocaleString()}</span> },
    { accessorKey: 'paidDate', header: 'Payment Date', id: 'paidDate', cell: ({ row }) => row.original.paidDate || '-' },
    { accessorKey: 'status', header: 'Status', id: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];

  const maintColumns: ColumnDef<any>[] = [
    { accessorKey: 'createdAt', header: 'Opened Date', id: 'createdAt' },
    { accessorKey: 'title', header: 'Service Request', id: 'title', cell: ({ row }) => <span className="font-bold">{row.original.title}</span> },
    { accessorKey: 'priority', header: 'Priority', id: 'priority', cell: ({ row }) => <StatusBadge status={row.original.priority} /> },
    { accessorKey: 'status', header: 'Status', id: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/tenants' })}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm font-semibold text-muted-foreground">Back to Tenant Directory</span>
      </div>

      {/* HEADER BLOCK */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 pb-6 border-b">
        <div className="flex items-center space-x-4">
          <TenantAvatar name={`${tenant.firstName} ${tenant.lastName}`} size="lg" />
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-extrabold tracking-tight">{tenant.firstName} {tenant.lastName}</h1>
              <StatusBadge status={tenant.status} />
            </div>
            <p className="text-sm text-muted-foreground font-semibold flex items-center gap-1">
              <Building className="w-4 h-4 text-primary" />
              {tenant.propertyName ? `${tenant.propertyName} • Unit ${tenant.unitNumber}` : 'Unassigned Portfolio Resident'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" onClick={() => setIsChatOpen(true)} className="flex items-center gap-1.5 font-bold">
            <MessageSquare className="w-4 h-4" /> Direct Chat
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: `/tenants/${tenant.id}/edit` })}>
            Edit Profile
          </Button>
          <Button size="sm" onClick={() => navigate({ to: '/leasing/leases' })} className="flex items-center gap-1">
            Renew Lease
          </Button>
        </div>
      </div>

      {/* METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 flex items-center space-x-3 border-border">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Current Balance</p>
            <p className={`text-xl font-extrabold ${balanceDue > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              ${balanceDue.toLocaleString()}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-3 border-border">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Lease Status</p>
            <p className="text-sm font-extrabold">{lease ? lease.status : 'No Contract'}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-3 border-border">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Monthly Rent</p>
            <p className="text-xl font-extrabold">${monthlyRent.toLocaleString()}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-3 border-border">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Security Deposit</p>
            <p className="text-xl font-extrabold">${(monthlyRent * 1.2).toLocaleString()}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-3 border-border">
          <div className="p-3 bg-secondary/80 text-muted-foreground rounded-xl">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Open Requests</p>
            <p className="text-xl font-extrabold">{maintenance.length}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TABS CONTAINER */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="lease">Lease</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="communication">CRM Dialog</TabsTrigger>
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6">
              <Card className="p-5 space-y-4 border-border">
                <h3 className="font-bold text-base border-b pb-2 uppercase tracking-wide">Personal Coordinates</h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <p className="text-muted-foreground">Email Channels</p>
                    <p className="text-foreground mt-0.5 flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-primary" /> {tenant.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mobile Phone</p>
                    <p className="text-foreground mt-0.5 flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-primary" /> {tenant.phone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Government SSN ID</p>
                    <p className="text-foreground mt-0.5">***-**-6543</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Birthdate Coordinates</p>
                    <p className="text-foreground mt-0.5">Oct 12, 1992</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 space-y-4 border-border">
                <h3 className="font-bold text-base border-b pb-2 uppercase tracking-wide">Employment Status</h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <p className="text-muted-foreground">Employer / Position</p>
                    <p className="text-foreground mt-0.5">TechCorp Inc. / Senior Developer</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stipulated Income</p>
                    <p className="text-foreground mt-0.5">$6,800 / mo</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* LEASE TAB */}
            <TabsContent value="lease">
              {lease ? (
                <Card className="p-5 space-y-4 border-border">
                  <h3 className="font-bold text-base border-b pb-2 uppercase tracking-wide">Lease Coordinates</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                    <div>
                      <p className="text-muted-foreground">Lease Agreement ID</p>
                      <p className="text-foreground mt-0.5">{lease.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rental Term Range</p>
                      <p className="text-foreground mt-0.5">{(lease.startDate || '').split('T')[0]} to {(lease.endDate || '').split('T')[0]}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monthly Rent Amount</p>
                      <p className="text-foreground mt-0.5">${lease.rentAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lease Contract Status</p>
                      <p className="text-foreground mt-0.5">{lease.status}</p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="p-8 text-center border-border">
                  <p className="text-sm font-semibold text-muted-foreground italic mb-4">No active lease agreement registered.</p>
                  <Button variant="outline" onClick={() => navigate({ to: '/leasing/leases' })}>
                    Initiate Lease Wizard
                  </Button>
                </Card>
              )}
            </TabsContent>

            {/* PAYMENTS TAB */}
            <TabsContent value="payments" className="space-y-4">
              <style>{`
                @page {
                  size: A4 portrait;
                  margin: 15mm 15mm 15mm 15mm;
                }
                @media print {
                  body {
                    background: white !important;
                    color: black !important;
                  }
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-ledger-area, #printable-ledger-area * {
                    visibility: visible !important;
                  }
                  #printable-ledger-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: white !important;
                    color: black !important;
                    padding: 0 !important;
                    margin: 0 !important;
                  }
                  .no-print {
                    display: none !important;
                  }
                  table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                  }
                  th, td {
                    border-bottom: 1px solid #e2e8f0 !important;
                    padding: 8px 4px !important;
                    color: black !important;
                  }
                  th {
                    font-weight: 800 !important;
                  }
                }
              `}</style>
              
              <div id="printable-ledger-area" className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
                {/* Ledger Header */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded no-print">
                      Official Resident Ledger
                    </span>
                    <h3 className="font-extrabold text-base text-foreground mt-1">{managementCompany}</h3>
                    <p className="text-muted-foreground text-[10px] leading-relaxed">
                      {propertyAddress}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold">Statement Recipient</p>
                    <p className="font-extrabold text-foreground text-sm">{tenant.firstName} {tenant.lastName}</p>
                    <p className="text-muted-foreground text-[10px] leading-relaxed">
                      Phone: {tenant.phone || 'N/A'} • Email: {tenant.email || 'N/A'}<br />
                      {tenant.propertyName ? `${tenant.propertyName} • Unit ${tenant.unitNumber}` : 'Unassigned Portfolio Resident'}
                    </p>
                  </div>
                </div>

                {/* Ledger Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Description</th>
                        <th className="py-2.5">Reference ID</th>
                        <th className="py-2.5 text-right">Debit (Charges)</th>
                        <th className="py-2.5 text-right">Credit (Payments)</th>
                        <th className="py-2.5 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {ledgerEntries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-secondary/10">
                          <td className="py-2.5 font-semibold text-muted-foreground">{entry.date}</td>
                          <td className="py-2.5 text-foreground font-extrabold">{entry.desc}</td>
                          <td className="py-2.5 font-mono text-[10px] text-muted-foreground">{entry.ref}</td>
                          <td className="py-2.5 text-right text-rose-500 font-bold">
                            {entry.debit > 0 ? `$${entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-2.5 text-right text-emerald-500 font-bold">
                            {entry.credit > 0 ? `$${entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className={`py-2.5 text-right font-black ${entry.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            ${entry.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {ledgerEntries.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground italic font-medium">
                            No ledger transactions recorded for this resident.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Ledger Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <div className="text-[10px] text-muted-foreground">
                    Generated on {new Date().toLocaleDateString()} • System Audited Ledger
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[9px] uppercase text-muted-foreground font-bold">Outstanding Balance</p>
                      <p className={`text-lg font-black ${balanceDue > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        ${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print flex items-center gap-1.5 h-9 font-bold">
                      <Printer className="w-4 h-4" /> Print Ledger
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* MAINTENANCE TAB */}
            <TabsContent value="maintenance">
              <DataTable columns={maintColumns} data={maintenance} />
            </TabsContent>

            {/* DOCUMENTS TAB */}
            <TabsContent value="documents">
              <DocumentUploader
                documents={docs}
                onUpload={(file) => uploadMutation.mutate(file)}
                title="Resident Documents Vault"
              />
            </TabsContent>

            {/* COMMUNICATION TAB */}
            <TabsContent value="communication">
              {/* LIVE COMMUNICATION CARD */}
              <Card className="p-6 border-border bg-card">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 mb-4 gap-3">
                  <div>
                    <h3 className="font-bold text-base text-foreground">Live Discussion Channel</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Real-time direct chat with {tenant.firstName} {tenant.lastName}</p>
                  </div>
                  <Button onClick={() => setIsChatOpen(true)} className="flex items-center gap-1.5 font-bold text-xs">
                    <MessageSquare className="w-4 h-4" /> Open Live Chat Drawer
                  </Button>
                </div>
                <div className="p-8 text-center bg-muted/15 border border-dashed rounded-xl flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Real-Time Resident Chat</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                      Send messages directly to the tenant portal. Real-time delivery and read receipts (✓✓) are tracked automatically.
                    </p>
                  </div>
                  <Button onClick={() => setIsChatOpen(true)} className="font-bold text-xs">
                    Start Direct Discussion
                  </Button>
                </div>
              </Card>
              </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT SIDEBAR TIMELINE */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5 border-border">
            <h3 className="font-bold text-sm uppercase border-b pb-3 mb-4 tracking-wide">Residency Timeline</h3>
            <Timeline events={timelineEvents} />
          </Card>
        </div>

      </div>
      {tenant && (
        <QuickChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          participantType="TENANT"
          participantId={tenant.id}
          participantName={`${tenant.firstName} ${tenant.lastName}`}
          subtitle={tenant.unitNumber ? `Unit ${tenant.unitNumber}` : 'Resident'}
        />
      )}
    </div>
  );
};

export default TenantDetailsPage;
