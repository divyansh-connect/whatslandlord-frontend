import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Loader2 } from 'lucide-react';
import * as zod from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { mapBackendErrors } from '../../utils/errorMapping';

const newRequestFormSchema = zod.object({
  propertyId: zod.string().min(1, 'Property is required'),
  buildingId: zod.string().min(1, 'Building is required'),
  unitId: zod.string().min(1, 'Unit is required'),
  tenantName: zod.string().min(1, 'Resident name is required'),
  category: zod.string().min(1, 'Category is required'),
  priority: zod.enum(['Low', 'Medium', 'High', 'Urgent']),
  description: zod.string().min(1, 'Description of issue is required'),
  preferredTime: zod.string().optional().or(zod.literal('')),
  permissionToEnter: zod.boolean(),
  notes: zod.string().optional().or(zod.literal('')),
});
type RequestFormValues = zod.infer<typeof newRequestFormSchema>;

export const NewRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Queries
  const { data: properties = [] } = useQuery({ queryKey: ['properties'], queryFn: () => api.property.getAll() });
  const { data: buildings = [] } = useQuery({ queryKey: ['buildings'], queryFn: () => api.building.getAll() });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => api.unit.getAll() });
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: () => api.tenant.getAll() });
  const { data: leases = [] } = useQuery({ queryKey: ['leases'], queryFn: () => api.leasing.getLeases() });

  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm<RequestFormValues>({
    resolver: zodResolver(newRequestFormSchema),
    defaultValues: {
      priority: 'Medium',
      permissionToEnter: true,
      category: 'General',
      propertyId: '',
      buildingId: '',
      unitId: '',
      tenantName: '',
      preferredTime: '',
      notes: '',
    }
  });

  const selectedPropertyId = watch('propertyId');
  const selectedBuildingId = watch('buildingId');
  const selectedUnitId = watch('unitId');
  const currentTenantName = watch('tenantName');

  // Reset fields on property change
  React.useEffect(() => {
    const matchingBuilding = buildings.find((b) => b.propertyId === selectedPropertyId);
    setValue('buildingId', matchingBuilding ? matchingBuilding.id : '');
    setValue('unitId', '');
    setValue('tenantName', '');
  }, [selectedPropertyId, buildings, setValue]);

  // Auto-populate resident name when unit is selected
  React.useEffect(() => {
    if (!selectedUnitId) {
      setValue('tenantName', '');
      return;
    }

    // 1. Check tenant by unitId
    const tenant = tenants.find((t: any) => t.unitId === selectedUnitId);
    if (tenant) {
      const name = `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim();
      if (name) {
        setValue('tenantName', name, { shouldValidate: true });
        return;
      }
    }

    // 2. Check unit's tenants list or tenantName
    const unit = units.find((u: any) => u.id === selectedUnitId);
    if (unit?.tenants && Array.isArray(unit.tenants) && unit.tenants.length > 0) {
      const t0 = unit.tenants[0];
      const name = `${t0.firstName || ''} ${t0.lastName || ''}`.trim();
      if (name) {
        setValue('tenantName', name, { shouldValidate: true });
        return;
      }
    }

    if (unit?.tenantName && unit.tenantName !== 'Vacant' && unit.tenantName !== 'Unassigned') {
      setValue('tenantName', unit.tenantName, { shouldValidate: true });
      return;
    }

    // 3. Check active lease
    const lease = leases.find((l: any) => l.unitId === selectedUnitId);
    if (lease?.tenantName && lease.tenantName !== 'Resident') {
      setValue('tenantName', lease.tenantName, { shouldValidate: true });
      return;
    }

    setValue('tenantName', '');
  }, [selectedUnitId, units, tenants, leases, setValue]);

  const filteredUnits = selectedPropertyId
    ? units.filter((u) => u.propertyId === selectedPropertyId || (selectedBuildingId && u.buildingId === selectedBuildingId))
    : [];

  // AI DIY Troubleshooting State
  const [aiTips, setAiTips] = React.useState<{ tips: string[]; category: string; emergencyAlert: boolean; suggestionTitle: string } | null>(null);
  const [loadingTips, setLoadingTips] = React.useState(false);

  const fetchAiTroubleshooting = async () => {
    const desc = watch('description');
    const cat = watch('category');
    if (!desc) return;
    setLoadingTips(true);
    try {
      const result: any = await api.serviceRequests.troubleshoot({ description: desc, category: cat });
      const data = result?.data || result;
      setAiTips(data);
    } catch (e) {
      console.warn('AI Troubleshooting failed:', e);
    } finally {
      setLoadingTips(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (values: RequestFormValues) => {
      const prop = properties.find((p) => p.id === values.propertyId);
      const unit = units.find((u) => u.id === values.unitId);
      const title = values.description
        ? values.description.slice(0, 40) + (values.description.length > 40 ? '...' : '')
        : `${values.category} Service Request`;
      return api.serviceRequests.create({
        ...values,
        title,
        propertyName: prop ? prop.name : 'Property Location',
        unitNumber: unit ? unit.unitNumber : '101',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests-list'] });
      navigate({ to: '/maintenance/requests' });
    },
    onError: (err: any) => {
      mapBackendErrors(err, setError);
    }
  });

  const onSubmit = (data: RequestFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-2xl text-foreground">
      <PageHeader
        title="Submit Maintenance Ticket"
        description="Record resident reported issues, HVAC failures, or common area diagnostics."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Maintenance', href: '/maintenance' },
          { label: 'Requests', href: '/maintenance/requests' },
          { label: 'New Request' },
        ]}
      />

      <Card className="p-6 border bg-card mt-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs font-semibold">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Property Portfolio</label>
              <Select {...register('propertyId')}>
                <option value="">Select Property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              {errors.propertyId && <p className="text-rose-500 text-[10px]">{errors.propertyId.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Unit</label>
              <Select {...register('unitId')} disabled={!selectedPropertyId}>
                <option value="">Select Unit...</option>
                {filteredUnits.map((u) => (
                  <option key={u.id} value={u.id}>Unit {u.unitNumber}</option>
                ))}
              </Select>
              {errors.unitId && <p className="text-rose-500 text-[10px]">{errors.unitId.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Resident Payee Name</label>
            <Input
              placeholder="Resident contact name..."
              {...register('tenantName')}
              readOnly={!!currentTenantName}
              className={
                currentTenantName
                  ? 'bg-muted/70 text-muted-foreground border-border/60 cursor-not-allowed select-none font-medium'
                  : ''
              }
            />
            {errors.tenantName && <p className="text-rose-500">{errors.tenantName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Issue Category</label>
              <Select {...register('category')}>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="HVAC">HVAC</option>
                <option value="Appliance">Appliance Repair</option>
                <option value="Roofing">Roofing</option>
                <option value="Structural">Structural</option>
                <option value="Landscaping">Landscaping</option>
                <option value="Pest Control">Pest Control</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Security">Security</option>
                <option value="General">General Repairs</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Priority Bracket</label>
              <Select {...register('priority')}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent / Emergency</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-muted-foreground uppercase">Description of Issue</label>
              {watch('description') && (
                <button
                  type="button"
                  onClick={fetchAiTroubleshooting}
                  disabled={loadingTips}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 transition"
                >
                  {loadingTips ? <Loader2 className="w-3 h-3 animate-spin" /> : <Loader2 className="w-3 h-3 hidden" />}
                  <span>✨ Get AI DIY Tips</span>
                </button>
              )}
            </div>
            <textarea
              className="w-full min-h-[90px] p-3 rounded-lg border border-border bg-card text-foreground"
              placeholder="Describe the issue, leak rates, or equipment behaviors..."
              {...register('description')}
            />
            {errors.description && <p className="text-rose-500">{errors.description.message}</p>}
          </div>

          {/* AI DIY TROUBLESHOOTING BOX */}
          {aiTips && (
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-primary/5 to-emerald-500/10 rounded-xl border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  🤖 {aiTips.suggestionTitle || 'AI DIY Troubleshooting Tips'}
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  Try Before Submitting
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                Try these 3 simple troubleshooting steps. If these fix your issue, you can cancel this ticket!
              </p>
              <ul className="space-y-1.5 pl-1">
                {aiTips.tips.map((tip, idx) => (
                  <li key={idx} className="text-xs flex items-start gap-2 bg-background/80 p-2 rounded-lg border border-border/40">
                    <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-foreground font-semibold leading-tight">{tip}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center pt-1 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => {
                    alert('Great! Request canceled. We are glad your issue is resolved!');
                    navigate({ to: '/maintenance/requests' });
                  }}
                  className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 underline"
                >
                  ✓ Issue Fixed! Cancel Ticket
                </button>
                <span className="text-[10px] text-muted-foreground italic">Or click 'Submit Request' below if still broken</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 items-center">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Preferred Visit Time</label>
              <Input type="text" placeholder="E.g., Morning 8 AM - 12 PM" {...register('preferredTime')} />
            </div>
            
            <div className="flex items-center space-x-2 pt-5">
              <input type="checkbox" id="enter-check" {...register('permissionToEnter')} />
              <label htmlFor="enter-check" className="text-xs font-bold text-muted-foreground uppercase cursor-pointer">
                Permission to Enter Unit
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Diagnostic Notes (Internal Only)</label>
            <Input placeholder="Internal contractor notes..." {...register('notes')} />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" type="button" onClick={() => navigate({ to: '/maintenance/requests' })}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Submit Request
            </Button>
          </div>

        </form>
      </Card>
    </div>
  );
};
export default NewRequestPage;
