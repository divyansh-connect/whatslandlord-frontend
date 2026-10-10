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
import { CurrencyInput } from '../../components/Phase4Components';
import { Loader2, ArrowLeft, Check, Printer, X, Mail } from 'lucide-react';

const payFormSchema = zod.object({
  tenantId: zod.string().min(1, 'Tenant is required'),
  amount: zod.number().min(1, 'Amount must be positive'),
  dueDate: zod.string().min(1, 'Due Date is required'),
  paidDate: zod.string().min(1, 'Payment Date is required'),
  paymentMethod: zod.enum(['ACH', 'CreditCard', 'DebitCard', 'BankTransfer', 'WireTransfer', 'Cash', 'Check', 'MoneyOrder', 'Zelle']),
  referenceNumber: zod.string().optional(),
  
  allocRent: zod.number().min(0),
  allocUtilities: zod.number().min(0),
  allocParking: zod.number().min(0),
  allocPet: zod.number().min(0),
  notes: zod.string().optional(),
});

type PayFormInputs = zod.infer<typeof payFormSchema>;

export const NewPaymentPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [success, setSuccess] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [sendEmailToggle, setSendEmailToggle] = useState(true);
  const [isEmailSent, setIsEmailSent] = useState(false);

  // Queries
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: () => api.tenant.getAll() });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => api.unit.getAll() });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PayFormInputs>({
    resolver: zodResolver(payFormSchema),
    defaultValues: {
      amount: 1500,
      paymentMethod: 'ACH',
      paidDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      allocRent: 1400,
      allocUtilities: 100,
      allocParking: 0,
      allocPet: 0,
    },
  });

  const selectedTenantId = watch('tenantId');
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const selectedUnit = selectedTenant
    ? (units.find((u) => u.id === selectedTenant.unitId) || units.find((u) => u.propertyId === selectedTenant.propertyId))
    : units[0];
  const paymentMethod = watch('paymentMethod');

  const recordMutation = useMutation({
    mutationFn: (values: PayFormInputs) => {
      return api.payments.create({
        tenantId: values.tenantId,
        tenantName: selectedTenant ? `${selectedTenant.firstName} ${selectedTenant.lastName}` : 'Tenant',
        propertyId: selectedUnit?.propertyId || selectedTenant?.propertyId || '',
        propertyName: selectedUnit?.propertyName || selectedTenant?.propertyName || 'Property',
        unitId: selectedUnit?.id || selectedTenant?.unitId || '',
        unitNumber: selectedUnit?.unitNumber || '101',
        amount: values.amount,
        dueDate: values.dueDate,
        paidDate: values.paidDate,
        paymentMethod: values.paymentMethod,
        referenceNumber: values.referenceNumber || `RCP-${Math.floor(100000 + Math.random() * 900000)}-ZTR`,
        createdBy: 'Manager',
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['payments-list'] });
      queryClient.invalidateQueries({ queryKey: ['rent-ledger-list'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-dashboard-metrics'] });
      setSuccess(true);
      
      // Save data for modal
      setReceiptData({
        receiptNumber: data.referenceNumber,
        tenantName: data.tenant ? `${data.tenant.firstName} ${data.tenant.lastName}` : (data.tenantName || 'Tenant'),
        propertyName: data.property?.name || data.propertyName || 'Property',
        unitNumber: data.unit?.unitNumber || data.unitNumber || 'Unassigned',
        tenantPhone: data.tenant?.phone || 'N/A',
        companyName: data.company?.name || 'Astoria Group',
        companyPhone: data.company?.phone || '+1 (800) 555-0199',
        amount: data.amount,
        paidDate: data.paidDate,
        paymentMethod: data.paymentMethod,
      });
  // If Cash, Zelle, or other manual method is selected, wait for manager interactions. Otherwise do regular redirect.
      const isManualMethod = ['Cash', 'Zelle', 'WireTransfer', 'Check', 'MoneyOrder', 'BankTransfer'].includes(data.paymentMethod);
      if (isManualMethod) {
        setShowReceiptModal(true);
        if (sendEmailToggle) {
          setIsEmailSent(true);
        }
      } else {
        setTimeout(() => navigate({ to: '/payments' }), 1500);
      }
    },
  });

  const onSubmit = (values: PayFormInputs) => {
    recordMutation.mutate(values);
  };

  const handlePrint = () => {
    if (!receiptData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${receiptData.receiptNumber}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1f2937;
              padding: 40px;
              max-width: 480px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .receipt-card {
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              padding: 30px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
            }
            .logo {
              font-size: 24px;
              font-weight: 900;
              letter-spacing: -0.05em;
              color: #2563eb;
              margin: 0;
            }
            .logo span {
              color: #10b981;
            }
            .header h1 {
              font-size: 16px;
              font-weight: 800;
              margin: 10px 0 0 0;
              color: #111827;
            }
            .header p {
              font-size: 11px;
              color: #6b7280;
              margin: 3px 0 0 0;
            }
            .success-stamp {
              background-color: #d1fae5;
              color: #065f46;
              border: 1px solid #a7f3d0;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 4px 14px;
              border-radius: 9999px;
              display: inline-block;
              margin-top: 12px;
              letter-spacing: 0.05em;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .details-table td {
              padding: 12px 0;
              border-bottom: 1px solid #f3f4f6;
              font-size: 13px;
            }
            .details-table td.label {
              color: #6b7280;
              font-weight: 500;
            }
            .details-table td.value {
              text-align: right;
              font-weight: 600;
              color: #1f2937;
            }
            .details-table tr.total td {
              border-bottom: none;
              padding-top: 15px;
              font-size: 15px;
              font-weight: 800;
            }
            .details-table tr.total td.value {
              color: #10b981;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 11px;
              color: #9ca3af;
              border-top: 1px dashed #e5e7eb;
              padding-top: 15px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="header">
              <div class="logo" style="color: #1e3a8a; font-family: 'Segoe UI', sans-serif; font-size: 24px; font-weight: 800; text-transform: uppercase;">${receiptData.companyName}</div>
              <h1>Official Rent Receipt</h1>
              <p>Thank you for settling your balance</p>
              <div class="success-stamp">PAID & CLEARED</div>
            </div>
            <table class="details-table">
              <tr>
                <td class="label">Receipt Number</td>
                <td class="value">${receiptData.receiptNumber}</td>
              </tr>
              <tr>
                <td class="label">Tenant Name</td>
                <td class="value">${receiptData.tenantName}</td>
              </tr>
              <tr>
                <td class="label">Apartment Number</td>
                <td class="value">Unit ${receiptData.unitNumber}</td>
              </tr>
              <tr>
                <td class="label">Phone Number</td>
                <td class="value">${receiptData.tenantPhone}</td>
              </tr>
              <tr>
                <td class="label">Company Contact Number</td>
                <td class="value">${receiptData.companyPhone}</td>
              </tr>
              <tr>
                <td class="label">Payment Method</td>
                <td class="value">${receiptData.paymentMethod}</td>
              </tr>
              <tr>
                <td class="label">Date / Time</td>
                <td class="value">${new Date(receiptData.paidDate).toLocaleString()}</td>
              </tr>
              <tr class="total">
                <td class="label" style="color: #111827;">Total Charged</td>
                <td class="value">$${receiptData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </table>
            <div class="footer">
              ${receiptData.companyName} Payments Gateway • Recorded by Manager<br>
              © 2026 ${receiptData.companyName}. All rights reserved.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Record Payment Receipt"
        description="Log offline checks, cash, or credit transactions directly into the resident ledger."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Rent Collection', href: '/rent' },
          { label: 'Payments', href: '/payments' },
          { label: 'Record Payment' },
        ]}
      />

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-semibold mb-6">
          Payment logged successfully! {['Cash', 'Zelle', 'WireTransfer', 'Check', 'MoneyOrder', 'BankTransfer'].includes(paymentMethod) ? 'Receipt generated.' : 'Redirecting...'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card border border-border p-6 rounded-2xl shadow-sm text-foreground">
        
        {/* --- SECTION 1: TENANT SELECT --- */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-foreground uppercase border-b pb-2">Resident Account</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Tenant</label>
              <Select {...register('tenantId')}>
                <option value="">Select Resident...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} ({t.propertyName ? `${t.propertyName} - Unit ${t.unitNumber}` : 'No Unit'})
                  </option>
                ))}
              </Select>
              {errors.tenantId && <p className="text-rose-500 text-xs">{errors.tenantId.message}</p>}
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Unit Location</label>
              <Input
                value={selectedUnit ? `${selectedUnit.propertyName} • Unit ${selectedUnit.unitNumber}` : 'Unassigned'}
                disabled
              />
            </div>
          </div>
        </div>

        {/* --- SECTION 2: PAYMENT DETAILS --- */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-foreground uppercase border-b pb-2">Payment Parameters</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <CurrencyInput
              label="Payment Amount ($)"
              {...register('amount', { valueAsNumber: true })}
              error={errors.amount?.message}
            />
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Payment Channel</label>
              <Select {...register('paymentMethod')}>
                <option value="ACH">ACH Direct</option>
                <option value="CreditCard">Credit Card</option>
                <option value="DebitCard">Debit Card</option>
                <option value="BankTransfer">Bank Wire</option>
                <option value="WireTransfer">Wire Transfer</option>
                <option value="Check">Check</option>
                <option value="Cash">Cash</option>
                <option value="MoneyOrder">Money Order</option>
                <option value="Zelle">Zelle</option>
              </Select>
            </div>

            {/* Offline Payment Flow Options */}
            {['Cash', 'Zelle', 'WireTransfer', 'Check', 'MoneyOrder', 'BankTransfer'].includes(paymentMethod) && (
              <div className="col-span-2 flex items-center space-x-2.5 bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-2xl animate-in fade-in duration-200">
                <input 
                  type="checkbox" 
                  id="sendEmail" 
                  checked={sendEmailToggle} 
                  onChange={(e) => setSendEmailToggle(e.target.checked)} 
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300 cursor-pointer"
                />
                <label htmlFor="sendEmail" className="text-xs font-bold text-emerald-600 uppercase cursor-pointer select-none">
                  Auto-generate and send payment receipt to tenant
                </label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Payment Date</label>
              <Input type="date" {...register('paidDate')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Due Date Reference</label>
              <Input type="date" {...register('dueDate')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Reference Number</label>
              <Input placeholder="Check # / Wire ID" {...register('referenceNumber')} />
            </div>
          </div>
        </div>

        {/* --- SECTION 3: ALLOCATIONS --- */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-foreground uppercase border-b pb-2">Billing Allocations</h3>
          <div className="grid grid-cols-4 gap-4">
            <CurrencyInput label="Rent ($)" {...register('allocRent', { valueAsNumber: true })} />
            <CurrencyInput label="Utilities ($)" {...register('allocUtilities', { valueAsNumber: true })} />
            <CurrencyInput label="Parking ($)" {...register('allocParking', { valueAsNumber: true })} />
            <CurrencyInput label="Pet Fee ($)" {...register('allocPet', { valueAsNumber: true })} />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-muted-foreground uppercase">Transaction Notes</label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 text-foreground"
            placeholder="Add receipt notes..."
            {...register('notes')}
          />
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: '/payments' })} className="flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Button>
          
          {/* Button states: disabled and muted after click */}
          <Button 
            type="submit" 
            disabled={recordMutation.isPending}
            className={`${recordMutation.isPending ? 'opacity-50 cursor-not-allowed bg-slate-400 hover:bg-slate-400' : ''}`}
          >
            {recordMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {recordMutation.isPending ? 'Recording Payment...' : 'Record Payment Receipt'}
          </Button>
        </div>

      </form>

      {/* CASH PAYMENT RECEIPT POPUP MODAL */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-200 text-foreground">
            <button
              onClick={() => navigate({ to: '/payments' })}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary/40 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2 py-2">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="font-extrabold text-base text-primary uppercase">{receiptData.companyName}</h3>
              <h4 className="font-bold text-sm text-emerald-500">Rent Payment Successful!</h4>
              <p className="text-[10px] text-muted-foreground">The transaction has been successfully recorded.</p>
            </div>

            <div className="p-4 bg-secondary/15 rounded-xl border border-border space-y-3 font-semibold text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Receipt Number</span>
                <span className="font-mono text-foreground font-bold">{receiptData.receiptNumber}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Resident Name</span>
                <span className="text-foreground font-bold">{receiptData.tenantName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Apartment Number</span>
                <span className="text-foreground font-bold">Unit {receiptData.unitNumber}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Phone Number</span>
                <span className="text-foreground font-bold">{receiptData.tenantPhone}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Company Contact Number</span>
                <span className="text-foreground font-bold">{receiptData.companyPhone}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Payment Method</span>
                <span>{receiptData.paymentMethod}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Date / Time</span>
                <span>{new Date(receiptData.paidDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-foreground font-bold">Total Charged</span>
                <span className="text-emerald-500 font-extrabold text-sm">
                  ${receiptData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {isEmailSent && (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 rounded-xl text-[10px] font-bold flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0" />
                <span>Cash receipt email has been automatically generated and sent to the tenant.</span>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-semibold">
                <Printer className="w-4.5 h-4.5" /> Print Receipt
              </Button>
              <Button onClick={() => navigate({ to: '/payments' })}>
                Close & Finish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewPaymentPage;
