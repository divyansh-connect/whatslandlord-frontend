import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { FormDialog } from '../../components/FormDialog';
import { FinancialSummaryCard } from '../../components/FinancialSummaryCard';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { ColumnDef } from '@tanstack/react-table';
import { 
  Building2, Home, UserCheck, AlertCircle, Wrench, FileText, 
  MapPin, Landmark, DollarSign, Calendar, Plus, Upload, Loader2, ArrowLeft, CreditCard, ShieldCheck,
  MessageSquare, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import { QuickChatDrawer } from '../../components/chat/QuickChatDrawer';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export const PropertyDetailsPage: React.FC = () => {
  const { id } = useParams({ from: '/properties/$id' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDocUploadOpen, setIsDocUploadOpen] = useState(false);
  const [selectedChatTenant, setSelectedChatTenant] = useState<any | null>(null);

  // Fetch Property
  const { data: property, isLoading: loadingProp } = useQuery({
    queryKey: ['property', id],
    queryFn: () => api.property.getById(id),
  });

  // Fetch Units
  const { data: allUnits = [], isLoading: loadingUnits } = useQuery({
    queryKey: ['units'],
    queryFn: () => api.unit.getAll(),
  });

  // Fetch Tenants
  const { data: allTenants = [], isLoading: loadingTenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.tenant.getAll(),
  });

  // Fetch Leases
  const { data: allLeases = [] } = useQuery({
    queryKey: ['leases'],
    queryFn: () => api.leasing.getLeases(),
  });

  // Fetch Maintenance Requests
  const { data: allMaintenance = [], isLoading: loadingMaint } = useQuery({
    queryKey: ['maintenance-tickets'],
    queryFn: () => api.maintenance.getAll(),
  });

  // Fetch Documents
  const { data: allDocs = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.document.getAll(),
  });

  // Fetch Payments
  const { data: allPayments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.payments.getAll(),
  });

  // Fetch Expenses
  const { data: allExpenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.expenses.getAll(),
  });

  // Fetch Profile
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.userProfile.get(),
  });

  const propertyUnits = (property?.units && property.units.length > 0)
    ? property.units.map((pu: any) => {
        const fullUnit = allUnits.find((au: any) => au.id === pu.id);
        return { ...pu, ...fullUnit };
      })
    : allUnits.filter((u: any) => u.propertyId === id);

  const propertyTenants = allTenants.filter((t: any) => t.propertyId === id || propertyUnits.some((u: any) => u.id === t.unitId));
  const propertyMaint = allMaintenance.filter((m: any) => m.propertyId === id || propertyUnits.some((u: any) => u.id === m.unitId));
  const propertyDocs = allDocs.filter((d: any) => d.propertyId === id);
  const propertyLeases = allLeases.filter((l: any) => l.propertyId === id || propertyUnits.some((u: any) => u.id === l.unitId));

  const docUploadMutation = useMutation({
    mutationFn: (file: File) =>
      api.document.create({
        name: file.name,
        type: 'PDF',
        propertyId: id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsDocUploadOpen(false);
    },
  });

  if (loadingProp || !property) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Derived Dynamic Values matching Rent Roll & Lease agreements
  const occupiedUnits = propertyUnits.filter((u) => {
    const isOcc = u.status === 'Occupied';
    const hasActiveLease = propertyLeases.some((l: any) => 
      (l.unitId === u.id || l.unit?.id === u.id) && 
      (l.status === 'Active' || l.status === 'Pending_Move_In' || l.status === 'Pending')
    );
    const hasTenant = propertyTenants.some((t: any) => t.unitId === u.id);
    return isOcc || hasActiveLease || hasTenant;
  }).length;
  const vacantUnits = Math.max(0, propertyUnits.length - occupiedUnits);

  // Dynamic Revenue matching Rent Roll Report
  const calculatedRev = propertyUnits.reduce((sum, u) => {
    const activeLease = propertyLeases.find((l: any) => 
      (l.unitId === u.id || l.unit?.id === u.id) && 
      (l.status === 'Active' || l.status === 'Pending_Move_In' || l.status === 'Pending')
    );
    const unitLease = Array.isArray(u.leases)
      ? u.leases.find((l: any) => l.status === 'Active' || l.status === 'Pending_Move_In' || l.status === 'Pending')
      : null;
    const lease = activeLease || unitLease;
    const isOccupied = u.status === 'Occupied' || !!lease || propertyTenants.some((t: any) => t.unitId === u.id);
    if (!isOccupied) return sum;
    const rent = Number(lease?.rentAmount ?? u.rentAmount ?? 0);
    return sum + rent;
  }, 0);
  const monthlyRevenue = calculatedRev > 0 ? calculatedRev : Number(property.monthlyRevenue || 0);

  // Dynamic Expenses matching real expense vouchers
  const propertyExpenses = allExpenses.filter((e: any) => e.propertyId === id || (e.propertyName && e.propertyName === property.name));
  const totalExpenses = propertyExpenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0) || Number(property.monthlyExpenses || 0);

  // Management Company (No fake Apex fallback)
  const managementCo = 
    (property.managementCompany && !property.managementCompany.includes('Apex'))
      ? property.managementCompany
      : (profile?.company && !profile.company.includes('Apex'))
        ? profile.company
        : (profile?.company || 'Self-Managed');

  // Real Purchase Price & Valuation & Expenses (only show if actually recorded, not mock fallback)
  const hasRealPurchasePrice = property.purchasePrice && property.purchasePrice !== 1000000 && property.purchasePrice > 0;
  const hasRealValuation = property.currentValue && property.currentValue !== 1200000 && property.currentValue > 0;
  const hasRealMonthlyExpenses = property.monthlyExpenses && property.monthlyExpenses > 0;
  const totalFloors = property.buildings?.[0]?.floors || property.totalFloors || property.floors || 1;

  // Real Dynamic Financial Chart Data
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const financialChartData = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - idx));
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mLabel = monthNames[d.getMonth()];

    const mIncome = allPayments
      .filter((p: any) => (p.propertyId === id || propertyUnits.some((u) => u.id === p.unitId)) && (p.paidDate || p.createdAt || '').startsWith(mStr))
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    const mExp = allExpenses
      .filter((e: any) => (e.propertyId === id || (e.propertyName && e.propertyName === property.name)) && (e.date || e.createdAt || '').startsWith(mStr))
      .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

    const isCurrentMonth = idx === 5;
    return {
      month: mLabel,
      Income: mIncome > 0 ? mIncome : (isCurrentMonth ? monthlyRevenue : 0),
      Expenses: mExp > 0 ? mExp : (isCurrentMonth ? totalExpenses : 0),
    };
  });

  // Column definitions
  const unitColumns: ColumnDef<any>[] = [
    { accessorKey: 'unitNumber', header: 'Unit #', id: 'unitNumber', cell: ({ row }) => <span className="font-bold">{row.original.unitNumber}</span> },
    { accessorKey: 'floor', header: 'Floor', id: 'floor', cell: ({ row }) => row.original.floor || '1' },
    { accessorKey: 'bedrooms', header: 'Bed/Bath', id: 'layout', cell: ({ row }) => <span>{row.original.bedrooms || 1}B / {row.original.bathrooms || 1}Ba</span> },
    { accessorKey: 'squareFootage', header: 'Sqft', id: 'squareFootage', cell: ({ row }) => row.original.squareFootage ? `${row.original.squareFootage.toLocaleString()} sqft` : '-' },
    { 
      accessorKey: 'rentAmount', 
      header: 'Rent', 
      id: 'rent', 
      cell: ({ row }) => {
        const activeLease = propertyLeases.find((l: any) => 
          (l.unitId === row.original.id || l.unit?.id === row.original.id) && 
          (l.status === 'Active' || l.status === 'Pending_Move_In' || l.status === 'Pending')
        );
        const unitLease = Array.isArray(row.original.leases)
          ? row.original.leases.find((l: any) => l.status === 'Active' || l.status === 'Pending_Move_In' || l.status === 'Pending')
          : null;
        const lease = activeLease || unitLease;
        const rent = Number(lease?.rentAmount ?? row.original.rentAmount ?? 0);
        return <span className="font-bold">${rent.toLocaleString()}</span>;
      } 
    },
    { 
      accessorKey: 'tenantName', 
      header: 'Tenant', 
      id: 'tenantName', 
      cell: ({ row }) => {
        const matchedTenant = propertyTenants.find((t: any) => t.unitId === row.original.id);
        const tName = matchedTenant 
          ? `${matchedTenant.firstName} ${matchedTenant.lastName}`.trim() 
          : (row.original.tenants?.length ? `${row.original.tenants[0].firstName} ${row.original.tenants[0].lastName}`.trim() : row.original.tenantName);
        return tName && tName !== 'Vacant' ? tName : <span className="text-muted-foreground italic">Vacant</span>;
      } 
    },
    { accessorKey: 'status', header: 'Status', id: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];

  const tenantColumns: ColumnDef<any>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="font-bold">
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    { accessorKey: 'email', header: 'Email', id: 'email' },
    { accessorKey: 'phone', header: 'Phone', id: 'phone' },
    { 
      accessorKey: 'unitNumber', 
      header: 'Unit #', 
      id: 'unit',
      cell: ({ row }) => {
        const u = propertyUnits.find((unit) => unit.id === row.original.unitId);
        return u?.unitNumber ? (u.unitNumber.startsWith('Unit') ? u.unitNumber : `Unit ${u.unitNumber}`) : (row.original.unitNumber || 'Unassigned');
      }
    },
    { accessorKey: 'status', header: 'Status', id: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      id: 'chat',
      header: 'Direct Chat',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedChatTenant(row.original)}
          className="h-8 text-xs font-bold flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" /> Chat
        </Button>
      ),
    },
  ];

  const maintColumns: ColumnDef<any>[] = [
    { accessorKey: 'createdAt', header: 'Date Created', id: 'createdAt' },
    { accessorKey: 'title', header: 'Issue', id: 'title', cell: ({ row }) => <span className="font-bold">{row.original.title}</span> },
    { 
      accessorKey: 'unitNumber', 
      header: 'Unit #', 
      id: 'unit',
      cell: ({ row }) => {
        const u = propertyUnits.find((unit) => unit.id === row.original.unitId);
        return u?.unitNumber ? (u.unitNumber.startsWith('Unit') ? u.unitNumber : `Unit ${u.unitNumber}`) : (row.original.unitNumber || 'Building Wide');
      }
    },
    { accessorKey: 'priority', header: 'Priority', id: 'priority', cell: ({ row }) => <StatusBadge status={row.original.priority} /> },
    { accessorKey: 'status', header: 'Status', id: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];

  const docColumns: ColumnDef<any>[] = [
    { accessorKey: 'name', header: 'Name', id: 'name', cell: ({ row }) => <span className="font-bold">{row.original.name}</span> },
    { accessorKey: 'size', header: 'Size', id: 'size' },
    { accessorKey: 'uploadedAt', header: 'Uploaded', id: 'uploadedAt' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/properties' })}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm font-semibold text-muted-foreground">Back to Properties</span>
      </div>

      {/* --- HEADER BLOCK --- */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 pb-6 border-b">
        <div className="flex items-start space-x-4">
          {property.imageUrl ? (
            <div className="relative group flex-shrink-0">
              <img
                src={property.imageUrl}
                alt={property.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-border shadow-sm"
              />
              <a
                href={property.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0 bg-black/50 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold transition-opacity"
              >
                View
              </a>
            </div>
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-border flex-shrink-0">
              <Building2 className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{property.name}</h1>
              <StatusBadge status={property.status} />
            </div>
            <p className="text-sm text-muted-foreground font-semibold flex items-center gap-1">
              <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
              {property.address}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/properties/edit', search: { id: property.id } as any })}>
            Edit Property
          </Button>
          <Button size="sm" onClick={() => navigate({ to: '/properties/units/new' })} className="flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Add Unit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="units">Units ({propertyUnits.length})</TabsTrigger>
          <TabsTrigger value="tenants">Tenants ({propertyTenants.length})</TabsTrigger>
          <TabsTrigger value="financial">Financials</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance ({propertyMaint.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* --- OVERVIEW TAB --- */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-4 flex items-center space-x-3 border-border">
              <div className="p-3 bg-primary/10 text-primary rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Units</p>
                <p className="text-xl font-extrabold">{propertyUnits.length}</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center space-x-3 border-border">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Occupied</p>
                <p className="text-xl font-extrabold">{occupiedUnits}</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center space-x-3 border-border">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Vacant</p>
                <p className="text-xl font-extrabold">{vacantUnits}</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center space-x-3 border-border">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Revenue</p>
                <p className="text-xl font-extrabold">${monthlyRevenue.toLocaleString()}</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center space-x-3 border-border">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Expenses</p>
                <p className="text-xl font-extrabold">${totalExpenses.toLocaleString()}</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 space-y-4 border-border text-foreground">
              <h3 className="font-bold text-base border-b pb-2 uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Asset Parameters
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <p className="text-muted-foreground">Property Type</p>
                  <p className="text-foreground mt-0.5">{property.type || 'Apartment'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Floors</p>
                  <p className="text-foreground mt-0.5">{totalFloors} {totalFloors > 1 ? 'Floors' : 'Floor'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Units</p>
                  <p className="text-foreground mt-0.5">{propertyUnits.length || property.totalUnits || 1} {propertyUnits.length > 1 ? 'Units' : 'Unit'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Management Co.</p>
                  <p className="text-foreground mt-0.5">{managementCo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">NYC BIN #</p>
                  <p className="text-foreground mt-0.5 font-mono font-bold text-amber-500">{property.nycBin || 'Not Specified'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">City, State & Zip</p>
                  <p className="text-foreground mt-0.5">
                    {property.city ? `${property.city}, ${property.state || ''} ${property.zip || ''}` : (property.address || 'Not Specified')}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 space-y-4 border-border text-foreground">
              <h3 className="font-bold text-base border-b pb-2 uppercase tracking-wide flex items-center gap-2">
                <Landmark className="w-4 h-4 text-primary" />
                Ownership & Valuation
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <p className="text-muted-foreground">Owner Account</p>
                  <p className="text-foreground mt-0.5 flex items-center gap-1 font-bold">
                    <Landmark className="w-3.5 h-3.5 text-primary" />
                    {property.owner ? (typeof property.owner === 'object' ? (property.owner.name || `${property.owner.firstName || ''} ${property.owner.lastName || ''}`.trim()) : property.owner) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Share Percentage</p>
                  <p className="text-foreground mt-0.5">{property.ownershipPercentage || 100}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Purchase Price</p>
                  <p className="text-foreground mt-0.5">{hasRealPurchasePrice ? `$${Number(property.purchasePrice).toLocaleString()}` : 'Not Specified'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Valuation</p>
                  <p className="text-foreground mt-0.5">{hasRealValuation ? `$${Number(property.currentValue).toLocaleString()}` : 'Not Specified'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimated Monthly Expenses</p>
                  <p className="text-foreground mt-0.5">{hasRealMonthlyExpenses ? `$${Number(property.monthlyExpenses).toLocaleString()}` : 'Not Specified'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="text-foreground mt-0.5"><StatusBadge status={property.status || 'Active'} /></p>
                </div>
              </div>
            </Card>

            {/* Property Photo & Media Card */}
            <Card className="p-5 space-y-4 border-border text-foreground md:col-span-2">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-base uppercase tracking-wide flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Property Photo & Media
                </h3>
                {property.imageUrl && (
                  <a
                    href={property.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Original Cloudinary URL
                  </a>
                )}
              </div>

              {property.imageUrl ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative group rounded-2xl overflow-hidden border border-border shadow-md max-w-sm w-full">
                    <img
                      src={property.imageUrl}
                      alt={property.name}
                      className="w-full h-56 object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="space-y-3 flex-1 text-xs">
                    <div>
                      <p className="font-bold text-foreground">Cloudinary Image URL:</p>
                      <a
                        href={property.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline font-mono break-all block mt-1 bg-secondary/50 p-2.5 rounded-lg border border-border"
                      >
                        {property.imageUrl}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate({ to: '/properties/edit', search: { id: property.id } as any })}
                        className="h-8 text-xs font-bold"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" /> Change / Replace Photo
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-2xl p-8 text-center bg-secondary/10 flex flex-col items-center justify-center space-y-3">
                  <div className="p-3 bg-secondary rounded-full text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">No property photo uploaded</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Property photo was not added during creation. You can upload one via Edit Property.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate({ to: '/properties/edit', search: { id: property.id } as any })}
                    className="text-xs font-bold"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" /> Upload Property Photo
                  </Button>
                </div>
              )}
            </Card>

            {/* Payment Integration & Merchant Account Card */}
            <Card className="p-5 space-y-4 border-border text-foreground md:col-span-2 bg-card/80">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base uppercase tracking-wide">Payment Integration & Merchant Account</h3>
                    <p className="text-xs text-muted-foreground">Routing configuration for tenant online rent payments</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    !property.paymentProvider || property.paymentProvider === 'COMPANY_DEFAULT'
                      ? 'bg-secondary text-muted-foreground border-border'
                      : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  }`}>
                    <ShieldCheck className="w-4 h-4" />
                    {!property.paymentProvider || property.paymentProvider === 'COMPANY_DEFAULT'
                      ? 'Company Settings (Option 2 Fallback)'
                      : `Custom Gateway: ${property.paymentProvider.replace('_', '.')} (Active - 1st Priority)`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: '/properties/edit', search: { id: property.id } as any })}
                    className="text-xs font-semibold h-8"
                  >
                    Configure Gateway
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold">
                <div>
                  <p className="text-muted-foreground uppercase text-[10px] tracking-wider">Gateway Priority</p>
                  <p className="text-foreground mt-1 text-sm font-bold flex items-center gap-1.5">
                    {!property.paymentProvider || property.paymentProvider === 'COMPANY_DEFAULT' ? (
                      <span className="text-muted-foreground">Option 2: Company Fallback</span>
                    ) : (
                      <span className="text-emerald-500">1st Priority: Property Custom</span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {!property.paymentProvider || property.paymentProvider === 'COMPANY_DEFAULT'
                      ? 'Rent paid by tenants of this property deposits into Company Settings merchant account.'
                      : 'Rent paid by tenants of this property deposits directly into this property LLC account.'}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground uppercase text-[10px] tracking-wider">
                    {property.paymentProvider === 'STRIPE' ? 'Publishable Key' : property.paymentProvider === 'AUTHORIZE_NET' ? 'API Login ID' : property.paymentProvider === 'RAZORPAY' ? 'Key ID' : 'Merchant Identifier'}
                  </p>
                  <p className="text-foreground mt-1 text-sm font-mono font-bold">
                    {property.paymentAccountId ? property.paymentAccountId : <span className="text-muted-foreground italic font-normal">Inherited from Company Settings</span>}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground uppercase text-[10px] tracking-wider">Secret Credentials Status</p>
                  <p className="text-foreground mt-1 text-sm flex items-center gap-1.5 font-mono">
                    {property.hasPaymentToken ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> Encrypted & Verified
                      </span>
                    ) : !property.paymentProvider || property.paymentProvider === 'COMPANY_DEFAULT' ? (
                      <span className="text-muted-foreground">Company Vault Key Active</span>
                    ) : (
                      <span className="text-amber-500">Token Not Set</span>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* --- UNITS TAB --- */}
        <TabsContent value="units">
          <DataTable columns={unitColumns} data={propertyUnits} loading={loadingUnits} />
        </TabsContent>

        {/* --- TENANTS TAB --- */}
        <TabsContent value="tenants">
          <DataTable columns={tenantColumns} data={propertyTenants} loading={loadingTenants} />
        </TabsContent>

        {/* --- FINANCIALS TAB --- */}
        <TabsContent value="financial" className="space-y-6">
          <FinancialSummaryCard income={property.monthlyRevenue} expenses={property.monthlyExpenses} />

          <Card className="p-6 border-border">
            <h3 className="font-bold text-base mb-4 uppercase tracking-wide">Net Operations Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={financialChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.05)" />
                  <XAxis dataKey="month" stroke="currentColor" fontSize={11} opacity={0.6} />
                  <YAxis stroke="currentColor" fontSize={11} opacity={0.6} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        {/* --- MAINTENANCE TAB --- */}
        <TabsContent value="maintenance">
          <DataTable columns={maintColumns} data={propertyMaint} loading={loadingMaint} />
        </TabsContent>

        {/* --- DOCUMENTS TAB --- */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsDocUploadOpen(true)} className="flex items-center gap-1">
              <Upload className="w-4 h-4" />
              Upload Document
            </Button>
          </div>

          <DataTable columns={docColumns} data={propertyDocs} loading={loadingDocs} />

          <FormDialog open={isDocUploadOpen} onOpenChange={setIsDocUploadOpen} title="Upload Property Document">
            <FileUploader onFileSelect={(file) => docUploadMutation.mutate(file)} />
          </FormDialog>
        </TabsContent>
      </Tabs>

      {selectedChatTenant && (
        <QuickChatDrawer
          isOpen={!!selectedChatTenant}
          onClose={() => setSelectedChatTenant(null)}
          participantType="TENANT"
          participantId={selectedChatTenant.id}
          participantName={`${selectedChatTenant.firstName} ${selectedChatTenant.lastName}`}
          subtitle={selectedChatTenant.unitNumber ? `Unit ${selectedChatTenant.unitNumber}` : 'Tenant'}
        />
      )}
    </div>
  );
};
export default PropertyDetailsPage;
