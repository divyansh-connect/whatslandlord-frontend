import React from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import api from '../api';
import { Owner } from '../types';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { mapBackendErrors } from '../utils/errorMapping';

const quickOwnerSchema = zod.object({
  name: zod.string().min(1, 'Full Name is required'),
  email: zod.string().email('Invalid email address'),
  phone: zod.string().min(10, 'Phone number must be at least 10 digits'),
  payoutMethod: zod.enum(['ACH/Direct Deposit', 'Wire Transfer', 'Check']),
  password: zod.string().optional().or(zod.literal('')),
});

type QuickOwnerFormInputs = zod.infer<typeof quickOwnerSchema>;

interface QuickAddOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOwnerCreated: (newOwner: Owner) => void;
}

export const QuickAddOwnerModal: React.FC<QuickAddOwnerModalProps> = ({
  isOpen,
  onClose,
  onOwnerCreated,
}) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<QuickOwnerFormInputs>({
    resolver: zodResolver(quickOwnerSchema),
    defaultValues: {
      payoutMethod: 'ACH/Direct Deposit',
      password: 'Password123!',
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: QuickOwnerFormInputs) => {
      return api.owner.create({
        ...values,
        password: values.password || 'Password123!',
      });
    },
    onSuccess: (newOwner: any) => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      reset();
      onClose();
      if (newOwner) {
        onOwnerCreated(newOwner);
      }
    },
    onError: (err: any) => {
      mapBackendErrors(err, setError);
    },
  });

  if (!isOpen) return null;

  const onSubmit = (values: QuickOwnerFormInputs) => {
    createMutation.mutate(values);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 text-foreground max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <h3 className="font-extrabold text-base text-foreground">Add Property Owner</h3>
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Full Name *</label>
            <Input placeholder="e.g. Jane Doe" {...register('name')} />
            {errors.name && <p className="text-rose-500 text-xs font-semibold">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Email *</label>
            <Input type="email" placeholder="jane.doe@example.com" {...register('email')} />
            {errors.email && <p className="text-rose-500 text-xs font-semibold">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Password</label>
            <Input type="password" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="text-rose-500 text-xs font-semibold">{errors.password.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Phone *</label>
            <Input type="tel" placeholder="(555) 555-0100" {...register('phone')} />
            {errors.phone && <p className="text-rose-500 text-xs font-semibold">{errors.phone.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Payout Method</label>
            <Select {...register('payoutMethod')}>
              <option value="ACH/Direct Deposit">ACH/Direct Deposit</option>
              <option value="Wire Transfer">Wire Transfer</option>
              <option value="Check">Check</option>
            </Select>
            {errors.payoutMethod && <p className="text-rose-500 text-xs font-semibold">{errors.payoutMethod.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Owner
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default QuickAddOwnerModal;
