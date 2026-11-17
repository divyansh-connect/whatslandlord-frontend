import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { useNavigate } from '@tanstack/react-router';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  Calendar, User, Home, Key, ClipboardList, CheckCircle2, 
  Play, AlertCircle, Ban, ArrowRight, ShieldCheck, Check, Clock, FileText, Eye, AlertTriangle, Plus
} from 'lucide-react';
import { CreateInspectionTemplateModal } from './CreateInspectionTemplateModal';
import { useTranslation } from 'react-i18next';

interface MoveOutDetailPageProps {
  id: string;
}

export const MoveOutDetailPage: React.FC<MoveOutDetailPageProps> = ({ id }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);

  // Fetch Move Out details
  const { data: moveOut, isLoading, refetch } = useQuery({
    queryKey: ['moveOut', id],
    queryFn: () => api.moveOuts.getById(id),
  });

  // Fetch Templates for Starting Inspection (type must be MOVE_OUT or ROUTINE)
  const { data: templates = [] } = useQuery({
    queryKey: ['activeInspectionTemplates'],
    queryFn: async () => {
      const all = await api.inspectionTemplates.getAll();
      return all.filter((tpl: any) => tpl.active);
    },
  });

  // Mutations
  const startInspectionMutation = useMutation({
    mutationFn: (templateId: string) => api.moveOuts.startInspection(id, templateId),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['moveOuts'] });
      if (data?.id) {
        navigate({ to: `/leasing/inspections/${data.id}` });
      } else {
        refetch();
      }
    },
  });

  const completeMoveOutMutation = useMutation({
    mutationFn: () => api.moveOuts.complete(id),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['moveOuts'] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  const cancelMoveOutMutation = useMutation({
    mutationFn: (reason: string) => api.moveOuts.cancel(id, reason),
    onSuccess: () => {
      setShowCancelModal(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['moveOuts'] });
    },
  });

  if (isLoading) {
    return <div className="py-12 text-center text-xs font-semibold text-muted-foreground">Loading Move Out details...</div>;
  }

  if (!moveOut) {
    return (
      <div className="py-12 text-center text-xs font-semibold text-rose-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-2 text-rose-500" />
        Move Out record not found.
      </div>
    );
  }

  const { lease, unit, inspections = [], status, scheduledDate, completedDate, notes, damageItems = [], depositSummary } = moveOut;
  const property = unit?.property;
  const tenant = lease?.tenant;

  // Find if there is an active inspection
  const activeInspection = inspections[0]; // latest one

  // Timeline statuses
  const timelineSteps = [
    { label: 'Lease Active', active: true, done: true },
    { label: 'Scheduled', active: true, done: status !== 'CANCELLED' },
    { label: 'Inspection', active: status === 'INSPECTION_IN_PROGRESS' || status === 'INSPECTION_COMPLETED' || status === 'DAMAGE_REVIEW' || status === 'READY_FOR_COMPLETION' || status === 'COMPLETED', done: status === 'INSPECTION_COMPLETED' || status === 'DAMAGE_REVIEW' || status === 'READY_FOR_COMPLETION' || status === 'COMPLETED' },
    { label: 'Damage Review', active: status === 'DAMAGE_REVIEW', done: status === 'READY_FOR_COMPLETION' || status === 'COMPLETED' },
    { label: 'Move Out Complete', active: status === 'COMPLETED', done: status === 'COMPLETED' }
  ];

  const handleStartInspection = () => {
    if (!selectedTemplateId) return;
    startInspectionMutation.mutate(selectedTemplateId);
  };

  const handleCompleteMoveOut = () => {
    completeMoveOutMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Move Out: ${tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Resident'}`}
        description={`Scheduled Date: ${new Date(scheduledDate).toLocaleDateString()} | Unit: ${unit?.unitNumber || 'N/A'}`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Leasing', href: '/leasing/move-out' },
          { label: 'Move Out Details' },
        ]}
      />

      {/* TIMELINE PROGRESS COMPONENT */}
      <div className="bg-card border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
          {timelineSteps.map((step, idx) => (
            <React.Fragment key={idx}>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step.done 
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                    : step.active 
                    ? 'bg-primary text-white animate-pulse' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step.done ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <div className="text-left">
                  <p className={`text-xs font-extrabold uppercase tracking-wider ${step.active || step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                </div>
              </div>
              {idx < timelineSteps.length - 1 && (
                <div className={`hidden md:block flex-1 h-[2px] ${
                  step.done ? 'bg-emerald-500' : 'bg-muted'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* CORE DETAILS BOX */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Summary & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Box */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6 text-foreground">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-primary">Overview</h2>
              <StatusBadge status={status} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <User className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Tenant / Resident</p>
                    <p className="font-bold text-sm text-primary">{tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Resident'}</p>
                    <p className="text-muted-foreground font-semibold">{tenant?.email || 'No email'}</p>
                    <p className="text-muted-foreground font-semibold">{tenant?.phone || 'No phone'}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Home className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Property Asset</p>
                    <p className="font-bold text-sm">{property?.name || 'Property'}</p>
                    <p className="text-muted-foreground font-semibold">{property?.address || 'N/A'}</p>
                    <p className="text-muted-foreground font-semibold">Unit: {unit?.unitNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Key className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Lease Terms</p>
                    <p className="font-bold">Rent Amount: <span className="text-primary font-extrabold">${lease?.rentAmount?.toLocaleString()} / mo</span></p>
                    <p className="text-muted-foreground font-semibold">Security Deposit: ${lease?.depositAmount?.toLocaleString()}</p>
                    <p className="text-muted-foreground font-semibold">Start: {lease?.startDate ? new Date(lease.startDate).toLocaleDateString() : 'N/A'}</p>
                    <p className="text-muted-foreground font-semibold">End: {lease?.endDate ? new Date(lease.endDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Scheduled Move Out Date</p>
                    <p className="font-bold text-sm text-amber-500">{new Date(scheduledDate).toLocaleDateString()}</p>
                    {completedDate && (
                      <p className="text-emerald-500 font-bold">Completed: {new Date(completedDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {notes && (
              <div className="bg-secondary/40 p-4 rounded-xl text-xs font-semibold">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Move Out Notes</p>
                <p className="text-muted-foreground">{notes}</p>
              </div>
            )}
          </div>

          {/* DAMAGE REVIEW SUMMARY BOX */}
          {(damageItems.length > 0 || depositSummary) && (
            <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6 text-foreground">
              <h2 className="text-sm font-extrabold uppercase tracking-wider border-b pb-4 text-primary">Damage Review & Settlement</h2>
              
              {damageItems.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reviewed Damage Items</h3>
                  <div className="space-y-2">
                    {damageItems.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-xs p-3 border rounded-xl bg-secondary/15">
                        <div>
                          <p className="font-bold">{item.roomName} — {item.itemLabel}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">Condition: {item.condition} | Decision: <span className="text-primary font-bold">{item.decision?.replace('_', ' ')}</span></p>
                        </div>
                        {item.chargeAmount > 0 && (
                          <span className="font-bold text-rose-500">${item.chargeAmount}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {depositSummary && (
                <div className="bg-secondary/30 p-4 rounded-xl border space-y-3 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original Security Deposit:</span>
                    <span className="font-bold">${depositSummary.originalDeposit}</span>
                  </div>
                  <div className="flex justify-between text-rose-500">
                    <span>Total Damage Deductions:</span>
                    <span className="font-bold">-${depositSummary.totalCharges}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-emerald-500 text-sm font-extrabold">
                    <span>Final Refund Amount:</span>
                    <span>${depositSummary.refundAmount}</span>
                  </div>
                  {depositSummary.notes && (
                    <div className="text-[10px] text-muted-foreground italic border-t pt-2">
                      Notes: {depositSummary.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* INSPECTIONS HISTORY & TRIGGER BOX */}
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wider border-b pb-4 text-primary">Move Out Inspection</h2>

            {inspections.length === 0 ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl font-bold">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>No inspection has been started for this move-out. Select a template below to start.</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-2.5">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="flex-1 min-w-[200px] p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
                  >
                    <option value="">Select Checklist Template...</option>
                    {templates.map((tpl: any) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name} ({tpl.type.replace('_', ' ')})</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateTemplateModalOpen(true)}
                    className="flex-shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Create Template
                  </Button>
                  <Button
                    onClick={handleStartInspection}
                    disabled={!selectedTemplateId || startInspectionMutation.isPending}
                    className="flex-shrink-0"
                  >
                    <Play className="w-4 h-4 mr-2" /> Start Inspection
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCompleteMoveOut}
                    disabled={completeMoveOutMutation.isPending}
                    className="flex-shrink-0 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 font-bold"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" /> Skip Inspection & Complete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {inspections.map((ins: any) => (
                  <div key={ins.id} className="border rounded-xl p-6 space-y-6 bg-secondary/15">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-primary">{ins.inspectionNumber}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            ins.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>{ins.status}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold">Template: {ins.templateName} (v{ins.templateVersion})</p>
                      </div>

                      <div className="flex space-x-2 mt-3 sm:mt-0">
                        {ins.status !== 'COMPLETED' ? (
                          <Button size="sm" onClick={() => navigate({ to: `/leasing/inspections/${ins.id}` })}>
                            <Play className="w-3.5 h-3.5 mr-1" /> Resume Inspection
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => navigate({ to: `/leasing/inspections/${ins.id}` })}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> View Checklist
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Inspector</span>
                        <span className="font-bold">{ins.assignedInspector?.firstName ? `${ins.assignedInspector.firstName} ${ins.assignedInspector.lastName}` : 'Unassigned'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">Started At</span>
                        <span className="font-mono text-muted-foreground">{new Date(ins.startedAt).toLocaleString()}</span>
                      </div>
                      {ins.completedAt && (
                        <div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase block">Completed At</span>
                          <span className="font-mono text-emerald-500 font-bold">{new Date(ins.completedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {ins.status === 'COMPLETED' && (
                      <div className="space-y-4 border-t pt-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Signatures & Signoff</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border rounded-lg p-3 bg-card space-y-2">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase block">Inspector Signature</span>
                            {ins.inspectorSignature ? (
                              <img src={ins.inspectorSignature} alt="Inspector Signature" className="max-h-16 mx-auto dark:invert" />
                            ) : (
                              <span className="text-rose-500 font-semibold block py-2">Missing Signature</span>
                            )}
                            {ins.inspectorSignedAt && <span className="text-[9px] text-muted-foreground block text-center">{new Date(ins.inspectorSignedAt).toLocaleString()}</span>}
                          </div>

                          <div className="border rounded-lg p-3 bg-card space-y-2">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase block">Tenant Signature</span>
                            {ins.tenantSignature ? (
                              <img src={ins.tenantSignature} alt="Tenant Signature" className="max-h-16 mx-auto dark:invert" />
                            ) : (
                              <span className="text-rose-500 font-semibold block py-2">Missing Signature</span>
                            )}
                            {ins.tenantSignedAt && <span className="text-[9px] text-muted-foreground block text-center">{new Date(ins.tenantSignedAt).toLocaleString()}</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Move-Out Status Card & Execution */}
        <div className="space-y-6">
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-sm font-extrabold uppercase tracking-wider border-b pb-4 text-primary">Workflow Controls</h2>

            {status === 'SCHEDULED' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Tenant occupancy active. Start the move-out walkthrough inspection to check unit condition, or skip inspection to complete move out immediately.</p>
                <Button 
                  onClick={handleCompleteMoveOut} 
                  disabled={completeMoveOutMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Skip Inspection & Complete Move Out
                </Button>
                <Button 
                  onClick={() => setShowCancelModal(true)} 
                  variant="outline" 
                  className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/35"
                >
                  <Ban className="w-4 h-4 mr-2" /> Cancel Move Out Workflow
                </Button>
              </div>
            )}

            {status === 'INSPECTION_IN_PROGRESS' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-xs bg-amber-500/10 text-amber-500 p-3 rounded-xl font-bold border border-amber-500/20">
                  <Clock className="w-5 h-5 flex-shrink-0 animate-spin" />
                  <span>Move out inspection is currently in progress. Complete and sign checklist to proceed.</span>
                </div>
                <Button onClick={() => navigate({ to: `/leasing/inspections/${activeInspection?.id}` })} className="w-full">
                  <Play className="w-4 h-4 mr-2" /> Resume Inspection Screen
                </Button>
              </div>
            )}

            {status === 'INSPECTION_COMPLETED' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-xs bg-emerald-500/10 text-emerald-500 p-3 rounded-xl font-bold border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                  <span>Checklist completed and signed. Ready for damage assessments.</span>
                </div>

                <Button 
                  onClick={() => navigate({ to: `/leasing/damage-review/${id}` })} 
                  className="w-full bg-primary hover:bg-primary/95 font-bold"
                >
                  <FileText className="w-4 h-4 mr-2" /> Review Damage Items
                </Button>
              </div>
            )}

            {status === 'DAMAGE_REVIEW' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-xs bg-amber-500/10 text-amber-500 p-3 rounded-xl font-bold border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>Damage review submitted. Please approve deposit refund and finish workflow.</span>
                </div>

                <Button 
                  onClick={() => navigate({ to: `/leasing/damage-review/${id}` })} 
                  className="w-full bg-primary hover:bg-primary/95 font-bold"
                >
                  <FileText className="w-4 h-4 mr-2" /> Adjust Damage & Deposit
                </Button>
              </div>
            )}

            {status === 'READY_FOR_COMPLETION' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-xs bg-emerald-500/10 text-emerald-500 p-3 rounded-xl font-bold border border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                  <span>Damage checklist and deposit refund settled. Ready to complete Move Out.</span>
                </div>

                <Button 
                  onClick={handleCompleteMoveOut} 
                  disabled={completeMoveOutMutation.isPending} 
                  className="w-full bg-emerald-500 hover:bg-emerald-600 font-bold shadow-emerald-500/10"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Complete Move Out & Close Lease
                </Button>
              </div>
            )}

            {status === 'COMPLETED' && (
              <div className="space-y-4 text-xs font-semibold text-center">
                <div className="p-8 border border-emerald-500/25 bg-emerald-500/5 text-emerald-500 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h3 className="text-sm font-extrabold uppercase">Move Out Completed</h3>
                  <p className="text-muted-foreground">Lease is marked Ended, unit marked Vacant (Preparation Required), and tenant inactive.</p>
                </div>
              </div>
            )}

            {status === 'CANCELLED' && (
              <div className="space-y-4 text-xs font-semibold text-center">
                <div className="p-8 border border-rose-500/25 bg-rose-500/5 text-rose-500 rounded-2xl space-y-2">
                  <Ban className="w-12 h-12 text-rose-500 mx-auto" />
                  <h3 className="text-sm font-extrabold uppercase">Workflow Cancelled</h3>
                  {moveOut.cancelReason && (
                    <p className="text-muted-foreground italic mt-2">"Reason: {moveOut.cancelReason}"</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 max-w-md w-full space-y-4 text-foreground shadow-xl">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-rose-500">Cancel Move Out Workflow</h3>
            <p className="text-xs text-muted-foreground">Are you sure you want to cancel this move-out workflow?</p>
            <textarea
              required
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-2 rounded border bg-secondary text-xs focus:outline-none h-24"
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)}>Keep Scheduled</Button>
              <Button 
                onClick={() => cancelMoveOutMutation.mutate(cancelReason)} 
                disabled={!cancelReason || cancelMoveOutMutation.isPending}
                className="bg-rose-500 hover:bg-rose-600"
                size="sm"
              >
                Confirm Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Create Inspection Template Modal */}
      <CreateInspectionTemplateModal
        open={isCreateTemplateModalOpen}
        onOpenChange={setIsCreateTemplateModalOpen}
        onSuccess={(newId) => setSelectedTemplateId(newId)}
        defaultType="MOVE_OUT"
      />
    </div>
  );
};

export default MoveOutDetailPage;
