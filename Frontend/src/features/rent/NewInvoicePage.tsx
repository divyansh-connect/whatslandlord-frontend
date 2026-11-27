import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { CurrencyInput, AmountSummary } from '../../components/Phase4Components';
import { Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react';

const invoiceSchema = zod.object({
  tenantId: zod.string().min(1, 'Tenant is required'),
  dueDate: zod.string().min(1, 'Due Date is required'),
  notes: zod.string().optional(),
  lineItems: zod.array(zod.object({
    description: zod.string().min(1, 'Description is required'),
    amount: zod.number().min(1, 'Amount must be positive'),
  })).min(1, 'Must add at least 1 line item'),
});

type InvoiceFormInputs = zod.infer<typeof invoiceSchema>;

export const NewInvoicePage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  // Queries
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: () => api.tenant.getAll() });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => api.unit.getAll() });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormInputs>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      dueDate: new Date().toISOString().split('T')[0],
      lineItems: [
        { description: 'Rent Charge', amount: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const selectedTenantId = watch('tenantId');
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const selectedUnit = selectedTenant ? units.find((u) => u.id === selectedTenant.unitId) : null;
  const lineItemsWatch = watch('lineItems') || [];

  React.useEffect(() => {
    if (selectedUnit) {
      const rentIndex = lineItemsWatch.findIndex(item => 
        item.description.toLowerCase().includes('rent')
      );
      const targetIndex = rentIndex !== -1 ? rentIndex : 0;
      setValue(`lineItems.${targetIndex}.amount`, selectedUnit.rentAmount);
    }
  }, [selectedUnit, setValue]);

  // Calculate totals dynamically
  const subtotal = lineItemsWatch.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const total = subtotal;

  const createMutation = useMutation({
    mutationFn: (values: InvoiceFormInputs) => {
      return api.invoices.create({
        tenantId: values.tenantId,
        tenantName: selectedTenant ? `${selectedTenant.firstName} ${selectedTenant.lastName}` : 'Tenant',
        propertyId: selectedUnit ? selectedUnit.propertyId : 'prop-1',
        propertyName: selectedUnit ? selectedUnit.propertyName : 'Property',
        unitNumber: selectedUnit ? selectedUnit.unitNumber : '101',
        dueDate: values.dueDate,
        amount: total,
        status: 'Sent',
        lineItems: values.lineItems,
        notes: values.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
      setSuccess(true);
      setTimeout(() => navigate({ to: '/invoices' }), 2000);
    },
  });

  const onSubmit = (values: InvoiceFormInputs) => {
    createMutation.mutate(values);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Create Invoice"
        description="Compile new resident billing statement, itemize utilities, storage, and miscellaneous fees."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Rent Collection', href: '/rent' },
          { label: 'Invoices', href: '/invoices' },
          { label: 'New Invoice' },
        ]}
      />

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-semibold mb-6">
          Invoice created and dispatched successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card border border-border p-6 rounded-2xl shadow-sm text-foreground">
        
        {/* Tenant Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Tenant</label>
            <Select {...register('tenantId')}>
              <option value="">Select Resident...</option>
              {tenants.filter((t: any) => t.unitId).map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName} ({t.propertyName ? `${t.propertyName} - Unit ${t.unitNumber}` : 'No Unit'})
                </option>
              ))}
            </Select>
            {errors.tenantId && <p className="text-rose-500 text-xs">{errors.tenantId.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Due Date</label>
            <Input type="date" {...register('dueDate')} />
            {errors.dueDate && <p className="text-rose-500 text-xs">{errors.dueDate.message}</p>}
          </div>
        </div>

        {/* Dynamic Line items */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm text-foreground uppercase">Itemized Line Items</h4>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', amount: 100 })} className="text-xs font-semibold">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Line Item
            </Button>
          </div>
          {errors.lineItems && <p className="text-rose-500 text-xs">{errors.lineItems.message as string}</p>}

          <div className="space-y-3">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-secondary/15 p-3.5 rounded-xl border border-border/40">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Item Description</label>
                  <Input placeholder="Rent / Utility Charge" {...register(`lineItems.${idx}.description`)} />
                </div>
                
                <div className="space-y-1">
                  <CurrencyInput
                    label="Charge Amount ($)"
                    min={0.01}
                    step="0.01"
                    {...register(`lineItems.${idx}.amount`, { valueAsNumber: true })}
                  />
                  {errors.lineItems?.[idx]?.amount && (
                    <p className="text-rose-500 text-xs">{errors.lineItems[idx]?.amount?.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="ghost" className="text-rose-500 hover:bg-rose-500/10 h-10 w-10 flex items-center justify-center rounded-lg" onClick={() => remove(idx)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals Summary */}
        <div className="pt-4 border-t">
          <AmountSummary subtotal={subtotal} total={total} />
        </div>

        {/* Notes */}
        <div className="space-y-1 pt-4 border-t">
          <label className="text-xs font-bold text-muted-foreground uppercase">Invoice Notes</label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 text-foreground"
            placeholder="Add notes shown on PDF..."
            {...register('notes')}
          />
        </div>

        {/* FOOTER */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: '/invoices' })} className="flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save & Send Invoice
          </Button>
        </div>

      </form>
    </div>
  );
};
export default NewInvoicePage;
