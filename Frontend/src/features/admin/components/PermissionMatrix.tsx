import React from 'react';
import { Card } from '../../../components/ui/Card';
import { 
  Shield, ShieldAlert, Lock, Save, CheckCircle2, 
  LayoutDashboard, Building2, Key, Users, FileText, 
  UserCheck, CreditCard, BookOpen, Wrench, BarChart3, 
  MessageSquare, Bot, Settings, Check, X, RotateCcw
} from 'lucide-react';
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
  onToggleModule: (module: string, enabled: boolean) => void;
  onToggleAll?: (enabled: boolean) => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  managerName,
  isPrimary,
  permissions,
  onToggleModule,
  onToggleAll,
  onSave,
  isSaving = false,
}) => {
  const standardModules = [
    {
      name: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5 text-blue-500" />,
      desc: 'Access main dashboard overview, performance charts, and summary statistics.',
    },
    {
      name: 'Properties',
      icon: <Building2 className="w-5 h-5 text-indigo-500" />,
      desc: 'View and manage real estate properties, unit configurations, and drafts.',
    },
    {
      name: 'Leasing',
      icon: <Key className="w-5 h-5 text-amber-500" />,
      desc: 'Manage rental leads, tenant screening, move-in/out checklists, and leases.',
    },
    {
      name: 'Tenants',
      icon: <Users className="w-5 h-5 text-emerald-500" />,
      desc: 'Access tenant directory, contact information, and tenant documents.',
    },
    {
      name: 'Documents',
      icon: <FileText className="w-5 h-5 text-sky-500" />,
      desc: 'View, upload, and organize lease agreements, contracts, and company files.',
    },
    {
      name: 'Owners',
      icon: <UserCheck className="w-5 h-5 text-purple-500" />,
      desc: 'View property owner records, ownership splits, and owner statements.',
    },
    {
      name: 'Rent & Payments',
      icon: <CreditCard className="w-5 h-5 text-teal-500" />,
      desc: 'Track monthly rent collections, record incoming payments, and send invoices.',
    },
    {
      name: 'Accounting',
      icon: <BookOpen className="w-5 h-5 text-orange-500" />,
      desc: 'General ledger, charts of accounts, company income, and vendor expense tracking.',
    },
    {
      name: 'Maintenance',
      icon: <Wrench className="w-5 h-5 text-rose-500" />,
      desc: 'Handle maintenance tickets, assign tasks to staff, and track work orders.',
    },
    {
      name: 'Reports',
      icon: <BarChart3 className="w-5 h-5 text-cyan-500" />,
      desc: 'Generate business analytics, rent roll, occupancy rates, and financial reports.',
    },
    {
      name: 'Communication',
      icon: <MessageSquare className="w-5 h-5 text-violet-500" />,
      desc: 'Send notifications, SMS updates, and announcements to tenants and owners.',
    },
    {
      name: 'AI Assistant',
      icon: <Bot className="w-5 h-5 text-pink-500" />,
      desc: 'Use AI chatbot for automated leasing analysis and operational queries.',
    },
    {
      name: 'Restore Bin',
      icon: <RotateCcw className="w-5 h-5 text-amber-500" />,
      desc: 'View, recover, or permanently purge soft-deleted items across modules.',
    },
    {
      name: 'Company Settings',
      icon: <Settings className="w-5 h-5 text-slate-500" />,
      desc: 'Organization billing, integrations, and manager management (Owner only).',
      ownerOnly: true,
    },
  ];

  const isModuleEnabled = (modName: string): boolean => {
    if (isPrimary) return true;
    if (modName === 'Company Settings') return false;
    const existing = permissions.find((p) => p.module?.toLowerCase() === modName.toLowerCase());
    if (existing) {
      return Boolean(existing.view ?? existing.canView);
    }
    return false;
  };

  return (
    <Card className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* HEADER */}
      <div className="p-4 border-b border-border bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {isPrimary ? (
              <Shield className="w-5 h-5 text-primary" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-indigo-500" />
            )}
            <h4 className="font-extrabold text-sm text-foreground uppercase tracking-wider">
              Menu Access Controls: <span className="text-primary">{managerName}</span> {isPrimary ? '(Primary Owner)' : '(Co-Manager)'}
            </h4>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {isPrimary
              ? 'Primary Manager holds master organizational authority. All menus and features are permanently unlocked.'
              : 'Toggle which navigation menus and modules this Co-Manager can view and access.'}
          </p>
        </div>

        {!isPrimary && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            {onToggleAll && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleAll(true)}
                  className="h-8 px-2.5 text-xs font-semibold"
                >
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Enable All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleAll(false)}
                  className="h-8 px-2.5 text-xs font-semibold"
                >
                  <X className="w-3.5 h-3.5 mr-1 text-rose-500" />
                  Disable All
                </Button>
              </>
            )}
            {onSave && (
              <Button
                onClick={onSave}
                disabled={isSaving}
                size="sm"
                className="flex items-center gap-1.5 px-4 h-8 font-bold text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save Permissions'}
              </Button>
            )}
          </div>
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

      {/* TOGGLE CARDS LIST */}
      <div className="p-4 divide-y divide-border/60">
        {standardModules.map((mod) => {
          const isEnabled = isModuleEnabled(mod.name);
          const isLocked = isPrimary || mod.ownerOnly;

          return (
            <div
              key={mod.name}
              className={`py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-4 transition-colors ${
                mod.ownerOnly && !isPrimary ? 'opacity-60' : ''
              }`}
            >
              {/* Module Details */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-secondary/60 border border-border/80 shrink-0">
                  {mod.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {mod.name}
                    </span>
                    {mod.ownerOnly && !isPrimary && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-extrabold uppercase tracking-wide">
                        <Lock className="w-3 h-3" />
                        Owner Only
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-md mt-0.5">
                    {mod.desc}
                  </p>
                </div>
              </div>

              {/* Status Badge & Toggle Switch */}
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`hidden sm:inline-flex text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isEnabled
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isEnabled ? 'Visible & Active' : 'Hidden'}
                </span>

                {/* iOS-Style Toggle Switch */}
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => onToggleModule(mod.name, !isEnabled)}
                  aria-pressed={isEnabled}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isLocked
                      ? 'cursor-not-allowed opacity-50'
                      : ''
                  } ${
                    isEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default PermissionMatrix;
