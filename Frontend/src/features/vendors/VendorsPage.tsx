import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { Vendor } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { VendorRating } from '../../components/MaintenanceComponents';
import { Plus, Eye, Loader2, ShieldAlert, Pencil } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

export const VendorsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // Dialog states
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Edit states
  const [editingVendor, setEditingVendor] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Plumber');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editRating, setEditRating] = useState('5.0');
  const [editStatus, setEditStatus] = useState('Active');

  const handleStartEdit = (vendor: any) => {
    setEditingVendor(vendor);
    setEditName(vendor.name || vendor.companyName || '');
    setEditCategory(vendor.category || vendor.serviceType || 'Plumber');
    setEditPhone(vendor.phone || '');
    setEditEmail(vendor.email || '');
    setEditContact(vendor.primaryContact || vendor.contactName || '');
    setEditRating(String(vendor.rating || '5.0'));
    setEditStatus(vendor.status || 'Active');
  };

  const editMutation = useMutation({
    mutationFn: (data: any) => api.vendors.update(editingVendor!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors-list'] });
      setEditingVendor(null);
    },
  });

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Plumbing');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [license, setLicense] = useState('');
  const [password, setPassword] = useState('');

  // Queries
  const { data: vendorsList = [], isLoading } = useQuery({ queryKey: ['vendors-list'], queryFn: () => api.vendors.getAll() });

  const createMutation = useMutation({
    mutationFn: (newV: any) => api.vendors.create(newV),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors-list'] });
      setIsCreateOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setContact('');
      setLicense('');
      setPassword('');
    },
  });

  const filteredVendors = vendorsList.filter((v) => {
    const searchMatch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.category.toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = categoryFilter === '' || v.category === categoryFilter;
    return searchMatch && catMatch;
  });

  const columns: ColumnDef<Vendor>[] = [
    {
      accessorKey: 'name',
      header: t('maintenanceVendors.vendorFirm'),
      id: 'name',
      cell: ({ row }) => (
        <span onClick={() => setSelectedVendor(row.original)} className="font-bold text-primary hover:underline cursor-pointer">
          {row.original.name}
        </span>
      ),
    },
    { accessorKey: 'category', header: t('maintenanceVendors.tradeSpecialty'), id: 'category' },
    {
      accessorKey: 'rating',
      header: t('maintenanceVendors.rating'),
      id: 'rating',
      cell: ({ row }) => <VendorRating rating={row.original.rating} />,
    },
    { accessorKey: 'activeJobs', header: t('maintenanceVendors.activeJobs'), id: 'activeJobs' },
    { accessorKey: 'completedJobs', header: t('maintenanceVendors.completedJobs'), id: 'completedJobs' },
    { accessorKey: 'responseTime', header: t('maintenanceVendors.responseTime'), id: 'responseTime' },
    {
      accessorKey: 'status',
      header: t('maintenanceRequests.status'),
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status || 'Active'} />,
    },
    {
      id: 'actions',
      header: t('maintenanceRequests.actions'),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSelectedVendor(row.original)} title="View Profile">
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleStartEdit(row.original)}
            title="Edit Vendor"
            className="text-primary hover:text-primary/80"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('maintenanceVendors.title')}
        description={t('maintenanceVendors.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('nav.maintenance'), href: '/maintenance' },
          { label: t('maintenanceVendors.title') },
        ]}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search maintenance staff..."
        filters={[
          {
            key: 'category',
            value: categoryFilter,
            placeholder: 'Specialty Trade',
            options: [
              { label: 'Plumber', value: 'Plumber' },
              { label: 'Electrician', value: 'Electrician' },
              { label: 'HVAC', value: 'HVAC' },
              { label: 'General Contractor', value: 'General Contractor' },
              { label: 'Cleaning', value: 'Cleaning' },
              { label: 'Landscaping', value: 'Landscaping' },
              { label: 'Pest Control', value: 'Pest Control' },
              { label: 'Security', value: 'Security' },
              { label: 'Roofing', value: 'Roofing' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'category') setCategoryFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setCategoryFilter('');
        }}
      />

      <DataTable columns={columns} data={filteredVendors.slice(0, 100)} loading={isLoading} />

      {/* CREATE DIALOG */}
      <FormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} title="Register Vendor Partner">
        <div className="space-y-4 pt-2">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Company Name</label>
            <Input placeholder="E.g., Northside Plumbing Services" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Specialty Trade</label>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Plumber">Plumber Specialty</option>
                <option value="Electrician">Electrician Specialty</option>
                <option value="HVAC">HVAC Maintenance</option>
                <option value="General Contractor">General Contractor</option>
                <option value="Cleaning">Cleaning & Turnovers</option>
                <option value="Landscaping">Landscaping & Pools</option>
                <option value="Pest Control">Pest Control</option>
                <option value="Security">Security & Fire</option>
                <option value="Roofing">Roofing & Guttering</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Contact Person</label>
              <Input placeholder="Primary Agent Name..." value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Business Phone</label>
              <Input placeholder="(512) 555-0199" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Email Address</label>
              <Input type="email" placeholder="contact@firm.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">License Number</label>
            <Input placeholder="E.g., LIC-TEX-8822" value={license} onChange={(e) => setLicense(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">User Password</label>
            <Input type="password" placeholder="Define login password..." value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  name,
                  category,
                  phone,
                  email,
                  primaryContact: contact,
                  licenseNumber: license,
                  insuranceExpiration: '2027-12-31',
                  password,
                })
              }
              disabled={!name || !phone || !email || !password || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Register Vendor
            </Button>
          </div>

        </div>
      </FormDialog>

      {/* DETAIL DIALOG */}
      <FormDialog open={!!selectedVendor} onOpenChange={(open) => !open && setSelectedVendor(null)} title="Vendor Profile & Compliance">
        {selectedVendor && (
          <div className="space-y-6 pt-3 text-xs font-semibold text-foreground">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h4 className="font-extrabold text-sm uppercase">{selectedVendor.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase">{selectedVendor.category}</p>
              </div>
              <VendorRating rating={selectedVendor.rating} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase">Primary Contact</p>
                <p className="font-bold">{selectedVendor.primaryContact || 'Agent'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase">Contact Details</p>
                <p className="font-mono">{selectedVendor.phone}</p>
                <p>{selectedVendor.email}</p>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-extrabold uppercase text-[10px]">License & Insurance Verified</p>
                <p className="font-medium mt-0.5 text-muted-foreground">License: {selectedVendor.licenseNumber || 'Verified'} • Expiration: {selectedVendor.insuranceExpiration}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center border rounded-xl overflow-hidden divide-x bg-secondary/15 p-3.5">
              <div>
                <p className="text-muted-foreground text-[9px] uppercase">Active Jobs</p>
                <p className="font-black text-sm">{selectedVendor.activeJobs}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] uppercase">Completed Jobs</p>
                <p className="font-black text-sm">{selectedVendor.completedJobs}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[9px] uppercase">Response SLA</p>
                <p className="font-black text-sm">{selectedVendor.responseTime}</p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedVendor(null)}>Close</Button>
            </div>
          </div>
        )}
      </FormDialog>

      {/* EDIT VENDOR DIALOG */}
      <FormDialog open={!!editingVendor} onOpenChange={(open) => !open && setEditingVendor(null)} title="Edit Vendor Details">
        {editingVendor && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Company / Firm Name</label>
              <Input
                placeholder="Vendor / Trade Firm Name..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Specialty Trade</label>
                <Select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                  <option value="Plumber">Plumber Specialty</option>
                  <option value="Electrician">Electrician Specialty</option>
                  <option value="HVAC">HVAC Maintenance</option>
                  <option value="General Contractor">General Contractor</option>
                  <option value="Cleaning">Cleaning & Turnovers</option>
                  <option value="Landscaping">Landscaping & Pools</option>
                  <option value="Pest Control">Pest Control</option>
                  <option value="Security">Security & Fire</option>
                  <option value="Roofing">Roofing & Guttering</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Primary Contact</label>
                <Input
                  placeholder="Primary Agent Name..."
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Business Phone</label>
                <Input
                  placeholder="(512) 555-0199"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Email Address</label>
                <Input
                  type="email"
                  placeholder="contact@firm.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Rating (1.0 - 5.0)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={editRating}
                  onChange={(e) => setEditRating(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Status</label>
                <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending Verification">Pending Verification</option>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditingVendor(null)}>Cancel</Button>
              <Button
                onClick={() =>
                  editMutation.mutate({
                    name: editName,
                    companyName: editName,
                    category: editCategory,
                    serviceType: editCategory,
                    phone: editPhone,
                    email: editEmail,
                    primaryContact: editContact,
                    contactName: editContact,
                    rating: parseFloat(editRating) || 5.0,
                    status: editStatus,
                  })
                }
                disabled={!editName || !editPhone || !editEmail || editMutation.isPending}
              >
                {editMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  );
};
export default VendorsPage;
