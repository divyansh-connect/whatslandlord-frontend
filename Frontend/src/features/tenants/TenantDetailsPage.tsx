import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { TenantAvatar } from '../../components/TenantAvatar';
import { DocumentUploader } from '../../components/DocumentUploader';
import { Timeline, TimelineEvent } from '../../components/Timeline';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { ColumnDef } from '@tanstack/react-table';
import { 
  User, Building, ShieldCheck, Mail, Phone, Calendar, Landmark,
  DollarSign, Wrench, CreditCard, Sparkles, FileText, ArrowLeft, Loader2, Check, Printer, MessageSquare,
  Image as ImageIcon, ExternalLink, Upload
} from 'lucide-react';

export const TenantDetailsPage: React.FC = () => {
  const { id } = useParams({ from: '/tenants/$id' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  const { data: allLedger = [] } = useQuery({ queryKey: ['rent-ledger-list'], queryFn: () => api.rentLedger.getAll() });

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
    uploadedAt: d.uploadedAt || 'N/A',
    uploadedBy: 'Manager',
  }));

  // Reconciled Tenant Ledger matching Rent Ledger Statement exactly
  const tenantLedgerEntries = React.useMemo(() => {
    if (!tenant) return [];
    const tenantFullName = `${tenant.firstName} ${tenant.lastName}`.trim().toLowerCase();

    // 1. If global rent ledger matches exist, use them
    const ledgerMatches = (allLedger || []).filter((item: any) => {
      if (item.tenantId && item.tenantId === id) return true;
      const tName = String(item.tenantName || '').trim().toLowerCase();
      return tName && (tName === tenantFullName || tName.includes(tenant.firstName.toLowerCase()));
    });

    if (ledgerMatches.length > 0) {
      const getTxOrder = (item: any) => {
        if (item.sortOrder) return item.sortOrder;
        if (item.transactionType === 'Rent Charge') return 1;
        if (item.transactionType === 'Late Fee') return 2;
        return 3;
      };
      const sorted = [...ledgerMatches].sort((a: any, b: any) => {
        const dCmp = (a.date || '').localeCompare(b.date || '');
        if (dCmp !== 0) return dCmp;
        return getTxOrder(a) - getTxOrder(b);
      });

      let running = 0;
      return sorted.map((item: any) => {
        const debit = Number(item.debit) || 0;
        const credit = Number(item.credit) || 0;
        running += debit - credit;
        return {
          date: item.date,
          desc: item.description,
          ref: item.referenceNumber || (item.id ? String(item.id).substring(0, 16) : 'TXN'),
          debit,
          credit,
          balance: running,
        };
      });
    }

    // 2. Direct dynamic calculation from tenant.invoices + tenant payments
    const txs: Array<{
      date: string;
      desc: string;
      ref: string;
      debit: number;
      credit: number;
      order: number;
    }> = [];

    (tenant.invoices || []).forEach((inv: any) => {
      const d = inv.dueDate ? String(inv.dueDate).split('T')[0] : (inv.createdAt ? String(inv.createdAt).split('T')[0] : '2026-05-01');
      const invDate = new Date(d);
      const mName = !isNaN(invDate.getTime()) ? invDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }) : '';
      txs.push({
        date: d,
        desc: inv.description || (mName ? `Monthly Rent Invoice – ${mName}` : 'Monthly Rent Invoice'),
        ref: inv.id ? inv.id.substring(0, 16) : 'INV',
        debit: Number(inv.amount) || 0,
        credit: 0,
        order: 1,
      });
    });

    (payments || []).forEach((p: any) => {
      const d = p.paidDate ? String(p.paidDate).split('T')[0] : (p.dueDate ? String(p.dueDate).split('T')[0] : '2026-05-01');
      txs.push({
        date: d,
        desc: p.description || `Payment Received via ${p.paymentMethod || 'Offline'} Ref# ${p.referenceNumber || (p.id ? String(p.id).substring(0, 8) : 'RCP')}`,
        ref: p.referenceNumber || (p.id ? p.id.substring(0, 16) : 'TXN'),
        debit: 0,
        credit: Number(p.amount) || 0,
        order: 2,
      });
    });

    txs.sort((a, b) => {
      const dCmp = a.date.localeCompare(b.date);
      if (dCmp !== 0) return dCmp;
      return a.order - b.order;
    });

    let running = 0;
    return txs.map((tx) => {
      running += tx.debit - tx.credit;
      return {
        ...tx,
        balance: running,
      };
    });
  }, [allLedger, tenant, id, payments]);

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

  // Derived Balance / Details strictly matching Rent Ledger and Reports
  const balanceDue = React.useMemo(() => {
    if (!tenant) return 0;
    if (tenantLedgerEntries.length > 0) {
      const totalCharged = tenantLedgerEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
      const totalPaid = tenantLedgerEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
      return Math.max(0, totalCharged - totalPaid);
    }
    return (tenant?.invoices || []).reduce((sum: number, inv: any) => {
      const isPaid = String(inv?.status || '').toLowerCase() === 'paid';
      const invBal = isPaid ? 0 : (inv.balance !== undefined ? Number(inv.balance) : Number(inv.amount || 0));
      return sum + Number(invBal || 0);
    }, 0) + Number(tenant?.previousBalance || tenant?.openingBalance || 0);
  }, [tenant, tenantLedgerEntries]);

  // Dynamic residency timeline from real tenant milestones
  const timelineEvents: TimelineEvent[] = React.useMemo(() => {
    if (!tenant) return [];
    const events: TimelineEvent[] = [];

    if (tenant.moveInDate || lease?.startDate) {
      events.push({
        id: 'movein',
        title: 'Resident Move-In Completed',
        description: `Checked keys and assigned to Unit ${tenant.unitNumber || 'Assigned Unit'}.`,
        time: (tenant.moveInDate || lease?.startDate || '').split('T')[0],
        by: 'Property Manager',
        icon: <Check className="w-4 h-4 text-emerald-500" />,
      });
    }

    if (lease) {
      events.push({
        id: 'lease',
        title: 'Lease Agreement Active',
        description: `Lease contract bound to ${tenant.firstName} ${tenant.lastName} (${lease.status || 'Active'}).`,
        time: (lease.startDate || '').split('T')[0] || (tenant.createdAt || '').split('T')[0],
        by: 'Leasing Agent',
        icon: <ShieldCheck className="w-4 h-4 text-primary" />,
      });
    }

    if (tenant.screeningReports && tenant.screeningReports.length > 0) {
      const rep = tenant.screeningReports[0];
      events.push({
        id: 'screening',
        title: 'Background Screening Verified',
        description: `Credit score: ${rep.creditScore || 'Cleared'}. Screening Status: ${rep.status || 'Approved'}.`,
        time: (rep.createdAt || tenant.createdAt || '').split('T')[0],
        by: 'Screening System',
      });
    }

    events.push({
      id: 'registered',
      title: 'Tenant Profile Registered',
      description: `Resident account active in property portfolio.`,
      time: (tenant.createdAt || '').split('T')[0] || 'Active',
    });

    return events;
  }, [tenant, lease]);

  if (loadingTenant || !tenant) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const hasBalance = balanceDue > 0;
  const monthlyRent = lease ? lease.rentAmount : ((tenant as any)?.unit?.rentAmount || (tenant as any)?.rentAmount || 0);
  const securityDeposit = lease?.depositAmount ?? (lease as any)?.deposit ?? (lease as any)?.securityDeposit ?? (tenant as any)?.unit?.securityDeposit ?? (tenant as any)?.securityDeposit ?? 0;

  const property = allProperties.find((p) => p.id === tenant?.propertyId);
  const propertyAddress = property ? property.address : (tenant?.propertyName || 'N/A');
  const managementCompany = 
    (property?.managementCompany && !property.managementCompany.includes('Apex'))
      ? property.managementCompany
      : (profile?.company && !profile.company.includes('Apex'))
        ? profile.company
        : (profile?.company || (tenant as any)?.companyName || property?.managementCompany || 'Property Management');

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
          <TenantAvatar name={`${tenant.firstName} ${tenant.lastName}`} imageUrl={tenant.imageUrl} size="lg" />
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
          <Button variant="outline" size="sm" onClick={() => navigate({ to: `/tenants/${tenant.id}/edit` })}>
            Edit Profile
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
              ${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <p className="text-xl font-extrabold">
              ${Number(securityDeposit || 0).toLocaleString()}
            </p>
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
            </TabsList>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-6">
              {/* Personal Details & Contact */}
              <Card className="p-5 space-y-4 border-border">
                <h3 className="font-bold text-base border-b pb-2 uppercase tracking-wide">Personal Coordinates</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-semibold">
                  <div>
                    <p className="text-muted-foreground">Email Channels</p>
                    <p className="text-foreground mt-0.5 flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-primary" /> {tenant.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mobile Phone</p>
                    <p className="text-foreground mt-0.5 flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-primary" /> {tenant.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Alternate Phone</p>
                    <p className="text-foreground mt-0.5">{tenant.altPhone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Preferred Name</p>
                    <p className="text-foreground mt-0.5">{tenant.preferredName || `${tenant.firstName} ${tenant.lastName}`}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Gender</p>
                    <p className="text-foreground mt-0.5">{tenant.gender || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Birthdate Coordinates</p>
                    <p className="text-foreground mt-0.5">{tenant.dob ? String(tenant.dob).split('T')[0] : '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Nationality</p>
                    <p className="text-foreground mt-0.5">{tenant.nationality || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Government ID / Document</p>
                    <p className="text-foreground mt-0.5">{tenant.idType || 'ID'}: {tenant.idNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Residential Address</p>
                    <p className="text-foreground mt-0.5">{tenant.currentAddress || propertyAddress || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Previous Address</p>
                    <p className="text-foreground mt-0.5">{tenant.previousAddress || '—'}</p>
                  </div>
                </div>
              </Card>

              {/* Emergency Contact */}
              <Card className="p-5 space-y-4 border-border">
                <h3 className="font-bold text-base border-b pb-2 uppercase tracking-wide">Emergency Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                  <div>
                    <p className="text-muted-foreground">Contact Name</p>
                    <p className="text-foreground mt-0.5">{tenant.emergencyName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Relationship</p>
                    <p className="text-foreground mt-0.5">{tenant.emergencyRelationship || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Emergency Phone</p>
                    <p className="text-foreground mt-0.5">{tenant.emergencyPhone || '—'}</p>
                  </div>
                </div>
              </Card>

              {/* Employment Status */}
              <Card className="p-5 space-y-4 border-border">
                <h3 className="font-bold text-base border-b pb-2 uppercase tracking-wide">Employment Status</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
                  <div>
                    <p className="text-muted-foreground">Employer / Organization</p>
                    <p className="text-foreground mt-0.5">{tenant.employer || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Job Position / Role</p>
                    <p className="text-foreground mt-0.5">{tenant.position || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Employment Status</p>
                    <p className="text-foreground mt-0.5">{tenant.employmentStatus || 'Full-Time'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stipulated Income</p>
                    <p className="text-foreground mt-0.5">{tenant.monthlyIncome ? `$${Number(tenant.monthlyIncome).toLocaleString()} / mo` : '—'}</p>
                  </div>
                </div>
              </Card>

              {/* Lease & Move-in Coordinates */}
              <Card className="p-5 space-y-4 border-border">
                <h3 className="font-bold text-base border-b pb-2 uppercase tracking-wide">Lease & Move-in Coordinates</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
                  <div>
                    <p className="text-muted-foreground">Move-in Date</p>
                    <p className="text-foreground mt-0.5">{(tenant.moveInDate || lease?.startDate || '').split('T')[0] || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Invoice Start Date</p>
                    <p className="text-foreground mt-0.5">{(tenant.invoiceStartDate || '').split('T')[0] || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Assigned Property</p>
                    <p className="text-foreground mt-0.5">{tenant.propertyName || property?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Assigned Unit</p>
                    <p className="text-foreground mt-0.5">{tenant.unitNumber ? `Unit ${tenant.unitNumber}` : '—'}</p>
                  </div>
                </div>
              </Card>

              {/* Tenant Photo & Media Card */}
              <Card className="p-5 space-y-4 border-border">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-base uppercase tracking-wide flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    Tenant Photo & Media
                  </h3>
                  {tenant.imageUrl && (
                    <a
                      href={tenant.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Original Cloudinary URL
                    </a>
                  )}
                </div>

                {tenant.imageUrl ? (
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="relative group rounded-2xl overflow-hidden border border-border shadow-sm w-32 h-32 flex-shrink-0">
                      <img
                        src={tenant.imageUrl}
                        alt={`${tenant.firstName} ${tenant.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-3 flex-1 text-xs">
                      <div>
                        <p className="font-bold text-foreground">Cloudinary Image URL:</p>
                        <a
                          href={tenant.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline font-mono break-all block mt-1 bg-secondary/50 p-2.5 rounded-lg border border-border"
                        >
                          {tenant.imageUrl}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate({ to: `/tenants/${tenant.id}/edit` })}
                          className="h-8 text-xs font-bold"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" /> Change / Replace Photo
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-xl p-6 text-center bg-secondary/10 flex flex-col items-center justify-center space-y-2">
                    <div className="p-2.5 bg-secondary rounded-full text-muted-foreground">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">No tenant photo uploaded</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Tenant photo was not attached during registration. You can upload one via Edit Profile.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate({ to: `/tenants/${tenant.id}/edit` })}
                      className="text-xs font-bold h-8"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1" /> Upload Tenant Photo
                    </Button>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* LEASE TAB */}
            <TabsContent value="lease">
              {lease ? (
                <Card className="p-5 space-y-4 border-border">
                  <h3 className="font-bold text-base border-b pb-2 uppercase tracking-wide">Lease Coordinates</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-semibold">
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
                      <p className="text-muted-foreground">Security Deposit Amount</p>
                      <p className="text-foreground mt-0.5">${Number(securityDeposit || 0).toLocaleString()}</p>
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

                {/* Ledger Table with vertical scroll for long transaction history */}
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-border/60 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-card z-10 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                      <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                        <th className="py-2.5 px-3 bg-card">Date</th>
                        <th className="py-2.5 px-3 bg-card">Description</th>
                        <th className="py-2.5 px-3 bg-card">Reference ID</th>
                        <th className="py-2.5 px-3 text-right bg-card">Debit (Charges)</th>
                        <th className="py-2.5 px-3 text-right bg-card">Credit (Payments)</th>
                        <th className="py-2.5 px-3 text-right bg-card">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {tenantLedgerEntries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-secondary/10 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-muted-foreground whitespace-nowrap">{entry.date}</td>
                          <td className="py-2.5 px-3 text-foreground font-extrabold">{entry.desc}</td>
                          <td className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">{entry.ref}</td>
                          <td className="py-2.5 px-3 text-right text-rose-500 font-bold whitespace-nowrap">
                            {entry.debit > 0 ? `$${entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-500 font-bold whitespace-nowrap">
                            {entry.credit > 0 ? `$${entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-black whitespace-nowrap ${entry.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            ${entry.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      {tenantLedgerEntries.length === 0 && (
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
    </div>
  );
};

export default TenantDetailsPage;
