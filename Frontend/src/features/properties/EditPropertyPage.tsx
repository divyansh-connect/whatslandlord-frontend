import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { AddressForm } from '../../components/AddressForm';
import { FileUploader } from '../../components/FileUploader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Loader2, ArrowLeft, ChevronDown, Plus, CreditCard, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { QuickAddOwnerModal } from '../../components/QuickAddOwnerModal';

const optionalNumberRegister = {
  setValueAs: (v: any) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v)),
};

const propertyFormSchema = zod.object({
  name: zod.string().min(1, 'Property Name is required'),
  type: zod.enum(['Apartment', 'Commercial', 'Single Family', 'Multi Family', 'SingleFamily', 'MultiFamily', 'HOA', 'MUP', 'Mixed-Use Property (MUP)']),
  status: zod.enum(['Active', 'Inactive', 'Under Review', 'Archived']),

  streetAddress: zod.string().min(1, 'Street Address is required'),
  city: zod.string().min(1, 'City is required'),
  state: zod.string().min(2, 'State is required'),
  country: zod.string().min(1, 'Country is required'),
  zip: zod.string().min(5, 'ZIP Code is required'),
  nycBin: zod.string().optional(),

  owner: zod.string().min(1, 'Owner is required'),
  ownershipPercentage: zod.number().min(1).max(100),
  managementCompany: zod.string().optional(),

  yearBuilt: zod.number().min(1700, 'Year built must be at least 1700').max(new Date().getFullYear() + 5, 'Year built is invalid').optional(),
  totalFloors: zod.number().min(1, 'Must be at least 1 floor').optional(),
  totalBuildings: zod.number().optional(),
  totalUnits: zod.number().min(1, 'Must be at least 1 unit').optional(),
  squareFootage: zod.number().min(0, 'Square footage cannot be negative').optional(),

  purchasePrice: zod.number().min(0, 'Purchase price cannot be negative').optional(),
  currentValue: zod.number().min(0, 'Current value cannot be negative').optional(),
  monthlyExpenses: zod.number().min(0, 'Monthly expenses cannot be negative').optional(),
});

type PropertyFormInputs = zod.infer<typeof propertyFormSchema>;

export const EditPropertyPage: React.FC<{ propertyId?: string }> = ({ propertyId: propPropertyId }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const searchParams = useSearch({ strict: false }) as any;
  const propertyId = propPropertyId || searchParams?.id || new URLSearchParams(window.location.search).get('id') || '';

  const [photos, setPhotos] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [isAddOwnerModalOpen, setIsAddOwnerModalOpen] = useState(false);

  // Property-Wise Payment Integration State
  const [paymentProvider, setPaymentProvider] = useState<string>('COMPANY_DEFAULT');
  const [paymentAccountId, setPaymentAccountId] = useState<string>('');
  const [paymentAuthToken, setPaymentAuthToken] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('Active');
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [hasExistingToken, setHasExistingToken] = useState<boolean>(false);

  // Query owners to select one
  const { data: owners = [] } = useQuery({
    queryKey: ['owners'],
    queryFn: () => api.owner.getAll(),
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors },
  } = useForm<PropertyFormInputs>({
    resolver: zodResolver(propertyFormSchema),
  });

  useEffect(() => {
    if (propertyId) {
      setLoadingProperty(true);
      api.property.getById(propertyId)
        .then((data: any) => {
          if (data) {
            const ownerObj = owners.find((o) => o.id === data.ownerId);
            const ownerName = ownerObj
              ? (ownerObj.name || `${ownerObj.firstName || ''} ${ownerObj.lastName || ''}`.trim())
              : data.ownerId || '';

            reset({
              name: data.name || '',
              type: data.type === 'SingleFamily' ? 'Single Family' : data.type === 'MultiFamily' ? 'Multi Family' : data.type || 'Apartment',
              status: data.status || 'Active',
              streetAddress: data.streetAddress || '',
              city: data.city || '',
              state: data.state || '',
              country: data.country || 'USA',
              zip: data.zip || '',
              nycBin: data.nycBin || (data as any).bin || '',
              owner: ownerName,
              ownershipPercentage: data.ownershipPercentage || 100,
              managementCompany: data.managementCompany || '',
              yearBuilt: data.yearBuilt || 2020,
              totalFloors: data.buildings?.[0]?.floors || data.totalFloors || data.floors || data.totalBuildings || 1,
              totalBuildings: data.buildings?.[0]?.floors || data.totalFloors || data.floors || data.totalBuildings || 1,
              totalUnits: data.buildings?.[0]?.unitsCount || data.totalUnits || data.unitsCount || data.units?.length || 1,
              squareFootage: data.squareFootage || 10000,
              purchasePrice: data.purchasePrice || 1000000,
              currentValue: data.currentValue || 1200000,
              monthlyExpenses: data.monthlyExpenses || 0,
            });

            // Populate Payment Gateway Settings
            setPaymentProvider(data.paymentProvider || 'COMPANY_DEFAULT');
            setPaymentAccountId(data.paymentAccountId || '');
            setPaymentStatus(data.paymentStatus || 'Active');
            setHasExistingToken(!!data.hasPaymentToken);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch property details:', err);
        })
        .finally(() => setLoadingProperty(false));
    } else {
      setLoadingProperty(false);
    }
  }, [propertyId, reset, owners]);

  const updateMutation = useMutation({
    mutationFn: (values: any) => {
      return api.property.update(propertyId, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setSuccess(true);
      setTimeout(() => navigate({ to: '/properties' }), 2000);
    },
  });

  const onSubmit = (values: PropertyFormInputs) => {
    const selectedOwner = owners.find((o) =>
      o.name === values.owner ||
      `${o.firstName} ${o.lastName}`.trim() === values.owner ||
      o.id === values.owner
    );
    const ownerId = selectedOwner ? selectedOwner.id : '';

    updateMutation.mutate({
      name: values.name,
      type: values.type,
      status: values.status,
      ownerId,
      ownershipPercentage: values.ownershipPercentage,
      managementCompany: values.managementCompany,
      address: `${values.streetAddress}, ${values.city}, ${values.state}, ${values.country}, ${values.zip}`,
      streetAddress: values.streetAddress,
      city: values.city,
      state: values.state,
      country: values.country,
      zip: values.zip,
      nycBin: values.nycBin,
      yearBuilt: values.yearBuilt,
      totalFloors: values.totalFloors || values.totalBuildings || 1,
      totalBuildings: values.totalFloors || values.totalBuildings || 1,
      totalUnits: values.totalUnits || 1,
      squareFootage: values.squareFootage,
      purchasePrice: values.purchasePrice,
      currentValue: values.currentValue,
      monthlyExpenses: values.monthlyExpenses,
      image: imageFile || undefined,
      paymentProvider,
      paymentAccountId: paymentProvider === 'COMPANY_DEFAULT' ? '' : paymentAccountId,
      paymentAuthToken: paymentAuthToken || undefined,
      paymentStatus,
    });
  };

  if (loadingProperty) {
    return <div className="p-6 text-xs text-muted-foreground font-semibold">Loading property asset ledger details...</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Edit Property"
        description="Modify registered property assets in your management ledger."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Properties', href: '/properties' },
          { label: 'Edit Property' },
        ]}
      />

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-semibold mb-6 animate-fade-in">
          Property updated successfully! Redirecting back to portfolio...
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-card border border-border p-6 rounded-2xl shadow-sm text-foreground">

        {/* --- SECTION 1: BASIC INFORMATION --- */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-foreground uppercase border-b pb-2">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Property Name</label>
              <Input placeholder="Oakridge Heights" {...register('name')} />
              {errors.name && <p className="text-rose-500 text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Property Type</label>
              <Select {...register('type')}>
                <option value="Apartment">Apartment</option>
                <option value="Commercial">Commercial</option>
                <option value="Single Family">Single Family</option>
                <option value="Multi Family">Multi Family</option>
                <option value="MUP">Mixed-Use Property (MUP)</option>
                <option value="HOA">HOA</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Status</label>
              <Select {...register('status')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Under Review">Under Review</option>
                <option value="Archived">Archived</option>
              </Select>
            </div>
          </div>
        </div>

        {/* --- SECTION 2: ADDRESS (REUSABLE) --- */}
        <AddressForm register={register} errors={errors} />

        {/* --- SECTION: PROPERTY PARAMETERS --- */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-foreground uppercase border-b pb-2">Property Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Total Floors</label>
              <Input type="number" placeholder="e.g. 3" {...register('totalFloors', optionalNumberRegister)} />
              {errors.totalFloors && <p className="text-rose-500 text-xs font-semibold">{errors.totalFloors.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Total Units</label>
              <Input type="number" placeholder="e.g. 10" {...register('totalUnits', optionalNumberRegister)} />
              {errors.totalUnits && <p className="text-rose-500 text-xs font-semibold">{errors.totalUnits.message}</p>}
            </div>
          </div>
        </div>

        {/* --- SECTION 3: OWNERSHIP --- */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-foreground uppercase border-b pb-2">Ownership Structure</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase">Owner</label>
                <button
                  type="button"
                  onClick={() => setIsAddOwnerModalOpen(true)}
                  className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Owner
                </button>
              </div>
              <Select
                {...register('owner')}
                onChange={(e) => {
                  if (e.target.value === '__ADD_NEW__') {
                    setIsAddOwnerModalOpen(true);
                    setValue('owner', '');
                  } else {
                    register('owner').onChange(e);
                  }
                }}
              >
                <option value="">Select Owner...</option>
                <option value="__ADD_NEW__" className="text-primary font-bold">+ Add New Owner...</option>
                {owners.map((o) => {
                  const displayName = o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim();
                  return (
                    <option key={o.id} value={displayName}>
                      {displayName}
                    </option>
                  );
                })}
              </Select>
              {errors.owner && <p className="text-rose-500 text-xs">{errors.owner.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Ownership Percentage (%)</label>
              <Input type="number" {...register('ownershipPercentage', { valueAsNumber: true })} />
              {errors.ownershipPercentage && <p className="text-rose-500 text-xs">{errors.ownershipPercentage.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Management Company</label>
              <Input {...register('managementCompany')} placeholder="Enter management company name" className="font-medium" />
              {errors.managementCompany && <p className="text-rose-500 text-xs">{errors.managementCompany.message}</p>}
            </div>
          </div>
        </div>

        {/* --- SECTION 4.5: PROPERTY-WISE PAYMENT INTEGRATION & MERCHANT ACCOUNT --- */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-xs sm:text-sm uppercase text-primary tracking-wider">
                  Payment Integration & Merchant Account
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure property-specific payment gateway to receive tenant rent in this account, or use Company Default as fallback.
              </p>
            </div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border self-start sm:self-auto ${
              paymentProvider === 'COMPANY_DEFAULT'
                ? 'bg-secondary text-muted-foreground border-border'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              {paymentProvider === 'COMPANY_DEFAULT' ? 'Company Default (Option 2 Fallback)' : `Custom Property Gateway: ${paymentProvider.replace('_', '.')}`}
            </span>
          </div>

          <div className="bg-secondary/20 p-4 sm:p-5 rounded-2xl border border-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                  Payment Provider / Account Destination
                </label>
                <Select
                  value={paymentProvider}
                  onChange={(e) => setPaymentProvider(e.target.value)}
                  className="h-10 text-sm font-medium"
                >
                  <option value="COMPANY_DEFAULT">🏢 Use Company Default (Fallback Option)</option>
                  <option value="STRIPE">💳 Stripe (Credit/Debit/Apple Pay)</option>
                  <option value="AUTHORIZE_NET">🔒 Authorize.Net (Credit Card & eCheck)</option>
                  <option value="RAZORPAY">⚡ Razorpay (Cards, UPI & NetBanking)</option>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {paymentProvider === 'COMPANY_DEFAULT'
                    ? 'Tenant rent for this property will flow through the global gateway configured under Company Settings.'
                    : '1st Priority: Tenant rent for this property will bypass Company Settings and deposit directly into this account.'}
                </p>
              </div>

              {paymentProvider !== 'COMPANY_DEFAULT' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                    Gateway Status
                  </label>
                  <Select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="h-10 text-sm font-medium"
                  >
                    <option value="Active">Active (Accepting Tenant Payments)</option>
                    <option value="Inactive">Inactive (Temporarily Disabled)</option>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Inactive status temporarily routes payments to Company Default until re-activated.
                  </p>
                </div>
              )}
            </div>

            {paymentProvider === 'STRIPE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                    Stripe Publishable Key
                  </label>
                  <Input
                    placeholder="pk_live_... or pk_test_..."
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    className="h-10 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                      Stripe Secret Key (Encrypted in DB)
                    </label>
                    {hasExistingToken && !paymentAuthToken && (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Saved in DB
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      placeholder={hasExistingToken ? '•••••••••••••••• (Leave blank to keep existing)' : 'sk_live_... or sk_test_...'}
                      value={paymentAuthToken}
                      onChange={(e) => setPaymentAuthToken(e.target.value)}
                      className="h-10 text-sm font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {hasExistingToken && (
                    <p className="text-[10px] text-muted-foreground">
                      Current secret key is securely encrypted. Enter a new value only to replace it.
                    </p>
                  )}
                </div>
              </div>
            )}

            {paymentProvider === 'AUTHORIZE_NET' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                    API Login ID
                  </label>
                  <Input
                    placeholder="e.g. 2Aja8R5p"
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    className="h-10 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                      Transaction Key (Encrypted in DB)
                    </label>
                    {hasExistingToken && !paymentAuthToken && (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Saved in DB
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      placeholder={hasExistingToken ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter 16-character Transaction Key'}
                      value={paymentAuthToken}
                      onChange={(e) => setPaymentAuthToken(e.target.value)}
                      className="h-10 text-sm font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {hasExistingToken && (
                    <p className="text-[10px] text-muted-foreground">
                      Current secret key is securely encrypted. Enter a new value only to replace it.
                    </p>
                  )}
                </div>
              </div>
            )}

            {paymentProvider === 'RAZORPAY' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/50 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                    Razorpay Key ID
                  </label>
                  <Input
                    placeholder="rzp_live_... or rzp_test_..."
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    className="h-10 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                      Razorpay Key Secret (Encrypted in DB)
                    </label>
                    {hasExistingToken && !paymentAuthToken && (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Saved in DB
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      placeholder={hasExistingToken ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter Razorpay Key Secret'}
                      value={paymentAuthToken}
                      onChange={(e) => setPaymentAuthToken(e.target.value)}
                      className="h-10 text-sm font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {hasExistingToken && (
                    <p className="text-[10px] text-muted-foreground">
                      Current secret key is securely encrypted. Enter a new value only to replace it.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ADDITIONAL DETAILS DROPDOWN TOGGLE */}
        <div className="pt-2 border-t">
          <button
            type="button"
            onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
            className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/60 border border-border rounded-xl transition-all text-left cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground uppercase tracking-wide">
                  Additional Details (Optional)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Financial Valuation, Property Photo & Documents
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <span>{showAdditionalDetails ? 'Hide Details' : 'Show Details'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdditionalDetails ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </div>

        {showAdditionalDetails && (
          <div className="space-y-8 animate-fade-in pt-2">
            {/* --- SECTION 5: FINANCIAL INFORMATION --- */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-foreground uppercase border-b pb-2">Financial Valuation (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Purchase Price ($)</label>
                  <Input type="number" placeholder="e.g. 2000000" {...register('purchasePrice', optionalNumberRegister)} />
                  {errors.purchasePrice && <p className="text-rose-500 text-xs font-semibold">{errors.purchasePrice.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Current Value ($)</label>
                  <Input type="number" placeholder="e.g. 2200000" {...register('currentValue', optionalNumberRegister)} />
                  {errors.currentValue && <p className="text-rose-500 text-xs font-semibold">{errors.currentValue.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Monthly Expenses ($)</label>
                  <Input type="number" placeholder="e.g. 4500" {...register('monthlyExpenses', optionalNumberRegister)} />
                  {errors.monthlyExpenses && <p className="text-rose-500 text-xs font-semibold">{errors.monthlyExpenses.message}</p>}
                </div>
              </div>
            </div>

            {/* --- SECTION 6: MEDIA --- */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-foreground uppercase border-b pb-2">Property Photo & Document (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Property Photo <span className="text-muted-foreground font-normal">(Max 1MB)</span></label>
                  <FileUploader
                    accept="image/*"
                    maxSizeMB={1}
                    onFileSelect={(file) => setImageFile(file)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Property Documents</label>
                  <FileUploader />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- FOOTER BUTTONS --- */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate({ to: '/properties' })}
            className="flex items-center gap-1 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </Button>

          <div className="flex space-x-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

      </form>
      <QuickAddOwnerModal
        isOpen={isAddOwnerModalOpen}
        onClose={() => setIsAddOwnerModalOpen(false)}
        onOwnerCreated={(newOwner) => {
          const displayName = newOwner.name || `${newOwner.firstName || ''} ${newOwner.lastName || ''}`.trim() || newOwner.id;
          setValue('owner', displayName, { shouldValidate: true });
        }}
      />
    </div>
  );
};
export default EditPropertyPage;
