import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  Building2,
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
  ChevronDown,
  Clock,
  X,
} from 'lucide-react';
import { mapBackendErrors } from '../../utils/errorMapping';
import { generateMonthListFromMoveIn, MonthPaymentStatus } from './NewUnitPage';

const unitFormSchema = zod.object({
  propertyId: zod.string().min(1, 'Property is required'),
  buildingId: zod.string().optional(),
  unitNumber: zod.string().min(1, 'Unit Number is required'),
  floor: zod.number().min(1, 'Floor must be at least 1'),
  bedrooms: zod.number().min(0, 'Bedrooms must be non-negative'),
  bathrooms: zod.number().min(0, 'Bathrooms must be non-negative'),
  squareFootage: zod.number().min(0, 'Square footage must be non-negative'),
  rentAmount: zod.number().min(0, 'Rent Amount must be non-negative'),
  securityDeposit: zod.number().min(0, 'Security Deposit must be non-negative'),
  availabilityDate: zod.string().min(1, 'Availability Date is required'),
  status: zod.enum(['Occupied', 'Vacant', 'Reserved', 'Under Maintenance']),

  // Late Fee Policy
  isLateFeeEnabled: zod.boolean().optional(),
  lateFeeType: zod.enum(['FLAT', 'PERCENTAGE']).optional(),
  lateFeeAmount: zod.union([zod.number(), zod.literal('')]).optional(),
  lateFeeGraceDays: zod.union([zod.number(), zod.literal('')]).optional(),

  // Vacant options
  wantToAdvertise: zod.enum(['yes', 'no']).nullable().optional(),
  advertiseTime: zod.enum(['now', 'later']).nullable().optional(),

  // Occupied options
  provideTenantInfo: zod.enum(['now', 'later']).nullable().optional(),
  tenantFirstName: zod.string().optional(),
  tenantLastName: zod.string().optional(),
  tenantPreferredName: zod.string().optional(),
  tenantEmail: zod.string().optional(),
  tenantPhone: zod.string().optional(),
  tenantAltPhone: zod.string().optional(),
  tenantPassword: zod.string().optional(),
  showPassword: zod.boolean().optional(),
  tenantDob: zod.string().optional(),
  tenantGender: zod.string().optional(),
  tenantMoveInDate: zod.string().optional(),
  tenantInvoiceStartDate: zod.string().optional(),
  tenantPreviousBalance: zod.union([zod.number(), zod.literal('')]).optional(),
  unpaidMonths: zod.array(zod.string()).optional(),

  // Additional Optional Tenant Details
  showTenantAdditionalDetails: zod.boolean().optional(),
  tenantSsn: zod.string().optional(),
  tenantIdType: zod.string().optional(),
  tenantIdNumber: zod.string().optional(),
  tenantEmergencyName: zod.string().optional(),
  tenantEmergencyRelationship: zod.string().optional(),
  tenantEmergencyPhone: zod.string().optional(),
  tenantEmployer: zod.string().optional(),
  tenantEmployerPhone: zod.string().optional(),
  tenantPosition: zod.string().optional(),
  tenantMonthlyIncome: zod.union([zod.number(), zod.literal('')]).optional(),
  tenantEmploymentStatus: zod.string().optional(),
  tenantCurrentAddress: zod.string().optional(),
  tenantPreviousAddress: zod.string().optional(),
});

type UnitFormInputs = zod.infer<typeof unitFormSchema>;

export const EditUnitPage: React.FC = () => {
  const { id } = useParams({ from: '/properties/units/$id/edit' });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  // Fetch Unit
  const { data: unit, isLoading: loadingUnit } = useQuery({
    queryKey: ['unit', id],
    queryFn: () => api.unit.getById(id),
  });

  // Queries for Select Options
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => api.building.getAll(),
  });

  const updateMutation = useMutation({
    mutationFn: async (values: UnitFormInputs) => {
      const propObj = properties.find((p) => p.id === values.propertyId);
      const autoBuilding = buildings.find((b) => b.propertyId === values.propertyId);
      const targetBuildingId = values.buildingId || autoBuilding?.id;
      const bldObj = buildings.find((b) => b.id === targetBuildingId);

      // 1. Update Unit Record
      const updatedUnit = await api.unit.update(id, {
        propertyId: values.propertyId,
        buildingId: targetBuildingId,
        unitNumber: values.unitNumber,
        floor: Number(values.floor || 1),
        bedrooms: Number(values.bedrooms || 0),
        bathrooms: Number(values.bathrooms || 0),
        squareFootage: Number(values.squareFootage || 0),
        rentAmount: Number(values.rentAmount || 0),
        securityDeposit: Number(values.securityDeposit || 0),
        availabilityDate: values.availabilityDate,
        status: values.status,
        propertyName: propObj ? propObj.name : undefined,
        buildingName: bldObj ? bldObj.name : undefined,
        advertiseListing: values.status === 'Vacant' && values.wantToAdvertise === 'yes' && values.advertiseTime === 'now',
        isLateFeeEnabled: Boolean(values.isLateFeeEnabled),
        lateFeeType: values.lateFeeType || 'FLAT',
        lateFeeAmount: values.isLateFeeEnabled && values.lateFeeAmount !== '' && values.lateFeeAmount !== undefined ? Number(values.lateFeeAmount) : null,
        lateFeeGraceDays: values.isLateFeeEnabled && values.lateFeeGraceDays !== '' && values.lateFeeGraceDays !== undefined ? Number(values.lateFeeGraceDays) : null,
      });

      // 2. If Occupied and Tenant info is provided
      if (values.status === 'Occupied' && values.provideTenantInfo === 'now' && values.tenantFirstName && values.tenantLastName) {
        const existingTenantId = unit?.tenant?.id || (unit?.tenants && unit.tenants[0]?.id);
        const tenantData = {
          firstName: values.tenantFirstName,
          lastName: values.tenantLastName,
          preferredName: values.tenantPreferredName,
          email: values.tenantEmail || `${values.tenantFirstName.toLowerCase()}@example.com`,
          phone: values.tenantPhone || '(512) 555-0199',
          altPhone: values.tenantAltPhone,
          password: values.tenantPassword || '123456',
          dob: values.tenantDob,
          gender: values.tenantGender || 'Male',
          status: 'Active',
          unitId: id,
          propertyId: values.propertyId,
          propertyName: propObj?.name || 'Property',
          unitNumber: values.unitNumber,
          moveInDate: values.tenantMoveInDate,
          invoiceStartDate: values.tenantInvoiceStartDate || values.tenantMoveInDate,
          previousBalance: Number(values.tenantPreviousBalance || 0),
          openingBalance: Number(values.tenantPreviousBalance || 0),
          ssn: values.tenantSsn || undefined,
          idType: values.tenantIdType || 'Driver License',
          idNumber: values.tenantIdNumber || undefined,
          emergencyName: values.tenantEmergencyName || undefined,
          emergencyRelationship: values.tenantEmergencyRelationship || undefined,
          emergencyPhone: values.tenantEmergencyPhone || undefined,
          employer: values.tenantEmployer || undefined,
          employerPhone: values.tenantEmployerPhone || undefined,
          jobPhone: values.tenantEmployerPhone || undefined,
          position: values.tenantPosition || undefined,
          monthlyIncome: values.tenantMonthlyIncome || undefined,
          employmentStatus: values.tenantEmploymentStatus || 'Full-Time',
          currentAddress: values.tenantCurrentAddress || undefined,
          previousAddress: values.tenantPreviousAddress || undefined,
        };

        let activeTenantObj;
        if (existingTenantId) {
          activeTenantObj = await api.tenant.update(existingTenantId, tenantData);
        } else {
          activeTenantObj = await api.tenant.create(tenantData);
        }
        const activeTenantId = activeTenantObj?.id || existingTenantId;

        // Auto-Create Active Lease if no lease exists
        if (api.leasing?.createLease && activeTenantId) {
          try {
            const endDate = new Date(values.tenantMoveInDate || new Date());
            endDate.setFullYear(endDate.getFullYear() + 1);
            await api.leasing.createLease({
              tenantId: activeTenantId,
              tenantName: `${values.tenantFirstName} ${values.tenantLastName}`,
              propertyId: values.propertyId,
              propertyName: propObj?.name || 'Property',
              unitId: id,
              unitNumber: values.unitNumber,
              startDate: values.tenantMoveInDate,
              endDate: endDate.toISOString().split('T')[0],
              rentAmount: values.rentAmount,
              securityDeposit: values.securityDeposit,
              depositAmount: values.securityDeposit,
              status: 'Active',
            });
          } catch (err) {
            console.warn('Auto lease creation handled:', err);
          }
        }

        // Auto-Generate Monthly Invoices for Past Move-In
        const pastMonths = generateMonthListFromMoveIn(values.tenantInvoiceStartDate || values.tenantMoveInDate || '');
        if (pastMonths.length > 0 && api.invoices?.create && activeTenantId) {
          for (const monthItem of pastMonths) {
            const detail = editMonthDetails[monthItem.id] || { status: 'Unpaid', paidAmount: 0 };
            const pAmt = detail.status === 'Paid' ? Number(values.rentAmount || 0) : (detail.status === 'Partial' ? Math.min(Number(values.rentAmount || 0), Number(detail.paidAmount || 0)) : 0);
            const hasLateFee = (applyGlobalLateFee || detail.applyLateFee) && detail.status !== 'Paid';
            const totalInvoiceAmt = Number(values.rentAmount || 0) + (hasLateFee ? 50 : 0);
            const invStatus = detail.status === 'Paid' ? 'Paid' : (detail.status === 'Partial' ? 'Partially Paid' : 'Overdue');

            try {
              const createdInv = await api.invoices.create({
                tenantId: activeTenantId,
                tenantName: `${values.tenantFirstName} ${values.tenantLastName}`,
                propertyId: values.propertyId,
                propertyName: propObj?.name || 'Property',
                unitId: id,
                unitNumber: values.unitNumber,
                amount: totalInvoiceAmt,
                dueDate: monthItem.dueDate,
                status: invStatus,
                lineItems: [
                  {
                    description: `Monthly Rent Charge - ${monthItem.label}`,
                    amount: Number(values.rentAmount || 0),
                  },
                  ...(hasLateFee ? [
                    {
                      description: `Overdue Late Fee Charge (10-Day Policy) - ${monthItem.label}`,
                      amount: 50,
                    }
                  ] : []),
                ],
              });

              if (pAmt > 0 && api.payments?.create) {
                try {
                  const isPartial = detail.status === 'Partial';
                  await api.payments.create({
                    tenantId: activeTenantId,
                    tenantName: `${values.tenantFirstName} ${values.tenantLastName}`,
                    propertyId: values.propertyId,
                    propertyName: propObj?.name || 'Property',
                    unitId: id,
                    unitNumber: values.unitNumber,
                    invoiceId: createdInv?.id,
                    amount: pAmt,
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

      return updatedUnit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unit', id] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
      queryClient.invalidateQueries({ queryKey: ['payments-list'] });
      queryClient.invalidateQueries({ queryKey: ['rent-ledger-list'] });
      setSuccess(true);
      setTimeout(() => navigate({ to: '/units' }), 2000);
    },
    onError: (err: any) => {
      mapBackendErrors(err, setError);
    },
  });

  const [applyGlobalLateFee, setApplyGlobalLateFee] = useState<boolean>(false);
  const [editMonthDetails, setEditMonthDetails] = useState<Record<string, MonthPaymentStatus>>({});
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [partialInput, setPartialInput] = useState<string>('');

  const { watch, register, handleSubmit, setValue, setError, formState: { errors } } = useForm<UnitFormInputs>({
    resolver: zodResolver(unitFormSchema),
    values: unit ? {
      propertyId: unit.propertyId || '',
      buildingId: unit.buildingId || '',
      unitNumber: unit.unitNumber || '',
      floor: Number(unit.floor) || 1,
      bedrooms: Number(unit.bedrooms) || 0,
      bathrooms: Number(unit.bathrooms) || 1,
      squareFootage: Number(unit.squareFootage) || 0,
      rentAmount: Number(unit.rentAmount) || 0,
      securityDeposit: Number(unit.securityDeposit) || 0,
      availabilityDate: unit.availabilityDate ? (unit.availabilityDate.includes('T') ? unit.availabilityDate.split('T')[0] : unit.availabilityDate) : new Date().toISOString().split('T')[0],
      status: unit.status || 'Vacant',
      isLateFeeEnabled: unit.isLateFeeEnabled ?? false,
      lateFeeType: unit.lateFeeType || 'FLAT',
      lateFeeAmount: unit.lateFeeAmount ?? 50,
      lateFeeGraceDays: unit.lateFeeGraceDays ?? 5,
      wantToAdvertise: unit.wantToAdvertise || 'no',
      advertiseTime: unit.advertiseTime || 'now',
      provideTenantInfo: 'now',
      tenantFirstName: unit.tenant?.firstName || '',
      tenantLastName: unit.tenant?.lastName || '',
      tenantPreferredName: unit.tenant?.preferredName || '',
      tenantEmail: unit.tenant?.email || '',
      tenantPhone: unit.tenant?.phone || '',
      tenantAltPhone: unit.tenant?.altPhone || '',
      tenantPassword: '123456',
      showPassword: false,
      tenantDob: unit.tenant?.dob ? (unit.tenant.dob.includes('T') ? unit.tenant.dob.split('T')[0] : unit.tenant.dob) : '',
      tenantGender: unit.tenant?.gender || 'Male',
      tenantMoveInDate: unit.tenant?.moveInDate ? (unit.tenant.moveInDate.includes('T') ? unit.tenant.moveInDate.split('T')[0] : unit.tenant.moveInDate) : new Date().toISOString().split('T')[0],
      tenantInvoiceStartDate: (unit.tenant as any)?.invoiceStartDate ? ((unit.tenant as any).invoiceStartDate.includes('T') ? (unit.tenant as any).invoiceStartDate.split('T')[0] : (unit.tenant as any).invoiceStartDate) : (unit.tenant?.moveInDate ? (unit.tenant.moveInDate.includes('T') ? unit.tenant.moveInDate.split('T')[0] : unit.tenant.moveInDate) : new Date().toISOString().split('T')[0]),
      tenantPreviousBalance: unit.tenant?.previousBalance || unit.tenant?.openingBalance || 0,
      unpaidMonths: [],
      showTenantAdditionalDetails: false,
      tenantSsn: unit.tenant?.ssn || '',
      tenantIdType: unit.tenant?.idType || 'Driver License',
      tenantIdNumber: unit.tenant?.idNumber || '',
      tenantEmergencyName: unit.tenant?.emergencyName || '',
      tenantEmergencyRelationship: unit.tenant?.emergencyRelationship || '',
      tenantEmergencyPhone: unit.tenant?.emergencyPhone || '',
      tenantEmployer: unit.tenant?.employer || '',
      tenantEmployerPhone: unit.tenant?.employerPhone || unit.tenant?.jobPhone || '',
      tenantPosition: unit.tenant?.position || '',
      tenantMonthlyIncome: unit.tenant?.monthlyIncome || '',
      tenantEmploymentStatus: unit.tenant?.employmentStatus || 'Full-Time',
      tenantCurrentAddress: unit.tenant?.currentAddress || '',
      tenantPreviousAddress: unit.tenant?.previousAddress || '',
    } : undefined,
  });

  const selectedPropertyId = watch('propertyId');
  const currentStatus = watch('status');
  const isLateFeeEnabled = watch('isLateFeeEnabled');
  const lateFeeType = watch('lateFeeType') || 'FLAT';
  const lateFeeAmount = watch('lateFeeAmount');
  const lateFeeGraceDays = watch('lateFeeGraceDays');
  const wantToAdvertise = watch('wantToAdvertise');
  const advertiseTime = watch('advertiseTime');
  const provideTenantInfo = watch('provideTenantInfo');
  const showPassword = watch('showPassword');
  const tenantMoveInDate = watch('tenantMoveInDate');
  const tenantInvoiceStartDate = watch('tenantInvoiceStartDate');
  const unpaidMonths = watch('unpaidMonths') || [];
  const rentAmount = watch('rentAmount') || 0;
  const showTenantAdditionalDetails = watch('showTenantAdditionalDetails');

  const onSubmit = (values: UnitFormInputs) => {
    updateMutation.mutate(values);
  };

  if (loadingUnit || !unit) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Edit Unit"
        description="Update unit parameters, rent amount, layout specs and occupancy status."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Properties', href: '/properties' },
          { label: 'Units', href: '/units' },
          { label: 'Edit Unit' },
        ]}
      />

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-semibold mb-6">
          Unit updated successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-foreground">

        {/* --- TARGET PROPERTY CARD --- */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-primary font-extrabold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            Target Property
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Property *</label>
            <Select {...register('propertyId')} className="h-10 text-sm font-medium">
              <option value="">Select Property...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            {errors.propertyId && <p className="text-rose-500 text-xs font-semibold">{errors.propertyId.message}</p>}
          </div>
        </div>

        {/* --- UNIT DETAILS CARD --- */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
          
          {/* CARD HEADER */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-xs flex items-center justify-center border border-primary/20">
                #1
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-foreground">
                    Unit #{watch('unitNumber') || '1'}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${
                    currentStatus === 'Occupied' ? 'bg-amber-500/15 text-amber-500 border border-amber-500/20' :
                    currentStatus === 'Vacant' ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20' :
                    'bg-blue-500/15 text-blue-500 border border-blue-500/20'
                  }`}>
                    {currentStatus}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Configure details & tenancy status for this unit layout
                </p>
              </div>
            </div>
          </div>

          {/* --- SECTION 1: UNIT PARAMETERS --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Unit Number *</label>
              <Input
                placeholder="Suite B / 204"
                {...register('unitNumber')}
                className="h-10 text-sm font-medium"
              />
              {errors.unitNumber && <p className="text-rose-500 text-xs font-semibold">{errors.unitNumber.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Floor</label>
              {(() => {
                const selectedProp = properties.find((p: any) => p.id === selectedPropertyId);
                const autoBuilding = buildings.find((b: any) => b.propertyId === selectedPropertyId) || selectedProp?.buildings?.[0];
                const totalFloorsForProp = Number(
                  selectedProp?.totalFloors ||
                  selectedProp?.floors ||
                  autoBuilding?.floors ||
                  1
                );
                const currentFloorVal = Number(watch('floor') || 1);
                const maxOption = Math.max(totalFloorsForProp, currentFloorVal, 5);

                return (
                  <div>
                    <Select {...register('floor', { valueAsNumber: true })} className="h-10 text-sm font-medium">
                      {Array.from({ length: maxOption }, (_, i) => i + 1).map((fl) => (
                        <option key={fl} value={fl}>
                          Floor {fl} {fl > totalFloorsForProp ? `(Notice: Property has ${totalFloorsForProp} Floors)` : ''}
                        </option>
                      ))}
                    </Select>
                    {currentFloorVal > totalFloorsForProp && (
                      <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1 mt-1 animate-fade-in">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        Property "{selectedProp?.name || 'Selected'}" has only {totalFloorsForProp} floors.
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
                {...register('squareFootage', { valueAsNumber: true })}
                className="h-10 text-sm font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Bedrooms</label>
              <Input
                type="number"
                {...register('bedrooms', { valueAsNumber: true })}
                className="h-10 text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Bathrooms</label>
              <Input
                type="number"
                step="0.5"
                {...register('bathrooms', { valueAsNumber: true })}
                className="h-10 text-sm font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Monthly Rent ($) *</label>
              <Input
                type="number"
                {...register('rentAmount', { valueAsNumber: true })}
                className="h-10 text-sm font-medium"
              />
              {errors.rentAmount && <p className="text-rose-500 text-xs font-semibold">{errors.rentAmount.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Security Deposit ($)</label>
              <Input
                type="number"
                {...register('securityDeposit', { valueAsNumber: true })}
                className="h-10 text-sm font-medium"
              />
            </div>
          </div>

          {/* --- SECTION 2: AVAILABILITY & STATUS --- */}
          <div className={`pt-4 border-t border-border grid grid-cols-1 ${currentStatus !== 'Occupied' ? 'sm:grid-cols-2' : ''} gap-4`}>
            {currentStatus !== 'Occupied' && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Availability Date</label>
                <Input
                  type="date"
                  {...register('availabilityDate')}
                  className="h-10 text-sm font-medium"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Initial Status *</label>
              <Select {...register('status')} className="h-10 text-sm font-semibold">
                <option value="Vacant">Vacant</option>
                <option value="Occupied">Occupied</option>
                <option value="Reserved">Reserved</option>
                <option value="Under Maintenance">Under Maintenance</option>
              </Select>
            </div>
          </div>

          {/* --- UNIT LATE FEE & GRACE PERIOD (OPTIONAL) --- */}
          <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 space-y-4">
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
                  {isLateFeeEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={isLateFeeEnabled ? 'default' : 'outline'}
                  onClick={() => setValue('isLateFeeEnabled', !isLateFeeEnabled, { shouldDirty: true })}
                  className={`h-7 px-3 text-xs font-bold ${
                    isLateFeeEnabled 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {isLateFeeEnabled ? 'ON' : 'OFF'}
                </Button>
              </div>
            </div>

            {isLateFeeEnabled && (
              <div className="space-y-3 pt-1 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">
                      Late Fee Type
                    </label>
                    <Select
                      {...register('lateFeeType')}
                      className="h-9 text-xs font-bold"
                    >
                      <option value="FLAT">Flat Fee ($)</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">
                      {lateFeeType === 'PERCENTAGE' ? 'Fee Percentage (%)' : 'Fee Amount ($)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">
                        {lateFeeType === 'PERCENTAGE' ? '%' : '$'}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step={lateFeeType === 'PERCENTAGE' ? '0.5' : '1'}
                        {...register('lateFeeAmount', { valueAsNumber: true })}
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
                        {...register('lateFeeGraceDays', { valueAsNumber: true })}
                        className="h-9 text-xs font-bold"
                        placeholder="5"
                      />
                      <span className="absolute right-3 top-2.5 text-[10px] font-extrabold text-muted-foreground uppercase">
                        Days
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-background/80 rounded-xl border border-amber-500/15 text-[11px] text-muted-foreground flex items-center gap-2">
                  <span className="font-bold text-amber-600 dark:text-amber-400">Rule Preview:</span>
                  <span>
                    If rent remains unpaid after{' '}
                    <strong className="text-foreground">{Number(lateFeeGraceDays || 5)} days</strong> of due date, an automated{' '}
                    <strong className="text-foreground">
                      {lateFeeType === 'PERCENTAGE' ? `${Number(lateFeeAmount || 5)}% of rent` : `$${Number(lateFeeAmount || 50)}`}
                    </strong>{' '}
                    late fee invoice will be charged to the tenant.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* --- DYNAMIC FLOW 1: VACANT UNIT ADVERTISING SECTION --- */}
          {currentStatus === 'Vacant' && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in text-xs font-semibold">
              <div className="flex items-center gap-2 text-primary border-b border-primary/10 pb-2.5">
                <Megaphone className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <h4 className="font-extrabold text-xs uppercase">Vacant Unit Advertising & Listing</h4>
                  <p className="text-[10px] text-muted-foreground font-normal">Manage marketing and tenant recruitment preferences</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 bg-background p-3 rounded-xl border border-border">
                <p className="text-foreground text-xs font-bold">
                  “This unit is vacant. Would you like to advertise/list this vacant unit or apartment?”
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={wantToAdvertise === 'yes' ? 'default' : 'outline'}
                    onClick={() => setValue('wantToAdvertise', 'yes')}
                    className="font-bold h-8 px-4 text-xs"
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={wantToAdvertise === 'no' ? 'default' : 'outline'}
                    onClick={() => setValue('wantToAdvertise', 'no')}
                    className="font-bold h-8 px-4 text-xs"
                  >
                    No
                  </Button>
                </div>
              </div>

              {wantToAdvertise === 'yes' && (
                <div className="space-y-2 pt-2 animate-fade-in border-t border-primary/10">
                  <p className="text-muted-foreground font-semibold text-[11px]">
                    When would you like to start advertising this unit?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={advertiseTime === 'now' ? 'default' : 'outline'}
                      onClick={() => setValue('advertiseTime', 'now')}
                      className="font-bold text-xs"
                    >
                      Now (Publish to Listings)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={advertiseTime === 'later' ? 'default' : 'outline'}
                      onClick={() => setValue('advertiseTime', 'later')}
                      className="font-bold text-xs"
                    >
                      Later (Save as Draft)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- DYNAMIC FLOW 2: OCCUPIED TENANT INFORMATION FORM --- */}
          {currentStatus === 'Occupied' && (
            <div className="bg-secondary/40 border border-border rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in text-xs font-semibold">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2 text-primary">
                  <UserPlus className="w-4.5 h-4.5 text-primary shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-xs uppercase">Occupied Tenant Information</h4>
                    <p className="text-[10px] text-muted-foreground font-normal">Register/Update resident details for completed move-in</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-[10px] font-extrabold uppercase">
                  Active Resident
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 bg-background p-3 rounded-xl border border-border">
                <p className="text-foreground text-xs font-bold">
                  “Would you like to provide the tenant information now or later?”
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={provideTenantInfo === 'now' ? 'default' : 'outline'}
                    onClick={() => setValue('provideTenantInfo', 'now')}
                    className="font-bold h-8 px-4 text-xs"
                  >
                    Now (Enter Details)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={provideTenantInfo === 'later' ? 'default' : 'outline'}
                    onClick={() => setValue('provideTenantInfo', 'later')}
                    className="font-bold h-8 px-4 text-xs"
                  >
                    Later
                  </Button>
                </div>
              </div>

              {provideTenantInfo === 'now' && (
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
                          {...register('tenantFirstName')}
                          className="h-8.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Last Name *</label>
                        <Input
                          placeholder="Doe"
                          {...register('tenantLastName')}
                          className="h-8.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Preferred Name</label>
                        <Input
                          placeholder="Johnny"
                          {...register('tenantPreferredName')}
                          className="h-8.5 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Date of Birth</label>
                        <Input
                          type="date"
                          {...register('tenantDob')}
                          className="h-8.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Gender</label>
                        <Select
                          {...register('tenantGender')}
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
                          {...register('tenantEmail')}
                          className="h-8.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Mobile Phone *</label>
                        <Input
                          placeholder="(512) 555-0199"
                          {...register('tenantPhone')}
                          className="h-8.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">Alternate Phone</label>
                        <Input
                          placeholder="(512) 555-4321"
                          {...register('tenantAltPhone')}
                          className="h-8.5 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Key className="w-3 h-3 text-primary" /> Tenant Password *
                        </label>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password for dashboard"
                            {...register('tenantPassword')}
                            className="h-8.5 text-xs pr-8"
                          />
                          <button
                            type="button"
                            onClick={() => setValue('showPassword', !showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                          >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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
                          {...register('tenantMoveInDate')}
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
                          {...register('tenantInvoiceStartDate')}
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
                          {...register('tenantPreviousBalance', {
                            setValueAs: (v) => (v === '' ? '' : Number(v)),
                          })}
                          className="h-8.5 text-xs"
                        />
                        <p className="text-[9px] text-muted-foreground italic mt-0.5">
                          Initial balance logged in ledger
                        </p>
                      </div>
                    </div>

                    {/* Monthly Billing Breakdown (Chips/Badges) for Past Move-In */}
                    {(() => {
                      const pastMonths = generateMonthListFromMoveIn(tenantInvoiceStartDate || tenantMoveInDate || '');
                      if (pastMonths.length === 0) return null;

                      const rentVal = Number(rentAmount || 0);

                      const handleUpdateEditMonthStatus = (
                        monthId: string,
                        status: 'Paid' | 'Unpaid' | 'Partial',
                        customPaidAmount?: number,
                        shouldClosePopover: boolean = true
                      ) => {
                        let newPaidAmt = 0;
                        if (status === 'Paid') {
                          newPaidAmt = rentVal;
                        } else if (status === 'Partial') {
                          newPaidAmt = Math.min(rentVal, Math.max(0, customPaidAmount ?? Math.round(rentVal / 2)));
                        } else {
                          newPaidAmt = 0;
                        }

                        const existingD = editMonthDetails[monthId] || { status: 'Unpaid', paidAmount: 0 };
                        const updatedDetails = {
                          ...editMonthDetails,
                          [monthId]: { ...existingD, status, paidAmount: newPaidAmt },
                        };

                        let totalUnpaidBalance = 0;
                        const unpaidMonthsList: string[] = [];

                        pastMonths.forEach((m) => {
                          const detail = updatedDetails[m.id] || { status: 'Unpaid', paidAmount: 0 };
                          const pAmt = detail.status === 'Paid'
                            ? rentVal
                            : (detail.status === 'Partial' ? Math.min(rentVal, Number(detail.paidAmount || 0)) : 0);
                          
                          const monthHasLateFee = (applyGlobalLateFee || detail.applyLateFee) && detail.status !== 'Paid';
                          const due = Math.max(0, rentVal + (monthHasLateFee ? 50 : 0) - pAmt);
                          if (due > 0 || detail.status !== 'Paid') {
                            unpaidMonthsList.push(m.id);
                          }
                          totalUnpaidBalance += due;
                        });

                        setEditMonthDetails(updatedDetails);
                        setValue('unpaidMonths', unpaidMonthsList);
                        setValue('tenantPreviousBalance', totalUnpaidBalance);
                        if (shouldClosePopover) {
                          setActivePopover(null);
                        }
                      };

                      const handleToggleGlobalLateFee = (enabled: boolean) => {
                        setApplyGlobalLateFee(enabled);
                        let totalUnpaidBalance = 0;
                        const unpaidMonthsList: string[] = [];

                        pastMonths.forEach((m) => {
                          const detail = editMonthDetails[m.id] || { status: 'Unpaid', paidAmount: 0 };
                          const pAmt = detail.status === 'Paid'
                            ? rentVal
                            : (detail.status === 'Partial' ? Math.min(rentVal, Number(detail.paidAmount || 0)) : 0);

                          const monthHasLateFee = (enabled || detail.applyLateFee) && detail.status !== 'Paid';
                          const due = Math.max(0, rentVal + (monthHasLateFee ? 50 : 0) - pAmt);
                          if (due > 0 || detail.status !== 'Paid') {
                            unpaidMonthsList.push(m.id);
                          }
                          totalUnpaidBalance += due;
                        });

                        setValue('unpaidMonths', unpaidMonthsList);
                        setValue('tenantPreviousBalance', totalUnpaidBalance);
                      };

                      let paidCount = 0;
                      let partialCount = 0;
                      let unpaidCount = 0;
                      let totalPaidAmount = 0;
                      let totalUnpaidAmount = 0;

                      pastMonths.forEach((m) => {
                        const d = editMonthDetails[m.id] || { status: 'Unpaid', paidAmount: 0 };
                        const monthLateFee = (applyGlobalLateFee || d.applyLateFee) && d.status !== 'Paid' ? 50 : 0;

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
                                  checked={applyGlobalLateFee}
                                  onChange={(e) => handleToggleGlobalLateFee(e.target.checked)}
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
                              const d = editMonthDetails[m.id] || { status: 'Unpaid', paidAmount: 0 };
                              const isPopoverOpen = activePopover === m.id;
                              const monthHasLateFee = (applyGlobalLateFee || d.applyLateFee) && d.status !== 'Paid';
                              const monthDue = Math.max(0, rentVal + (monthHasLateFee ? 50 : 0) - d.paidAmount);

                              return (
                                <div key={m.id} className="relative inline-block">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isPopoverOpen) {
                                        setActivePopover(null);
                                      } else {
                                        setActivePopover(m.id);
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
                                          onClick={() => handleUpdateEditMonthStatus(m.id, 'Paid')}
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
                                            handleUpdateEditMonthStatus(m.id, 'Partial', amt, false);
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
                                          onClick={() => handleUpdateEditMonthStatus(m.id, 'Unpaid')}
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
                                              checked={Boolean(d.applyLateFee ?? applyGlobalLateFee)}
                                              onChange={(e) => {
                                                const isChecked = e.target.checked;
                                                const updatedDetails = {
                                                  ...editMonthDetails,
                                                  [m.id]: { ...d, applyLateFee: isChecked },
                                                };
                                                setEditMonthDetails(updatedDetails);
                                                let totalUnpaidBalance = 0;
                                                const unpaidMonthsList: string[] = [];

                                                pastMonths.forEach((pM) => {
                                                  const detail = updatedDetails[pM.id] || { status: 'Unpaid', paidAmount: 0 };
                                                  const pAmt = detail.status === 'Paid'
                                                    ? rentVal
                                                    : (detail.status === 'Partial' ? Math.min(rentVal, Number(detail.paidAmount || 0)) : 0);
                                                  
                                                  const pHasLateFee = (applyGlobalLateFee || detail.applyLateFee) && detail.status !== 'Paid';
                                                  const due = Math.max(0, rentVal + (pHasLateFee ? 50 : 0) - pAmt);
                                                  if (due > 0 || detail.status !== 'Paid') {
                                                    unpaidMonthsList.push(pM.id);
                                                  }
                                                  totalUnpaidBalance += due;
                                                });

                                                setValue('unpaidMonths', unpaidMonthsList);
                                                setValue('tenantPreviousBalance', totalUnpaidBalance);
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
                                              onClick={() => handleUpdateEditMonthStatus(m.id, 'Partial', Number(partialInput || 0))}
                                            >
                                              Save
                                            </Button>
                                          </div>
                                          {Number(partialInput || 0) < rentVal && (
                                            <p className="text-[9px] text-rose-500 font-bold">
                                              Remaining Due: ${(rentVal - Number(partialInput || 0)).toLocaleString()}
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
                      onClick={() => setValue('showTenantAdditionalDetails', !showTenantAdditionalDetails)}
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
                        <span>{showTenantAdditionalDetails ? 'Hide Details' : 'Show Details'}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showTenantAdditionalDetails ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                  </div>

                  {showTenantAdditionalDetails && (
                    <div className="space-y-4 animate-fade-in pt-1 bg-background p-3.5 rounded-xl border border-border">
                      {/* GOVERNMENT IDS */}
                      <div className="space-y-2">
                        <h6 className="font-extrabold text-[10px] uppercase text-muted-foreground tracking-wider border-b pb-1">
                          Government IDs (Optional)
                        </h6>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">ID Type</label>
                            <Select {...register('tenantIdType')} className="h-8.5 text-xs">
                              <option value="Driver License">Driver License</option>
                              <option value="Passport">Passport</option>
                              <option value="State ID">State ID</option>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">ID Number</label>
                            <Input
                              placeholder="A1234567"
                              {...register('tenantIdNumber')}
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
                              {...register('tenantEmergencyName')}
                              className="h-8.5 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Relationship</label>
                            <Input
                              placeholder="Spouse / Parent"
                              {...register('tenantEmergencyRelationship')}
                              className="h-8.5 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Emergency Phone</label>
                            <Input
                              type="tel"
                              placeholder="(512) 555-9876"
                              {...register('tenantEmergencyPhone')}
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
                              {...register('tenantEmployer')}
                              className="h-8.5 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Position</label>
                            <Input
                              placeholder="Staff Engineer"
                              {...register('tenantPosition')}
                              className="h-8.5 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Job Phone Number</label>
                            <Input
                              type="tel"
                              placeholder="(512) 555-1122 (Optional)"
                              {...register('tenantEmployerPhone')}
                              className="h-8.5 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Monthly Income ($)</label>
                            <Input
                              type="number"
                              placeholder="e.g. 3500"
                              {...register('tenantMonthlyIncome', {
                                setValueAs: (v) => (v === '' ? '' : Number(v)),
                              })}
                              className="h-8.5 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
                            <Select {...register('tenantEmploymentStatus')} className="h-8.5 text-xs">
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
                              {...register('tenantCurrentAddress')}
                              className="h-8.5 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Previous Address (Optional)</label>
                            <Input
                              placeholder="456 Elm St, Dallas, TX"
                              {...register('tenantPreviousAddress')}
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
                        Submitting will automatically create/update the Active Tenant account with portal password, generate an Active Lease agreement, auto-bypass screening, and mark Move-In Workflow as COMPLETED.
                      </p>
                    </div>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>

        {/* --- FORM ACTIONS --- */}
        <div className="flex justify-between items-center pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate({ to: '/units' })}
            className="flex items-center gap-1 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Button>

          <Button type="submit" disabled={updateMutation.isPending} className="font-extrabold px-6">
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>

      </form>
    </div>
  );
};

export default EditUnitPage;
