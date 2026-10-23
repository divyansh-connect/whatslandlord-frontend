import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { PlanLimitReachedModal } from '../../components/PlanLimitReachedModal';
import { AddressForm } from '../../components/AddressForm';
import { FileUploader } from '../../components/FileUploader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Loader2, ArrowLeft, ChevronDown, Plus, CreditCard, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { QuickAddOwnerModal } from '../../components/QuickAddOwnerModal';
import { mapBackendErrors } from '../../utils/errorMapping';

const optionalNumberRegister = {
  setValueAs: (v: any) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v)),
};

const propertyFormSchema = zod.object({
  name: zod.string().min(1, 'Property Name is required'),
  type: zod.enum(['Apartment', 'Commercial', 'Single Family', 'Multi Family', 'SingleFamily', 'MultiFamily', 'HOA', 'MUP', 'Mixed-Use Property (MUP)']),
  status: zod.enum(['Active', 'Inactive', 'Under Review', 'Archived', 'Draft']),
  
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

export const NewPropertyPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [photos, setPhotos] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [success, setSuccess] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [isAddOwnerModalOpen, setIsAddOwnerModalOpen] = useState(false);

  // Property-Wise Payment Integration State
  const [paymentProvider, setPaymentProvider] = useState<string>('COMPANY_DEFAULT');
  const [customProvider, setCustomProvider] = useState<string>('STRIPE');
  const [paymentAccountId, setPaymentAccountId] = useState<string>('');
  const [paymentAuthToken, setPaymentAuthToken] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('Active');
  const [showSecret, setShowSecret] = useState<boolean>(false);

  // Query owners to select one
  const { data: owners = [] } = useQuery({
    queryKey: ['owners'],
    queryFn: () => api.owner.getAll(),
  });

  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');

  const createMutation = useMutation({
    mutationFn: (values: any) => {
      return api.property.create(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setSuccess(true);
      setTimeout(() => navigate({ to: '/properties' }), 2000);
    },
    onError: (err: any) => {
      const errMsg = err?.message || err?.response?.data?.error?.message || '';
      if (errMsg.toLowerCase().includes('limit reached') || err?.code === 'PLAN_LIMIT_EXCEEDED' || err?.response?.data?.error?.code === 'PLAN_LIMIT_EXCEEDED') {
        setLimitMessage(errMsg || 'Property creation limit reached for your active subscription plan.');
        setShowLimitModal(true);
      } else {
        mapBackendErrors(err, setError);
      }
    }
  });

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<PropertyFormInputs>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      type: 'Apartment',
      status: 'Active',
      ownershipPercentage: 100,
      managementCompany: '',
      yearBuilt: undefined,
      totalFloors: 1,
      totalBuildings: 1,
      totalUnits: 1,
      squareFootage: undefined,
      purchasePrice: undefined,
      currentValue: undefined,
      monthlyExpenses: undefined,
    },
  });

  const onSubmit = (values: PropertyFormInputs) => {
    const selectedOwner = owners.find((o) =>
      o.id === values.owner ||
      o.name === values.owner ||
      `${o.firstName || ''} ${o.lastName || ''}`.trim() === values.owner
    );
    const ownerId = selectedOwner ? selectedOwner.id : values.owner;

    createMutation.mutate({
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
      paymentAccountId: paymentProvider === 'COMPANY_DEFAULT' ? undefined : paymentAccountId,
      paymentAuthToken: paymentProvider === 'COMPANY_DEFAULT' ? undefined : paymentAuthToken,
      paymentStatus,
    });
  };

  const handleSaveDraft = (e: React.MouseEvent) => {
    e.preventDefault();
    const values = handleSubmit((formValues) => {
      const selectedOwner = owners.find((o) =>
        o.id === formValues.owner ||
        o.name === formValues.owner ||
        `${o.firstName || ''} ${o.lastName || ''}`.trim() === formValues.owner
      );
      const ownerId = selectedOwner ? selectedOwner.id : formValues.owner;

      createMutation.mutate({
        name: formValues.name || 'Untitled Draft Property',
        type: formValues.type || 'Apartment',
        status: 'Draft',
        ownerId,
        ownershipPercentage: formValues.ownershipPercentage || 100,
        managementCompany: formValues.managementCompany || '',
        address: `${formValues.streetAddress || ''}, ${formValues.city || ''}, ${formValues.state || ''}, ${formValues.country || 'USA'}, ${formValues.zip || ''}`,
        streetAddress: formValues.streetAddress || '',
        city: formValues.city || '',
        state: formValues.state || '',
        country: formValues.country || 'USA',
        zip: formValues.zip || '',
        nycBin: formValues.nycBin,
        yearBuilt: formValues.yearBuilt || 2020,
        totalBuildings: formValues.totalBuildings || 1,
        squareFootage: formValues.squareFootage || 5000,
        purchasePrice: formValues.purchasePrice || 0,
        currentValue: formValues.currentValue || 0,
        monthlyExpenses: formValues.monthlyExpenses || 0,
        image: imageFile || undefined,
        paymentProvider,
        paymentAccountId: paymentProvider === 'COMPANY_DEFAULT' ? undefined : paymentAccountId,
        paymentAuthToken: paymentProvider === 'COMPANY_DEFAULT' ? undefined : paymentAuthToken,
        paymentStatus,
      });
      navigate({ to: '/properties/drafts' });
    })();
  };

  return (
    <div className="w-full space-y-5 pb-10">
      <PageHeader
        title="Add Property"
        description="Register a new property asset in your management ledger."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Properties', href: '/properties' },
          { label: 'Add Property' },
        ]}
      />

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl text-sm font-semibold mb-6 animate-fade-in shadow-lg">
          Property saved successfully! Redirecting back to portfolio...
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-card border border-border p-6 sm:p-7 rounded-2xl shadow-xl text-foreground">
        
        {/* --- SECTION 1: BASIC INFORMATION --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Property Name *</label>
            <Input placeholder="Oakridge Heights" {...register('name')} className="h-10 text-sm font-medium" />
            {errors.name && <p className="text-rose-500 text-xs font-semibold">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Property Type *</label>
            <Select {...register('type')} className="h-10 text-sm font-semibold">
              <option value="Apartment">Apartment</option>
              <option value="Commercial">Commercial</option>
              <option value="Single Family">Single Family</option>
              <option value="Multi Family">Multi Family</option>
              <option value="MUP">Mixed-Use Property (MUP)</option>
              <option value="HOA">HOA</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Status *</label>
            <Select {...register('status')} className="h-10 text-sm font-semibold">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Under Review">Under Review</option>
              <option value="Archived">Archived</option>
              <option value="Draft">Draft</option>
            </Select>
          </div>
        </div>

        {/* --- SECTION 2: ADDRESS COORDINATES --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-border">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Street Address *</label>
            <Input placeholder="124 Oakridge Blvd" {...register('streetAddress')} className="h-10 text-sm font-medium" />
            {errors.streetAddress && <p className="text-rose-500 text-xs font-semibold">{errors.streetAddress.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">City *</label>
            <Input placeholder="Austin" {...register('city')} className="h-10 text-sm font-medium" />
            {errors.city && <p className="text-rose-500 text-xs font-semibold">{errors.city.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">State *</label>
            <Input placeholder="TX" {...register('state')} className="h-10 text-sm font-medium" />
            {errors.state && <p className="text-rose-500 text-xs font-semibold">{errors.state.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Country *</label>
            <Input placeholder="USA" {...register('country')} className="h-10 text-sm font-medium" />
            {errors.country && <p className="text-rose-500 text-xs font-semibold">{errors.country.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">ZIP Code *</label>
            <Input placeholder="78701" {...register('zip')} className="h-10 text-sm font-medium" />
            {errors.zip && <p className="text-rose-500 text-xs font-semibold">{errors.zip.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-amber-500 uppercase tracking-wide flex items-center gap-1 truncate">
              NYC BIN (Building ID) <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
            </label>
            <Input placeholder="e.g. 1000000" {...register('nycBin')} className="h-10 text-sm font-medium" />
          </div>
        </div>

        {/* --- SECTION: PROPERTY PARAMETERS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Total Floors</label>
            <Input type="number" placeholder="e.g. 3" {...register('totalFloors', optionalNumberRegister)} className="h-10 text-sm font-medium" />
            {errors.totalFloors && <p className="text-rose-500 text-xs font-semibold">{errors.totalFloors.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Total Units</label>
            <Input type="number" placeholder="e.g. 10" {...register('totalUnits', optionalNumberRegister)} className="h-10 text-sm font-medium" />
            {errors.totalUnits && <p className="text-rose-500 text-xs font-semibold">{errors.totalUnits.message}</p>}
          </div>
        </div>

        {/* --- SECTION 3: OWNERSHIP STRUCTURE --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Owner *</label>
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
              className="h-10 text-sm font-semibold"
            >
              <option value="">Select Owner...</option>
              <option value="__ADD_NEW__" className="text-primary font-bold">+ Add New Owner...</option>
              {owners.map((o) => {
                const displayName = o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim() || o.id;
                return (
                  <option key={o.id} value={displayName}>
                    {displayName}
                  </option>
                );
              })}
            </Select>
            {errors.owner && <p className="text-rose-500 text-xs font-semibold">{errors.owner.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Ownership Percentage (%) *</label>
            <Input type="number" {...register('ownershipPercentage', { valueAsNumber: true })} className="h-10 text-sm font-medium" />
            {errors.ownershipPercentage && <p className="text-rose-500 text-xs font-semibold">{errors.ownershipPercentage.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Management Company</label>
            <Input {...register('managementCompany')} placeholder="Enter management company name" className="h-10 text-sm font-medium" />
            {errors.managementCompany && <p className="text-rose-500 text-xs font-semibold">{errors.managementCompany.message}</p>}
          </div>
        </div>

        {/* --- SECTION 4.5: PROPERTY-WISE PAYMENT INTEGRATION & MERCHANT ACCOUNT --- */}
        <div className="space-y-4 pt-3 border-t border-border">
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
              {paymentProvider === 'COMPANY_DEFAULT' ? 'Company Default (Option 1)' : `Custom Gateway: ${paymentProvider.replace('_', '.')}`}
            </span>
          </div>

          <div className="bg-secondary/20 p-4 sm:p-5 rounded-2xl border border-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                  Payment Account Setup
                </label>
                <Select
                  value={paymentProvider === 'COMPANY_DEFAULT' ? 'COMPANY_DEFAULT' : 'OTHER'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'COMPANY_DEFAULT') {
                      setPaymentProvider('COMPANY_DEFAULT');
                    } else {
                      setPaymentProvider(customProvider || 'STRIPE');
                    }
                  }}
                  className="h-10 text-sm font-medium"
                >
                  <option value="COMPANY_DEFAULT">🏢 Use Company Default (Company Settings)</option>
                  <option value="OTHER">⚙️ Other (Custom Payment Gateway)</option>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {paymentProvider === 'COMPANY_DEFAULT'
                    ? 'Tenant rent for this property will flow through the global gateway configured under Company Settings.'
                    : 'Configure property-specific custom payment gateway credentials.'}
                </p>
              </div>

              {paymentProvider !== 'COMPANY_DEFAULT' && (
                <>
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                      Select Custom Gateway Provider
                    </label>
                    <Select
                      value={paymentProvider}
                      onChange={(e) => {
                        setPaymentProvider(e.target.value);
                        setCustomProvider(e.target.value);
                      }}
                      className="h-10 text-sm font-medium"
                    >
                      <option value="STRIPE">💳 Stripe (Credit/Debit/Apple Pay)</option>
                      <option value="RAZORPAY">⚡ Razorpay (Cards, UPI & NetBanking)</option>
                      <option value="AUTHORIZE_NET">🔒 Authorize.Net (Credit Card & eCheck)</option>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Tenant rent will bypass Company Settings and deposit directly into this gateway.
                    </p>
                  </div>

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
                </>
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
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                    Stripe Secret Key (Encrypted in DB)
                  </label>
                  <div className="relative">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      placeholder="sk_live_... or sk_test_..."
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
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                    Transaction Key (Encrypted in DB)
                  </label>
                  <div className="relative">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      placeholder="Enter 16-character Transaction Key"
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
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">
                    Razorpay Key Secret (Encrypted in DB)
                  </label>
                  <div className="relative">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      placeholder="Enter Razorpay Key Secret"
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
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ADDITIONAL DETAILS DROPDOWN TOGGLE */}
        <div className="pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => setShowAdditionalDetails(!showAdditionalDetails)}
            className="w-full flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary/60 border border-border rounded-2xl transition-all text-left cursor-pointer"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-foreground uppercase tracking-wider">
                  Additional Details (Optional)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Financial Valuation, Property Photo & Documents
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-primary">
              <span>{showAdditionalDetails ? 'Hide Details' : 'Show Details'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdditionalDetails ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </div>

        {showAdditionalDetails && (
          <div className="space-y-6 animate-fade-in pt-2">
            {/* --- SECTION 5: FINANCIAL DATA --- */}
            <div className="space-y-3 pt-2 border-t border-border">
              <h3 className="font-extrabold text-xs sm:text-sm uppercase text-primary tracking-wider border-b border-border pb-2">Financial Valuation (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Purchase Price ($)</label>
                  <Input type="number" placeholder="e.g. 2000000" {...register('purchasePrice', optionalNumberRegister)} className="h-10 text-sm font-medium" />
                  {errors.purchasePrice && <p className="text-rose-500 text-xs font-semibold">{errors.purchasePrice.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Current Value ($)</label>
                  <Input type="number" placeholder="e.g. 2200000" {...register('currentValue', optionalNumberRegister)} className="h-10 text-sm font-medium" />
                  {errors.currentValue && <p className="text-rose-500 text-xs font-semibold">{errors.currentValue.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Monthly Expenses ($)</label>
                  <Input type="number" placeholder="e.g. 4500" {...register('monthlyExpenses', optionalNumberRegister)} className="h-10 text-sm font-medium" />
                  {errors.monthlyExpenses && <p className="text-rose-500 text-xs font-semibold">{errors.monthlyExpenses.message}</p>}
                </div>
              </div>
            </div>

            {/* --- SECTION 6: MEDIA --- */}
            <div className="space-y-3 pt-2 border-t border-border">
              <h3 className="font-extrabold text-xs sm:text-sm uppercase text-primary tracking-wider border-b border-border pb-2">Property Photo & Document (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Property Photo <span className="text-muted-foreground font-normal">(Max 1MB)</span></label>
                  <FileUploader
                    accept="image/*"
                    maxSizeMB={1}
                    onFileSelect={(file) => setImageFile(file)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Property Documents</label>
                  <FileUploader />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- FOOTER BUTTONS --- */}
        <div className="flex justify-between items-center pt-6 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate({ to: '/properties' })}
            className="flex items-center gap-1 font-semibold text-sm h-10 px-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </Button>

          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={handleSaveDraft} className="text-sm h-10 font-bold px-5">
              Save Draft
            </Button>
            <Button type="submit" disabled={createMutation.isPending} className="text-sm h-10 font-bold px-6">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Property
            </Button>
          </div>
        </div>

      </form>

      <PlanLimitReachedModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        onUpgrade={() => navigate({ to: '/subscriptions/plans' })}
        message={limitMessage}
        limitType="properties"
      />
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
export default NewPropertyPage;
