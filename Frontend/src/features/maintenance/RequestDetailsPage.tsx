import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { RequestPriorityBadge } from '../../components/MaintenanceComponents';
import { StatusBadge } from '../../components/StatusBadge';
import { CheckCircle, AlertTriangle, User, Calendar, Clock, Lock, MessageSquare, Phone, Mail, Send } from 'lucide-react';
import { extractPreferredVisit, cleanDescription } from '../../utils/maintenanceHelpers';

import { getFormattedRequestNumber } from '../../utils/format';

export const RequestDetailsPage: React.FC = () => {
  const { id } = useParams({ from: '/maintenance/requests/$id' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [assignedCost, setAssignedCost] = useState<string>('');
  const [newText, setNewText] = useState('');

  // Queries
  const { data: request, isLoading } = useQuery({
    queryKey: ['service-request-detail', id],
    queryFn: () => api.serviceRequests.getById(id),
  });

  const { data: vendorsList = [] } = useQuery({ queryKey: ['vendors-list'], queryFn: () => api.vendors.getAll() });

  const postMessageMutation = useMutation({
    mutationFn: (text: string) => {
      return api.serviceRequests.update(id, {
        newMessage: {
          senderName: 'Property Manager Staff',
          role: 'Manager',
          text,
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request-detail', id] });
      setNewText('');
    }
  });

  const approveMutation = useMutation({
    mutationFn: () => api.serviceRequests.update(id, { status: 'Approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request-detail', id] });
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ vendorId, cost }: { vendorId: string; cost: number }) => {
      const v = vendorsList.find((v) => v.id === vendorId);
      return api.serviceRequests.update(id, {
        status: 'Assigned',
        assignedVendorId: vendorId,
        assignedVendorName: v ? v.name : 'Assigned Vendor',
        cost: cost,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request-detail', id] });
    },
  });

  const updateCostMutation = useMutation({
    mutationFn: (newCost: number) => {
      return api.serviceRequests.update(id, {
        cost: newCost,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request-detail', id] });
      alert('Maintenance cost updated successfully!');
    },
  });

  const completeMutation = useMutation({
    mutationFn: (cost?: number) => api.serviceRequests.update(id, { status: 'Completed', cost }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request-detail', id] });
    },
  });

  // AI Vendor Recommendation Query
  const { data: aiRecommendation } = useQuery({
    queryKey: ['ai-vendor-recommendation', id, request?.category],
    queryFn: () => api.serviceRequests.autoAssign({
      title: request?.title,
      description: request?.description,
      category: request?.category,
    }),
    enabled: !!request,
  });

  const recommendedVendor = aiRecommendation?.recommendedVendor || null;
  const preferredVisitDay = extractPreferredVisit(request);

  if (isLoading || !request) {
    return <LoadingSkeleton type="details" />;
  }

  return (
    <div className="space-y-6 text-foreground max-w-4xl">
      <PageHeader
        title={`Service Ticket Details - ${getFormattedRequestNumber(request)}`}
        description="Verify service diagnostics, update statuses, or assign service contractors."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Maintenance', href: '/maintenance' },
          { label: 'Requests', href: '/maintenance/requests' },
          { label: 'Details' },
        ]}
      />

      {/* EMERGENCY HAZARD DETECTED BANNER */}
      {request.priority === 'Emergency' && (
        <div className="p-4 bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 animate-pulse shadow-sm">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
            <div>
              <p className="font-black text-sm uppercase flex items-center gap-2">
                🚨 Emergency Safety Hazard Detected by AI
              </p>
              <p className="text-[11px] font-semibold opacity-90 mt-0.5">
                Urgent safety keywords detected in resident report. Dispatched under Emergency SLA protocol.
              </p>
            </div>
          </div>
          <span className="bg-rose-500 text-white text-[10px] uppercase font-black px-3 py-1 rounded-full shrink-0">
            Critical SLA
          </span>
        </div>
      )}

      {/* STATUS OVERVIEW & COST MANAGEMENT */}
      <div className="flex flex-wrap items-center justify-between p-4 bg-card border rounded-2xl gap-3">
        <div className="flex items-center space-x-3.5">
          <StatusBadge status={request.status} />
          <RequestPriorityBadge priority={request.priority as any} />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {request.status === 'New' && (
            <Button size="sm" onClick={() => approveMutation.mutate()} loading={approveMutation.isPending}>Approve Ticket</Button>
          )}

          {/* Persistent Cost Update & Vendor Assignment Form */}
          {request.status !== 'Completed' && (
            <div className="flex items-center space-x-2 bg-secondary/20 p-1.5 rounded-xl border border-border/50">
              <span className="text-[10px] font-black uppercase text-muted-foreground px-1">Cost ($):</span>
              <input
                type="number"
                placeholder={request.cost ? String(request.cost) : 'Enter cost...'}
                value={assignedCost !== '' ? assignedCost : (request.cost ? String(request.cost) : '')}
                onChange={(e) => setAssignedCost(e.target.value)}
                className="text-xs p-1.5 rounded-lg border bg-background text-foreground w-24 focus:outline-none focus:ring-1 focus:ring-primary h-8 font-black"
              />
              <Button 
                size="sm" 
                onClick={() => {
                  const val = Number(assignedCost !== '' ? assignedCost : request.cost);
                  if (val >= 0) {
                    updateCostMutation.mutate(val);
                  }
                }}
                disabled={updateCostMutation.isPending}
                loading={updateCostMutation.isPending}
                className="bg-primary hover:bg-primary/95 text-white font-extrabold h-8 text-[11px] px-3 shadow-sm"
              >
                Save Cost
              </Button>
            </div>
          )}

          {request.status === 'Approved' && !request.assignedVendorName && (
            <div className="flex items-center space-x-2">
              <select
                className="text-xs p-1.5 rounded-lg border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-8"
                onChange={(e) => setSelectedVendorId(e.target.value)}
                value={selectedVendorId}
              >
                <option value="">Select Maintenance Staff...</option>
                {vendorsList.slice(0, 15).map((v) => (
                  <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                ))}
              </select>
              <Button 
                size="sm" 
                onClick={() => {
                  if (selectedVendorId) {
                    assignMutation.mutate({ 
                      vendorId: selectedVendorId, 
                      cost: Number(assignedCost || request.cost || 150) 
                    });
                  }
                }}
                disabled={!selectedVendorId || assignMutation.isPending}
                loading={assignMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-[11px]"
              >
                Dispatch Staff
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/maintenance/requests' })}>Back to List</Button>
        </div>
      </div>

      {/* AI AUTO VENDOR RECOMMENDATION BANNER (Tenant Requests Only) */}
      {recommendedVendor && request.status !== 'Completed' && request.category !== 'Building Code Compliance' && (
        <Card className="p-4 bg-gradient-to-r from-primary/10 via-emerald-500/5 to-amber-500/10 border border-primary/30 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
          <div className="space-y-1 flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-black text-xs text-primary uppercase tracking-wider flex items-center gap-1">
                🤖 AI Auto-Vendor Recommendation
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-600 font-extrabold px-2 py-0.5 rounded-full">
                {recommendedVendor.matchScore || 98}% Match Score
              </span>
            </div>
            <p className="font-extrabold text-sm text-foreground">
              {recommendedVendor.vendorName} • {recommendedVendor.serviceType} Specialist ({recommendedVendor.rating || 4.9}★)
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              {recommendedVendor.reasoning}
            </p>
          </div>

          {!request.assignedVendorName && (
            <Button
              size="sm"
              onClick={() => {
                assignMutation.mutate({
                  vendorId: recommendedVendor.vendorId || vendorsList[0]?.id || 'v-1',
                  cost: 200,
                });
              }}
              disabled={assignMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-9 px-4 shrink-0 shadow-md flex items-center gap-1.5"
            >
              ⚡ Auto-Assign Best Vendor
            </Button>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Columns - Details */}
        <Card className="md:col-span-2 p-6 border bg-card space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap justify-between items-center border-b pb-2 gap-2">
              <h3 className="text-base font-extrabold uppercase tracking-wide">{request.title}</h3>
              {preferredVisitDay && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Preferred Day: {preferredVisitDay}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-muted-foreground pt-2">Issue Description:</p>
            <p className="text-xs leading-relaxed font-medium bg-secondary/10 p-3.5 border rounded-xl">{cleanDescription(request.description) || request.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
            <div className="p-3.5 bg-secondary/15 rounded-xl border border-border/40">
              <p className="text-muted-foreground text-[10px] uppercase">Property Location</p>
              <p className="font-bold text-sm mt-1">{request.propertyName}</p>
              <p className="text-muted-foreground">Unit: {request.unitNumber}</p>
            </div>

            <div className="p-3.5 bg-secondary/15 rounded-xl border border-border/40">
              <p className="text-muted-foreground text-[10px] uppercase">Resident Payee</p>
              <p className="font-bold text-sm mt-1">{request.tenantName}</p>
            </div>
          </div>

          {/* Discussion log / comments thread */}
          <div className="border-t pt-6 space-y-4">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-primary" /> In-App Tenant Message Thread
            </h4>
            
            <div className="space-y-3 max-h-72 overflow-y-auto p-4 bg-secondary/15 rounded-xl border border-border/40 flex flex-col">
              {request.messages && request.messages.length > 0 ? (
                request.messages.map((m) => (
                  <div 
                    key={m.id} 
                    className={`flex flex-col space-y-1 p-3 rounded-xl max-w-[85%] text-xs font-semibold ${
                      m.role === 'Manager' ? 'bg-primary/10 border border-primary/20 self-end ml-auto' : 'bg-card border self-start'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-4 border-b border-border/20 pb-1 mb-1">
                      <span className="font-black uppercase text-[10px] text-primary">{m.senderName}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">{m.timestamp}</span>
                    </div>
                    <p className="text-foreground leading-relaxed font-semibold">{m.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic text-center font-semibold">No messages on this request yet.</p>
              )}
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (newText.trim()) {
                  postMessageMutation.mutate(newText);
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Type message update to resident..."
                value={newText}
                onChange={e => setNewText(e.target.value)}
                className="flex-1 text-xs p-2.5 rounded-xl border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                required
              />
              <Button type="submit" size="sm" disabled={postMessageMutation.isPending || !newText.trim()} className="flex items-center gap-1 h-10">
                <Send className="w-3.5 h-3.5" /> Send
              </Button>
            </form>
          </div>
        </Card>

        {/* Right Column - Auditing */}
        <Card className="md:col-span-1 p-6 border bg-card space-y-4">
          <h3 className="font-extrabold text-sm uppercase border-b pb-2 tracking-wider">Access & Scheduling</h3>
          
          <div className="space-y-3.5 text-xs font-semibold">
            <div className="flex items-center space-x-2">
              <Clock className="w-4.5 h-4.5 text-amber-500" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Preferred Visit Day / Time</p>
                <p className="font-extrabold text-foreground text-sm text-amber-600 dark:text-amber-400">
                  {preferredVisitDay || (request.scheduledDate && !request.scheduledDate.includes('-') ? request.scheduledDate : null) || 'Flexible / Anytime'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Lock className="w-4.5 h-4.5 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Permission to Enter</p>
                <p className="text-emerald-500 font-extrabold">Granted</p>
              </div>
            </div>

            <div className="border-t pt-3.5 mt-2">
              <p className="text-[10px] text-muted-foreground uppercase">Assigned Maintenance Staff</p>
              <p className="font-bold mt-0.5">{request.assignedVendorName || 'Not Assigned Yet'}</p>
            </div>

            <div className="border-t pt-3.5 mt-2 space-y-1 animate-fade-in">
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-muted-foreground uppercase font-black">
                  {request.status === 'Completed' ? 'Final Settled Cost' : 'Maintenance Cost'}
                </p>
                <span className="text-[9px] bg-primary/10 text-primary font-extrabold px-1.5 py-0.5 rounded">
                  AI Benchmark
                </span>
              </div>
              <p className="font-black text-emerald-500 text-base">
                ${request.cost || request.estimatedCost || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Category ({request.category || 'Standard'}) benchmark:{' '}
                <span className="font-bold text-foreground">
                  {(request.category || '').toLowerCase().includes('hvac') || (request.category || '').toLowerCase().includes('ac')
                    ? '$250 - $600'
                    : (request.category || '').toLowerCase().includes('electr')
                    ? '$150 - $350'
                    : (request.category || '').toLowerCase().includes('plumb')
                    ? '$120 - $280'
                    : (request.category || '').toLowerCase().includes('roof')
                    ? '$400 - $850'
                    : '$120 - $220'}
                </span>
              </p>
            </div>

            {/* Resident contact details */}
            <div className="border-t pt-4 mt-4 space-y-3">
              <p className="text-[10px] text-muted-foreground uppercase font-black">Direct Contact Channels</p>
              <div className="flex flex-col gap-2 pt-1.5 font-bold text-xs">
                <a 
                  href={`sms:5550199`} 
                  className="flex items-center justify-between p-2.5 bg-secondary/20 hover:bg-secondary/40 border border-border/40 rounded-xl transition text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span>SMS Tenant</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">555-0199</span>
                </a>
                <a 
                  href={`mailto:${(request.tenantName || 'tenant').toLowerCase().replace(' ', '')}@rentals.com`} 
                  className="flex items-center justify-between p-2.5 bg-secondary/20 hover:bg-secondary/40 border border-border/40 rounded-xl transition text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span>Email Tenant</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[100px]">
                    {(request.tenantName || 'tenant').toLowerCase().replace(' ', '')}@rentals.com
                  </span>
                </a>
                <a 
                  href={`https://wa.me/${(request.tenantPhone || request.phone || '').replace(/\D/g, '') || '15550199'}?text=${encodeURIComponent(`Hi ${request.tenantName}, updating you regarding your maintenance ticket: ${request.title}`)}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center justify-between p-2.5 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 rounded-xl transition text-foreground"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span>WhatsApp Chat</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-500 font-bold">WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};
export default RequestDetailsPage;
