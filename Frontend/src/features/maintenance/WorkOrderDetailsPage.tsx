import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { StatusBadge } from '../../components/StatusBadge';
import { FormDialog } from '../../components/FormDialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Printer, Calendar, DollarSign, User, Wrench, ShieldAlert, Coins, Clock } from 'lucide-react';
import { extractPreferredVisit } from '../../utils/maintenanceHelpers';

export const WorkOrderDetailsPage: React.FC = () => {
  const { id } = useParams({ from: '/maintenance/work-orders/$id' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Advance Payment Modal States
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceMethod, setAdvanceMethod] = useState('Check');
  const [advanceRef, setAdvanceRef] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Queries
  const { data: wo, isLoading } = useQuery({
    queryKey: ['work-order-detail', id],
    queryFn: () => api.workOrders.getById(id),
  });

  const { data: vendorsList = [] } = useQuery({ queryKey: ['vendors-list'], queryFn: () => api.vendors.getAll() });

  const recordAdvanceMutation = useMutation({
    mutationFn: (values: { amount: number; method: string; ref: string; date: string }) => {
      return api.workOrders.update(id, {
        advancePaymentAmount: values.amount,
        advancePaymentMethod: values.method,
        advancePaymentRef: values.ref,
        advancePaymentDate: values.date,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['expenses-list'] });
      setIsAdvanceOpen(false);
    },
  });

  const assignMutation = useMutation({
    mutationFn: (vendorId: string) => {
      const v = vendorsList.find((v) => v.id === vendorId);
      return api.workOrders.update(id, {
        status: 'Assigned',
        vendorId,
        vendorName: v ? v.name : 'Assigned Vendor',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-detail', id] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => api.workOrders.update(id, { status: 'Completed', actualCost: wo ? wo.estimatedCost * 1.1 : 200 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-detail', id] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => api.workOrders.update(id, { status: 'Closed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-detail', id] });
    },
  });

  if (isLoading || !wo) {
    return <LoadingSkeleton type="details" />;
  }

  return (
    <div className="space-y-6 text-foreground max-w-4xl">
      <PageHeader
        title={`Work Order Detail - ${wo.workOrderNumber}`}
        description="Verify contractor estimates, technicians scheduling, and completed service invoices."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Maintenance', href: '/maintenance' },
          { label: 'Work Orders', href: '/maintenance/work-orders' },
          { label: 'Details' },
        ]}
      />

      {/* QUICK STATUS BAR */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-card border rounded-2xl gap-3">
        <div className="flex items-center space-x-3.5 flex-wrap gap-2">
          <StatusBadge status={wo.status} />
          <span className="text-xs font-bold text-muted-foreground font-mono">{wo.scheduledDate}</span>
          {extractPreferredVisit(wo) && (
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              <Clock className="w-3 h-3 text-amber-500" /> Pref Day: {extractPreferredVisit(wo)}
            </span>
          )}
        </div>

        <div className="flex space-x-2">
          {wo.status === 'Draft' && (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-muted-foreground mr-2">Assign Maintenance Staff:</span>
              <select
                className="text-xs p-1.5 rounded-lg border bg-card text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                onChange={(e) => assignMutation.mutate(e.target.value)}
                defaultValue=""
                disabled={assignMutation.isPending}
              >
                <option value="" disabled>Select Maintenance Staff...</option>
                {vendorsList.slice(0, 15).map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                ))}
              </select>
            </div>
          )}
          {wo.status === 'Assigned' && (
            <Button size="sm" onClick={() => completeMutation.mutate()} loading={completeMutation.isPending}>Mark Complete</Button>
          )}
          {wo.status === 'Completed' && (
            <Button size="sm" onClick={() => closeMutation.mutate()} loading={closeMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600">
              Close Work Order
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} className="flex items-center gap-1.5 text-xs">
            <Printer className="w-4 h-4" /> Print Form
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/maintenance/work-orders' })}>Back</Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="invoices">Invoices & Financials</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 p-6 border bg-card space-y-6">
              <h3 className="text-sm font-extrabold uppercase border-b pb-2">Assigned Logistics & Property</h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="p-3.5 bg-secondary/10 rounded-xl border">
                  <p className="text-muted-foreground text-[10px] uppercase">Property Location</p>
                  <p className="font-bold text-sm mt-1">{wo.propertyName}</p>
                  <p className="text-muted-foreground">Unit: {wo.unitNumber}</p>
                </div>
                <div className="p-3.5 bg-secondary/10 rounded-xl border">
                  <p className="text-muted-foreground text-[10px] uppercase">Assigned Maintenance Staff</p>
                  <p className="font-bold text-sm mt-1">{wo.vendorName}</p>
                  <p className="text-muted-foreground">Technician: {wo.assignedTechnician}</p>
                </div>
                {extractPreferredVisit(wo) && (
                  <div className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/20 col-span-2">
                    <p className="text-muted-foreground text-[10px] uppercase font-bold">Tenant Preferred Visit Window / Day</p>
                    <p className="font-black text-sm mt-0.5 text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" /> {extractPreferredVisit(wo)}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="md:col-span-1 p-6 border bg-card space-y-4">
              <h3 className="text-sm font-extrabold uppercase border-b pb-2">Cost Analysis</h3>
              <div className="space-y-3.5 text-xs font-semibold">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Estimated Cost:</span>
                  <span className="font-bold">${wo.estimatedCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Actual Cost (Base):</span>
                  <span className="font-bold">${wo.actualCost.toLocaleString()}</span>
                </div>
                {wo.extraExpenses > 0 && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Extra Expenses:</span>
                    <span className="font-bold text-rose-500">${wo.extraExpenses.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Total Final Cost:</span>
                  <span className="font-extrabold text-emerald-600">${(wo.actualCost + (wo.extraExpenses || 0)).toLocaleString()}</span>
                </div>
                {wo.resolutionNotes && (
                  <div className="pt-2">
                    <span className="text-muted-foreground block mb-1">Resolution Notes:</span>
                    <p className="text-[11px] text-foreground bg-secondary/10 p-2.5 rounded-lg font-medium italic">"{wo.resolutionNotes}"</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline" className="mt-4">
          <Card className="p-6 border bg-card space-y-4">
            <h3 className="text-sm font-extrabold uppercase border-b pb-2">Work Order Progress Logs</h3>
            <div className="space-y-4 text-xs font-semibold">
              <div className="flex space-x-3.5 border-l-2 border-primary pl-4 pb-4 position-relative">
                <div className="w-2.5 h-2.5 rounded-full bg-primary -ml-[22px] mt-1" />
                <div>
                  <p className="font-bold">Work Order Finalized / Dispatched</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">{wo.scheduledDate} 09:00 AM • System Log</p>
                </div>
              </div>

              <div className="flex space-x-3.5 border-l-2 border-primary pl-4 pb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-primary -ml-[22px] mt-1" />
                <div>
                  <p className="font-bold">Contractor Dispatched to Site</p>
                  <p className="text-[10px] text-muted-foreground font-semibold">{wo.scheduledDate} 10:30 AM • {wo.vendorName}</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* INVOICES */}
        <TabsContent value="invoices" className="mt-4 space-y-6">
          {/* ADVANCE PAYMENT LEDGER */}
          <Card className="p-6 border bg-card space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-extrabold uppercase">Advance Payment Ledger</h3>
              {!wo.advancePaymentAmount && wo.status !== 'Completed' && wo.status !== 'Closed' && (
                <Button 
                  size="sm" 
                  onClick={() => {
                    setAdvanceAmount((wo.estimatedCost * 0.2).toFixed(0)); // default 20% estimated cost
                    setIsAdvanceOpen(true);
                  }}
                  className="flex items-center gap-1 text-xs"
                >
                  <Coins className="w-3.5 h-3.5" /> Record Advance Payment
                </Button>
              )}
            </div>

            {wo.advancePaymentAmount ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="p-3.5 bg-amber-500/5 rounded-xl border border-amber-500/10 space-y-2">
                  <p className="text-[10px] uppercase text-amber-500 font-bold">Advance Details</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Disbursed:</span>
                    <span className="font-extrabold text-amber-500">${wo.advancePaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Date:</span>
                    <span>{wo.advancePaymentDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span>{wo.advancePaymentMethod}</span>
                  </div>
                  {wo.advancePaymentRef && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference / Check #:</span>
                      <span className="font-mono">{wo.advancePaymentRef}</span>
                    </div>
                  )}
                </div>
                <div className="p-3.5 bg-secondary/15 rounded-xl border space-y-2 flex flex-col justify-center">
                  <p className="text-[10px] uppercase text-muted-foreground font-bold">Financial Reconciliation Summary</p>
                  <div className="flex justify-between">
                    <span>Estimated Cost:</span>
                    <span>${wo.estimatedCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-500 font-bold border-t pt-1.5 mt-1.5">
                    <span>Advance Deduction:</span>
                    <span>-${wo.advancePaymentAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic font-semibold">No advance payment has been issued for this work order.</p>
            )}
          </Card>

          {/* LINKED VENDOR INVOICES */}
          <Card className="p-6 border bg-card space-y-4">
            <h3 className="text-sm font-extrabold uppercase border-b pb-2">Linked Vendor Invoices</h3>
            <div className="p-4 bg-secondary/15 rounded-xl border text-xs font-semibold space-y-3.5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">Vendor Billing Invoice</p>
                  <p className="text-[10px] text-muted-foreground">Reference Work Order: {wo.workOrderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-sm">${(wo.actualCost + (wo.extraExpenses || 0)).toLocaleString()}</p>
                  <StatusBadge status={wo.status === 'Closed' ? 'Paid' : 'Approved'} />
                </div>
              </div>

              {wo.advancePaymentAmount ? (
                <div className="border-t pt-3 space-y-1 bg-secondary/10 p-3 rounded-lg">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gross Services Cost</span>
                    <span>${(wo.actualCost + (wo.extraExpenses || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-amber-500 font-bold">
                    <span>Less: Advance Payment</span>
                    <span>-${wo.advancePaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-foreground font-black border-t pt-1 mt-1 text-sm">
                    <span>Net Balance Due</span>
                    <span className="text-rose-500">${((wo.actualCost + (wo.extraExpenses || 0)) - wo.advancePaymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          {/* ADVANCE RECORDING FORM DIALOG */}
          <FormDialog open={isAdvanceOpen} onOpenChange={setIsAdvanceOpen} title="Record Advance Payment">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                recordAdvanceMutation.mutate({
                  amount: Number(advanceAmount) || 0,
                  method: advanceMethod,
                  ref: advanceRef,
                  date: advanceDate
                });
              }}
              className="space-y-4 pt-2 text-xs font-semibold text-foreground"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Advance Amount ($)</label>
                  <Input 
                    type="number" 
                    required 
                    min="1" 
                    value={advanceAmount} 
                    onChange={e => setAdvanceAmount(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Payment Method</label>
                  <Select value={advanceMethod} onChange={e => setAdvanceMethod(e.target.value)}>
                    <option value="Check">Check</option>
                    <option value="Cash">Cash</option>
                    <option value="ACH">ACH Transfer</option>
                    <option value="Bank Wire">Bank Wire</option>
                    <option value="Credit Card">Credit Card</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Payment Date</label>
                  <Input 
                    type="date" 
                    required 
                    value={advanceDate} 
                    onChange={e => setAdvanceDate(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">Reference / Check #</label>
                  <Input 
                    placeholder="E.g. Check #4802" 
                    value={advanceRef} 
                    onChange={e => setAdvanceRef(e.target.value)} 
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsAdvanceOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={recordAdvanceMutation.isPending || !advanceAmount}>
                  {recordAdvanceMutation.isPending ? 'Saving...' : 'Disburse Advance'}
                </Button>
              </div>
            </form>
          </FormDialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default WorkOrderDetailsPage;
