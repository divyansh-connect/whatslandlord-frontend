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
  MapPin, Landmark, DollarSign, Calendar, Plus, Upload, Loader2, ArrowLeft, CreditCard, ShieldCheck 
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export const PropertyDetailsPage: React.FC = () => {
  const { id } = useParams({ from: '/properties/$id' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDocUploadOpen, setIsDocUploadOpen] = useState(false);

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
  const propertyUnits = allUnits.filter((u) => u.propertyId === id);

  // Fetch Tenants
  const { data: allTenants = [], isLoading: loadingTenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.tenant.getAll(),
  });
  const propertyTenants = allTenants.filter((t) => t.propertyId === id);

  // Fetch Maintenance Requests
  const { data: allMaintenance = [], isLoading: loadingMaint } = useQuery({
    queryKey: ['maintenance-tickets'],
    queryFn: () => api.maintenance.getAll(),
  });
  const propertyMaint = allMaintenance.filter((m) => m.propertyId === id);

  // Fetch Documents
  const { data: allDocs = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.document.getAll(),
  });
  const propertyDocs = allDocs.filter((d) => d.propertyId === id);

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

  // Derived Values
  const vacantUnits = propertyUnits.filter((u) => u.status === 'Vacant').length;
  const occupiedUnits = propertyUnits.filter((u) => u.status === 'Occupied').length;

  // Chart data Mock
  const financialChartData = [
    { month: 'Mar', Income: property.monthlyRevenue * 0.9, Expenses: property.monthlyExpenses * 0.8 },
    { month: 'Apr', Income: property.monthlyRevenue * 0.95, Expenses: property.monthlyExpenses * 1.1 },
    { month: 'May', Income: property.monthlyRevenue * 0.98, Expenses: property.monthlyExpenses * 0.9 },
    { month: 'Jun', Income: property.monthlyRevenue, Expenses: property.monthlyExpenses * 1.0 },
    { month: 'Jul', Income: property.monthlyRevenue, Expenses: property.monthlyExpenses },
  ];

  // Column definitions
  const unitColumns: ColumnDef<any>[] = [
    { accessorKey: 'unitNumber', header: 'Unit #', id: 'unitNumber', cell: ({ row }) => <span className="font-bold">{row.original.unitNumber}</span> },
    { accessorKey: 'floor', header: 'Floor', id: 'floor' },
    { accessorKey: 'bedrooms', header: 'Bed/Bath', id: 'layout', cell: ({ row }) => <span>{row.original.bedrooms}B / {row.original.bathrooms}Ba</span> },
    { accessorKey: 'squareFootage', header: 'Sqft', id: 'squareFootage' },
    { accessorKey: 'rentAmount', header: 'Rent', id: 'rent', cell: ({ row }) => <span>${row.original.rentAmount.toLocaleString()}</span> },
    { accessorKey: 'tenantName', header: 'Tenant', id: 'tenantName', cell: ({ row }) => row.original.tenantName || <span className="text-muted-foreground italic">Vacant</span> },
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
    { accessorKey: 'unitNumber', header: 'Unit #', id: 'unit' },
    { accessorKey: 'status', header: 'Status', id: 'status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  ];

  const maintColumns: ColumnDef<any>[] = [
    { accessorKey: 'createdAt', header: 'Date Created', id: 'createdAt' },
    { accessorKey: 'title', header: 'Issue', id: 'title', cell: ({ row }) => <span className="font-bold">{row.original.title}</span> },
    { accessorKey: 'unitNumber', header: 'Unit #', id: 'unit' },
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
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{property.name}</h1>
            <StatusBadge status={property.status} />
          </div>
          <p className="text-sm text-muted-foreground font-semibold flex items-center gap-1">
            <MapPin className="w-4 h-4 text-primary" />
            {property.address}
          </p>
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
                <p className="text-xl font-extrabold">${property.monthlyRevenue.toLocaleString()}</p>
              </div>
            </Card>

            <Card className="p-4 flex items-center space-x-3 border-border">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Expenses</p>
                <p className="text-xl font-extrabold">${property.monthlyExpenses.toLocaleString()}</p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 space-y-4 border-border text-foreground">
              <h3 className="font-bold text-base border-b pb-2 uppercase tracking-wide">Asset Parameters</h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <p className="text-muted-foreground">Property Type</p>
                  <p className="text-foreground mt-0.5">{property.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Year Built</p>
                  <p className="text-foreground mt-0.5">{property.yearBuilt}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Management Co.</p>
                  <p className="text-foreground mt-0.5">{property.managementCompany}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">NYC BIN #</p>
                  <p className="text-foreground mt-0.5 font-mono font-bold text-amber-500">{property.nycBin || 'Not Specified'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Square Footage</p>
                  <p className="text-foreground mt-0.5">{property.squareFootage.toLocaleString()} sqft</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 space-y-4 border-border text-foreground">
              <h3 className="font-bold text-base border-b pb-2 uppercase tracking-wide">Ownership Details</h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <p className="text-muted-foreground">Owner Account</p>
                  <p className="text-foreground mt-0.5 flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5 text-primary" />
                    {property.owner ? (typeof property.owner === 'object' ? (property.owner.name || `${property.owner.firstName || ''} ${property.owner.lastName || ''}`.trim()) : property.owner) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Share Percentage</p>
                  <p className="text-foreground mt-0.5">{property.ownershipPercentage}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Purchase Price</p>
                  <p className="text-foreground mt-0.5">${property.purchasePrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Valuation</p>
                  <p className="text-foreground mt-0.5">${property.currentValue.toLocaleString()}</p>
                </div>
              </div>
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
    </div>
  );
};
export default PropertyDetailsPage;
