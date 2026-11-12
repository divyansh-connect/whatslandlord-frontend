import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { Shield, Upload, FileCheck } from 'lucide-react';

export const TenantInsurancePage: React.FC = () => {
  // Queries
  const { data: policy = null, isLoading } = useQuery({ queryKey: ['tenant-insurance-policy'], queryFn: () => api.tenantInsurance.get() });

  if (isLoading || !policy) {
    return <LoadingSkeleton type="card" />;
  }

  return (
    <div className="space-y-6 text-foreground max-w-3xl">
      <PageHeader
        title="Renters Insurance policy"
        description="Verify liability coverage amounts, policy expiration dates, or upload updated coverage declarations."
        breadcrumbs={[
          { label: 'Home', href: '/tenant' },
          { label: 'Insurance' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Policy Coverage Profile */}
        <Card className="md:col-span-2 p-6 border bg-card space-y-6">
          <div className="flex items-center space-x-3 border-b pb-4">
            <Shield className="w-7 h-7 text-emerald-500 shrink-0" />
            <div>
              <h3 className="font-extrabold text-sm uppercase">{policy.provider}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-bold">Policy NO: {policy.policyNumber}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">Coverage limit</span>
              <p className="font-bold text-sm text-foreground">${policy.coverageAmount.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase">Expiration Date</span>
              <p className="font-bold text-sm text-amber-500">{policy.expirationDate}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-emerald-500 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 font-bold">
            <FileCheck className="w-4.5 h-4.5 shrink-0" />
            <span>Active & Verified by property management office</span>
          </div>
        </Card>

        {/* Upload Policy card */}
        <Card className="md:col-span-1 p-6 border bg-card flex flex-col justify-between space-y-4 text-xs font-semibold">
          <div>
            <h4 className="font-extrabold uppercase">Update Policy</h4>
            <p className="text-muted-foreground mt-2 leading-relaxed">Submit your new liability coverage declaration sheet before policy expiration.</p>
          </div>
          <Button size="sm" className="w-full flex items-center justify-center gap-1.5 uppercase font-bold" onClick={() => alert('Opening policy upload dialog...')}>
            <Upload className="w-4 h-4" /> Upload Document
          </Button>
        </Card>

      </div>
    </div>
  );
};
export default TenantInsurancePage;
