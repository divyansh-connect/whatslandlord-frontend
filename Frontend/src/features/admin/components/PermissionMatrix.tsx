import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Shield, ShieldAlert, Lock, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export interface PermissionItem {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  canExport?: boolean;
}

interface PermissionMatrixProps {
  managerName: string;
  isPrimary: boolean;
  permissions: PermissionItem[];
  onToggle: (module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export', checked: boolean) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  managerName,
  isPrimary,
  permissions,
  onToggle,
  onSave,
  isSaving = false,
}) => {
  const actions: Array<'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'> = [
    'view',
    'create',
    'edit',
    'delete',
    'approve',
    'export',
  ];

  const standardModules = [
    'Dashboard',
    'Properties',
    'Leasing',
    'Tenants',
    'Documents',
    'Owners',
    'Rent & Payments',
    'Accounting',
    'Maintenance',
    'Reports',
    'Communication',
    'AI Assistant',
    'Company Settings',
  ];

  const getFriendlyModuleName = (moduleName: string) => {
    switch (moduleName) {
      case 'Owners':
        return 'Owners (Owner Payouts)';
      case 'Rent & Payments':
        return 'Rent & Payments (Tenant Payments)';
      case 'Accounting':
        return 'Accounting (Vendor Bills & Ledgers)';
      case 'Maintenance':
        return 'Maintenance (My Tasks & Tickets)';
      case 'Company Settings':
        return 'Company Settings (Configuration & Roles)';
      default:
        return moduleName;
    }
  };

  // Ensure all standard modules exist in the displayed list
  const resolvedPermissions = standardModules.map((mod) => {
    if (isPrimary) {
      return {
        module: mod,
        view: true,
        create: true,
        edit: true,
        delete: true,
        approve: true,
        export: true,
      };
    }

    const existing = permissions.find((p) => p.module?.toLowerCase() === mod.toLowerCase());
    if (existing) {
      return {
        module: mod,
        view: mod === 'Company Settings' ? false : Boolean(existing.view ?? existing.canView),
        create: mod === 'Company Settings' ? false : Boolean(existing.create ?? existing.canCreate),
        edit: mod === 'Company Settings' ? false : Boolean(existing.edit ?? existing.canEdit),
        delete: mod === 'Company Settings' ? false : Boolean(existing.delete ?? existing.canDelete),
        approve: mod === 'Company Settings' ? false : Boolean(existing.approve ?? existing.canApprove),
        export: mod === 'Company Settings' ? false : Boolean(existing.export ?? existing.canExport),
      };
    }
    return {
      module: mod,
      view: false,
      create: false,
      edit: false,
      delete: false,
      approve: false,
      export: false,
    };
  });

  return (
    <Card className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* HEADER */}
      <div className="p-4 border-b border-border bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {isPrimary ? (
              <Shield className="w-4 h-4 text-primary" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-indigo-500" />
            )}
            <h4 className="font-extrabold text-xs text-primary uppercase tracking-widest">
              Permission Scope Matrix: {managerName} {isPrimary ? '(Primary Manager)' : '(Co-Manager)'}
            </h4>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
            {isPrimary
              ? 'Primary Manager holds master organizational authority. All privileges are permanently unlocked.'
              : 'Configure module accessibility and operational authority checkboxes for this Co-Manager.'}
          </p>
        </div>

        {!isPrimary && onSave && (
          <Button
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="flex items-center gap-1.5 px-4 h-9 font-bold text-xs self-start md:self-auto"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Permissions'}
          </Button>
        )}
      </div>

      {isPrimary && (
        <div className="mx-4 mt-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2.5 text-xs text-primary font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Primary Manager holds unconstrained root authority across all properties, company billing, staff, and configuration settings.
          </span>
        </div>
      )}

      {/* MATRIX TABLE */}
      <div className="overflow-x-auto p-2">
        <table className="w-full text-left text-xs font-semibold">
          <thead className="bg-secondary/40 text-muted-foreground uppercase border-b border-border">
            <tr>
              <th className="p-3">Module Name</th>
              {actions.map((act) => (
                <th key={act} className="p-3 text-center uppercase tracking-wider text-[10px] font-extrabold">
                  {act}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-foreground">
            {resolvedPermissions.map((p) => {
              const isCompanySettings = p.module === 'Company Settings';
              return (
                <tr
                  key={p.module}
                  className={`transition ${
                    isCompanySettings && !isPrimary
                      ? 'bg-rose-500/5 hover:bg-rose-500/10'
                      : 'hover:bg-secondary/5'
                  }`}
                >
                  <td className="p-3 font-bold flex items-center gap-2">
                    {isCompanySettings && !isPrimary && (
                      <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    )}
                    <span>{getFriendlyModuleName(p.module)}</span>
                    {isCompanySettings && !isPrimary && (
                      <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-extrabold uppercase">
                        Owner Only
                      </span>
                    )}
                  </td>

                  {actions.map((act) => {
                    const isChecked = p[act];
                    const isDisabled = isPrimary || isCompanySettings;

                    return (
                      <td key={act} className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={(e) => onToggle(p.module, act, e.target.checked)}
                          className={`rounded border-border h-4 w-4 transition ${
                            isDisabled
                              ? 'cursor-not-allowed opacity-60 text-muted-foreground'
                              : 'cursor-pointer text-primary focus:ring-primary'
                          }`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default PermissionMatrix;
