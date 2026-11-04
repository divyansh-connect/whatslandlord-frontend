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
import { Loader2, Check } from 'lucide-react';
import { mapBackendErrors } from '../../utils/errorMapping';

const leaseFormSchemaBase = zod.object({
  propertyId: zod.string().min(1, 'Property is required'),
  unitId: zod.string().min(1, 'Unit is required'),
  tenantId: zod.string().min(1, 'Tenant selection is required'),
  startDate: zod.string().min(1, 'Start Date is required'),
  endDate: zod.string().min(1, 'End Date is required'),
  rentAmount: zod.number().min(1, 'Rent must be positive'),
  depositAmount: zod.number().min(0, 'Deposit must be non-negative'),
});

type LeaseFormInputs = zod.infer<typeof leaseFormSchemaBase>;

export const NewLeasePage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  // Queries
  const { data: properties = [] } = useQuery({ queryKey: ['properties'], queryFn: () => api.property.getAll() });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => api.unit.getAll() });
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: () => api.tenant.getAll() });

  const leaseFormSchema = React.useMemo(() => {
    return leaseFormSchemaBase.superRefine((data, ctx) => {
      const selectedUnit = units.find((u) => u.id === data.unitId);
      if (selectedUnit && selectedUnit.status?.toLowerCase() === 'occupied') {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          message: 'Already occupied cannot create lease again',
          path: ['unitId'],
        });
      }
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (start >= end) {
          ctx.addIssue({
            code: zod.ZodIssueCode.custom,
            message: 'Lease Start Date must be before End Date',
            path: ['endDate'],
          });
        }
      }
    });
  }, [units]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LeaseFormInputs>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      rentAmount: 1500,
      depositAmount: 1500,
    },
  });

  const selectedPropertyId = watch('propertyId');
  const selectedUnitId = watch('unitId');

  const selectedUnit = React.useMemo(() => units.find((u) => u.id === selectedUnitId), [units, selectedUnitId]);

  React.useEffect(() => {
    if (selectedUnit) {
      if (selectedUnit.rentAmount !== undefined && selectedUnit.rentAmount !== null) {
        setValue('rentAmount', selectedUnit.rentAmount);
      }
      if (selectedUnit.securityDeposit !== undefined && selectedUnit.securityDeposit !== null) {
        setValue('depositAmount', selectedUnit.securityDeposit);
      }
    }
  }, [selectedUnit, setValue]);

  // Filter units of selected property (allow any status to make testing easy)
  const availableUnits = units.filter((u) => u.propertyId === selectedPropertyId);

  const createMutation = useMutation({
    mutationFn: (values: LeaseFormInputs) => {
      const ten = tenants.find((t) => t.id === values.tenantId);
      const prop = properties.find((p) => p.id === values.propertyId);
      const uni = units.find((u) => u.id === values.unitId);

      return api.leasing.createLease({
        tenantId: values.tenantId,
        tenantName: ten ? `${ten.firstName} ${ten.lastName}` : 'Resident',
        propertyId: values.propertyId,
        propertyName: prop ? prop.name : 'Property',
        unitId: values.unitId,
        unitNumber: uni ? uni.unitNumber : 'Unit',
        startDate: values.startDate,
        endDate: values.endDate,
        rentAmount: values.rentAmount,
        depositAmount: values.depositAmount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['moveIns'] });
      setSuccess(true);
      setTimeout(() => navigate({ to: '/leasing/move-in' }), 1500);
    },
    onError: (err: any) => {
      mapBackendErrors(err, setError);
    }
  });

  const onSubmit = (values: LeaseFormInputs) => {
    createMutation.mutate(values);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Create Lease Agreement"
        description="Quickly set up rental terms, select units, and schedule move-in conditions."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Leasing', href: '/leasing/leases' },
          { label: 'New Lease' },
        ]}
      />

      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm text-foreground">
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-bold mb-6 flex items-center space-x-2">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span>Lease created and Move In scheduled successfully! Redirecting...</span>
          </div>
        )}

        {selectedUnit && selectedUnit.status?.toLowerCase() === 'occupied' && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl text-xs font-semibold mb-6 flex items-center space-x-2">
            <span className="text-base">⚠️</span>
            <span>This unit is currently Occupied. To create a new lease, please complete the Move-Out / Lease End of the current tenant first.</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Property */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Property</label>
              <Select {...register('propertyId')}>
                <option value="">Select Property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                ))}
              </Select>
              {errors.propertyId && <p className="text-rose-500 text-xs font-semibold">{errors.propertyId.message}</p>}
            </div>

            {/* Unit */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Rentable Unit</label>
              <Select {...register('unitId')} disabled={!selectedPropertyId}>
                <option value="">Select Unit...</option>
                {availableUnits.map((u) => {
                  const isOccupied = u.status?.toLowerCase() === 'occupied';
                  return (
                    <option key={u.id} value={u.id} disabled={isOccupied}>
                      Unit {u.unitNumber} - {u.status} ({u.bedrooms}B / {u.bathrooms}Ba){isOccupied ? ' - Already occupied cannot create lease again' : ''}
                    </option>
                  );
                })}
              </Select>
              {errors.unitId && <p className="text-rose-500 text-xs font-semibold">{errors.unitId.message}</p>}
            </div>

            {/* Tenant */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Resident / Tenant</label>
              <Select {...register('tenantId')}>
                <option value="">Select Tenant...</option>
                {tenants.map((t: any) => {
                  const isApproved = t.screeningReports?.some((r: any) => r.status === 'Completed' || r.status === 'Approved');
                  return (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} ({t.email || 'No email'}){isApproved ? ' - Screening Approved' : ''}
                    </option>
                  );
                })}
              </Select>
              {errors.tenantId && <p className="text-rose-500 text-xs font-semibold">{errors.tenantId.message}</p>}
            </div>

            {/* Rent Amount */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Monthly Rent ($)</label>
              <Input type="number" {...register('rentAmount', { valueAsNumber: true })} />
              {errors.rentAmount && <p className="text-rose-500 text-xs font-semibold">{errors.rentAmount.message}</p>}
            </div>

            {/* Security Deposit */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Security Deposit ($)</label>
              <Input type="number" {...register('depositAmount', { valueAsNumber: true })} />
              {errors.depositAmount && <p className="text-rose-500 text-xs font-semibold">{errors.depositAmount.message}</p>}
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Lease Start Date</label>
              <Input type="date" {...register('startDate')} />
              {errors.startDate && <p className="text-rose-500 text-xs font-semibold">{errors.startDate.message}</p>}
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Lease End Date</label>
              <Input type="date" {...register('endDate')} />
              {errors.endDate && <p className="text-rose-500 text-xs font-semibold">{errors.endDate.message}</p>}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Lease & Schedule Move In
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewLeasePage;
