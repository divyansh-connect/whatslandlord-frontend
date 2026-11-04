import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Loader2, ArrowLeft } from 'lucide-react';

const appFormSchema = zod.object({
  tenantName: zod.string().min(1, 'Applicant Name is required'),
  email: zod.string().email('Invalid email address'),
  propertyId: zod.string().min(1, 'Property Preference is required'),
  unitNumber: zod.string().min(1, 'Unit Number is required'),
  rentProposed: zod.number().min(1, 'Rent Proposed must be positive'),
});

type AppFormInputs = zod.infer<typeof appFormSchema>;

export const NewApplicationPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (values: AppFormInputs) => {
      const propObj = properties.find((p) => p.id === values.propertyId);
      return api.leasing.createApplication({
        tenantName: values.tenantName,
        email: values.email,
        propertyName: propObj ? propObj.name : 'Property',
        unitNumber: values.unitNumber,
        rentProposed: values.rentProposed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['applications-list'] });
      setSuccess(true);
      setTimeout(() => navigate({ to: '/leasing/applications' }), 2000);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AppFormInputs>({
    resolver: zodResolver(appFormSchema),
    defaultValues: {
      rentProposed: 1500,
    },
  });

  const onSubmit = (values: AppFormInputs) => {
    createMutation.mutate(values);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Add Application"
        description="Register a new applicant background screening request."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Leasing', href: '/leasing/leases' },
          { label: 'Applications', href: '/leasing/applications' },
          { label: 'Add Application' },
        ]}
      />

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-semibold mb-6">
          Application registered successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card border border-border p-6 rounded-2xl shadow-sm text-foreground">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Applicant Name</label>
            <Input placeholder="John Smith" {...register('tenantName')} />
            {errors.tenantName && <p className="text-rose-500 text-xs">{errors.tenantName.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Email Address</label>
            <Input type="email" placeholder="john.smith@gmail.com" {...register('email')} />
            {errors.email && <p className="text-rose-500 text-xs">{errors.email.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1 col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Property Choice</label>
            <Select {...register('propertyId')}>
              <option value="">Select Property...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            {errors.propertyId && <p className="text-rose-500 text-xs">{errors.propertyId.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Unit Number</label>
            <Input placeholder="104" {...register('unitNumber')} />
            {errors.unitNumber && <p className="text-rose-500 text-xs">{errors.unitNumber.message}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground uppercase">Proposed Rent ($)</label>
          <Input type="number" {...register('rentProposed', { valueAsNumber: true })} />
        </div>

        <div className="flex justify-between items-center pt-6 border-t">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: '/leasing/applications' })} className="flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Application
          </Button>
        </div>
      </form>
    </div>
  );
};
export default NewApplicationPage;
