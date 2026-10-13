import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/StatusBadge';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { 
  ArrowLeft, CheckCircle2, Play, AlertCircle, XCircle, Clock, 
  MapPin, User, Tag, Calendar, DollarSign, Image as ImageIcon,
  Wrench, Check, AlertTriangle, X, Coins, Sparkles
} from 'lucide-react';

export const StaffTaskDetailsPage: React.FC = () => {
  const { id } = useParams({ from: '/staff/tasks/$id' });
  const navigate = useNavigate();

  const { data: task, isLoading } = useQuery({
    queryKey: ['staff-work-order-details-v2', id],
    queryFn: () => api.workOrders.getById(id),
  });

  const [localStatus, setLocalStatus] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [actualCost, setActualCost] = useState<number>(0);
  const [extraExpenses, setExtraExpenses] = useState<number>(0);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  // Modals state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReasonText, setRejectReasonText] = useState('');

  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [actualCostVal, setActualCostVal] = useState<string>('');
  const [extraExpensesVal, setExtraExpensesVal] = useState<string>('');
  const [resolutionNotesVal, setResolutionNotesVal] = useState('');

  useEffect(() => {
    if (task) {
      setLocalStatus(task.status);
      setRejectReason(task.rejectReason || '');
      setActualCost(task.actualCost || 0);
      setExtraExpenses(task.extraExpenses || 0);
      setResolutionNotes(task.resolutionNotes || '');
    }
  }, [task]);

  if (isLoading) {
    return <LoadingSkeleton type="details" />;
  }

  if (!task) {
    return (
      <div className="p-8 text-center bg-card border rounded-2xl">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="font-extrabold text-sm uppercase">Task Not Found</h3>
        <p className="text-xs text-muted-foreground mt-1">The requested maintenance task could not be retrieved.</p>
        <Button size="sm" onClick={() => navigate({ to: '/staff/dashboard' })} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  // Workflow steps definitions
  const steps = [
    { label: 'New', statusKey: 'New', desc: 'Job created' },
    { label: 'Assigned', statusKey: 'Assigned', desc: 'Tech assigned' },
    { label: 'In Progress', statusKey: 'In Progress', desc: 'Work active' },
    { label: 'Completed', statusKey: 'Completed', desc: 'Job finished' }
  ];

  // Helper to determine step status colors
  const getStepIndex = (status: string) => {
    if (status === 'New') return 0;
    if (status === 'Assigned' || status === 'Scheduled' || status === 'Waiting' || status === 'Draft') return 1;
    if (status === 'In Progress') return 2;
    if (status === 'Completed' || status === 'Closed') return 3;
    return -1;
  };

  const currentStepIndex = getStepIndex(localStatus);
  const isRejected = localStatus === 'Rejected' || localStatus === 'Cancelled';

  // UI-only action triggers
  const handleAccept = () => {
    setLocalStatus('Assigned');
  };

  const handleStartWork = () => {
    setLocalStatus('In Progress');
  };

  // Reject Submit Handler
  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalStatus('Rejected');
    setRejectReason(rejectReasonText || 'No reason provided');
    setIsRejectModalOpen(false);
  };

  // Completion Submit Handler
  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const actual = actualCostVal ? Number(actualCostVal) : 0;
    const extra = extraExpensesVal ? Number(extraExpensesVal) : 0;
    const totalActual = actual + extra;

    setLocalStatus('Completed');
    setActualCost(actual);
    setExtraExpenses(extra);
    setResolutionNotes(resolutionNotesVal || 'Repairs completed.');
    setIsCompleteModalOpen(false);

    try {
      await api.workOrders.update(id, {
        status: 'Completed',
        actualCost: totalActual > 0 ? totalActual : actual,
        extraCost: extra,
        resolutionNotes: resolutionNotesVal || 'Repairs completed.',
      });
    } catch (err) {
      console.error('Failed to update task completion in backend:', err);
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate({ to: '/staff/dashboard' })}
          className="p-2 rounded-xl border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <PageHeader
          title={`Task Details - ${task.workOrderNumber}`}
          description="Detailed technician instructions, tenant details, and repair workflow."
          breadcrumbs={[
            { label: 'Portal', href: '/staff/dashboard' },
            { label: 'Tasks', href: '/staff/tasks' },
            { label: task.workOrderNumber },
          ]}
        />
      </div>

      {isRejected && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-center space-x-3 text-xs font-bold animate-pulse">
          <XCircle className="w-5 h-5 shrink-0" />
          <span>This task has been {localStatus.toLowerCase()} and requires no further action.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Section - Main Task Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border bg-card space-y-6">
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="font-mono font-black text-primary text-xs uppercase bg-primary/10 px-2.5 py-0.5 rounded">
                  {task.workOrderNumber}
                </span>
                <StatusBadge status={localStatus as any} />
              </div>
              <h2 className="text-xl font-black mt-3 leading-snug">{task.issue || 'AC Repair & Diagnostics'}</h2>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-medium">
                {task.description || 'No detailed instructions provided. Please inspect site, diagnose root cause, and complete standard repair procedure.'}
              </p>
            </div>

            {/* Meta information details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-border/40 py-5 text-xs font-semibold">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <MapPin className="w-4.5 h-4.5 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Location</p>
                    <p className="text-foreground mt-0.5">{task.propertyName} • Unit {task.unitNumber}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Tag className="w-4.5 h-4.5 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Job Priority</p>
                    <p className="text-foreground mt-0.5 flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        task.priority === 'Urgent' ? 'bg-rose-500' :
                        task.priority === 'High' ? 'bg-amber-500' :
                        task.priority === 'Medium' ? 'bg-blue-500' : 'bg-emerald-500'
                      }`} />
                      {task.priority || 'Medium'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Calendar className="w-4.5 h-4.5 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Scheduled Date</p>
                    <p className="text-foreground mt-0.5">{task.scheduledDate || 'TBD'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-muted-foreground">
                  <DollarSign className="w-4.5 h-4.5 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/60">Estimated Cost</p>
                    <p className="text-foreground mt-0.5 font-bold">${task.estimatedCost || '0.00'}</p>
                  </div>
                </div>

                {localStatus === 'Completed' && (
                  <div className="flex items-center space-x-3 text-muted-foreground">
                    <DollarSign className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-emerald-600">Actual / Total Cost</p>
                      <p className="text-emerald-600 mt-0.5 font-black text-sm">${actualCost + extraExpenses}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Advance payment received details */}
            {task.advancePaymentAmount && task.advancePaymentAmount > 0 && (
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 text-amber-500 rounded-2xl text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Coins className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-bold text-amber-500">Advance Payment Received</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Paid via {task.advancePaymentMethod} on {task.advancePaymentDate} {task.advancePaymentRef ? `(Ref: ${task.advancePaymentRef})` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-amber-500">${task.advancePaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            )}

            {/* Reject reason details */}
            {localStatus === 'Rejected' && rejectReason && (
              <div className="p-4 bg-rose-500/5 border border-rose-500/20 text-rose-500 rounded-2xl text-xs font-bold space-y-1">
                <p className="uppercase text-[9px] text-muted-foreground">Reason for Rejection</p>
                <p className="leading-relaxed font-semibold">{rejectReason}</p>
              </div>
            )}

            {/* Completed Resolution logs */}
            {localStatus === 'Completed' && (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 rounded-2xl text-xs font-bold grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="uppercase text-[9px] text-muted-foreground">Cost Breakdown</p>
                  <p>Base Labor: <span className="text-foreground font-extrabold">${actualCost}</span></p>
                  <p>Extra Expenses: <span className="text-foreground font-extrabold">${extraExpenses}</span></p>
                </div>
                <div className="space-y-1 md:border-l md:pl-4">
                  <p className="uppercase text-[9px] text-muted-foreground">Resolution Summary</p>
                  <p className="text-foreground font-medium italic mt-1 leading-relaxed">"{resolutionNotes || 'No notes provided.'}"</p>
                </div>
              </div>
            )}

            {/* Actions Panel */}
            {!isRejected && localStatus !== 'Completed' && (
              <div className="flex flex-wrap gap-3 pt-2">
                {localStatus === 'New' && (
                  <>
                    <Button
                      onClick={handleAccept}
                      className="flex-1 rounded-xl h-10 font-bold bg-primary text-white"
                    >
                      Accept Job
                    </Button>
                    <Button
                      onClick={() => {
                        setRejectReasonText('');
                        setIsRejectModalOpen(true);
                      }}
                      className="flex-1 rounded-xl h-10 font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20"
                    >
                      Reject Job
                    </Button>
                  </>
                )}

                {(localStatus === 'Assigned' || localStatus === 'Scheduled' || localStatus === 'Draft') && (
                  <Button
                    onClick={handleStartWork}
                    className="flex-1 rounded-xl h-10 font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-4 h-4 fill-white" /> Start Work
                  </Button>
                )}

                {localStatus === 'In Progress' && (
                  <Button
                    onClick={() => {
                      setActualCostVal(task.estimatedCost.toString());
                      setIsCompleteModalOpen(true);
                    }}
                    className="flex-1 rounded-xl h-10 font-bold bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4.5 h-4.5" /> Complete Work
                  </Button>
                )}
              </div>
            )}
          </Card>

        </div>

        {/* Right Section - Progress Tracker */}
        <div className="lg:col-span-1">
          <Card className="p-6 border bg-card space-y-6 sticky top-6">
            <h3 className="font-extrabold text-sm uppercase tracking-wider border-b pb-3">Workflow Progress</h3>
            
            <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
              {steps.map((step, idx) => {
                const isActive = idx === currentStepIndex;
                const isCompleted = idx < currentStepIndex;
                
                return (
                  <div key={step.label} className="relative flex items-start space-x-3.5 text-xs font-semibold">
                    <span className={`absolute -left-[20px] w-4.5 h-4.5 rounded-full border-4 border-card flex items-center justify-center transition-all ${
                      isActive ? 'bg-primary text-white scale-125' : 
                      isCompleted ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted && <Check className="w-2.5 h-2.5" />}
                    </span>
                    <div className="space-y-0.5">
                      <p className={`font-bold transition-all ${
                        isActive ? 'text-primary' : 
                        isCompleted ? 'text-emerald-500' : 'text-muted-foreground/80'
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 leading-relaxed font-semibold">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

      </div>

      {/* REJECT DIALOG MODAL */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-200 text-foreground">
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary/40 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 text-rose-500 font-extrabold text-sm border-b pb-3 uppercase tracking-wide">
              <AlertTriangle className="w-5 h-5" />
              <h3>Reject Work Assignment</h3>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-muted-foreground font-bold text-[10px] uppercase">Reason for Rejection</label>
                <textarea
                  required
                  rows={3}
                  value={rejectReasonText}
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  placeholder="Please state why you are rejecting this task (e.g. materials unavailable, conflicts with existing schedule, incorrect dispatch)..."
                  className="w-full rounded-xl border bg-background p-3.5 border-border/80 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl h-10 font-bold"
                  onClick={() => setIsRejectModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl h-10 font-bold bg-rose-500 text-white hover:bg-rose-600"
                >
                  Confirm Reject
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETION DETAIL MODAL */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 relative animate-in zoom-in-95 duration-200 text-foreground">
            <button
              onClick={() => setIsCompleteModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary/40 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 text-emerald-500 font-extrabold text-sm border-b pb-3 uppercase tracking-wide">
              <CheckCircle2 className="w-5 h-5" />
              <h3>Record Job Resolution</h3>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-4">
                {/* Actual repair cost */}
                <div className="space-y-1">
                  <label className="text-muted-foreground font-bold text-[10px] uppercase">Labor / Base Cost ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      required
                      value={actualCostVal}
                      onChange={(e) => setActualCostVal(e.target.value)}
                      className="pl-8 h-10 rounded-xl"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Extra Expenses */}
                <div className="space-y-1">
                  <label className="text-muted-foreground font-bold text-[10px] uppercase">Extra Expenses / Materials ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={extraExpensesVal}
                      onChange={(e) => setExtraExpensesVal(e.target.value)}
                      className="pl-8 h-10 rounded-xl"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* AI Cost Sanity Guidance */}
              <div className="p-3 bg-secondary/25 rounded-2xl border border-border/60 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> AI Cost Benchmark Guidance
                  </span>
                  <span className="text-muted-foreground font-mono text-[10px] font-bold">
                    Standard Range: $80 - $220
                  </span>
                </div>
                {Number(actualCostVal || 0) + Number(extraExpensesVal || 0) > 350 ? (
                  <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    High Cost Alert: Total (${Number(actualCostVal || 0) + Number(extraExpensesVal || 0)}) exceeds average repair benchmark. Please itemize materials and labor clearly in resolution notes.
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ Total (${Number(actualCostVal || 0) + Number(extraExpensesVal || 0)}) is within expected operational range for this repair.
                  </p>
                )}
              </div>

              {/* Resolution Notes */}
              <div className="space-y-1">
                <label className="text-muted-foreground font-bold text-[10px] uppercase">Materials Used / Resolution Notes</label>
                <textarea
                  rows={4}
                  value={resolutionNotesVal}
                  onChange={(e) => setResolutionNotesVal(e.target.value)}
                  placeholder="Mention parts replaced, details of diagnostic checks, or extra materials purchased for this task..."
                  className="w-full rounded-xl border bg-background p-3.5 border-border/80 focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl h-10 font-bold"
                  onClick={() => setIsCompleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl h-10 font-bold bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  Submit & Finish Job
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffTaskDetailsPage;
