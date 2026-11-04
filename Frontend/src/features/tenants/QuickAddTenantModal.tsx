import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Loader2, ChevronDown, UserPlus } from 'lucide-react';
import { mapBackendErrors } from '../../utils/errorMapping';

const tenantFormSchema = zod.object({
  firstName: zod.string().min(1, 'First Name is required'),
  lastName: zod.string().min(1, 'Last Name is required'),
  preferredName: zod.string().optional(),
  dob: zod.string().min(1, 'Date of Birth is required'),
  gender: zod.enum(['Male', 'Female', 'Other']),
  nationality: zod.string().min(1, 'Nationality is required'),
  
  email: zod.string().email('Invalid email address'),
  phone: zod.string().min(1, 'Mobile Phone is required'),
  altPhone: zod.string().optional(),
  password: zod.string().min(6, 'Password must be at least 6 characters'),

  idType: zod.enum(['SSN', 'Driver License', 'Passport', 'State ID']).optional(),
  idNumber: zod.string().optional(),
  
  emergencyName: zod.string().optional(),
  emergencyRelationship: zod.string().optional(),
  emergencyPhone: zod.string().optional(),
  
  employer: zod.string().optional(),
  position: zod.string().optional(),
  monthlyIncome: zod.number().min(0, 'Monthly Income cannot be negative').optional(),
  employmentStatus: zod.enum(['Full-Time', 'Part-Time', 'Self-Employed', 'Unemployed', 'Retired']).optional(),
  
  currentAddress: zod.string().optional(),
  previousAddress: zod.string().optional(),
});

type TenantFormInputs = zod.infer<typeof tenantFormSchema>;

interface QuickAddTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId?: string | null;
  unitNumber?: string;
  onSuccessTenant?: (tenant: any) => void;
}

export const QuickAddTenantModal: React.FC<QuickAddTenantModalProps> = ({
  open,
  onOpenChange,
  unitId,
  unitNumber,
  onSuccessTenant,
}) => {
  const queryClient = useQueryClient();
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TenantFormInputs>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      gender: 'Male',
      nationality: 'American',
      idType: 'Driver License',
      employmentStatus: 'Full-Time',
      monthlyIncome: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: TenantFormInputs) => {
      setServerError(null);
      // 1. Create tenant
      const created = await api.tenant.create({
        ...values,
        unitId: unitId || undefined,
        role: 'Tenant',
      });
      const newTenantId = created?.id || created?.data?.id;
      const tenantName = `${values.firstName} ${values.lastName}`;

      // 2. If unitId is provided, also trigger unit assign to ensure status is updated to Occupied
      if (unitId && newTenantId) {
        try {
          await api.unit.assignTenant(unitId, newTenantId, tenantName);
        } catch (assignErr) {
          console.warn('Unit assign after tenant create warning:', assignErr);
        }
      }

      return created?.data || created;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      if (unitId) {
        queryClient.invalidateQueries({ queryKey: ['unit-detail', unitId] });
      }
      reset();
      setShowAdditionalDetails(false);
      onOpenChange(false);
      if (onSuccessTenant) {
        onSuccessTenant(data);
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create tenant';
      setServerError(msg);
      mapBackendErrors(err, setError);
    },
  });

  const onSubmit = (values: TenantFormInputs) => {
    createMutation.mutate(values);
  };

  const handleClose = () => {
    reset();
    setServerError(null);
    setShowAdditionalDetails(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-foreground text-lg font-bold">
                Register & Add Tenant
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {unitNumber
                  ? `Create a new tenant account and assign directly to Unit ${unitNumber}.`
                  : 'Register a new tenant application account details.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {serverError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl font-medium">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
          {/* PERSONAL INFO */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider border-b pb-1.5">
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">First Name *</label>
                <Input placeholder="John" {...register('firstName')} />
                {errors.firstName && <p className="text-rose-500 text-[10px]">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Last Name *</label>
                <Input placeholder="Doe" {...register('lastName')} />
                {errors.lastName && <p className="text-rose-500 text-[10px]">{errors.lastName.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Preferred Name</label>
                <Input placeholder="Johnny" {...register('preferredName')} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Date of Birth *</label>
                <Input type="date" {...register('dob')} />
                {errors.dob && <p className="text-rose-500 text-[10px]">{errors.dob.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Gender *</label>
                <Select {...register('gender')}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Nationality *</label>
                <Input placeholder="American" {...register('nationality')} />
                {errors.nationality && <p className="text-rose-500 text-[10px]">{errors.nationality.message}</p>}
              </div>
            </div>
          </div>

          {/* CONTACT INFO */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-xs text-foreground uppercase tracking-wider border-b pb-1.5">
              Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Email Address *</label>
                <Input type="email" placeholder="john.doe@example.com" {...register('email')} />
                {errors.email && <p className="text-rose-500 text-[10px]">{errors.email.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Mobile Phone *</label>
                <Input type="tel" placeholder="(512) 555-0199" {...register('phone')} />
                {errors.phone && <p className="text-rose-500 text-[10px]">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Alternate Phone</label>
                <Input type="tel" placeholder="(512) 555-4321" {...register('altPhone')} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Account Password *</label>
                <Input type="password" placeholder="••••••••" {...register('password')} />
                {errors.password && <p className="text-rose-500 text-[10px]">{errors.password.message}</p>}
              </div>
            </div>
          </div>

          {/* ADDITIONAL DETAILS DROPDOWN TOGGLE */}
          <div className="pt-1 border-t">
            <button
              type="button"
              onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
              className="w-full flex items-center justify-between p-3 bg-secondary/20 hover:bg-secondary/40 border border-border/50 rounded-xl transition-all text-left cursor-pointer"
            >
              <div>
                <span className="font-bold text-xs text-foreground uppercase tracking-wide">
                  Additional Details (Optional)
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Government IDs, Emergency Contacts, Employment & Address
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <span>{showAdditionalDetails ? 'Hide' : 'Show'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showAdditionalDetails ? 'rotate-180' : ''}`} />
              </div>
            </button>
          </div>

          {showAdditionalDetails && (
            <div className="space-y-4 pt-1">
              {/* GOVERNMENT IDS */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-muted-foreground uppercase">Government ID</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">ID Type</label>
                    <Select {...register('idType')}>
                      <option value="Driver License">Driver License</option>
                      <option value="SSN">SSN</option>
                      <option value="Passport">Passport</option>
                      <option value="State ID">State ID</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">ID Number</label>
                    <Input placeholder="A1234567" {...register('idNumber')} />
                  </div>
                </div>
              </div>

              {/* EMERGENCY CONTACT */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-muted-foreground uppercase">Emergency Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Contact Name</label>
                    <Input placeholder="Jane Doe" {...register('emergencyName')} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Relationship</label>
                    <Input placeholder="Spouse" {...register('emergencyRelationship')} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Phone</label>
                    <Input placeholder="(512) 555-9999" {...register('emergencyPhone')} />
                  </div>
                </div>
              </div>

              {/* EMPLOYMENT */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-muted-foreground uppercase">Employment Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Employer</label>
                    <Input placeholder="Acme Corp" {...register('employer')} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Position</label>
                    <Input placeholder="Senior Specialist" {...register('position')} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Employment Status</label>
                    <Select {...register('employmentStatus')}>
                      <option value="Full-Time">Full-Time</option>
                      <option value="Part-Time">Part-Time</option>
                      <option value="Self-Employed">Self-Employed</option>
                      <option value="Unemployed">Unemployed</option>
                      <option value="Retired">Retired</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Current Address</label>
                    <Input placeholder="123 Main St, Austin, TX" {...register('currentAddress')} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex justify-end space-x-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {unitNumber ? `Register & Assign to Unit ${unitNumber}` : 'Register & Add Tenant'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
