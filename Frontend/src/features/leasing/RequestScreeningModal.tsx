import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { FormDialog } from '../../components/FormDialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Loader2, Send } from 'lucide-react';

interface RequestScreeningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const RequestScreeningModal: React.FC<RequestScreeningModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const queryClient = useQueryClient();

  // Form states
  const [tenantId, setTenantId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [screeningPackage, setScreeningPackage] = useState<'Basic' | 'Comprehensive'>('Basic');
  const [paymentResponsibility, setPaymentResponsibility] = useState<'Applicant' | 'Manager'>('Applicant');

  // Queries
  const { data: properties = [] } = useQuery({ queryKey: ['properties-list'], queryFn: () => api.property.getAll() });
  const { data: units = [] } = useQuery({ queryKey: ['units-list'], queryFn: () => api.unit.getAll() });
  const { data: tenants = [] } = useQuery({ queryKey: ['tenants-list'], queryFn: () => api.tenant.getAll() });

  // Show all applicants & tenants
  const selectableTenants = tenants;
  // Show all units for the selected property with status indicator
  const propertyUnits = units.filter((u: any) => u.propertyId === propertyId);

  const selectedUnitObj = units.find((u: any) => u.id === unitId);
  const isSelectedUnitOccupied = selectedUnitObj ? (selectedUnitObj.status && selectedUnitObj.status !== 'Vacant') : false;

  const requestMutation = useMutation({
    mutationFn: () => {
      const selectedProp = properties.find((p: any) => p.id === propertyId);
      const selectedUnit = units.find((u: any) => u.id === unitId);
      return api.screening.create({
        tenantId,
        firstName,
        lastName,
        email,
        phoneNumber,
        propertyId,
        propertyName: selectedProp ? selectedProp.name : 'Unknown Property',
        unitId,
        unitNumber: selectedUnit ? selectedUnit.unitNumber : '101',
        screeningPackage,
        paymentResponsibility,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-checks-list'] });
      onOpenChange(false);
      // Reset form
      setTenantId('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhoneNumber('');
      setPropertyId('');
      setUnitId('');
      setScreeningPackage('Basic');
      setPaymentResponsibility('Applicant');
      if (onSuccess) onSuccess();
    },
  });

  const skipMutation = useMutation({
    mutationFn: () => {
      const selectedProp = properties.find((p: any) => p.id === propertyId);
      const selectedUnit = units.find((u: any) => u.id === unitId);
      return api.screening.create({
        tenantId,
        firstName,
        lastName,
        email,
        phoneNumber,
        propertyId,
        propertyName: selectedProp ? selectedProp.name : 'Unknown Property',
        unitId,
        unitNumber: selectedUnit ? selectedUnit.unitNumber : '101',
        screeningPackage,
        paymentResponsibility,
        companyId: selectedProp?.companyId,
        status: 'Approved',
        screeningStatus: 'Approved',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-checks-list'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      onOpenChange(false);
      // Reset form
      setTenantId('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhoneNumber('');
      setPropertyId('');
      setUnitId('');
      if (onSuccess) onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tenantId && propertyId && unitId && !isSelectedUnitOccupied) {
      requestMutation.mutate();
    }
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Request Tenant Screening Check">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs font-semibold text-foreground">
        
        {/* Applicant details */}
        <div className="space-y-2.5">
          <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b pb-1">Applicant Details</h4>
          <div className="space-y-1">
            <label className="text-muted-foreground text-[10px] uppercase font-bold">Select Applicant / Tenant *</label>
            <Select 
              value={tenantId} 
              onChange={(e) => {
                const tId = e.target.value;
                setTenantId(tId);
                const selectedT = selectableTenants.find((t: any) => t.id === tId);
                if (selectedT) {
                  setFirstName(selectedT.firstName || '');
                  setLastName(selectedT.lastName || '');
                  setEmail(selectedT.email || '');
                  setPhoneNumber(selectedT.phone || '');
                  
                  // Auto-fill property and unit if tenant has an assigned unit
                  if (selectedT.unitId) {
                    const matchedUnit = units.find((u: any) => u.id === selectedT.unitId);
                    if (matchedUnit) {
                      setPropertyId(matchedUnit.propertyId);
                      setUnitId(matchedUnit.id);
                    } else {
                      setPropertyId('');
                      setUnitId('');
                    }
                  } else if (selectedT.propertyId) {
                    setPropertyId(selectedT.propertyId);
                    setUnitId('');
                  } else {
                    // Reset inputs to blank for new/unassigned tenant
                    setPropertyId('');
                    setUnitId('');
                  }
                } else {
                  // Reset form to blank when unselected
                  setFirstName('');
                  setLastName('');
                  setEmail('');
                  setPhoneNumber('');
                  setPropertyId('');
                  setUnitId('');
                }
              }} 
              required
            >
              <option value="">Choose Applicant...</option>
              {selectableTenants.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName} ({t.email})
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Property details */}
        <div className="space-y-2.5 pt-2">
          <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b pb-1">Applied Property Location</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] uppercase font-bold">Select Property *</label>
              <Select value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setUnitId(''); }} required>
                <option value="">Choose Property...</option>
                {properties.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] uppercase font-bold">Select Unit *</label>
              <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!propertyId} required>
                <option value="">Choose Unit...</option>
                {propertyUnits.map((u: any) => {
                  const isOccupied = u.status && u.status !== 'Vacant';
                  return (
                    <option key={u.id} value={u.id} disabled={isOccupied}>
                      Unit {u.unitNumber} {u.status ? `(${u.status})` : ''}
                    </option>
                  );
                })}
              </Select>
            </div>
          </div>
          {isSelectedUnitOccupied && (
            <p className="text-[11px] text-amber-500 font-semibold mt-1">
              ⚠️ Unit {selectedUnitObj?.unitNumber} is currently {selectedUnitObj?.status}. Screening requests are disabled for occupied units.
            </p>
          )}
        </div>

        {/* Screening parameters */}
        <div className="space-y-2.5 pt-2">
          <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b pb-1">Screening Parameters</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] uppercase font-bold">Screening Package *</label>
              <Select value={screeningPackage} onChange={(e) => setScreeningPackage(e.target.value as any)}>
                <option value="Basic">Basic Check</option>
                <option value="Comprehensive">Comprehensive Check</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-[10px] uppercase font-bold">Payment Responsibility *</label>
              <Select value={paymentResponsibility} onChange={(e) => setPaymentResponsibility(e.target.value as any)}>
                <option value="Applicant">Applicant Pays ($29.99)</option>
                <option value="Manager">Property Manager Pays (Waived)</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            type="button"
            variant="secondary"
            className="font-bold flex items-center gap-1 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
            disabled={requestMutation.isPending || skipMutation.isPending || !tenantId || !propertyId || !unitId || isSelectedUnitOccupied}
            onClick={() => skipMutation.mutate()}
          >
            {skipMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
            Skip Screening
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/95 text-white font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={requestMutation.isPending || skipMutation.isPending || !tenantId || !propertyId || !unitId || isSelectedUnitOccupied}
          >
            {requestMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Send Invitation
          </Button>
        </div>

      </form>
    </FormDialog>
  );
};
