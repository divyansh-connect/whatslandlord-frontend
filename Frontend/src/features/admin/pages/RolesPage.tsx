import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../api';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { PermissionMatrix, PermissionItem } from '../components/PermissionMatrix';
import { ShieldCheck, Shield, Trash2, Edit2, UserPlus, Users, Lock } from 'lucide-react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';

export const RolesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);
  const [deleteManagerId, setDeleteManagerId] = useState<string | null>(null);
  const [deleteManagerName, setDeleteManagerName] = useState<string>('');

  // Manager Form State
  const [managerForm, setManagerForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Local Editable Permissions State for Selected Co-Manager
  const [localPermissions, setLocalPermissions] = useState<PermissionItem[]>([]);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const triggerNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch Company Users
  const { data: companyUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['company-users-list'],
    queryFn: () => api.users.getAll(),
  });

  // Filter Managers: Primary Manager & Co-Managers
  const managers = React.useMemo(() => {
    return companyUsers.filter((u: any) => u.role === 'Property Manager' || u.role === 'Co-Manager' || u.isPrimary);
  }, [companyUsers]);

  const primaryManager = React.useMemo(() => {
    return managers.find((m: any) => m.isPrimary || m.role === 'Property Manager') || managers[0];
  }, [managers]);

  const coManagers = React.useMemo(() => {
    if (!primaryManager) return [];
    return managers.filter(
      (m: any) =>
        m.id !== primaryManager.id &&
        !m.isPrimary &&
        m.role !== 'Property Manager' &&
        (m.role === 'Co-Manager' || m.role?.startsWith('Co-Manager'))
    );
  }, [managers, primaryManager]);

  // Selected Active Manager
  const activeManager = React.useMemo(() => {
    if (selectedManagerId) {
      return managers.find((m: any) => m.id === selectedManagerId) || primaryManager;
    }
    // Default to first Co-Manager if available, otherwise Primary Manager
    return coManagers[0] || primaryManager;
  }, [managers, selectedManagerId, coManagers, primaryManager]);

  const isPrimaryActive = Boolean(
    activeManager?.isPrimary ||
    activeManager?.id === primaryManager?.id ||
    activeManager?.role === 'Property Manager'
  );

  // Keep local permissions synchronized when selected manager changes
  useEffect(() => {
    if (activeManager) {
      setLocalPermissions(activeManager.permissions || []);
    }
  }, [activeManager?.id, activeManager?.permissions]);

  // Mutation: Add / Edit Manager
  const saveManagerMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingUserId) {
        return api.users.update(editingUserId, {
          name: data.name,
          phone: data.phone,
          password: data.password || undefined,
        });
      } else {
        return api.users.invite({
          name: data.name,
          email: data.email,
          password: data.password,
          phone: data.phone,
          role: 'Co-Manager',
          status: 'Active',
        });
      }
    },
    onSuccess: (data: any) => {
      triggerNotification(
        editingUserId ? 'Co-Manager details updated successfully!' : 'Co-Manager added successfully!'
      );
      setManagerForm({ name: '', email: '', password: '', phone: '' });
      setFormError(null);
      setEditingUserId(null);
      queryClient.invalidateQueries({ queryKey: ['company-users-list'] });
      if (data?.id) {
        setSelectedManagerId(data.id);
      }
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to save Co-Manager.');
    },
  });

  // Mutation: Update Permissions
  const updatePermissionsMutation = useMutation({
    mutationFn: async (payload: { id: string; permissions: PermissionItem[] }) => {
      return api.users.updatePermissions(payload.id, payload.permissions);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users-list'] });
      triggerNotification(`Permissions for ${activeManager?.name} synchronized successfully!`);
    },
    onError: (err: any) => {
      triggerNotification(err.message || 'Failed to update permissions.', 'info');
    },
  });

  // Mutation: Delete Manager
  const deleteManagerMutation = useMutation({
    mutationFn: (id: string) => api.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-users-list'] });
      triggerNotification('Co-Manager deleted successfully.', 'info');
      setSelectedManagerId(primaryManager?.id || null);
    },
    onError: (err: any) => {
      triggerNotification(err.message || 'Failed to delete manager.', 'info');
    },
  });

  const confirmDeleteManager = () => {
    if (deleteManagerId) {
      deleteManagerMutation.mutate(deleteManagerId);
      setDeleteManagerId(null);
    }
  };

  const handlePermissionToggle = (
    module: string,
    action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export',
    checked: boolean
  ) => {
    if (isPrimaryActive) return; // Primary Manager cannot be edited or restricted!

    setLocalPermissions((prev) => {
      const idx = prev.findIndex((p) => p.module?.toLowerCase() === module.toLowerCase());
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], [action]: checked };
        return copy;
      } else {
        const newItem: PermissionItem = {
          module,
          view: action === 'view' ? checked : false,
          create: action === 'create' ? checked : false,
          edit: action === 'edit' ? checked : false,
          delete: action === 'delete' ? checked : false,
          approve: action === 'approve' ? checked : false,
          export: action === 'export' ? checked : false,
        };
        return [...prev, newItem];
      }
    });
  };

  const handleSavePermissions = () => {
    if (!activeManager || isPrimaryActive) return;
    updatePermissionsMutation.mutate({
      id: activeManager.id,
      permissions: localPermissions,
    });
  };

  return (
    <div className="space-y-6 text-foreground relative">
      <PageHeader
        title="Access Roles & Permissions"
        description="Establish organizational authority levels, add company Co-Managers, and configure dynamic module permission matrices."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Administration' }, { label: 'Roles & Permissions' }]}
      />

      {/* ADD / EDIT CO-MANAGER FORM */}
      <Card className="p-5 border bg-card space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-foreground">
                {editingUserId ? 'Edit Co-Manager Profile' : '+ Add Co-Manager (Sub-Manager)'}
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                Co-Managers operate under your company context with strictly partitioned permissions.
              </p>
            </div>
          </div>
          {editingUserId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingUserId(null);
                setManagerForm({ name: '', email: '', password: '', phone: '' });
                setFormError(null);
              }}
              className="text-xs text-rose-500 hover:bg-rose-500/10 font-bold"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        {formError && (
          <div className="text-xs font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
            {formError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!managerForm.name || !managerForm.email || (!editingUserId && !managerForm.password)) {
              setFormError('Name, email and password are required fields.');
              return;
            }
            saveManagerMutation.mutate(managerForm);
          }}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
        >
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Full Name</label>
            <Input
              required
              placeholder="E.g., Jane Doe"
              value={managerForm.name}
              onChange={(e) => setManagerForm({ ...managerForm, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</label>
            <Input
              required
              type="email"
              placeholder="jane@example.com"
              disabled={!!editingUserId}
              value={managerForm.email}
              onChange={(e) => setManagerForm({ ...managerForm, email: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              {editingUserId ? 'New Password (Optional)' : 'Password'}
            </label>
            <Input
              required={!editingUserId}
              type="password"
              placeholder="••••••••"
              value={managerForm.password}
              onChange={(e) => setManagerForm({ ...managerForm, password: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Mobile Phone</label>
            <Input
              placeholder="E.g., +1 234 567"
              value={managerForm.phone}
              onChange={(e) => setManagerForm({ ...managerForm, phone: e.target.value })}
            />
          </div>
          <div>
            <Button
              type="submit"
              disabled={saveManagerMutation.isPending}
              className="w-full flex items-center justify-center gap-1.5 h-10 font-bold"
            >
              {saveManagerMutation.isPending
                ? 'Saving...'
                : editingUserId
                ? 'Update Co-Manager'
                : 'Add Co-Manager'}
            </Button>
          </div>
        </form>
      </Card>

      {notification && (
        <div className="p-4 rounded-xl text-xs font-bold border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>{notification.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MANAGERS SELECTOR LIST */}
        <div className="space-y-4">
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2 border-border">
              <h4 className="font-extrabold text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Company Managers
              </h4>
            </div>

            {isLoadingUsers ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading managers...</div>
            ) : (
              <div className="space-y-3">
                {/* 1. PRIMARY MANAGER (MASTER OWNER) */}
                {primaryManager && (
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-primary tracking-wider mb-1.5 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" /> Primary Manager (Owner)
                    </div>
                    <div
                      onClick={() => setSelectedManagerId(primaryManager.id)}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        activeManager?.id === primaryManager.id
                          ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                          : 'border-border hover:bg-secondary/20 text-foreground'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-xs flex items-center gap-1.5">
                          {primaryManager.name}
                        </span>
                        <span className="px-2 py-0.5 bg-primary/15 text-primary border border-primary/30 rounded text-[9px] font-black uppercase tracking-wider">
                          PRIMARY
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 font-medium truncate">
                        {primaryManager.email}
                      </p>
                      {primaryManager.phone && (
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {primaryManager.phone}
                        </p>
                      )}
                      <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-1.5 text-[9px] text-primary/80 font-bold">
                        <Lock className="w-3 h-3" />
                        <span>Master Account Owner • Full Access (Protected)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. CO-MANAGERS (SUB-MANAGERS) */}
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider mb-1.5 mt-4">
                    Co-Managers ({coManagers.length})
                  </div>

                  {coManagers.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-border/70 text-center text-[11px] text-muted-foreground">
                      No Co-Managers configured yet. Use the form above to add a sub-manager.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {coManagers.map((m: any) => {
                        const isSelected = activeManager?.id === m.id;
                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedManagerId(m.id)}
                            className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500 shadow-sm ring-1 ring-indigo-500/20'
                                : 'border-border hover:bg-secondary/20 text-foreground'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-extrabold text-xs">{m.name}</span>
                              <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 rounded text-[9px] font-extrabold uppercase">
                                CO-MANAGER
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 font-medium truncate">
                              {m.email}
                            </p>
                            {m.phone && (
                              <p className="text-[10px] text-muted-foreground font-medium">
                                {m.phone}
                              </p>
                            )}

                            {/* CO-MANAGER ACTIONS */}
                            <div
                              className="flex gap-2 mt-2 pt-2 border-t border-border/50 justify-end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setEditingUserId(m.id);
                                  setManagerForm({
                                    name: m.name,
                                    email: m.email,
                                    password: '',
                                    phone: m.phone || '',
                                  });
                                  setFormError(null);
                                }}
                                className="p-1 px-2 hover:bg-primary/10 rounded text-primary text-[10px] font-bold flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteManagerId(m.id);
                                  setDeleteManagerName(m.name);
                                }}
                                className="p-1 px-2 hover:bg-rose-500/10 rounded text-rose-500 text-[10px] font-bold flex items-center gap-1"
                                title="Delete Co-Manager"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ROLE PERMISSION MATRIX */}
        <div className="lg:col-span-2">
          {activeManager ? (
            <PermissionMatrix
              managerName={activeManager.name}
              isPrimary={isPrimaryActive}
              permissions={isPrimaryActive ? [] : localPermissions}
              onToggle={handlePermissionToggle}
              onSave={handleSavePermissions}
              isSaving={updatePermissionsMutation.isPending}
            />
          ) : (
            <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted-foreground shadow-sm py-12">
              <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-xs font-semibold mt-2">
                Select a manager from the list to view and configure their module accessibility.
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteManagerId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteManagerId(null);
        }}
        title="Delete Co-Manager"
        description={`Are you sure you want to delete Co-Manager "${deleteManagerName}"? They will permanently lose access to this company account.`}
        onConfirm={confirmDeleteManager}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};

export default RolesPage;
