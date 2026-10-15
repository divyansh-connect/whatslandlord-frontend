import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../api';

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'owner' | 'tenant';
  onSuccess?: () => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  open,
  onOpenChange,
  type,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Form fields
  const [propertyId, setPropertyId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [category, setCategory] = useState(type === 'owner' ? 'Statement' : 'Lease');
  const [docName, setDocName] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Categories lists
  const ownerCategories = ['Statement', 'Tax', 'Contract', 'Insurance', 'Inspection', 'Maintenance', 'Other'];
  const tenantCategories = ['Lease', 'Receipt', 'Invoice', 'Inspection', 'Maintenance', 'Legal', 'Other'];

  // Queries
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
    enabled: open,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => api.building.getAll(),
    enabled: open && type === 'tenant',
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => api.unit.getAll(),
    enabled: open && type === 'tenant',
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.tenant.getAll(),
    enabled: open && type === 'tenant',
  });

  // Reset form when dialog opens/closes or type changes
  useEffect(() => {
    if (open) {
      setFile(null);
      setPropertyId('');
      setBuildingId('');
      setUnitId('');
      setTenantId('');
      setOwnerId('');
      setCategory(type === 'owner' ? 'Statements' : 'Leasing');
      setDocName('');
      setErrorMsg('');
      setSuccess(false);
    }
  }, [open, type]);

  // Handle Tenant selection and search pre-assigned locations
  const handleTenantSelect = (selectedId: string) => {
    setTenantId(selectedId);
    if (!selectedId) {
      setPropertyId('');
      setBuildingId('');
      setUnitId('');
      return;
    }
    const t = tenants.find((item: any) => item.id === selectedId);
    if (t) {
      const uId = t.unitId || '';
      setUnitId(uId);

      // Find unit in units list to get propertyId and buildingId
      const u = units.find((item: any) => item.id === uId);
      if (u) {
        setPropertyId(u.propertyId || '');
        setBuildingId(u.buildingId || '');
      } else {
        setPropertyId(t.propertyId || '');
        const b = buildings.find((item: any) => item.propertyId === t.propertyId);
        setBuildingId(b ? b.id : '');
      }
    }
  };

  // Auto-set owner info when property is selected
  useEffect(() => {
    if (type === 'owner' && propertyId) {
      const selectedProp = properties.find((p: any) => p.id === propertyId);
      if (selectedProp && selectedProp.ownerId) {
        setOwnerId(selectedProp.ownerId);
      } else {
        setOwnerId('');
      }
    }
  }, [propertyId, properties, type]);

  // Handle file selections & size checks (max 1 MB)
  const processFile = (selectedFile: File) => {
    setErrorMsg('');
    if (selectedFile.size > 1 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 1 MB limit. Please select a smaller file.');
      setFile(null);
      return;
    }
    setFile(selectedFile);
    // Keep original file name including extension
    setDocName(selectedFile.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const selected = e.dataTransfer.files[0];
    if (selected) processFile(selected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  };

  // Submit flow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    // Validations based on type
    if (type === 'owner') {
      if (!propertyId) {
        setErrorMsg('Please select a property.');
        return;
      }
    } else {
      if (!tenantId) {
        setErrorMsg('Please select a tenant.');
        return;
      }
      if (!propertyId || !buildingId || !unitId) {
        setErrorMsg('Selected tenant does not have a fully resolved property, building, or unit assignment.');
        return;
      }
    }

    setIsUploading(true);
    setErrorMsg('');

    try {
      let finalName = (docName || file.name).trim();
      const fileExt = file.name.includes('.') ? file.name.split('.').pop() : '';
      if (fileExt && !finalName.includes('.')) {
        finalName = `${finalName}.${fileExt}`;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', finalName);
      formData.append('category', category);
      formData.append('propertyId', propertyId);

      if (type === 'owner') {
        formData.append('ownerId', ownerId);
        await api.documents.uploadOwnerDoc(formData);
      } else {
        formData.append('buildingId', buildingId);
        formData.append('unitId', unitId);
        formData.append('tenantId', tenantId);
        await api.documents.uploadTenantDoc(formData);
      }

      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['docs-general'] });
      queryClient.invalidateQueries({ queryKey: ['docs-owner'] });
      queryClient.invalidateQueries({ queryKey: ['docs-tenant'] });
      if (onSuccess) onSuccess();
      
      // Close modal on success after delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to find selected owner name to display
  const getOwnerDisplayName = () => {
    if (!propertyId) return 'Select a property first';
    const selectedProp = properties.find((p: any) => p.id === propertyId);
    if (selectedProp && selectedProp.owner) {
      const o = selectedProp.owner;
      const fullName = o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim() || 'Unknown';
      return `${fullName} (${o.companyName || 'Individual'})`;
    }
    return 'No owner assigned to this property';
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={type === 'owner' ? 'Upload Document for Owner' : 'Upload Document for Tenant'}
      description={
        type === 'owner'
          ? 'Upload tax, statement, or contract documents associated directly with property owners.'
          : 'Upload lease, receipt, or notice documents associated with specific tenant units.'
      }
    >
      {success ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-3 text-center">
          <CheckCircle className="w-14 h-14 text-emerald-500 animate-bounce" />
          <h3 className="text-lg font-bold text-foreground">Upload Successful!</h3>
          <p className="text-xs text-muted-foreground">The file has been uploaded to Cloudinary and cataloged.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {/* Selection inputs */}
          <div className="space-y-3">
            {type === 'owner' ? (
              <>
                {/* Property Selector */}
                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Property</label>
                  <Select
                    value={propertyId}
                    onChange={(e: any) => {
                      setPropertyId(e.target.value);
                    }}
                    required
                  >
                    <option value="">Select Property...</option>
                    {properties.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* OWNER FLOW: Show owner details */}
                {propertyId && (
                  <div className="p-3 bg-secondary/20 border border-border rounded-xl">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-0.5">Associated Owner</label>
                    <span className="text-xs font-bold text-foreground">{getOwnerDisplayName()}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* TENANT FLOW: Select Tenant First */}
                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Tenant</label>
                  <Select
                    value={tenantId}
                    onChange={(e: any) => handleTenantSelect(e.target.value)}
                    required
                  >
                    <option value="">Select Tenant...</option>
                    {tenants
                      .filter((t: any) => t.status === 'Active')
                      .map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.firstName} {t.lastName}
                        </option>
                      ))}
                  </Select>
                </div>

                {/* Read-only Location Details Card */}
                {tenantId && (
                  <div className="p-3 bg-secondary/20 border border-border rounded-xl space-y-2 text-xs animate-fade-in">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Resolved Location Details</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase block">Property</span>
                        <span className="font-semibold text-foreground">
                          {properties.find((p: any) => p.id === propertyId)?.name || 'Unassigned'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase block">Building</span>
                        <span className="font-semibold text-foreground">
                          {buildings.find((b: any) => b.id === buildingId)?.name || 'Unassigned'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase block">Unit</span>
                        <span className="font-semibold text-foreground">
                          {units.find((u: any) => u.id === unitId)?.unitNumber ? `Unit ${units.find((u: any) => u.id === unitId)?.unitNumber}` : 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Category Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Category</label>
              <Select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                required
              >
                {(type === 'owner' ? ownerCategories : tenantCategories).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            {/* Document Name input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Document Display Name</label>
              <Input
                placeholder="E.g., Lease_Agreement_2026"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* File Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center transition cursor-pointer ${
              dragging ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50 hover:bg-secondary/10'
            }`}
            onClick={() => document.getElementById('modal-file-input')?.click()}
          >
            <input
              id="modal-file-input"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,text/plain"
            />
            {file ? (
              <>
                <FileText className="w-10 h-10 text-primary" />
                <div>
                  <p className="font-bold text-xs max-w-[300px] truncate text-foreground">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setDocName(''); }}
                  className="text-rose-500 text-[10px] font-black uppercase flex items-center gap-1 hover:underline"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground opacity-50" />
                <div>
                  <p className="font-extrabold text-xs text-foreground">Drag & drop document here</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">or click to browse. Max 1 MB.</p>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || isUploading || (type === 'tenant' && !tenantId) || (type === 'owner' && !propertyId)}
            >
              {isUploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        </form>
      )}
    </FormDialog>
  );
};
