import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useAuthStore } from '../../store/useStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import api from '../../api';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Mail,
  Lock,
  Building,
  User,
  Phone,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Globe,
  Briefcase
} from 'lucide-react';

// Login Validation Schema
const loginSchema = zod.object({
  email: zod.string().min(1, 'Email is required').email('Invalid email address'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
});
type LoginFormInputs = zod.infer<typeof loginSchema>;

// Tenant Signup Step 1 Schema (Credentials only)
const credentialsSchema = zod.object({
  firstName: zod.string().min(1, 'First name is required'),
  lastName: zod.string().min(1, 'Last name is required'),
  email: zod.string().min(1, 'Email is required').email('Invalid email address'),
  phone: zod.string().min(1, 'Phone number is required'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
});
type CredentialsFormInputs = zod.infer<typeof credentialsSchema>;

// Tenant Signup Step 3 Schema (Additional Lead/Tenant Details)
const detailsSchema = zod.object({
  dob: zod.string().min(1, 'Date of Birth is required'),
  nationality: zod.string().min(1, 'Nationality is required'),
  idType: zod.enum(['SSN', 'Driver License', 'Passport', 'State ID']),
  idNumber: zod.string().min(1, 'ID Number is required'),
  
  emergencyName: zod.string().min(1, 'Emergency Contact Name is required'),
  emergencyRelationship: zod.string().min(1, 'Relationship is required'),
  emergencyPhone: zod.string().min(1, 'Emergency Phone is required'),
  
  employer: zod.string().min(1, 'Employer Name is required'),
  position: zod.string().min(1, 'Position/Title is required'),
  monthlyIncome: zod.number().min(1, 'Monthly Income must be positive'),
  employmentStatus: zod.enum(['Full-Time', 'Part-Time', 'Self-Employed', 'Unemployed', 'Retired']),
  
  currentAddress: zod.string().min(1, 'Current Address is required'),
  
  budget: zod.number().min(1, 'Monthly Budget must be positive'),
  moveInDate: zod.string().min(1, 'Desired Move-in Date is required'),
  priority: zod.enum(['Low', 'Medium', 'High']),
  notes: zod.string().optional().or(zod.literal('')),
});
type DetailsFormInputs = zod.infer<typeof detailsSchema>;

interface LoginPageProps {
  navigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  const { login } = useAuthStore();
  
  // App states
  const [mode, setMode] = useState<'login' | 'signup-step1' | 'signup-step2' | 'signup-step3' | 'signup-success'>('login');
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const [signupStep1Data, setSignupStep1Data] = useState<CredentialsFormInputs | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Queries for public properties list
  const { data: properties = [], isLoading: isLoadingProperties } = useQuery({
    queryKey: ['public-properties'],
    queryFn: () => api.auth.getPublicProperties(),
    enabled: mode === 'signup-step2',
  });

  // Login Form
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isSubmittingLogin },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Signup Step 1 Form
  const {
    register: registerStep1,
    handleSubmit: handleStep1Submit,
    formState: { errors: step1Errors },
  } = useForm<CredentialsFormInputs>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  // Signup Step 3 Form (Details)
  const {
    register: registerStep3,
    handleSubmit: handleStep3Submit,
    formState: { errors: step3Errors },
  } = useForm<DetailsFormInputs>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      dob: '',
      nationality: '',
      idType: 'Driver License',
      idNumber: '',
      emergencyName: '',
      emergencyRelationship: '',
      emergencyPhone: '',
      employer: '',
      position: '',
      monthlyIncome: 3000,
      employmentStatus: 'Full-Time',
      currentAddress: '',
      budget: 1500,
      moveInDate: '',
      priority: 'Medium',
      notes: '',
    },
  });

  // Action: Submit Login
  const onLoginSubmit = async (data: LoginFormInputs) => {
    setApiError(null);
    try {
      await login(data.email, data.password);
      const user = useAuthStore.getState().user;
      const roleName = user?.role;

      if (roleName === 'Owner') {
        navigate('/owner');
      } else if (roleName === 'Tenant') {
        navigate('/tenant');
      } else if (roleName === 'Maintenance Staff' || roleName === 'Staff') {
        navigate('/staff/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setApiError(err.message || 'Invalid credentials. Please try again.');
    }
  };

  // Action: Step 1 Next
  const onStep1NextSubmit = async (data: CredentialsFormInputs) => {
    setApiError(null);
    setIsCheckingEmail(true);
    try {
      const checkRes = await api.auth.checkEmail(data.email);
      if (checkRes.exists) {
        setApiError('This email address is already registered. Please sign in instead.');
        return;
      }
      setSignupStep1Data(data);
      setMode('signup-step2');
    } catch (err: any) {
      setApiError(err.message || 'Error checking email availability. Please try again.');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Action: Step 2 Next
  const onStep2Next = () => {
    setApiError(null);
    if (!selectedProperty) {
      setApiError('Please select a property from the list.');
      return;
    }
    setMode('signup-step3');
  };

  // Action: Step 3 Complete Signup
  const onStep3FinishSubmit = async (step3Data: DetailsFormInputs) => {
    if (!signupStep1Data || !selectedProperty) return;
    setApiError(null);
    setIsSubmittingSignup(true);
    try {
      const payload = {
        ...signupStep1Data,
        ...step3Data,
        companyId: selectedProperty.companyId,
        property: selectedProperty.name,
      };
      await api.auth.tenantSignup(payload);
      setMode('signup-success');
    } catch (err: any) {
      setApiError(err.message || 'Signup processing failed. Please try again.');
    } finally {
      setIsSubmittingSignup(false);
    }
  };

  // UI: LOGIN VIEW
  if (mode === 'login') {
    return (
      <div className="space-y-6 text-slate-900 dark:text-white">
        <div className="flex justify-start">
          <a
            href="https://whatslandlord.com/"
            className="text-xs font-bold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white transition-colors duration-200 flex items-center gap-1"
          >
            ← Back
          </a>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Access Gate</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sign in to begin lease simulations</p>
        </div>

        {apiError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 p-3 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleLoginSubmit(onLoginSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input
                type="email"
                placeholder="name@example.com"
                {...registerLogin('email')}
                className="pl-10 bg-white dark:bg-slate-950/40 border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-primary"
              />
            </div>
            {loginErrors.email && (
              <p className="text-rose-500 dark:text-rose-400 text-xs font-semibold mt-1">{loginErrors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Password
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs text-primary font-bold hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
              <Input
                type="password"
                placeholder="••••••••"
                {...registerLogin('password')}
                className="pl-10 bg-white dark:bg-slate-950/40 border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-primary"
              />
            </div>
            {loginErrors.password && (
              <p className="text-rose-500 dark:text-rose-400 text-xs font-semibold mt-1">{loginErrors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full flex items-center justify-center h-10 font-bold bg-primary text-white hover:bg-primary/90 mt-2"
            disabled={isSubmittingLogin}
          >
            {isSubmittingLogin ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Sign In
          </Button>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setApiError(null);
                setMode('signup-step1');
              }}
              className="w-full flex items-center justify-center h-10 font-bold border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50"
            >
              Signup for Tenant
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // UI: SIGNUP STEP 1 VIEW (Credentials Form only)
  if (mode === 'signup-step1') {
    return (
      <div className="space-y-5 text-slate-900 dark:text-white">
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => {
              setApiError(null);
              setMode('login');
            }}
            className="text-xs font-bold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white transition-colors duration-200 flex items-center gap-1"
          >
            ← Back to Login
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Tenant Signup</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Step 1: Enter your account login details</p>
        </div>

        {apiError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 p-2.5 rounded-lg text-xs font-semibold text-center flex items-center gap-2 justify-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleStep1Submit(onStep1NextSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">First Name</label>
              <Input placeholder="John" {...registerStep1('firstName')} className="h-9 text-xs" />
              {step1Errors.firstName && <p className="text-rose-500 text-[10px]">{step1Errors.firstName.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Last Name</label>
              <Input placeholder="Doe" {...registerStep1('lastName')} className="h-9 text-xs" />
              {step1Errors.lastName && <p className="text-rose-500 text-[10px]">{step1Errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input placeholder="john.doe@gmail.com" type="email" {...registerStep1('email')} className="pl-10 h-9 text-xs" />
            </div>
            {step1Errors.email && <p className="text-rose-500 text-[10px]">{step1Errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <Input placeholder="(512) 555-0199" type="tel" {...registerStep1('phone')} className="pl-10 h-9 text-xs" />
            </div>
            {step1Errors.phone && <p className="text-rose-500 text-[10px]">{step1Errors.phone.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Choose Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
              <Input placeholder="••••••••" type="password" {...registerStep1('password')} className="pl-10 h-9 text-xs" />
            </div>
            {step1Errors.password && <p className="text-rose-500 text-[10px]">{step1Errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full flex items-center justify-center h-10 font-bold bg-primary text-white hover:bg-primary/90 mt-4"
            disabled={isCheckingEmail}
          >
            {isCheckingEmail ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Next: Select Property <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>
      </div>
    );
  }

  // UI: SIGNUP STEP 2 VIEW (Beautiful Property Grid Selection)
  if (mode === 'signup-step2') {
    return (
      <div className="space-y-5 text-slate-900 dark:text-white">
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 5px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.3);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(148, 163, 184, 0.5);
          }
        `}</style>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              setApiError(null);
              setMode('signup-step1');
            }}
            className="text-xs font-bold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white transition-colors duration-200 flex items-center gap-1"
          >
            ← Back to Credentials
          </button>
          <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Step 2 of 3</span>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Choose Your Home</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Select the property you want to assign yourself to</p>
        </div>

        {apiError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 p-2.5 rounded-lg text-xs font-semibold text-center flex items-center gap-2 justify-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1">
            <Building className="w-3.5 h-3.5" /> Available Properties
          </label>

          {isLoadingProperties ? (
            <div className="h-56 flex items-center justify-center border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/30">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-900/30">
              {properties.length === 0 ? (
                <p className="text-xs text-center text-slate-500 py-10">No properties currently available.</p>
              ) : (
                properties.map((prop: any) => {
                  const isSelected = selectedProperty?.id === prop.id;
                  const ownerName = prop.owner?.name || 'Apex Property Manager';
                  return (
                    <div
                      key={prop.id}
                      onClick={() => setSelectedProperty(prop)}
                      className={`flex items-center gap-3.5 p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-sm ${
                        isSelected
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {prop.imageUrl ? (
                          <img src={prop.imageUrl} alt={prop.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 dark:text-white truncate">{prop.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{prop.address || 'Address not listed'}</p>
                        <p className="text-[9px] text-primary/80 dark:text-primary-foreground/75 font-bold mt-1">Owner/Manager: {ownerName}</p>
                      </div>
                      <div className="shrink-0 flex items-center pr-1">
                        <input
                          type="radio"
                          checked={isSelected}
                          onChange={() => setSelectedProperty(prop)}
                          className="h-3.5 w-3.5 text-primary focus:ring-primary border-slate-300 dark:border-slate-700"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <Button
          onClick={onStep2Next}
          className="w-full flex items-center justify-center h-10 font-bold bg-primary text-white hover:bg-primary/90 mt-4"
          disabled={!selectedProperty}
        >
          Next: Application details <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  // UI: SIGNUP STEP 3 VIEW (Details Card + Lead & Additional Tenant Form)
  if (mode === 'signup-step3') {
    return (
      <div className="space-y-5 text-slate-900 dark:text-white max-h-[85vh] overflow-y-auto pr-1 custom-scrollbar">
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 5px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(148, 163, 184, 0.3);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(148, 163, 184, 0.5);
          }
        `}</style>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              setApiError(null);
              setMode('signup-step2');
            }}
            className="text-xs font-bold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white transition-colors duration-200 flex items-center gap-1"
          >
            ← Back to Property Selection
          </button>
          <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Step 3 of 3</span>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Application Details</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Complete application details for screening review</p>
        </div>

        {apiError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 p-2.5 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* 1. VISUALLY STUNNING SELECTED DETAILS CARD */}
        <div className="p-3.5 bg-gradient-to-br from-primary/10 via-primary/5 to-indigo-500/5 border border-primary/20 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase text-primary/75 tracking-wider">Selected Property</span>
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{selectedProperty?.name}</p>
            </div>
          </div>
          <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-2 grid grid-cols-2 gap-2 text-[9px] font-semibold text-slate-600 dark:text-slate-400">
            <div>
              <span className="block text-[8px] uppercase font-black text-slate-400">Applicant</span>
              <p className="truncate text-slate-800 dark:text-slate-200">{signupStep1Data?.firstName} {signupStep1Data?.lastName}</p>
            </div>
            <div>
              <span className="block text-[8px] uppercase font-black text-slate-400">Email & Phone</span>
              <p className="truncate text-slate-800 dark:text-slate-200">{signupStep1Data?.email}</p>
            </div>
          </div>
        </div>

        {/* 2. DETAILED LEADS FORM */}
        <form onSubmit={handleStep3Submit(onStep3FinishSubmit)} className="space-y-4 text-xs">
          
          {/* Section: Personal & ID Details */}
          <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <h4 className="font-extrabold uppercase text-[10px] text-primary tracking-wider">Personal & Identification</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Date of Birth</label>
                <Input type="date" {...registerStep3('dob')} className="h-9" />
                {step3Errors.dob && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.dob.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Nationality</label>
                <div className="relative">
                  <Globe className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input placeholder="American" {...registerStep3('nationality')} className="pl-10 h-9" />
                </div>
                {step3Errors.nationality && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.nationality.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">ID Type</label>
                <Select {...registerStep3('idType')} className="h-9">
                  <option value="Driver License">Driver License</option>
                  <option value="SSN">SSN</option>
                  <option value="Passport">Passport</option>
                  <option value="State ID">State ID</option>
                </Select>
                {step3Errors.idType && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.idType.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">ID Number</label>
                <Input placeholder="A1234567" {...registerStep3('idNumber')} className="h-9" />
                {step3Errors.idNumber && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.idNumber.message}</p>}
              </div>
            </div>
          </div>

          {/* Section: Address History */}
          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <h4 className="font-extrabold uppercase text-[10px] text-primary tracking-wider">Address History</h4>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Current Address</label>
              <Input placeholder="789 Pine Rd, Austin, TX" {...registerStep3('currentAddress')} className="h-9" />
              {step3Errors.currentAddress && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.currentAddress.message}</p>}
            </div>
          </div>

          {/* Section: Employment Information */}
          <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <h4 className="font-extrabold uppercase text-[10px] text-primary tracking-wider">Employment Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Employer Name</label>
                <div className="relative">
                  <Briefcase className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input placeholder="Google Inc." {...registerStep3('employer')} className="pl-10 h-9" />
                </div>
                {step3Errors.employer && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.employer.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Position/Title</label>
                <Input placeholder="Software Engineer" {...registerStep3('position')} className="h-9" />
                {step3Errors.position && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.position.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Monthly Income ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input type="number" {...registerStep3('monthlyIncome', { valueAsNumber: true })} className="pl-10 h-9" />
                </div>
                {step3Errors.monthlyIncome && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.monthlyIncome.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Job Status</label>
                <Select {...registerStep3('employmentStatus')} className="h-9">
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Self-Employed">Self-Employed</option>
                  <option value="Retired">Retired</option>
                  <option value="Unemployed">Unemployed</option>
                </Select>
                {step3Errors.employmentStatus && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.employmentStatus.message}</p>}
              </div>
            </div>
          </div>

          {/* Section: Emergency Contact */}
          <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <h4 className="font-extrabold uppercase text-[10px] text-primary tracking-wider">Emergency Contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1 col-span-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Contact Name</label>
                <Input placeholder="Mary Doe" {...registerStep3('emergencyName')} className="h-9 text-xs" />
                {step3Errors.emergencyName && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.emergencyName.message}</p>}
              </div>
              <div className="space-y-1 col-span-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Relationship</label>
                <Input placeholder="Spouse" {...registerStep3('emergencyRelationship')} className="h-9 text-xs" />
                {step3Errors.emergencyRelationship && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.emergencyRelationship.message}</p>}
              </div>
              <div className="space-y-1 col-span-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Phone No.</label>
                <Input placeholder="(512) 555-9876" {...registerStep3('emergencyPhone')} className="h-9 text-xs" />
                {step3Errors.emergencyPhone && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.emergencyPhone.message}</p>}
              </div>
            </div>
          </div>

          {/* Section: Application Parameters (Leads details) */}
          <div className="space-y-2.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <h4 className="font-extrabold uppercase text-[10px] text-primary tracking-wider">Lease Request details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Monthly Budget ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input type="number" {...registerStep3('budget', { valueAsNumber: true })} className="pl-10 h-9" />
                </div>
                {step3Errors.budget && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.budget.message}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase font-semibold">Desired Move-In</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <Input type="date" {...registerStep3('moveInDate')} className="pl-10 h-9" />
                </div>
                {step3Errors.moveInDate && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.moveInDate.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Priority Status</label>
                <Select {...registerStep3('priority')} className="h-9">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </Select>
                {step3Errors.priority && <p className="text-rose-500 text-[9px] mt-0.5">{step3Errors.priority.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Application Notes / Preferences</label>
              <textarea
                placeholder="Include pet counts, move-in preferences or other details..."
                {...registerStep3('notes')}
                rows={2}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-950/40 p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full flex items-center justify-center h-10 font-bold bg-primary text-white hover:bg-primary/90 mt-4"
            disabled={isSubmittingSignup}
          >
            {isSubmittingSignup ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Application
          </Button>
        </form>
      </div>
    );
  }

  // UI: SIGNUP SUCCESS VIEW
  if (mode === 'signup-success') {
    return (
      <div className="space-y-6 text-center text-slate-900 dark:text-white py-4">
        <div className="flex justify-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Application Submitted!</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            Your tenant registration details have been securely recorded. 
            A background checking ticket and CRM lead have been successfully generated for property manager review.
          </p>
        </div>

        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl max-w-xs mx-auto">
          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Next Steps</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            You can now log in using your registered credentials. Your dashboard will remain in a pending state until manager approval.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setMode('login');
          }}
          className="w-full flex items-center justify-center h-10 font-bold bg-primary text-white hover:bg-primary/90 mt-4"
        >
          Return to Access Gate
        </Button>
      </div>
    );
  }

  return null;
};

export default LoginPage;
