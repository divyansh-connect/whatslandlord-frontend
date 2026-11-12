import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api';
import { useNavigate } from '@tanstack/react-router';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { 
  Save, CheckCircle, Image, Trash2, Camera, User, 
  Clock, AlertCircle, FileText, Sparkles, Check, Play, Edit, RotateCcw, ClipboardList,
  ArrowLeft, Loader2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface InspectionScreenProps {
  id: string;
}

export const InspectionScreen: React.FC<InspectionScreenProps> = ({ id }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<any[]>([]);
  const [overallNotes, setOverallNotes] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [inspectorSignature, setInspectorSignature] = useState('');
  const [tenantSignature, setTenantSignature] = useState('');
  const [assignedInspectorId, setAssignedInspectorId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // Canvas refs for drawing signatures
  const inspectorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tenantCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isInspectorDrawing, setIsInspectorDrawing] = useState(false);
  const [isTenantDrawing, setIsTenantDrawing] = useState(false);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  // Fetch detailed inspection
  const { data: inspection, isLoading, refetch } = useQuery({
    queryKey: ['inspection', id],
    queryFn: () => api.inspections.getById(id),
  });

  // Fetch Templates
  const { data: templates = [] } = useQuery({
    queryKey: ['activeInspectionTemplates'],
    queryFn: async () => {
      const all = await api.inspectionTemplates.getAll();
      return all.filter((tpl: any) => tpl.active && tpl.type === 'INSPECTION_ASSIGN');
    },
  });

  useEffect(() => {
    if (inspection) {
      setRooms(inspection.rooms || []);
      setOverallNotes(inspection.overallNotes || '');
      setManagerNotes(inspection.managerNotes || '');
      setInspectorSignature(inspection.inspectorSignature || '');
      setTenantSignature(inspection.tenantSignature || '');
      setAssignedInspectorId(inspection.assignedInspectorId || '');
      setSelectedTemplateId(inspection.templateId || '');
    }
  }, [inspection]);

  // Mutations
  const updateDraftMutation = useMutation({
    mutationFn: (data: any) => api.inspections.update(id, data),
    onSuccess: () => {
      setSuccessMsg('Draft saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      refetch();
    },
    onError: (err: any) => {
      setValidationError(err?.message || 'Failed to save draft progress.');
    }
  });

  const completeMutation = useMutation({
    mutationFn: () => api.inspections.complete(id),
    onSuccess: () => {
      setSuccessMsg('Inspection completed successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      refetch();
    },
    onError: (err: any) => {
      setValidationError(err.message || 'Validation failed.');
    }
  });

  const reopenMutation = useMutation({
    mutationFn: () => api.inspections.reopen(id),
    onSuccess: () => {
      setSuccessMsg('Inspection reopened and unlocked!');
      setTimeout(() => setSuccessMsg(null), 3000);
      refetch();
    },
  });

  if (isLoading) {
    return <div className="py-12 text-center text-xs font-semibold text-muted-foreground">Loading Inspection checklist...</div>;
  }

  if (!inspection) {
    return (
      <div className="py-12 text-center text-xs font-semibold text-rose-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-2 text-rose-500" />
        Inspection record not found.
      </div>
    );
  }

  const parentWorkflow = inspection.moveIn || inspection.moveOut || {};
  const { lease, unit } = parentWorkflow;
  const tenant = lease?.tenant;
  const property = unit?.property;
  const isCompleted = inspection.status === 'COMPLETED';

  // Calculate Progress Stats
  const allItems = rooms.reduce((acc, r) => [...acc, ...(r.items || [])], []);
  const completedItems = allItems.filter((i: any) => i.completed);
  const totalCount = allItems.length;
  const completedCount = completedItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Rating styles
  const ratings: { value: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; label: string; color: string; bg: string }[] = [
    { value: 'EXCELLENT', label: 'Excellent', color: 'text-emerald-500 border-emerald-500', bg: 'bg-emerald-500/10' },
    { value: 'GOOD', label: 'Good', color: 'text-sky-500 border-sky-500', bg: 'bg-sky-500/10' },
    { value: 'FAIR', label: 'Fair', color: 'text-amber-500 border-amber-500', bg: 'bg-amber-500/10' },
    { value: 'POOR', label: 'Poor', color: 'text-rose-500 border-rose-500', bg: 'bg-rose-500/10' },
  ];

  const handleRateItem = (roomId: string, itemId: string, rate: any) => {
    if (isCompleted) return;
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        items: r.items.map((i: any) => i.id === itemId ? { ...i, condition: rate, completed: true } : i)
      };
    }));
  };

  const handleItemNoteChange = (roomId: string, itemId: string, noteVal: string) => {
    if (isCompleted) return;
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        items: r.items.map((i: any) => i.id === itemId ? { ...i, notes: noteVal } : i)
      };
    }));
  };

  const handlePhotoUpload = async (roomId: string, itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCompleted) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingItemId(itemId);
    setValidationError(null);

    try {
      const uploadedPhotos: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Upload direct to Cloudinary via backend endpoint
        const res = await api.inspections.uploadPhoto(itemId, file);
        if (res && res.url) {
          uploadedPhotos.push({
            id: res.id,
            url: res.url,
            caption: res.caption || file.name,
            sortOrder: res.sortOrder || i,
          });
        }
      }

      setRooms(prev => prev.map(r => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          items: r.items.map((item: any) => {
            if (item.id !== itemId) return item;
            const oldPhotos = item.photos || [];
            return {
              ...item,
              photos: [...oldPhotos, ...uploadedPhotos]
            };
          })
        };
      }));
    } catch (err: any) {
      console.warn('Direct Cloudinary upload failed, falling back to local preview:', err);
      // Fallback: If network drops, use base64 so user's photo is still safely previewed
      const fallbackPhotos: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        const promise = new Promise((resolve) => {
          reader.onloadend = () => {
            resolve({
              url: reader.result as string,
              caption: file.name,
              sortOrder: i,
            });
          };
        });
        reader.readAsDataURL(file);
        fallbackPhotos.push(await promise);
      }

      setRooms(prev => prev.map(r => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          items: r.items.map((item: any) => {
            if (item.id !== itemId) return item;
            const oldPhotos = item.photos || [];
            return {
              ...item,
              photos: [...oldPhotos, ...fallbackPhotos]
            };
          })
        };
      }));
    } finally {
      setUploadingItemId(null);
    }
  };

  const handleRemovePhoto = (roomId: string, itemId: string, photoIdx: number) => {
    if (isCompleted) return;
    setRooms(prev => prev.map(r => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        items: r.items.map((item: any) => {
          if (item.id !== itemId) return item;
          return {
            ...item,
            photos: (item.photos || []).filter((_: any, pIdx: number) => pIdx !== photoIdx)
          };
        })
      };
    }));
  };

  // Canvas drawing handlers
  const startDrawing = (canvasRef: React.MutableRefObject<HTMLCanvasElement | null>, drawingSetter: React.Dispatch<React.SetStateAction<boolean>>, e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isCompleted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3b82f6'; // primary blue

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    drawingSetter(true);
  };

  const draw = (canvasRef: React.MutableRefObject<HTMLCanvasElement | null>, isDrawing: boolean, e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isCompleted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = (canvasRef: React.MutableRefObject<HTMLCanvasElement | null>, drawingSetter: React.Dispatch<React.SetStateAction<boolean>>, sigSetter: React.Dispatch<React.SetStateAction<string>>) => {
    if (isCompleted) return;
    drawingSetter(false);
    const canvas = canvasRef.current;
    if (canvas) {
      sigSetter(canvas.toDataURL());
    }
  };

  const clearSignature = (canvasRef: React.MutableRefObject<HTMLCanvasElement | null>, sigSetter: React.Dispatch<React.SetStateAction<string>>) => {
    if (isCompleted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    sigSetter('');
  };

  const handleSaveDraft = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    // Pack room items payload
    const flatItemsPayload = rooms.reduce((acc, room) => {
      const items = room.items.map((i: any) => ({
        id: i.id,
        condition: i.condition,
        notes: i.notes,
        completed: i.completed,
        photos: i.photos || [],
      }));
      return [...acc, ...items];
    }, []);

    updateDraftMutation.mutate({
      overallNotes,
      managerNotes,
      inspectorSignature,
      tenantSignature,
      assignedInspectorId,
      templateId: selectedTemplateId,
      items: flatItemsPayload,
    });
  };

  const handleComplete = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);
    
    // Check if required items are rated
    for (const room of rooms) {
      for (const item of room.items) {
        if (item.required && (!item.completed || !item.condition)) {
          setValidationError(`Required item "${item.label}" in section "${room.name}" must be rated.`);
          return;
        }
      }
    }

    if (!inspectorSignature) {
      setValidationError('Inspector signature is required.');
      return;
    }

    if (!tenantSignature) {
      setValidationError('Tenant signature is required.');
      return;
    }

    // Save current states as draft first
    const flatItemsPayload = rooms.reduce((acc, room) => {
      const items = room.items.map((i: any) => ({
        id: i.id,
        condition: i.condition,
        notes: i.notes,
        completed: i.completed,
        photos: i.photos || [],
      }));
      return [...acc, ...items];
    }, []);

    updateDraftMutation.mutate({
      overallNotes,
      managerNotes,
      inspectorSignature,
      tenantSignature,
      assignedInspectorId,
      templateId: selectedTemplateId,
      items: flatItemsPayload,
      status: 'COMPLETED'
    }, {
      onSuccess: () => {
        completeMutation.mutate();
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={`Checklist Execution: ${inspection.inspectionNumber}`}
        description={`Status: ${inspection.status} | Template: ${inspection.templateName}`}
        breadcrumbs={[
          {
            label: inspection.moveInId ? 'Move In Details' : 'Move Out Details',
            href: inspection.moveInId
              ? `/leasing/move-in/${inspection.moveInId}`
              : `/leasing/move-out/${inspection.moveOutId}`
          },
          { label: 'Inspection Execution' },
        ]}
      />

      {/* PROGRESS TRACKER BAR */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 text-foreground">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wide">Inspection Progress</h3>
            <p className="text-xs text-muted-foreground font-bold">{completedCount} of {totalCount} items rated ({progressPercent}%)</p>
          </div>
        </div>

        <div className="w-full sm:w-1/2 space-y-1">
          <div className="flex justify-between text-[10px] font-extrabold uppercase text-muted-foreground">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden border">
            <div 
              className="h-full bg-primary transition-all duration-350"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {validationError && (
        <div className="bg-rose-500/10 border border-rose-500/25 text-rose-500 p-4 rounded-xl text-xs font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 p-4 rounded-xl text-xs font-bold flex items-center space-x-2">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ROOMS & ITEMS CHECKLIST */}
      <div className="space-y-6">
        {rooms.map((room, rIdx) => (
          <div key={room.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm text-foreground">
            <div className="bg-muted/40 px-6 py-4 border-b">
              <h2 className="text-sm font-extrabold uppercase tracking-widest text-primary">{room.name} Section</h2>
            </div>

            <div className="p-6 divide-y space-y-6">
              {room.items.map((item: any, iIdx: number) => (
                <div key={item.id} className={`pt-6 ${iIdx === 0 ? 'pt-0' : ''} space-y-4`}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
                    <div className="space-y-1">
                      <span className="text-xs font-extrabold flex items-center">
                        {item.label}
                        {item.required && <span className="text-rose-500 ml-1 font-extrabold">*</span>}
                      </span>
                      <p className="text-[10px] text-muted-foreground font-bold">
                        {item.required ? 'REQUIRED FIELD' : 'OPTIONAL FIELD'}
                      </p>
                    </div>

                    {/* rating buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {ratings.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          disabled={isCompleted}
                          onClick={() => handleRateItem(room.id, item.id, r.value)}
                          className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg border uppercase transition-all ${
                            item.condition === r.value 
                              ? `${r.color} ${r.bg} border-current scale-105 shadow-sm` 
                              : 'border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* notes & photo upload */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Item Condition Notes</label>
                      <textarea
                        disabled={isCompleted}
                        value={item.notes || ''}
                        onChange={(e) => handleItemNoteChange(room.id, item.id, e.target.value)}
                        placeholder="Detail any cracks, leaks, damage, or wear..."
                        className="w-full p-2.5 rounded border bg-secondary/35 text-xs focus:outline-none h-20"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase block">Condition Photos</span>
                      
                      {!isCompleted && (
                        <label className={`border border-dashed border-border rounded-xl p-3 flex flex-col items-center justify-center transition text-muted-foreground ${
                          uploadingItemId === item.id ? 'opacity-70 cursor-not-allowed bg-muted/40' : 'cursor-pointer hover:bg-muted/30'
                        }`}>
                          {uploadingItemId === item.id ? (
                            <>
                              <Loader2 className="w-5 h-5 mb-1 text-primary animate-spin" />
                              <span className="text-[10px] font-bold text-primary">Uploading to Cloudinary...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-5 h-5 mb-1 text-primary" />
                              <span className="text-[10px] font-bold">Upload Photos</span>
                            </>
                          )}
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            disabled={uploadingItemId === item.id}
                            className="hidden"
                            onChange={(e) => handlePhotoUpload(room.id, item.id, e)}
                          />
                        </label>
                      )}

                      {/* Photo previews */}
                      <div className="flex flex-wrap gap-2">
                        {(item.photos || []).map((p: any, pIdx: number) => (
                          <div key={pIdx} className="relative w-16 h-16 rounded-lg overflow-hidden border shadow-sm group">
                            <img src={p.url} alt="Item Preview" className="w-full h-full object-cover" />
                            {!isCompleted && (
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(room.id, item.id, pIdx)}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* OVERALL & MANAGER NOTES */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6 text-foreground">
        <h2 className="text-sm font-extrabold uppercase tracking-wider border-b pb-4 text-primary">Summary Notes</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">General Inspector Notes</label>
            <textarea
              disabled={isCompleted}
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              placeholder="Provide a general summary of property conditions..."
              className="w-full p-2.5 rounded border bg-secondary/35 text-xs focus:outline-none h-24"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Internal Manager Review Notes</label>
            <textarea
              disabled={isCompleted}
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              placeholder="Internal notes regarding repair costs, deposit withholding, actions needed..."
              className="w-full p-2.5 rounded border bg-secondary/35 text-xs focus:outline-none h-24"
            />
          </div>
        </div>
      </div>

      {/* SIGNATURE PANELS */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6 text-foreground">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b pb-4 gap-4">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-primary">Digital Signoff</h2>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-muted-foreground uppercase">Assign Inspector:</span>
              <select
                disabled={isCompleted}
                value={selectedTemplateId}
                onChange={(e) => {
                  e.preventDefault();
                  setSelectedTemplateId(e.target.value);
                }}
                className="p-1.5 rounded border bg-secondary/35 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
              >
                <option value="">Select Template...</option>
                {templates.map((tpl: any) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inspector Signature */}
          <div className="border rounded-xl p-4 space-y-3 bg-secondary/5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block text-center">Inspector Signature</span>
            
            {isCompleted ? (
              <div className="border rounded-lg p-2 bg-card">
                <img src={inspectorSignature} alt="Inspector Signature" className="max-h-24 mx-auto dark:invert" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="border rounded-lg overflow-hidden bg-card relative">
                  <canvas
                    width={400}
                    height={150}
                    ref={inspectorCanvasRef}
                    onMouseDown={(e) => startDrawing(inspectorCanvasRef, setIsInspectorDrawing, e)}
                    onMouseMove={(e) => draw(inspectorCanvasRef, isInspectorDrawing, e)}
                    onMouseUp={() => stopDrawing(inspectorCanvasRef, setIsInspectorDrawing, setInspectorSignature)}
                    onMouseLeave={() => stopDrawing(inspectorCanvasRef, setIsInspectorDrawing, setInspectorSignature)}
                    className="w-full cursor-crosshair h-28"
                  />
                  {inspectorSignature && (
                    <button
                      type="button"
                      onClick={() => clearSignature(inspectorCanvasRef, setInspectorSignature)}
                      className="absolute top-2 right-2 text-rose-500 hover:text-rose-600 bg-secondary/80 p-1.5 rounded-full"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
            <span className="text-[9px] text-muted-foreground block text-center">Date Signed: {inspection.inspectorSignedAt ? new Date(inspection.inspectorSignedAt).toLocaleString() : 'Not signed'}</span>
          </div>

          {/* Tenant Signature */}
          <div className="border rounded-xl p-4 space-y-3 bg-secondary/5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block text-center">Resident / Tenant Signature</span>

            {isCompleted ? (
              <div className="border rounded-lg p-2 bg-card">
                <img src={tenantSignature} alt="Tenant Signature" className="max-h-24 mx-auto dark:invert" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="border rounded-lg overflow-hidden bg-card relative">
                  <canvas
                    width={400}
                    height={150}
                    ref={tenantCanvasRef}
                    onMouseDown={(e) => startDrawing(tenantCanvasRef, setIsTenantDrawing, e)}
                    onMouseMove={(e) => draw(tenantCanvasRef, isTenantDrawing, e)}
                    onMouseUp={() => stopDrawing(tenantCanvasRef, setIsTenantDrawing, setTenantSignature)}
                    onMouseLeave={() => stopDrawing(tenantCanvasRef, setIsTenantDrawing, setTenantSignature)}
                    className="w-full cursor-crosshair h-28"
                  />
                  {tenantSignature && (
                    <button
                      type="button"
                      onClick={() => clearSignature(tenantCanvasRef, setTenantSignature)}
                      className="absolute top-2 right-2 text-rose-500 hover:text-rose-600 bg-secondary/80 p-1.5 rounded-full"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
            <span className="text-[9px] text-muted-foreground block text-center">Date Signed: {inspection.tenantSignedAt ? new Date(inspection.tenantSignedAt).toLocaleString() : 'Not signed'}</span>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS BAR */}
      <div className="flex justify-end space-x-3">
        <Button 
          variant="outline" 
          onClick={() => {
            const dest = inspection.moveInId
              ? `/leasing/move-in/${inspection.moveInId}`
              : `/leasing/move-out/${inspection.moveOutId}`;
            navigate({ to: dest });
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to {inspection.moveInId ? 'Move In' : 'Move Out'}
        </Button>

        {!isCompleted ? (
          <>
            <Button variant="outline" onClick={handleSaveDraft} disabled={updateDraftMutation.isPending}>
              <Save className="w-4 h-4 mr-2" /> Save Draft Progress
            </Button>
            <Button onClick={handleComplete} disabled={completeMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10">
              <CheckCircle className="w-4 h-4 mr-2" /> Finalize & Lock Inspection
            </Button>
          </>
        ) : (
          <Button onClick={() => reopenMutation.mutate()} className="bg-amber-500 hover:bg-amber-600 shadow-amber-500/10">
            <RotateCcw className="w-4 h-4 mr-2" /> Reopen Inspection (Unlock Editor)
          </Button>
        )}
      </div>
    </div>
  );
};

export default InspectionScreen;
