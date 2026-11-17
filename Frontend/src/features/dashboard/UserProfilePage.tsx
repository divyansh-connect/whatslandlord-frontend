import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useStore';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  User, Mail, Shield, CheckCircle2, Phone, 
  Briefcase, Loader2, Save, Lock, Edit3, KeyRound, Building2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const UserProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'password'>('view');
  
  // Profile Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [company, setCompany] = useState('');

  // Password Reset States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ text: '', isError: false });

  // Query Backend Database API for logged-in user profile
  const { data: profileResponse, isLoading } = useQuery({
    queryKey: ['user-profile-db'],
    queryFn: async () => {
      const res: any = await api.userProfile.get();
      return res?.data || res;
    },
  });

  // Sync state whenever DB profile data updates
  useEffect(() => {
    const profile = profileResponse?.data || profileResponse;
    if (profile) {
      setName(profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user?.name || '');
      setEmail(profile.email || user?.email || '');
      setPhone(profile.phone || (user as any)?.phone || '');
      setDepartment(profile.department || 'Collections');
      const storedCompany = localStorage.getItem('company_name') || user?.companyName || '';
      setCompany(profile.company && profile.company !== 'Apex Property Management' ? profile.company : (storedCompany || ''));
    }
  }, [profileResponse, user]);

  const activeProfile = profileResponse?.data || profileResponse || {};

  // Mutation to update user profile in MySQL DB
  const updateProfileMutation = useMutation({
    mutationFn: (updatedData: any) => api.userProfile.update(updatedData),
    onSuccess: (response: any) => {
      const updatedData = response?.data || response;
      if (updatedData) {
        if (updatedData.name) setName(updatedData.name);
        if (updatedData.phone) setPhone(updatedData.phone);
        if (updatedData.department) setDepartment(updatedData.department);
        if (updatedData.company) setCompany(updatedData.company);
      }
      queryClient.invalidateQueries({ queryKey: ['user-profile-db'] });
      setActiveTab('view');
      setSuccessMessage('Profile updated in database successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    },
    onError: () => {
      setSuccessMessage('Failed to update profile in database.');
      setTimeout(() => setSuccessMessage(''), 4000);
    },
  });

  // Mutation to change password in DB
  const changePasswordMutation = useMutation({
    mutationFn: (passData: any) => api.auth.changePassword(passData),
    onSuccess: (data: any) => {
      setPasswordMsg({ text: data?.message || 'Password updated in database successfully!', isError: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordMsg({ text: '', isError: false });
        setActiveTab('view');
      }, 2500);
    },
    onError: (err: any) => {
      setPasswordMsg({ text: err?.response?.data?.message || err?.message || 'Failed to update password in database.', isError: true });
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name,
      email,
      phone,
      department,
      company,
    });
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters.', isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={t('nav.profile', { defaultValue: 'Profile' })}
        description="View and update your personal profile details connected to the backend database."
        breadcrumbs={[
          { label: t('header.home', { defaultValue: 'Home' }), href: '/' },
          { label: t('nav.profile', { defaultValue: 'Profile' }) },
        ]}
      />

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-sm font-semibold flex items-center space-x-3 animate-fade-in shadow-lg shadow-emerald-500/5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <Card className="p-6 bg-card/60 backdrop-blur-xl border border-border/80 shadow-xl rounded-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          <div className="flex items-center space-x-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary shadow-xl overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-card" title="Account Active">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-black tracking-tight text-foreground">
                  {activeProfile.name || name || 'Diya Jain'}
                </h2>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                  {activeProfile.role || user?.role || 'Collection Manager'}
                </span>
              </div>
              <p className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
                <Mail className="w-4 h-4 text-primary/70" />
                <span>{activeProfile.email || email}</span>
              </p>
              <div className="flex items-center space-x-4 pt-1 text-xs text-muted-foreground font-semibold">
                <span className="flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{activeProfile.company || company}</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>{activeProfile.department || department}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Tabs */}
          <div className="flex items-center bg-muted/60 p-1.5 rounded-xl border border-border/60 self-stretch md:self-auto justify-stretch">
            <button
              onClick={() => setActiveTab('view')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'view'
                  ? 'bg-card text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'edit'
                  ? 'bg-card text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-2 ${
                activeTab === 'password'
                  ? 'bg-card text-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Security</span>
            </button>
          </div>

        </div>
      </Card>

      {/* TAB 1: OVERVIEW / VIEW DATA */}
      {activeTab === 'view' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 p-6 space-y-6 bg-card/60 backdrop-blur-xl border border-border/80 shadow-md rounded-2xl">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <h3 className="text-base font-extrabold tracking-tight text-foreground flex items-center space-x-2">
                <User className="w-5 h-5 text-primary" />
                <span>Account & Personal Information</span>
              </h3>
              <Button size="sm" variant="outline" onClick={() => setActiveTab('edit')}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Full Name</p>
                <p className="font-bold text-foreground">{activeProfile.name || name || '—'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Email Address</p>
                <p className="font-bold text-foreground">{activeProfile.email || email || '—'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Phone Number</p>
                <p className="font-bold text-foreground">{activeProfile.phone || phone || '—'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">System Role</p>
                <p className="font-bold text-primary">{activeProfile.role || user?.role || 'Collection Manager'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Department</p>
                <p className="font-bold text-foreground">{activeProfile.department || department || '—'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Company / Entity</p>
                <p className="font-bold text-foreground">{activeProfile.company || company || '—'}</p>
              </div>
            </div>
          </Card>

          {/* Side Info Card */}
          <div className="space-y-6">
            <Card className="p-6 bg-card/60 backdrop-blur-xl border border-border/80 shadow-md rounded-2xl space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground border-b border-border/80 pb-3 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Database Status</span>
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">Database Engine</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">MySQL (Prisma)</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground font-semibold">2FA Security</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">Enabled</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground font-semibold">Session Status</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">Active</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full text-xs font-bold mt-2"
                onClick={() => setActiveTab('password')}
              >
                <Lock className="w-3.5 h-3.5 mr-2" />
                Change Password
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: EDIT PROFILE FORM (CLEAN & SIMPLE) */}
      {activeTab === 'edit' && (
        <Card className="p-6 bg-card/60 backdrop-blur-xl border border-border/80 shadow-md rounded-2xl max-w-2xl">
          <h3 className="text-base font-extrabold tracking-tight text-foreground border-b border-border/80 pb-4 mb-6 flex items-center space-x-2">
            <Edit3 className="w-5 h-5 text-primary" />
            <span>Edit Profile</span>
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Full Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>

              {/* READ-ONLY EMAIL FIELD (EMAIL CANNOT BE CHANGED) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center">
                  <span>Email Address</span>
                  <span className="text-[10px] text-amber-500 font-normal lowercase ml-2">(cannot be changed)</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  readOnly
                  className="bg-muted/50 text-muted-foreground cursor-not-allowed opacity-80"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone Number</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter contact phone number"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Department</label>
                <Input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Enter department name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company Name</label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Enter company name..."
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/80">
              <Button type="button" variant="outline" onClick={() => setActiveTab('view')}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes to DB
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 3: SECURITY / PASSWORD */}
      {activeTab === 'password' && (
        <Card className="p-6 bg-card/60 backdrop-blur-xl border border-border/80 shadow-md rounded-2xl max-w-xl">
          <h3 className="text-base font-extrabold tracking-tight text-foreground border-b border-border/80 pb-4 mb-6 flex items-center space-x-2">
            <Lock className="w-5 h-5 text-primary" />
            <span>Reset Security Password</span>
          </h3>

          {passwordMsg.text && (
            <div className={`p-4 rounded-xl text-xs font-bold mb-4 ${
              passwordMsg.isError ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/80">
              <Button type="button" variant="outline" onClick={() => setActiveTab('view')}>
                Cancel
              </Button>
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                Update Password in DB
              </Button>
            </div>
          </form>
        </Card>
      )}

    </div>
  );
};

export default UserProfilePage;
