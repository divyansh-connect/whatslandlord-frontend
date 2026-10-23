import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Plus, X, Loader2, Edit2, Trash2, Eye } from 'lucide-react';
import api from '../../api';
import { Owner } from '../../types';
import { PageHeader } from '../../components/PageHeader';
import { useAuthStore } from '../../store/useStore';
import { DataTable } from '../../components/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { mapBackendErrors } from '../../utils/errorMapping';
import { ConfirmDialog } from '../../components/ConfirmDialog';

const ownerFormSchema = zod.object({
  name: zod.string().min(1, 'Full Name is required'),
  email: zod.string().email('Invalid email address'),
  phone: zod.string().min(10, 'Phone number must be at least 10 digits'),
  payoutMethod: zod.enum(['ACH/Direct Deposit', 'Wire Transfer', 'Check']),
  password: zod.string().optional().or(zod.literal('')),
});

type OwnerFormInputs = zod.infer<typeof ownerFormSchema>;

export const OwnersPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isCollectionManager = user?.role === 'Collection Manager';
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [viewingOwner, setViewingOwner] = useState<Owner | null>(null);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [deleteOwnerId, setDeleteOwnerId] = useState<string | null>(null);

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ['owners'],
    queryFn: () => api.owner.getAll(),
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<OwnerFormInputs>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: {
      payoutMethod: 'ACH/Direct Deposit',
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => {
      return api.owner.create(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      setIsModalOpen(false);
      reset();
      setSelectedProperties([]);
    },
    onError: (err: any) => {
      mapBackendErrors(err, setError);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      return api.owner.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      setIsModalOpen(false);
      setEditingOwner(null);
      reset();
      setSelectedProperties([]);
    },
    onError: (err: any) => {
      mapBackendErrors(err, setError);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      const ownerData = owners.find((o) => o.id === id);
      return api.owner.delete(id, ownerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      queryClient.invalidateQueries({ queryKey: ['restore-bin-items'] });
    },
  });

  const handleEditClick = (owner: Owner) => {
    setEditingOwner(owner);
    setSelectedProperties((owner as any).propertiesOwned || []);
    reset({
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      payoutMethod: owner.payoutMethod as any,
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleViewClick = (owner: Owner) => {
    setViewingOwner(owner);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteOwnerId(id);
  };

  const confirmDeleteOwner = () => {
    if (deleteOwnerId) {
      deleteMutation.mutate(deleteOwnerId);
      setDeleteOwnerId(null);
    }
  };

  const onSubmit = (data: OwnerFormInputs) => {
    const payload = {
      ...data,
      role: 'Owner',
      propertiesOwned: selectedProperties,
    };
    if (editingOwner) {
      updateMutation.mutate({ id: editingOwner.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const columns: ColumnDef<Owner>[] = [
    {
      accessorKey: 'name',
      header: t('pmOwners.name'),
      id: 'name',
      cell: ({ row }) => (
        <span className="font-bold">
          {row.original.name}
        </span>
      ),
    },
    { accessorKey: 'email', header: t('pmOwners.email'), id: 'email' },
    { accessorKey: 'phone', header: t('pmOwners.phone'), id: 'phone' },
    {
      accessorKey: 'propertiesOwnedCount',
      header: t('pmOwners.propertiesOwned'),
      id: 'propertiesOwnedCount',
      cell: ({ row }) => {
        const count = properties.filter(
          (p) =>
            p.ownerId === row.original.id ||
            p.owner === row.original.name ||
            ((row.original as any).propertiesOwned || []).includes(p.id)
        ).length;
        return <span className="font-bold">{count || row.original.propertiesOwnedCount || 0}</span>;
      },
    },
    { accessorKey: 'payoutMethod', header: t('pmOwners.payoutMethod'), id: 'payoutMethod' },
    {
      id: 'actions',
      header: t('pmOwners.actions'),
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleViewClick(row.original)}
            title="View Details"
          >
            <Eye className="w-4 h-4 text-emerald-500" />
          </Button>
          {!isCollectionManager && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditClick(row.original)}
                title="Edit Owner"
              >
                <Edit2 className="w-4 h-4 text-primary" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(row.original.id)}
                title="Delete Owner"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('pmOwners.title')}
        description={t('pmOwners.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/' },
          { label: t('pmOwners.title') },
        ]}
        action={isCollectionManager ? undefined : {
          label: t('pmOwners.addOwner'),
          onClick: () => {
            setEditingOwner(null);
            setSelectedProperties([]);
            reset({
              name: '',
              email: '',
              phone: '',
              payoutMethod: 'ACH/Direct Deposit',
            });
            setIsModalOpen(true);
          },
          icon: <Plus className="w-4 h-4" />,
        }}
      />
      <DataTable columns={columns} data={owners} loading={isLoading} />

      {/* Add / Edit Owner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 text-foreground max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="font-extrabold text-base">
                {editingOwner ? 'Edit Property Owner' : 'Add Property Owner'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingOwner(null);
                  setSelectedProperties([]);
                  reset();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Full Name</label>
                <Input
                  placeholder="e.g. Jane Doe"
                  {...register('name')}
                />
                {errors.name && <p className="text-rose-500 text-xs">{errors.name.message}</p>}
              </div>

               <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
                <Input
                  type="email"
                  placeholder="jane.doe@example.com"
                  {...register('email')}
                />
                {errors.email && <p className="text-rose-500 text-xs">{errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Password {editingOwner && <span className="text-[10px] text-muted-foreground lowercase normal-case">(leave blank to keep current)</span>}
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                />
                {errors.password && <p className="text-rose-500 text-xs">{errors.password.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Phone</label>
                <Input
                  type="tel"
                  placeholder="(555) 555-0100"
                  {...register('phone')}
                />
                {errors.phone && <p className="text-rose-500 text-xs">{errors.phone.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Payout Method</label>
                <Select
                  {...register('payoutMethod')}
                >
                  <option value="ACH/Direct Deposit">ACH/Direct Deposit</option>
                  <option value="Wire Transfer">Wire Transfer</option>
                  <option value="Check">Check</option>
                </Select>
                {errors.payoutMethod && <p className="text-rose-500 text-xs">{errors.payoutMethod.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Assign Properties</label>
                <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-2 space-y-2 bg-background">
                  {properties.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-1">No properties available.</p>
                  ) : (
                    properties.map(p => (
                      <label key={p.id} className="flex items-center space-x-2 text-xs font-semibold cursor-pointer text-foreground">
                        <input
                          type="checkbox"
                          value={p.id}
                          checked={selectedProperties.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProperties([...selectedProperties, p.id]);
                            } else {
                              setSelectedProperties(selectedProperties.filter(id => id !== p.id));
                            }
                          }}
                          className="rounded border-input text-primary focus:ring-primary bg-card"
                        />
                        <span>{p.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-border/80">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingOwner(null);
                    setSelectedProperties([]);
                    reset();
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingOwner ? 'Save Changes' : 'Create Owner'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Owner Details Modal */}
      {viewingOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 text-foreground animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <h3 className="font-extrabold text-base">Owner Details</h3>
              <button
                onClick={() => setViewingOwner(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Full Name</span>
                <span className="font-semibold text-foreground bg-accent/40 px-3 py-2 rounded-lg block">{viewingOwner.name}</span>
              </div>

              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Email</span>
                <span className="font-semibold text-foreground bg-accent/40 px-3 py-2 rounded-lg block break-all">{viewingOwner.email}</span>
              </div>

              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Phone</span>
                <span className="font-semibold text-foreground bg-accent/40 px-3 py-2 rounded-lg block">{viewingOwner.phone}</span>
              </div>

              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Payout Method</span>
                <span className="font-semibold text-foreground bg-accent/40 px-3 py-2 rounded-lg block">{viewingOwner.payoutMethod}</span>
              </div>

              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase block mb-1">Owned Properties</span>
                <div className="border border-border rounded-lg p-3 bg-accent/20 max-h-32 overflow-y-auto">
                  {properties.filter(
                    (p) =>
                      p.ownerId === viewingOwner.id ||
                      p.owner === viewingOwner.name ||
                      ((viewingOwner as any).propertiesOwned || []).includes(p.id)
                  ).length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">No properties assigned.</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {properties
                        .filter(
                          (p) =>
                            p.ownerId === viewingOwner.id ||
                            p.owner === viewingOwner.name ||
                            ((viewingOwner as any).propertiesOwned || []).includes(p.id)
                        )
                        .map((p) => (
                          <span key={p.id} className="text-xs font-bold px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full">
                            {p.name}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/80">
              <Button onClick={() => setViewingOwner(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={deleteOwnerId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteOwnerId(null);
        }}
        title="Delete Owner"
        description="Are you sure you want to delete this owner? This action cannot be undone."
        onConfirm={confirmDeleteOwner}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};
export default OwnersPage;
