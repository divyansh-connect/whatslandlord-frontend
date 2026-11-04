import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { User, Save, CheckCircle, Loader2, KeyRound, Edit3, Car, PawPrint, Globe } from 'lucide-react';

export const TenantProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'password'>('view');

  // Tenant Info State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicles, setVehicles] = useState('');
  const [pets, setPets] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('');

  // Password Reset State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ text: '', isError: false });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Queries
  const { data: profile = null, isLoading } = useQuery({
    queryKey: ['tenant-profile-details'],
    queryFn: () => api.tenantProfile.get(),
  });

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setVehicles(profile.vehicles || profile.vehicle || '');
      setPets(profile.pets || profile.pet || '');
      setPreferredLanguage(profile.preferredLanguage || 'English (US)');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (updatedData: any) => api.tenantProfile.update(updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profile-details'] });
      setActiveTab('view');
      setSuccessMessage('Tenant profile details updated successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      firstName,
      lastName,
      phone,
      email,
      vehicles,
      pets,
      preferredLanguage,
    });
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters.', isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }

    setPasswordLoading(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      setPasswordMsg({ text: 'Password reset successfully!', isError: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordMsg({ text: '', isError: false });
        setActiveTab('view');
      }, 3000);
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Failed to update password', isError: true });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (isLoading || !profile) {
    return <LoadingSkeleton type="card" />;
  }

  return (
    <div className="space-y-6 text-foreground max-w-4xl">
      <PageHeader
        title={t('tenant.profile.title')}
        description={t('tenant.profile.desc')}
        breadcrumbs={[
          { label: t('header.home'), href: '/tenant' },
          { label: t('tenant.profile.title') },
        ]}
      />

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 rounded-xl flex items-center gap-2 text-xs font-bold">
          <CheckCircle className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact & Personal Details Card with Integrated Edit & Reset Password */}
        <Card className="md:col-span-2 p-6 border bg-card space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-sm uppercase tracking-wider">
              {activeTab === 'password' ? '🔒 Reset Security Password' : activeTab === 'edit' ? '✏️ Edit Profile Details' : t('tenant.profile.contactDetails')}
            </h3>

            <div className="flex items-center gap-2">
              {activeTab === 'view' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('edit')}
                    className="flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('password')}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Reset Password
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('view')}
                  className="flex items-center gap-1.5 text-xs font-bold"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
          
          {activeTab === 'edit' ? (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">{t('tenant.profile.firstName')}</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">{t('tenant.profile.lastName')}</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">{t('tenant.profile.phone')}</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>

                {/* EMAIL ADDRESS */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    {t('tenant.profile.email')}
                  </label>
                  <Input value={email} disabled={true} readOnly={true} className="bg-muted/50 cursor-not-allowed opacity-70 border-muted" />
                </div>
              </div>

              <div className="pt-3">
                <Button type="submit" disabled={updateMutation.isPending} className="flex items-center gap-2">
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile Changes
                </Button>
              </div>
            </form>
          ) : activeTab === 'password' ? (
            <form onSubmit={handlePasswordReset} className="space-y-4 text-xs font-semibold max-w-md">
              {passwordMsg.text ? (
                <div className={`p-3 rounded-lg border text-xs font-bold ${passwordMsg.isError ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}`}>
                  {passwordMsg.text}
                </div>
              ) : null}

              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Current Password</label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required placeholder="••••••••" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">New Password</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="••••••••" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Confirm New Password</label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={passwordLoading} className="flex items-center gap-2">
                  {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Update Password
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground/60">{t('tenant.profile.firstName')}</p>
                  <p className="text-foreground mt-0.5 text-sm font-bold">{firstName} {lastName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground/60">{t('tenant.profile.phone')}</p>
                  <p className="text-foreground mt-0.5">{phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground/60">{t('tenant.profile.email')}</p>
                  <p className="text-foreground mt-0.5 font-bold">
                    {email}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground/60">{t('tenant.profile.preferredLanguage')}</p>
                  <p className="text-foreground mt-0.5">{preferredLanguage || 'English (US)'}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Vehicles & Pets Permits */}
        <Card className="md:col-span-1 p-6 border bg-card space-y-4 text-xs font-semibold">
          <h3 className="font-extrabold text-sm uppercase border-b pb-2 tracking-wider">{t('tenant.profile.permits')}</h3>
          
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground uppercase font-bold">{t('tenant.profile.registeredVehicles')}</label>
            {activeTab === 'edit' ? (
              <Input
                value={vehicles}
                onChange={(e) => setVehicles(e.target.value)}
                placeholder="e.g. Toyota Camry (2022) or N/A"
              />
            ) : (
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/15 border border-border/40 text-foreground font-medium">
                <Car className="w-4 h-4 text-sky-500 shrink-0" />
                <span className="text-xs">{vehicles && vehicles.trim() ? vehicles : 'N/A'}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 border-t pt-3">
            <label className="text-[10px] text-muted-foreground uppercase font-bold">{t('tenant.profile.registeredPets')}</label>
            {activeTab === 'edit' ? (
              <Input
                value={pets}
                onChange={(e) => setPets(e.target.value)}
                placeholder="e.g. Golden Retriever (Dog) or N/A"
              />
            ) : (
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/15 border border-border/40 text-foreground font-medium">
                <PawPrint className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-xs">{pets && pets.trim() ? pets : 'N/A'}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 border-t pt-3">
            <label className="text-[10px] text-muted-foreground uppercase font-bold">{t('tenant.profile.preferredLanguage')}</label>
            {activeTab === 'edit' ? (
              <Input
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                placeholder="English (US) or Español (ES)"
              />
            ) : (
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/15 border border-border/40 text-foreground font-medium">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs">{preferredLanguage || 'English (US)'}</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
export default TenantProfilePage;
