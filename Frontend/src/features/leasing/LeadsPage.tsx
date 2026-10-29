import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import api from '../../api';
import { Lead } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { Plus, Loader2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

const leadSchema = zod.object({
  firstName: zod.string().min(1, 'First Name is required'),
  lastName: zod.string().min(1, 'Last Name is required'),
  email: zod.string().email('Invalid email'),
  phone: zod.string().min(1, 'Phone is required'),
  propertyOfInterestId: zod.string().optional(),
  status: zod.enum(['New', 'Contacted', 'Showing Scheduled', 'Applied', 'Lost']),
});

type LeadFormValues = zod.infer<typeof leadSchema>;

export const LeadsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.leasing.getLeads(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (newLead: Omit<Lead, 'id' | 'createdAt'>) => {
      const prop = properties.find((p) => p.id === newLead.propertyOfInterestId);
      return api.leasing.createLead({
        ...newLead,
        propertyName: prop ? prop.name : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsFormOpen(false);
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: 'New' },
  });

  const onSubmit = (values: LeadFormValues) => {
    createMutation.mutate(values);
  };

  const filteredLeads = leads.filter((lead: any) => {
    if (!lead) return false;
    const q = (searchQuery || '').toLowerCase().trim();
    const fullName = `${lead.firstName || ''} ${lead.lastName || ''} ${lead.name || ''}`.trim().toLowerCase();
    const emailStr = String(lead.email || '').toLowerCase();
    const phoneStr = String(lead.phone || '').toLowerCase();
    const propStr = String(lead.propertyName || '').toLowerCase();
    const matchesSearch = !q ||
      fullName.includes(q) ||
      emailStr.includes(q) ||
      phoneStr.includes(q) ||
      propStr.includes(q);

    const matchesStatus = !statusFilter ||
      String(lead.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const columns: ColumnDef<Lead>[] = [
    {
      accessorKey: 'firstName',
      header: 'Name',
      id: 'name',
      cell: ({ row }) => (
        <span className="font-bold">
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    { accessorKey: 'email', header: 'Email', id: 'email' },
    { accessorKey: 'phone', header: 'Phone', id: 'phone' },
    {
      accessorKey: 'propertyName',
      header: 'Property of Interest',
      id: 'property',
      cell: ({ row }) => row.original.propertyName || <span className="text-muted-foreground">General inquiry</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      id: 'status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Leasing Leads"
        description="Monitor prospective tenants and inquiries for available listings."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Leasing', href: '/leasing/leads' },
          { label: 'Leads' },
        ]}
        action={{
          label: 'Add Lead',
          onClick: () => setIsFormOpen(true),
          icon: <Plus className="w-4 h-4" />,
        }}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search leads by name or email..."
        filters={[
          {
            key: 'status',
            value: statusFilter,
            placeholder: 'Filter by Status',
            options: [
              { label: 'New', value: 'New' },
              { label: 'Contacted', value: 'Contacted' },
              { label: 'Showing Scheduled', value: 'Showing Scheduled' },
              { label: 'Applied', value: 'Applied' },
              { label: 'Lost', value: 'Lost' },
            ],
          },
        ]}
        onFilterChange={(_, val) => setStatusFilter(val)}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('');
        }}
      />

      <DataTable
        columns={columns}
        data={filteredLeads}
        loading={isLoading}
        emptyStateMessage="No prospects found."
      />

      <FormDialog open={isFormOpen} onOpenChange={setIsFormOpen} title="Create New Lead">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">First Name</label>
              <Input placeholder="David" {...register('firstName')} />
              {errors.firstName && <p className="text-rose-500 text-xs">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Last Name</label>
              <Input placeholder="Miller" {...register('lastName')} />
              {errors.lastName && <p className="text-rose-500 text-xs">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
              <Input type="email" placeholder="david@gmail.com" {...register('email')} />
              {errors.email && <p className="text-rose-500 text-xs">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Phone</label>
              <Input placeholder="(512) 555-9876" {...register('phone')} />
              {errors.phone && <p className="text-rose-500 text-xs">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Property of Interest</label>
            <Select {...register('propertyOfInterestId')}>
              <option value="">General Inquiry / None</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Initial Status</label>
            <Select {...register('status')}>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Showing Scheduled">Showing Scheduled</option>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Lead
            </Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
};
export default LeadsPage;
