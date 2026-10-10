import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { FormDialog } from '../../components/FormDialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Loader2 } from 'lucide-react';

interface EditPaymentModalProps {
  payment: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({ payment, open, onOpenChange }) => {
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<number>(0);
  const [paidDate, setPaidDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('ACH');
  const [referenceNumber, setReferenceNumber] = useState<string>('');

  useEffect(() => {
    if (payment) {
      setAmount(payment.amount || 0);
      setPaidDate(payment.paidDate ? payment.paidDate.split('T')[0] : '');
      setPaymentMethod(payment.paymentMethod || 'ACH');
      setReferenceNumber(payment.referenceNumber || '');
    }
  }, [payment]);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.payments.update(payment.id, {
        amount,
        paidDate,
        paymentMethod,
        referenceNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-list'] });
      queryClient.invalidateQueries({ queryKey: ['rent-ledger-list'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
      queryClient.invalidateQueries({ queryKey: ['payment-detail', payment?.id] });
      onOpenChange(false);
    },
  });

  const isTenantOnline =
    payment?.createdBy === 'Tenant' ||
    payment?.createdBy === 'Tenant Portal' ||
    ['Razorpay', 'Stripe', 'AuthorizeNet'].includes(payment?.paymentMethod);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTenantOnline) {
      alert('Online payments made from Tenant Portal cannot be modified.');
      return;
    }
    if (payment) {
      updateMutation.mutate();
    }
  };

  if (!payment) return null;

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={`Edit Payment ${payment.receiptNumber || payment.id}`}>
      <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs font-semibold text-foreground">
        {isTenantOnline && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-medium">
            This payment was processed online via the Tenant Portal. In accordance with accounting compliance, online tenant payments cannot be edited.
          </div>
        )}
        <div className="space-y-1">
          <label className="text-muted-foreground text-[10px] uppercase font-bold">Tenant</label>
          <Input value={payment.tenantName || 'N/A'} disabled className="bg-muted/50" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] uppercase font-bold">Amount ($) *</label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
              disabled={isTenantOnline}
            />
          </div>

          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] uppercase font-bold">Payment Date *</label>
            <Input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              required
              disabled={isTenantOnline}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] uppercase font-bold">Payment Method *</label>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={isTenantOnline}>
              <option value="Offline">Offline (Cash / Direct)</option>
              <option value="Offline (Partial)">Offline (Partial)</option>
              <option value="ACH">ACH / Direct Deposit</option>
              <option value="CreditCard">Credit Card</option>
              <option value="DebitCard">Debit Card</option>
              <option value="BankTransfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Check">Check</option>
              <option value="MoneyOrder">Money Order</option>
              <option value="Zelle">Zelle</option>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] uppercase font-bold">Reference Number</label>
            <Input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. REF-123456"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending} className="bg-primary text-white font-bold">
            {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      </form>
    </FormDialog>
  );
};
