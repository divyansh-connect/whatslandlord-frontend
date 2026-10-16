import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { PlanLimitReachedModal } from '../../components/PlanLimitReachedModal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import {
  Loader2,
  ArrowLeft,
  Megaphone,
  UserPlus,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Key,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Building2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lock,
  Clock,
  X,
} from 'lucide-react';

export interface MonthPaymentStatus {
  status: 'Paid' | 'Unpaid' | 'Partial';
  paidAmount: number;
  applyLateFee?: boolean;
}

export interface UnitFormItem {
  id: string;
  isCollapsed?: boolean;
  unitNumber: string;
  floor: number;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  rentAmount: number;
  securityDeposit: number;
  availabilityDate: string;
  status: 'Vacant' | 'Occupied' | 'Reserved' | 'Under Maintenance';

  // Vacant Advertising States
  wantToAdvertise: 'yes' | 'no' | null;
  advertiseTime: 'now' | 'later' | null;

  // Occupied Tenant Onboarding States
  provideTenantInfo: 'now' | 'later' | null;
  tenantFirstName: string;
  tenantLastName: string;
  tenantPreferredName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantAltPhone: string;
  tenantPassword: string;
  showPassword?: boolean;
  tenantDob: string;
  tenantGender: string;
  tenantMoveInDate: string;
  tenantInvoiceStartDate?: string;
  tenantPreviousBalance: number | '';
  unpaidMonths?: string[];
  monthPaymentDetails?: Record<string, MonthPaymentStatus>;
  applyGlobalLateFee?: boolean;
  lateFeeAmount?: number;

  // Unit-Specific Late Fee Policy
  isLateFeeEnabled?: boolean;
  lateFeeType?: 'FLAT' | 'PERCENTAGE';
  lateFeeGraceDays?: number;

  // Additional Optional Tenant Details
  showTenantAdditionalDetails?: boolean;
  tenantSsn?: string;
  tenantIdType?: string;
  tenantIdNumber?: string;
  tenantEmergencyName?: string;
  tenantEmergencyRelationship?: string;
  tenantEmergencyPhone?: string;
  tenantEmployer?: string;
  tenantEmployerPhone?: string;
  tenantPosition?: string;
  tenantMonthlyIncome?: number | '';
  tenantEmploymentStatus?: string;
  tenantCurrentAddress?: string;
  tenantPreviousAddress?: string;
}

const createDefaultUnitItem = (index: number): UnitFormItem => ({
  id: `unit-${Date.now()}-${index}`,
  isCollapsed: false,
  unitNumber: '',
  floor: 1,
  bedrooms: 2,
  bathrooms: 2,
  squareFootage: 850,
  rentAmount: 1500,
  securityDeposit: 1500,
  availabilityDate: new Date().toISOString().split('T')[0],
  status: 'Vacant',
  // Late Fee Defaults
  isLateFeeEnabled: false,
  lateFeeType: 'FLAT',
  lateFeeAmount: 50,
  lateFeeGraceDays: 5,
  wantToAdvertise: null,
  advertiseTime: null,
  provideTenantInfo: 'now',
  tenantFirstName: '',
  tenantLastName: '',
  tenantPreferredName: '',
  tenantEmail: '',
  tenantPhone: '',
  tenantAltPhone: '',
  tenantPassword: '123456',
  showPassword: false,
  tenantDob: '',
  tenantGender: 'Male',
  tenantMoveInDate: new Date().toISOString().split('T')[0],
  tenantInvoiceStartDate: new Date().toISOString().split('T')[0],
  tenantPreviousBalance: 0,
  unpaidMonths: [],
  showTenantAdditionalDetails: false,
  tenantSsn: '',
  tenantIdType: 'Driver License',
  tenantIdNumber: '',
  tenantEmergencyName: '',
  tenantEmergencyRelationship: '',
  tenantEmergencyPhone: '',
  tenantEmployer: '',
  tenantEmployerPhone: '',
  tenantPosition: '',
  tenantMonthlyIncome: '',
  tenantEmploymentStatus: 'Full-Time',
  tenantCurrentAddress: '',
  tenantPreviousAddress: '',
});

export interface MonthChipItem {
  id: string;
  label: string;
  dueDate: string;
}

export const generateMonthListFromMoveIn = (moveInDateStr: string): MonthChipItem[] => {
  if (!moveInDateStr) return [];
  const moveInDate = new Date(moveInDateStr);
  if (isNaN(moveInDate.getTime())) return [];

  const now = new Date();
  let currentYear = moveInDate.getFullYear();
  let currentMonth = moveInDate.getMonth();

  const endYear = now.getFullYear();
  const endMonth = now.getMonth();

  if (currentYear > endYear || (currentYear === endYear && currentMonth >= endMonth)) {
    return [];
  }

  const months: MonthChipItem[] = [];

  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const monthObj = new Date(currentYear, currentMonth, 1);
    const id = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const label = monthObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const dueDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

    months.push({ id, label, dueDate });

    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    if (months.length >= 36) break;
  }

  return months;
};

export const NewUnitPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('Units created successfully!');
  const [propertyId, setPropertyId] = useState('');
  const [propertyError, setPropertyError] = useState('');
  const [isPropertyLocked, setIsPropertyLocked] = useState(false);
  const [showChangePropertyConfirm, setShowChangePropertyConfirm] = useState(false);

  // Multi-unit items state
  const [unitItems, setUnitItems] = useState<UnitFormItem[]>([createDefaultUnitItem(0)]);

  // Month payment status popover state
  const [activePopover, setActivePopover] = useState<{ unitId: string; monthId: string } | null>(null);
  const [partialInput, setPartialInput] = useState<string>('');

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleToggleGlobalLateFee = (unitId: string, enabled: boolean) => {
    setUnitItems((prev) =>
      prev.map((item) => {
        if (item.id !== unitId) return item;
        const updatedItem = { ...item, applyGlobalLateFee: enabled };

        const pastMonths = generateMonthListFromMoveIn(item.tenantInvoiceStartDate || item.tenantMoveInDate);
        const rentVal = Number(item.rentAmount || 0);
        const lateFeeVal = enabled ? Number(item.lateFeeAmount || 50) : 0;
        const details = item.monthPaymentDetails || {};

        let totalUnpaidBalance = 0;
        const unpaidMonthsList: string[] = [];

        pastMonths.forEach((m) => {
          const detail = details[m.id] || { status: 'Unpaid', paidAmount: 0 };
          const pAmt = detail.status === 'Paid'
            ? rentVal
            : (detail.status === 'Partial' ? Math.min(rentVal, Number(detail.paidAmount || 0)) : 0);
          
          const monthLateFee = (enabled || detail.applyLateFee) && detail.status !== 'Paid' ? lateFeeVal : 0;
          const due = Math.max(0, rentVal + monthLateFee - pAmt);
          if (due > 0 || detail.status !== 'Paid') {
            unpaidMonthsList.push(m.id);
          }
          totalUnpaidBalance += due;
        });

        return {
          ...updatedItem,
          unpaidMonths: unpaidMonthsList,
          tenantPreviousBalance: totalUnpaidBalance,
        };
      })
    );
  };

  const handleUpdateMonthStatus = (
    unitId: string,
    monthId: string,
    status: 'Paid' | 'Unpaid' | 'Partial',
    customPaidAmount?: number,
    shouldClosePopover: boolean = true
  ) => {
    setUnitItems((prev) =>
      prev.map((item) => {
        if (item.id !== unitId) return item;

        const pastMonths = generateMonthListFromMoveIn(item.tenantInvoiceStartDate || item.tenantMoveInDate);
        const rentVal = Number(item.rentAmount || 0);
        const lateFeeVal = Number(item.lateFeeAmount || 50);

        const existingDetails = item.monthPaymentDetails || {};
        let newPaidAmt = 0;
        if (status === 'Paid') {
          newPaidAmt = rentVal;
        } else if (status === 'Partial') {
          newPaidAmt = Math.min(rentVal, Math.max(0, customPaidAmount ?? Math.round(rentVal / 2)));
        } else {
          newPaidAmt = 0;
        }

        const currentMonthDetail = existingDetails[monthId] || {};
        const updatedDetails = {
          ...existingDetails,
          [monthId]: { ...currentMonthDetail, status, paidAmount: newPaidAmt },
        };

        let totalUnpaidBalance = 0;
        const unpaidMonthsList: string[] = [];

        pastMonths.forEach((m) => {
          const detail = updatedDetails[m.id] || { status: 'Unpaid', paidAmount: 0 };
          const pAmt = detail.status === 'Paid'
            ? rentVal
            : (detail.status === 'Partial' ? Math.min(rentVal, Number(detail.paidAmount || 0)) : 0);
          
          const monthLateFee = (item.applyGlobalLateFee || detail.applyLateFee) && detail.status !== 'Paid' ? lateFeeVal : 0;
          const due = Math.max(0, rentVal + monthLateFee - pAmt);
          if (due > 0 || detail.status !== 'Paid') {
            unpaidMonthsList.push(m.id);
          }
          totalUnpaidBalance += due;
        });

        return {
          ...item,
          monthPaymentDetails: updatedDetails,
          unpaidMonths: unpaidMonthsList,
          tenantPreviousBalance: totalUnpaidBalance,
        };
      })
    );
    if (shouldClosePopover) {
      setActivePopover(null);
    }
  };

  // Queries
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => api.building.getAll(),
  });

  // Helper to update a field in a specific unit item
  const updateUnitItem = <K extends keyof UnitFormItem>(id: string, field: K, value: UnitFormItem[K]) => {
    setUnitItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addUnitItem = () => {
    setUnitItems((prev) => {
      // Auto-collapse previous items so user focuses on new unit
      const collapsedPrev = prev.map((item) => ({ ...item, isCollapsed: true }));
      return [...collapsedPrev, createDefaultUnitItem(prev.length)];
    });
  };

  const removeUnitItem = (id: string) => {
    if (unitItems.length <= 1) return;
    setUnitItems((prev) => prev.filter((item) => item.id !== id));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const invalidItemIds = new Set<string>();

    if (!propertyId) {
      errors.propertyId = 'Property is required';
      setPropertyError('Property is required');
    } else {
      setPropertyError('');
    }

    unitItems.forEach((item) => {
      let hasError = false;
      if (!item.unitNumber.trim()) {
        errors[`unitNumber_${item.id}`] = `Unit Number is required`;
        hasError = true;
      }
      if (!item.rentAmount || item.rentAmount <= 0) {
        errors[`rentAmount_${item.id}`] = `Rent Amount must be positive`;
        hasError = true;
      }
      if (item.status === 'Occupied' && item.provideTenantInfo === 'now') {
        if (!item.tenantFirstName.trim()) {
          errors[`tenantFirstName_${item.id}`] = 'First Name is required';
          hasError = true;
        }
        if (!item.tenantLastName.trim()) {
          errors[`tenantLastName_${item.id}`] = 'Last Name is required';
          hasError = true;
        }
      }

      if (hasError) {
        invalidItemIds.add(item.id);
      }
    });

    // Auto-expand any collapsed unit card that has validation errors so user can see it!
    if (invalidItemIds.size > 0) {
      setUnitItems((prev) =>
        prev.map((item) =>
          invalidItemIds.has(item.id) ? { ...item, isCollapsed: false } : item
        )
      );
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const propObj = properties.find((p) => p.id === propertyId);
      const autoBuilding = buildings.find((b) => b.propertyId === propertyId);
      const targetBuildingId = autoBuilding?.id;
      const bldObj = buildings.find((b) => b.id === targetBuildingId);

      const createdUnits: any[] = [];

      for (const item of unitItems) {
        // 1. Create Unit Record
        const createdUnit = await api.unit.create({
          propertyId,
          buildingId: targetBuildingId,
          unitNumber: item.unitNumber,
          floor: Number(item.floor || 1),
          bedrooms: Number(item.bedrooms || 0),
          bathrooms: Number(item.bathrooms || 0),
          squareFootage: Number(item.squareFootage || 0),
          rentAmount: Number(item.rentAmount || 0),
          securityDeposit: Number(item.securityDeposit || 0),
          availabilityDate: item.availabilityDate,
          status: item.status,
          propertyName: propObj ? propObj.name : 'Unknown Property',
          buildingName: bldObj ? bldObj.name : (propObj ? propObj.name : undefined),
          advertiseListing: item.status === 'Vacant' && item.wantToAdvertise === 'yes' && item.advertiseTime === 'now',
          isLateFeeEnabled: Boolean(item.isLateFeeEnabled),
          lateFeeType: item.lateFeeType || 'FLAT',
          lateFeeAmount: item.isLateFeeEnabled ? Number(item.lateFeeAmount || 0) : null,
          lateFeeGraceDays: item.isLateFeeEnabled ? Number(item.lateFeeGraceDays || 0) : null,
        });

        // 2. If Occupied and Tenant details provided Now
        if (item.status === 'Occupied' && item.provideTenantInfo === 'now' && item.tenantFirstName && item.tenantLastName) {
          let newTenant;
          try {
            // Create Active Tenant
            newTenant = await api.tenant.create({
              firstName: item.tenantFirstName,
              lastName: item.tenantLastName,
              preferredName: item.tenantPreferredName,
              email: item.tenantEmail || `${item.tenantFirstName.toLowerCase()}@example.com`,
              phone: item.tenantPhone || '(512) 555-0199',
              altPhone: item.tenantAltPhone,
              password: item.tenantPassword || '123456',
              dob: item.tenantDob,
              gender: item.tenantGender,
              status: 'Active',
              unitId: createdUnit.id,
              propertyId,
              propertyName: propObj?.name || 'Property',
              unitNumber: item.unitNumber,
              moveInDate: item.tenantMoveInDate,
              invoiceStartDate: item.tenantInvoiceStartDate || item.tenantMoveInDate,
              previousBalance: Number(item.tenantPreviousBalance || 0),
              openingBalance: Number(item.tenantPreviousBalance || 0),
              ssn: item.tenantSsn || undefined,
              idType: item.tenantIdType || 'Driver License',
              idNumber: item.tenantIdNumber || undefined,
              emergencyName: item.tenantEmergencyName || undefined,
              emergencyRelationship: item.tenantEmergencyRelationship || undefined,
              emergencyPhone: item.tenantEmergencyPhone || undefined,
              employer: item.tenantEmployer || undefined,
              employerPhone: item.tenantEmployerPhone || undefined,
              jobPhone: item.tenantEmployerPhone || undefined,
              position: item.tenantPosition || undefined,
              monthlyIncome: item.tenantMonthlyIncome || undefined,
              employmentStatus: item.tenantEmploymentStatus || 'Full-Time',
              currentAddress: item.tenantCurrentAddress || undefined,
              previousAddress: item.tenantPreviousAddress || undefined,
            });
          } catch (tenantErr: any) {
            // Revert unit status back to Vacant if tenant creation fails
            try {
              await api.unit.update(createdUnit.id, { status: 'Vacant' });
            } catch (revErr) {
              console.warn('Unit status revert error handled:', revErr);
            }
            throw tenantErr;
          }



          // Auto-Create Active Lease
          if (api.leasing?.createLease) {
            try {
              const endDate = new Date(item.tenantMoveInDate || new Date());
              endDate.setFullYear(endDate.getFullYear() + 1);
              await api.leasing.createLease({
                tenantId: newTenant.id,
                tenantName: `${item.tenantFirstName} ${item.tenantLastName}`,
                propertyId,
                propertyName: propObj?.name || 'Property',
                unitId: createdUnit.id,
                unitNumber: item.unitNumber,
                startDate: item.tenantMoveInDate,
                endDate: endDate.toISOString().split('T')[0],
                rentAmount: item.rentAmount,
                securityDeposit: item.securityDeposit,
                depositAmount: item.securityDeposit,
                status: 'Active',
              });
            } catch (err) {
              console.warn('Auto lease creation handled:', err);
            }
          }

          // Auto-Generate Monthly Invoices for Past Move-In
          const pastMonths = generateMonthListFromMoveIn(item.tenantInvoiceStartDate || item.tenantMoveInDate);
          if (pastMonths.length > 0 && api.invoices?.create) {
            const unpaidSet = new Set(item.unpaidMonths || []);
            const monthDetails = item.monthPaymentDetails || {};

            for (const monthItem of pastMonths) {
              const detail = monthDetails[monthItem.id] || {
                status: unpaidSet.has(monthItem.id) ? 'Unpaid' : 'Unpaid',
                paidAmount: 0,
              };

              const rentAmt = Number(item.rentAmount || 0);
              const hasLateFee = (item.applyGlobalLateFee || detail.applyLateFee) && detail.status !== 'Paid';
              const lateFeeAmt = hasLateFee ? Number(item.lateFeeAmount || 50) : 0;
              const totalInvAmt = rentAmt + lateFeeAmt;

              const paidAmt = detail.status === 'Paid'
                ? rentAmt
                : (detail.status === 'Partial' ? Math.min(rentAmt, Number(detail.paidAmount || 0)) : 0);
              const remainingBal = Math.max(0, totalInvAmt - paidAmt);
              const invStatus = detail.status === 'Paid'
                ? 'Paid'
                : (detail.status === 'Partial' ? 'Partially Paid' : 'Overdue');

              const lineItems: any[] = [
                {
                  description: `Monthly Rent Charge - ${monthItem.label}`,
                  amount: rentAmt,
                },
              ];

              if (lateFeeAmt > 0) {
                lineItems.push({
                  description: `Overdue Late Fee Charge (10-Day Policy)`,
                  amount: lateFeeAmt,
                });
              }

              try {
                const createdInv = await api.invoices.create({
                  tenantId: newTenant.id,
                  tenantName: `${item.tenantFirstName} ${item.tenantLastName}`,
                  propertyId,
                  propertyName: propObj?.name || 'Property',
                  unitId: createdUnit.id,
                  unitNumber: item.unitNumber,
                  amount: totalInvAmt,
                  balance: remainingBal,
                  paidAmount: paidAmt,
                  dueDate: monthItem.dueDate,
                  status: invStatus,
                  lineItems,
                });

                if (paidAmt > 0 && api.payments?.create) {
                  try {
                    const isPartial = detail.status === 'Partial';
                    await api.payments.create({
                      tenantId: newTenant.id,
                      tenantName: `${item.tenantFirstName} ${item.tenantLastName}`,
                      propertyId,
                      propertyName: propObj?.name || 'Property',
                      unitId: createdUnit.id,
                      unitNumber: item.unitNumber,
                      invoiceId: createdInv?.id,
                      amount: paidAmt,
                      dueDate: monthItem.dueDate,
                      paidDate: monthItem.dueDate,
                      status: isPartial ? 'Partially Paid' : 'Paid',
                      paymentMethod: isPartial ? 'Offline (Partial)' : 'Offline',
                      referenceNumber: `RCP-OCCUPIED-${Math.floor(100000 + Math.random() * 900000)}`,
                      createdBy: 'Manager',
                    });
                  } catch (payErr) {
                    console.warn('Historical payment creation warning:', payErr);
                  }
                }
              } catch (invErr) {
                console.warn('Historical invoice creation handled:', invErr);
              }
            }
          }
        }

        createdUnits.push(createdUnit);
      }

      return createdUnits;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['moveIns'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
      queryClient.invalidateQueries({ queryKey: ['payments-list'] });
      queryClient.invalidateQueries({ queryKey: ['rent-ledger-list'] });

      const count = data.length;
      const msg = count === 1 
        ? 'Unit created successfully!' 
        : `${count} Units created successfully in ${properties.find(p => p.id === propertyId)?.name || 'Property'}!`;
      
      setSuccessMsg(msg);
      setSuccess(true);
      setTimeout(() => navigate({ to: '/units' }), 2500);
    },
    onError: (err: any) => {
      const errMsg = err?.message || err?.response?.data?.error?.message || '';
      if (errMsg.toLowerCase().includes('limit reached') || err?.code === 'PLAN_LIMIT_EXCEEDED' || err?.response?.data?.error?.code === 'PLAN_LIMIT_EXCEEDED') {
        setLimitMessage(errMsg || 'Unit creation limit reached for your active subscription plan.');
        setShowLimitModal(true);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createMutation.mutate();
    }
  };

  return (
    <div className="w-full space-y-5 pb-10">
      <PageHeader
        title="Add Unit"
        description="Register single or multiple rentable unit layouts to a property."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Properties', href: '/properties' },
          { label: 'Units', href: '/units' },
          { label: 'Add Unit' },
        ]}
      />

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-sm font-semibold flex items-center gap-3 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold">{successMsg}</p>
            <p className="text-xs text-emerald-500/80 font-normal mt-0.5">Redirecting to units portfolio...</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* --- GLOBAL PROPERTY SELECTOR CARD (FULL WIDTH) --- */}
        <div className="bg-card border border-border p-5 sm:p-6 rounded-2xl shadow-sm text-foreground space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="w-5 h-5 text-primary shrink-0" />
              <h3 className="text-sm font-extrabold uppercase tracking-wide">Target Property</h3>
            </div>
            {propertyId && isPropertyLocked && (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-600 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 border border-emerald-500/20">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" /> Property Locked
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChangePropertyConfirm(true)}
                  className="h-7 text-xs font-bold"
                >
                  Change Property
                </Button>
              </div>
            )}
          </div>

          <div className="w-full space-y-1">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Property *</label>
            {isPropertyLocked && propertyId ? (
              <div
                onClick={() => setShowChangePropertyConfirm(true)}
                className="h-10 px-3.5 py-2 bg-muted/30 border border-border rounded-xl text-sm font-bold flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-all"
              >
                <span className="flex items-center gap-2.5 text-foreground">
                  <Building2 className="w-4 h-4 text-primary" />
                  {properties.find((p) => p.id === propertyId)?.name || 'Selected Property'}
                </span>
                <span className="text-xs text-primary font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Locked (Click to change)
                </span>
              </div>
            ) : (
              <Select
                value={propertyId}
                onChange={(e) => {
                  const val = e.target.value;
                  setPropertyId(val);
                  if (val) {
                    setPropertyError('');
                    setIsPropertyLocked(true);
                  }
                }}
                className="h-10 text-sm font-semibold w-full"
              >
                <option value="">Select Property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
            {propertyError && <p className="text-rose-500 text-xs font-semibold">{propertyError}</p>}
          </div>
        </div>

        {/* --- IF NO PROPERTY IS SELECTED YET: PLACEHOLDER NOTICE --- */}
        {!propertyId ? (
          <div className="bg-card border border-dashed border-border p-8 sm:p-12 rounded-2xl text-center space-y-3 shadow-xs animate-fade-in my-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h4 className="font-extrabold text-base text-foreground">Select a Target Property First</h4>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Please select a property from the dropdown above. Once selected, the unit configuration details will unlock automatically.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* --- DYNAMIC UNIT CARDS LIST WITH ACCORDION COLLAPSE --- */}
            <div className="space-y-4">
          {unitItems.map((item, index) => (
            <div
              key={item.id}
              className="bg-card border border-border p-5 sm:p-6 rounded-2xl shadow-xl text-foreground space-y-5 transition-all"
            >
              {/* CARD HEADER WITH ACCORDION TOGGLE */}
              <div 
                className="flex items-center justify-between border-b border-border pb-3.5 cursor-pointer select-none"
                onClick={() => updateUnitItem(item.id, 'isCollapsed', !item.isCollapsed)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xs shrink-0">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-foreground">
                        {item.unitNumber ? `Unit ${item.unitNumber}` : `Unit #${index + 1}`}
                      </h4>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        item.status === 'Occupied' 
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      }`}>
                        {item.status} {item.status === 'Occupied' && item.tenantFirstName ? `(${item.tenantFirstName} ${item.tenantLastName})` : ''}
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.isCollapsed 
                        ? `${item.bedrooms} Bed / ${item.bathrooms} Bath • $${item.rentAmount || 0}/mo • Click to expand details`
                        : 'Configure details & tenancy status for this unit layout'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {unitItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUnitItem(item.id)}
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-8 px-2.5 text-xs font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateUnitItem(item.id, 'isCollapsed', !item.isCollapsed)}
                    className="h-8 px-3 text-xs font-extrabold flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    {item.isCollapsed ? (
                      <>
                        <span>Expand</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>Collapse</span>
                        <ChevronUp className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* CARD BODY (VISIBLE IF NOT COLLAPSED) */}
              {!item.isCollapsed && (
                <div className="space-y-6 pt-1 animate-fade-in">
                  
                  {/* --- SECTION 1: UNIT PARAMETERS --- */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Unit Number *</label>
                      <Input
                        placeholder="Suite B / 204"
                        value={item.unitNumber}
                        onChange={(e) => updateUnitItem(item.id, 'unitNumber', e.target.value)}
                        className="h-10 text-sm font-medium"
                      />
                      {formErrors[`unitNumber_${item.id}`] && (
                        <p className="text-rose-500 text-xs font-semibold">{formErrors[`unitNumber_${item.id}`]}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Floor</label>
                      {(() => {
                        const selectedProp = properties.find((p: any) => p.id === propertyId);
                        const autoBuilding = buildings.find((b: any) => b.propertyId === propertyId) || selectedProp?.buildings?.[0];
                        const totalFloorsForProp = Number(
                          selectedProp?.totalFloors ||
                          selectedProp?.floors ||
                          autoBuilding?.floors ||
                          1
                        );
                        const maxOption = Math.max(totalFloorsForProp, item.floor || 1, 5);

                        return (
                          <div>
                            <Select
                              value={item.floor}
                              onChange={(e) => updateUnitItem(item.id, 'floor', Number(e.target.value))}
                              className="h-10 text-sm font-medium"
                            >
                              {Array.from({ length: maxOption }, (_, i) => i + 1).map((fl) => (
                                <option key={fl} value={fl}>
                                  Floor {fl} {fl > totalFloorsForProp ? `(Notice: Property has ${totalFloorsForProp} Floors)` : ''}
                                </option>
                              ))}
                            </Select>
                            {item.floor > totalFloorsForProp && (
                              <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1 mt-1 animate-fade-in">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                Property "{selectedProp?.name || 'Target'}" has only {totalFloorsForProp} floors.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Square Footage</label>
                      <Input
                        type="number"
                        value={item.squareFootage}
                        onChange={(e) => updateUnitItem(item.id, 'squareFootage', Number(e.target.value))}
                        className="h-10 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Bedrooms</label>
                      <Input
                        type="number"
                        value={item.bedrooms}
                        onChange={(e) => updateUnitItem(item.id, 'bedrooms', Number(e.target.value))}
                        className="h-10 text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Bathrooms</label>
                      <Input
                        type="number"
                        step="0.5"
                        value={item.bathrooms}
                        onChange={(e) => updateUnitItem(item.id, 'bathrooms', Number(e.target.value))}
                        className="h-10 text-sm font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Monthly Rent ($) *</label>
                      <Input
                        type="number"
                        value={item.rentAmount}
                        onChange={(e) => updateUnitItem(item.id, 'rentAmount', Number(e.target.value))}
                        className="h-10 text-sm font-medium"
                      />
                      {formErrors[`rentAmount_${item.id}`] && (
                        <p className="text-rose-500 text-xs font-semibold">{formErrors[`rentAmount_${item.id}`]}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Security Deposit ($)</label>
                      <Input
                        type="number"
                        value={item.securityDeposit}
                        onChange={(e) => updateUnitItem(item.id, 'securityDeposit', Number(e.target.value))}
                        className="h-10 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 ${item.status !== 'Occupied' ? 'md:grid-cols-2' : ''} gap-4 pt-3 border-t border-border`}>
                    {item.status !== 'Occupied' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Availability Date</label>
                        <Input
                          type="date"
                          value={item.availabilityDate}
                          onChange={(e) => updateUnitItem(item.id, 'availabilityDate', e.target.value)}
                          className="h-10 text-sm font-medium"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Initial Status *</label>
                      <Select
                        value={item.status}
                        onChange={(e) => updateUnitItem(item.id, 'status', e.target.value as any)}
                        className="h-10 text-sm font-bold bg-primary/5 text-primary border-primary/30"
                      >
                        <option value="Vacant">Vacant</option>
                        <option value="Occupied">Occupied</option>
                        <option value="Reserved">Reserved</option>
                        <option value="Under Maintenance">Under Maintenance</option>
                      </Select>
                    </div>
                  </div>

                  {/* --- UNIT LATE FEE & GRACE PERIOD (OPTIONAL) --- */}
                  <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/15 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs uppercase tracking-wide text-foreground">
                            Late Fee & Grace Period (Optional)
                          </h4>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            Set automated overdue penalty rules specifically for this unit
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">
                          {item.isLateFeeEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant={item.isLateFeeEnabled ? 'default' : 'outline'}
                          onClick={() => updateUnitItem(item.id, 'isLateFeeEnabled', !item.isLateFeeEnabled)}
                          className={`h-7 px-3 text-xs font-bold ${
                            item.isLateFeeEnabled 
                              ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          {item.isLateFeeEnabled ? 'ON' : 'OFF'}
                        </Button>
                      </div>
                    </div>

                    {item.isLateFeeEnabled && (
                      <div className="space-y-3 pt-1 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">
                              Late Fee Type
                            </label>
                            <Select
                              value={item.lateFeeType || 'FLAT'}
                              onChange={(e) => updateUnitItem(item.id, 'lateFeeType', e.target.value as any)}
                              className="h-9 text-xs font-bold"
                            >
                              <option value="FLAT">Flat Fee ($)</option>
                              <option value="PERCENTAGE">Percentage (%)</option>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">
                              {item.lateFeeType === 'PERCENTAGE' ? 'Fee Percentage (%)' : 'Fee Amount ($)'}
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">
                                {item.lateFeeType === 'PERCENTAGE' ? '%' : '$'}
                              </span>
                              <Input
                                type="number"
                                min="0"
                                step={item.lateFeeType === 'PERCENTAGE' ? '0.5' : '1'}
                                value={item.lateFeeAmount ?? 50}
                                onChange={(e) => updateUnitItem(item.id, 'lateFeeAmount', Number(e.target.value))}
                                className="h-9 pl-7 text-xs font-bold"
                                placeholder="50"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">
                              Grace Period (Days)
                            </label>
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                value={item.lateFeeGraceDays ?? 5}
                                onChange={(e) => updateUnitItem(item.id, 'lateFeeGraceDays', Number(e.target.value))}
                                className="h-9 pr-14 text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="5"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-muted-foreground uppercase pointer-events-none select-none">
                                Days
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-2.5 bg-background/80 rounded-xl border border-amber-500/15 text-[11px] text-muted-foreground flex items-center gap-2">
                          <span className="font-bold text-amber-600 dark:text-amber-400">Rule Preview:</span>
                          <span>
                            If rent remains unpaid after{' '}
                            <strong className="text-foreground">{item.lateFeeGraceDays ?? 5} days</strong> of due date, an automated{' '}
                            <strong className="text-foreground">
                              {item.lateFeeType === 'PERCENTAGE' ? `${item.lateFeeAmount || 5}% of rent` : `$${item.lateFeeAmount || 50}`}
                            </strong>{' '}
                            late fee invoice will be charged to the tenant.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* --- DYNAMIC FLOW 1: VACANT ADVERTISING PROMPTS --- */}
                  {item.status === 'Vacant' && (
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3 animate-fade-in text-xs font-semibold">
                      <div className="flex items-center gap-2 text-primary border-b border-primary/10 pb-2">
                        <Megaphone className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <h4 className="font-extrabold text-xs uppercase">Vacant Unit Advertising & Listing</h4>
                          <p className="text-[10px] text-muted-foreground font-normal">Manage marketing and tenant recruitment preferences</p>
                        </div>
                      </div>

                      {/* Prompt 1 */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-background p-2.5 rounded-xl border border-border">
                        <p className="text-foreground text-xs font-bold">
                          “This unit is vacant. Would you like to advertise/list this vacant unit or apartment?”
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={item.wantToAdvertise === 'yes' ? 'default' : 'outline'}
                            onClick={() => updateUnitItem(item.id, 'wantToAdvertise', 'yes')}
                            className="font-bold h-8 px-4 text-xs"
                          >
                            Yes
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={item.wantToAdvertise === 'no' ? 'default' : 'outline'}
                            onClick={() => {
                              updateUnitItem(item.id, 'wantToAdvertise', 'no');
                              updateUnitItem(item.id, 'advertiseTime', null);
                            }}
                            className="font-bold h-8 px-4 text-xs"
                          >
                            No
                          </Button>
                        </div>
                      </div>

                      {/* Prompt 2 (If Yes) */}
                      {item.wantToAdvertise === 'yes' && (
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-background p-2.5 rounded-xl border border-border animate-fade-in">
                          <p className="text-foreground text-xs font-bold">
                            “Would you like to advertise this now or later?”
                          </p>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={item.advertiseTime === 'now' ? 'default' : 'outline'}
                              onClick={() => updateUnitItem(item.id, 'advertiseTime', 'now')}
                              className="font-bold h-8 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Now (List Immediately)
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={item.advertiseTime === 'later' ? 'default' : 'outline'}
                              onClick={() => updateUnitItem(item.id, 'advertiseTime', 'later')}
                              className="font-bold h-8 px-4 text-xs"
                            >
                              Later (Save Draft)
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- DYNAMIC FLOW 2: OCCUPIED TENANT INFORMATION FORM --- */}
                  {item.status === 'Occupied' && (
                    <div className="bg-secondary/40 border border-border rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in text-xs font-semibold">
                      <div className="flex items-center justify-between border-b border-border pb-2.5">
                        <div className="flex items-center gap-2 text-primary">
                          <UserPlus className="w-4.5 h-4.5 text-primary shrink-0" />
                          <div>
                            <h4 className="font-extrabold text-xs uppercase">Occupied Tenant Information</h4>
                            <p className="text-[10px] text-muted-foreground font-normal">Register existing resident details to auto-generate lease & completed move-in</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-[10px] font-extrabold uppercase">
                          Active Resident
                        </span>
                      </div>

                      {/* Ask Prompt */}
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-background p-3 rounded-xl border border-border">
                        <p className="text-foreground text-xs font-bold">
                          “Would you like to provide the tenant information now or later?”
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={item.provideTenantInfo === 'now' ? 'default' : 'outline'}
                            onClick={() => updateUnitItem(item.id, 'provideTenantInfo', 'now')}
                            className="font-bold h-8 px-4 text-xs"
                          >
                            Now (Enter Details)
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={item.provideTenantInfo === 'later' ? 'default' : 'outline'}
                            onClick={() => updateUnitItem(item.id, 'provideTenantInfo', 'later')}
                            className="font-bold h-8 px-4 text-xs"
                          >
                            Later
                          </Button>
                        </div>
                      </div>

                      {/* Tenant Details Form (If Now) */}
                      {item.provideTenantInfo === 'now' && (
                        <div className="space-y-4 pt-1 animate-fade-in">
                          
                          {/* Personal Information Group */}
                          <div className="space-y-2.5">
                            <h5 className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider border-b pb-1">
                              Personal Information
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">First Name *</label>
                                <Input
                                  placeholder="John"
                                  value={item.tenantFirstName}
                                  onChange={(e) => updateUnitItem(item.id, 'tenantFirstName', e.target.value)}
                                  className="h-8.5 text-xs"
                                />
                                {formErrors[`tenantFirstName_${item.id}`] && (
                                  <p className="text-rose-500 text-[10px] font-semibold">{formErrors[`tenantFirstName_${item.id}`]}</p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Last Name *</label>
                                <Input
                                  placeholder="Doe"
                                  value={item.tenantLastName}
                                  onChange={(e) => updateUnitItem(item.id, 'tenantLastName', e.target.value)}
                                  className="h-8.5 text-xs"
                                />
                                {formErrors[`tenantLastName_${item.id}`] && (
                                  <p className="text-rose-500 text-[10px] font-semibold">{formErrors[`tenantLastName_${item.id}`]}</p>
                                )}
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Preferred Name</label>
                                <Input
                                  placeholder="Johnny"
                                  value={item.tenantPreferredName}
                                  onChange={(e) => updateUnitItem(item.id, 'tenantPreferredName', e.target.value)}
                                  className="h-8.5 text-xs"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Date of Birth</label>
                                <Input
                                  type="date"
                                  value={item.tenantDob}
                                  onChange={(e) => updateUnitItem(item.id, 'tenantDob', e.target.value)}
                                  className="h-8.5 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Gender</label>
                                <Select
                                  value={item.tenantGender}
                                  onChange={(e) => updateUnitItem(item.id, 'tenantGender', e.target.value)}
                                  className="h-8.5 text-xs"
                                >
                                  <option value="Male">Male</option>
                                  <option value="Female">Female</option>
                                  <option value="Other">Other</option>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Contact & Portal Login Details Group */}
                          <div className="space-y-2.5 pt-1">
                            <h5 className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider border-b pb-1 flex items-center justify-between">
                              <span>Contact & Tenant Portal Credentials</span>
                              <span className="text-[9px] text-primary font-normal">Dashboard Access Setup</span>
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Email Address *</label>
                                <Input
                                  type="email"
                                  placeholder="john.doe@example.com"
                                  value={item.tenantEmail}
                                  onChange={(e) => updateUnitItem(item.id, 'tenantEmail', e.target.value)}
                                  className="h-8.5 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Mobile Phone *</label>
                                <Input
                                  placeholder="(512) 555-0199"
                                  value={item.tenantPhone}
                                  onChange={(e) => updateUnitItem(item.id, 'tenantPhone', e.target.value)}
                                  className="h-8.5 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">Alternate Phone</label>
                                <Input
                                  placeholder="(512) 555-4321"
                                  value={item.tenantAltPhone}
                                  onChange={(e) => updateUnitItem(item.id, 'tenantAltPhone', e.target.value)}
                                  className="h-8.5 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                  <Key className="w-3 h-3 text-primary" /> Tenant Password *
                                </label>
                                <div className="relative">
                                  <Input
                                    type={item.showPassword ? 'text' : 'password'}
                                    placeholder="Password for dashboard"
                                    value={item.tenantPassword}
                                    onChange={(e) => updateUnitItem(item.id, 'tenantPassword', e.target.value)}
                                    className="h-8.5 text-xs pr-8"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateUnitItem(item.id, 'showPassword', !item.showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                                  >
                                    {item.showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Tenancy & Financial History Group */}
                          <div className="space-y-2.5 pt-1">
                            <h5 className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider border-b pb-1">
                              Tenancy Dates & Outstanding Balance
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-background p-3.5 rounded-xl border border-border">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-primary" /> Move-In Date *
                                </label>
                                <Input
                                  type="date"
                                  value={item.tenantMoveInDate}
                                  onChange={(e) => updateUnitItem(item.id, 'tenantMoveInDate', e.target.value)}
                                  className="h-8.5 text-xs"
                                />
                                <p className="text-[9px] text-muted-foreground italic mt-0.5">
                                  Date tenant resides from
                                </p>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Invoices From Date *
                                </label>
                                <Input
                                  type="date"
                                  value={item.tenantInvoiceStartDate || item.tenantMoveInDate}
                                  onChange={(e) => updateUnitItem(item.id, 'tenantInvoiceStartDate', e.target.value)}
                                  className="h-8.5 text-xs"
                                />
                                <p className="text-[9px] text-muted-foreground italic mt-0.5">
                                  Date to start generating invoices from
                                </p>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                  <DollarSign className="w-3.5 h-3.5 text-amber-500" /> Outstanding Balance ($)
                                </label>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={item.tenantPreviousBalance}
                                  onChange={(e) =>
                                    updateUnitItem(
                                      item.id,
                                      'tenantPreviousBalance',
                                      e.target.value === '' ? '' : Number(e.target.value)
                                    )
                                  }
                                  className="h-8.5 text-xs"
                                />
                                <p className="text-[9px] text-muted-foreground italic mt-0.5">
                                  Initial balance logged in ledger
                                </p>
                              </div>
                            </div>

                            {/* Monthly Billing Breakdown (Chips/Badges) for Past Move-In */}
                            {(() => {
                              const pastMonths = generateMonthListFromMoveIn(item.tenantInvoiceStartDate || item.tenantMoveInDate);
                              if (pastMonths.length === 0) return null;

                              const rentVal = Number(item.rentAmount || 0);
                              const details = item.monthPaymentDetails || {};

                              let paidCount = 0;
                              let partialCount = 0;
                              let unpaidCount = 0;

                              let totalPaidAmount = 0;
                              let totalUnpaidAmount = 0;

                              pastMonths.forEach((m) => {
                                const d = details[m.id] || { status: 'Unpaid', paidAmount: 0 };
                                const monthLateFee = (item.applyGlobalLateFee || d.applyLateFee) && d.status !== 'Paid' ? Number(item.lateFeeAmount || 50) : 0;

                                if (d.status === 'Paid') {
                                  paidCount++;
                                  totalPaidAmount += rentVal;
                                } else if (d.status === 'Partial') {
                                  partialCount++;
                                  const pAmt = Math.min(rentVal, Number(d.paidAmount || 0));
                                  totalPaidAmount += pAmt;
                                  totalUnpaidAmount += Math.max(0, rentVal + monthLateFee - pAmt);
                                } else {
                                  unpaidCount++;
                                  totalUnpaidAmount += (rentVal + monthLateFee);
                                }
                              });

                              return (
                                <div className="bg-background p-3 rounded-xl border border-primary/30 space-y-2 mt-2">
                                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border pb-2">
                                    <div>
                                      <h6 className="font-extrabold text-[11px] text-foreground uppercase tracking-wide flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-primary" /> Monthly Billing Status ({pastMonths.length} Months Past)
                                      </h6>
                                      <p className="text-[9px] text-muted-foreground">
                                        Click a month chip to set status: <span className="text-emerald-500 font-bold">Paid</span>, <span className="text-amber-500 font-bold">Partial</span>, or <span className="text-rose-500 font-bold">Unpaid</span>. Unpaid months auto-calculate balance.
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                                      <label className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-md border border-amber-500/30 cursor-pointer hover:bg-amber-500/15 transition-all select-none">
                                        <input
                                          type="checkbox"
                                          checked={item.applyGlobalLateFee ?? false}
                                          onChange={(e) => handleToggleGlobalLateFee(item.id, e.target.checked)}
                                          className="rounded border-amber-500 text-amber-600 focus:ring-amber-500 w-3 h-3 cursor-pointer"
                                        />
                                        <span>Include $50 Late Fee for Unpaid Months</span>
                                      </label>

                                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-md border border-emerald-500/20">
                                        Paid: {paidCount} (${totalPaidAmount.toLocaleString()})
                                      </span>
                                      {partialCount > 0 && (
                                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-md border border-amber-500/20">
                                          Partial: {partialCount}
                                        </span>
                                      )}
                                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-md border border-rose-500/20">
                                        Unpaid: {unpaidCount} (${totalUnpaidAmount.toLocaleString()})
                                      </span>
                                    </div>
                                  </div>

                                  {/* Compact Chips Grid */}
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {pastMonths.map((m) => {
                                      const d = details[m.id] || { status: 'Unpaid', paidAmount: 0 };
                                      const isPopoverOpen = activePopover?.unitId === item.id && activePopover?.monthId === m.id;
                                      const monthHasLateFee = (item.applyGlobalLateFee || d.applyLateFee) && d.status !== 'Paid';
                                      const monthDue = Math.max(0, rentVal + (monthHasLateFee ? 50 : 0) - d.paidAmount);

                                      return (
                                        <div key={m.id} className="relative inline-block">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (isPopoverOpen) {
                                                setActivePopover(null);
                                              } else {
                                                setActivePopover({ unitId: item.id, monthId: m.id });
                                                setPartialInput(d.status === 'Partial' ? String(d.paidAmount) : String(Math.round(rentVal / 2)));
                                              }
                                            }}
                                            className={`px-2 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                                              d.status === 'Paid'
                                                ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/40 hover:bg-emerald-500/25 shadow-xs'
                                                : d.status === 'Partial'
                                                ? 'bg-amber-500/15 text-amber-600 border border-amber-500/40 hover:bg-amber-500/25 shadow-xs'
                                                : 'bg-rose-500/15 text-rose-500 border border-rose-500/40 hover:bg-rose-500/25 shadow-xs'
                                            }`}
                                          >
                                            {d.status === 'Paid' ? (
                                              <>
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                <span>{m.label}</span>
                                                <span className="text-[9px] opacity-75 font-normal">(Paid)</span>
                                              </>
                                            ) : d.status === 'Partial' ? (
                                              <>
                                                <Clock className="w-3 h-3 text-amber-500" />
                                                <span>{m.label}</span>
                                                <span className="text-[9px] font-bold">(${d.paidAmount} Paid / ${monthDue} Due)</span>
                                              </>
                                            ) : (
                                              <>
                                                <XCircle className="w-3 h-3 text-rose-500" />
                                                <span>{m.label}</span>
                                                <span className="text-[9px] opacity-75 font-normal">(Unpaid - ${monthDue})</span>
                                              </>
                                            )}
                                          </button>

                                          {/* Sleek Floating Popover */}
                                          {isPopoverOpen && (
                                            <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 p-3 bg-card text-card-foreground rounded-xl shadow-2xl border border-primary/30 animate-in fade-in zoom-in-95 space-y-2">
                                              <div className="flex items-center justify-between border-b border-border pb-1.5">
                                                <span className="font-extrabold text-[11px] text-foreground uppercase tracking-wide">
                                                  {m.label} Payment Status
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => setActivePopover(null)}
                                                  className="text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-muted cursor-pointer"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </div>

                                              <div className="grid grid-cols-3 gap-1 pt-1">
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateMonthStatus(item.id, m.id, 'Paid')}
                                                  className={`px-1.5 py-1 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer ${
                                                    d.status === 'Paid'
                                                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                                                      : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20'
                                                  }`}
                                                >
                                                  Full Paid
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const amt = Number(partialInput || Math.round(rentVal / 2));
                                                    handleUpdateMonthStatus(item.id, m.id, 'Partial', amt, false);
                                                  }}
                                                  className={`px-1.5 py-1 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer ${
                                                    d.status === 'Partial'
                                                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                                                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20'
                                                  }`}
                                                >
                                                  Partial
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateMonthStatus(item.id, m.id, 'Unpaid')}
                                                  className={`px-1.5 py-1 rounded-lg text-[10px] font-extrabold transition-all border cursor-pointer ${
                                                    d.status === 'Unpaid'
                                                      ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                                                      : 'bg-rose-500/10 text-rose-600 border-rose-500/30 hover:bg-rose-500/20'
                                                  }`}
                                                >
                                                  Unpaid
                                                </button>
                                              </div>

                                              {d.status !== 'Paid' && (
                                                <div className="pt-1.5 border-t border-border/60">
                                                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 cursor-pointer select-none">
                                                    <input
                                                      type="checkbox"
                                                      checked={Boolean(d.applyLateFee ?? item.applyGlobalLateFee)}
                                                      onChange={(e) => {
                                                        const isChecked = e.target.checked;
                                                        setUnitItems((prev) =>
                                                          prev.map((u) => {
                                                            if (u.id !== item.id) return u;
                                                            const currentDetails = u.monthPaymentDetails || {};
                                                            const existingD = currentDetails[m.id] || { status: 'Unpaid', paidAmount: 0 };
                                                            const updatedD = { ...existingD, applyLateFee: isChecked };
                                                            const newDetails = { ...currentDetails, [m.id]: updatedD };
                                                            
                                                            let totalUnpaidBalance = 0;
                                                            const unpaidList: string[] = [];
                                                            pastMonths.forEach((pM) => {
                                                              const pDetail = newDetails[pM.id] || { status: 'Unpaid', paidAmount: 0 };
                                                              const pAmt = pDetail.status === 'Paid' ? rentVal : (pDetail.status === 'Partial' ? Math.min(rentVal, Number(pDetail.paidAmount || 0)) : 0);
                                                              const lateFee = (u.applyGlobalLateFee || pDetail.applyLateFee) && pDetail.status !== 'Paid' ? Number(u.lateFeeAmount || 50) : 0;
                                                              const due = Math.max(0, rentVal + lateFee - pAmt);
                                                              if (due > 0 || pDetail.status !== 'Paid') unpaidList.push(pM.id);
                                                              totalUnpaidBalance += due;
                                                            });
                                                            return { ...u, monthPaymentDetails: newDetails, unpaidMonths: unpaidList, tenantPreviousBalance: totalUnpaidBalance };
                                                          })
                                                        );
                                                      }}
                                                      className="rounded border-amber-500 text-amber-600 focus:ring-amber-500 w-3 h-3 cursor-pointer"
                                                    />
                                                    <span>Include $50 Late Fee for {m.label}</span>
                                                  </label>
                                                </div>
                                              )}

                                              {d.status === 'Partial' && (
                                                <div className="pt-2 border-t border-border space-y-1.5">
                                                  <div className="flex items-center justify-between text-[10px] font-bold">
                                                    <span className="text-muted-foreground uppercase">Paid Amount ($):</span>
                                                    <span className="text-amber-600">Rent: ${rentVal}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Input
                                                      type="number"
                                                      min={0}
                                                      max={rentVal}
                                                      value={partialInput}
                                                      onChange={(e) => setPartialInput(e.target.value)}
                                                      className="h-7 text-xs font-bold"
                                                      placeholder="Amount"
                                                    />
                                                    <Button
                                                      type="button"
                                                      size="sm"
                                                      className="h-7 px-2.5 text-[10px] font-extrabold bg-amber-500 hover:bg-amber-600 text-white shrink-0 cursor-pointer"
                                                      onClick={() => handleUpdateMonthStatus(item.id, m.id, 'Partial', Number(partialInput || 0))}
                                                    >
                                                      Save
                                                    </Button>
                                                  </div>
                                                  {Number(partialInput || 0) < rentVal && (
                                                    <p className="text-[9px] text-rose-500 font-bold">
                                                      Remaining Due: ${(monthDue).toLocaleString()}
                                                    </p>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* ADDITIONAL DETAILS DROPDOWN TOGGLE */}
                          <div className="pt-2 border-t border-border/60">
                            <button
                              type="button"
                              onClick={() => updateUnitItem(item.id, 'showTenantAdditionalDetails', !item.showTenantAdditionalDetails)}
                              className="w-full flex items-center justify-between p-3 bg-background hover:bg-muted/40 border border-border rounded-xl transition-all text-left cursor-pointer"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-xs text-foreground uppercase tracking-wide">
                                    Additional Details (Optional)
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Government IDs, Emergency Contacts, Employment Parameters & Address History
                                </p>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-primary">
                                <span>{item.showTenantAdditionalDetails ? 'Hide Details' : 'Show Details'}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${item.showTenantAdditionalDetails ? 'rotate-180' : ''}`} />
                              </div>
                            </button>
                          </div>

                          {item.showTenantAdditionalDetails && (
                            <div className="space-y-4 animate-fade-in pt-1 bg-background p-3.5 rounded-xl border border-border">
                              {/* GOVERNMENT IDS */}
                              <div className="space-y-2">
                                <h6 className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider border-b pb-1">
                                  Government IDs (Optional)
                                </h6>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">ID Type</label>
                                    <Select
                                      value={item.tenantIdType || 'Driver License'}
                                      onChange={(e) => updateUnitItem(item.id, 'tenantIdType', e.target.value)}
                                      className="h-8.5 text-xs"
                                    >
                                      <option value="Driver License">Driver License</option>
                                      <option value="Passport">Passport</option>
                                      <option value="State ID">State ID</option>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">ID Number</label>
                                    <Input
                                      placeholder="A1234567"
                                      value={item.tenantIdNumber || ''}
                                      onChange={(e) => updateUnitItem(item.id, 'tenantIdNumber', e.target.value)}
                                      className="h-8.5 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* EMERGENCY CONTACT */}
                              <div className="space-y-2 pt-1">
                                <h6 className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider border-b pb-1">
                                  Emergency Contact (Optional)
                                </h6>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Contact Name</label>
                                    <Input
                                      placeholder="Mary Doe"
                                      value={item.tenantEmergencyName || ''}
                                      onChange={(e) => updateUnitItem(item.id, 'tenantEmergencyName', e.target.value)}
                                      className="h-8.5 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Relationship</label>
                                    <Input
                                      placeholder="Spouse / Parent"
                                      value={item.tenantEmergencyRelationship || ''}
                                      onChange={(e) => updateUnitItem(item.id, 'tenantEmergencyRelationship', e.target.value)}
                                      className="h-8.5 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Emergency Phone</label>
                                    <Input
                                      type="tel"
                                      placeholder="(512) 555-9876"
                                      value={item.tenantEmergencyPhone || ''}
                                      onChange={(e) => updateUnitItem(item.id, 'tenantEmergencyPhone', e.target.value)}
                                      className="h-8.5 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* EMPLOYMENT PARAMETERS */}
                              <div className="space-y-2 pt-1">
                                <h6 className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider border-b pb-1">
                                  Employment Parameters (Optional)
                                </h6>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Employer Name (Current Job)</label>
                                    <Input
                                      placeholder="Google Inc."
                                      value={item.tenantEmployer || ''}
                                      onChange={(e) => updateUnitItem(item.id, 'tenantEmployer', e.target.value)}
                                      className="h-8.5 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Position</label>
                                    <Input
                                      placeholder="Staff Engineer"
                                      value={item.tenantPosition || ''}
                                      onChange={(e) => updateUnitItem(item.id, 'tenantPosition', e.target.value)}
                                      className="h-8.5 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Job Phone Number</label>
                                    <Input
                                      type="tel"
                                      placeholder="(512) 555-1122 (Optional)"
                                      value={item.tenantEmployerPhone || ''}
                                      onChange={(e) => updateUnitItem(item.id, 'tenantEmployerPhone', e.target.value)}
                                      className="h-8.5 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Monthly Income ($)</label>
                                    <Input
                                      type="number"
                                      placeholder="e.g. 3500"
                                      value={item.tenantMonthlyIncome || ''}
                                      onChange={(e) =>
                                        updateUnitItem(
                                          item.id,
                                          'tenantMonthlyIncome',
                                          e.target.value === '' ? '' : Number(e.target.value)
                                        )
                                      }
                                      className="h-8.5 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
                                    <Select
                                      value={item.tenantEmploymentStatus || 'Full-Time'}
                                      onChange={(e) => updateUnitItem(item.id, 'tenantEmploymentStatus', e.target.value)}
                                      className="h-8.5 text-xs"
                                    >
                                      <option value="Full-Time">Full-Time</option>
                                      <option value="Part-Time">Part-Time</option>
                                      <option value="Self-Employed">Self-Employed</option>
                                      <option value="Unemployed">Unemployed</option>
                                      <option value="Student">Student</option>
                                      <option value="Retired">Retired</option>
                                    </Select>
                                  </div>
                                </div>
                              </div>

                              {/* ADDRESS HISTORY */}
                              <div className="space-y-2 pt-1">
                                <h6 className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider border-b pb-1">
                                  Address History (Optional)
                                </h6>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Current Address</label>
                                    <Input
                                      placeholder="789 Pine Rd, Austin, TX"
                                      value={item.tenantCurrentAddress || ''}
                                      onChange={(e) => updateUnitItem(item.id, 'tenantCurrentAddress', e.target.value)}
                                      className="h-8.5 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Previous Address (Optional)</label>
                                    <Input
                                      placeholder="456 Elm St, Dallas, TX"
                                      value={item.tenantPreviousAddress || ''}
                                      onChange={(e) => updateUnitItem(item.id, 'tenantPreviousAddress', e.target.value)}
                                      className="h-8.5 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Auto-Bypass Confirmation Notice */}
                          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl flex items-start gap-2 text-[11px] text-emerald-400 font-medium">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-xs">Automated Workflow Execution:</p>
                              <p className="text-[10px] opacity-90">
                                Submitting will automatically create the Active Tenant account with portal password, generate an Active Lease agreement, auto-bypass screening, and mark Move-In Workflow as COMPLETED.
                              </p>
                            </div>
                          </div>

                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* --- ADD ANOTHER UNIT BUTTON --- */}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={addUnitItem}
            className="w-full sm:w-auto px-6 py-5 border-dashed border-2 border-primary/40 hover:border-primary text-primary hover:bg-primary/5 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            + Add Another Unit to Property
          </Button>
        </div>

        {/* --- VALIDATION ERROR WARNING BANNER --- */}
        {Object.keys(formErrors).length > 0 && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-fade-in shadow-sm">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <p className="font-extrabold text-sm">Form Validation Error</p>
              <p className="text-xs opacity-90 mt-0.5">Please fill in required fields (Unit Number, Rent, etc.) for all units highlighted above before saving.</p>
            </div>
          </div>
        )}

        {/* --- FORM FOOTER BUTTONS --- */}
        <div className="flex justify-between items-center pt-5 border-t border-border bg-card p-5 rounded-2xl border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate({ to: '/units' })}
            className="flex items-center gap-1 font-semibold h-10 text-sm px-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </Button>

          <Button type="submit" disabled={createMutation.isPending} className="px-6 font-bold h-10 text-sm">
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {unitItems.length > 1 ? `Saving ${unitItems.length} Units...` : 'Saving Unit...'}
              </>
            ) : unitItems.length > 1 ? (
              `Save ${unitItems.length} Units`
            ) : unitItems[0]?.status === 'Occupied' && unitItems[0]?.provideTenantInfo === 'now' ? (
              'Save Unit & Complete Onboarding'
            ) : (
              'Save Unit'
            )}
          </Button>
        </div>
      </>
    )}

      </form>

      {/* --- CHANGE PROPERTY CONFIRMATION MODAL --- */}
      {showChangePropertyConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4 z-50 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-foreground mt-4">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-foreground">Change Target Property?</h3>
                <p className="text-xs text-muted-foreground font-medium">Confirm property selection unlock</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Do you want to change property? Unlocking selection will allow you to pick another property for this unit creation session.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowChangePropertyConfirm(false)}
                className="font-bold text-xs"
              >
                No, Keep Selected Property
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setIsPropertyLocked(false);
                  setShowChangePropertyConfirm(false);
                }}
                className="font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                Yes, Change Property
              </Button>
            </div>
          </div>
        </div>
      )}

      <PlanLimitReachedModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => navigate({ to: '/subscriptions/plans' })}
        message={limitMessage}
        limitType="units"
      />
    </div>
  );
};

export default NewUnitPage;
