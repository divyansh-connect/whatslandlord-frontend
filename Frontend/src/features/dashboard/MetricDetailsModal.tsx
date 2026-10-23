import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import api from '../../api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  Building2, Home, UserCheck, AlertCircle, TrendingUp, DollarSign, 
  Calendar, Wrench, Download, FileSpreadsheet, FileText, Search, X, CheckCircle, Clock,
  ArrowRight, ExternalLink 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type MetricType = 
  | 'properties' 
  | 'totalUnits' 
  | 'occupiedUnits' 
  | 'vacantUnits'
  | 'occupancyRate'
  | 'monthlyRevenue'
  | 'pendingRent'
  | 'expenses'
  | 'openMaintenance'
  | 'leasesExpiringSoon';

interface MetricDetailsModalProps {
  open: boolean;
  onClose: () => void;
  metricType: MetricType | null;
  metricsSummary?: any;
}

export const MetricDetailsModal: React.FC<MetricDetailsModalProps> = ({
  open,
  onClose,
  metricType,
  metricsSummary,
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch properties
  const { data: properties = [], isLoading: loadingProps } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
    enabled: open,
  });

  // 2. Fetch units
  const { data: units = [], isLoading: loadingUnits } = useQuery({
    queryKey: ['units'],
    queryFn: () => api.unit.getAll(),
    enabled: open && (
      metricType === 'totalUnits' || 
      metricType === 'occupiedUnits' || 
      metricType === 'vacantUnits' || 
      metricType === 'occupancyRate' ||
      metricType === 'monthlyRevenue' ||
      metricType === 'openMaintenance' ||
      metricType === 'pendingRent' ||
      metricType === 'leasesExpiringSoon'
    ),
  });

  // 3. Fetch tenants
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.tenant.getAll(),
    enabled: open && (
      metricType === 'occupiedUnits' || 
      metricType === 'totalUnits' || 
      metricType === 'monthlyRevenue' || 
      metricType === 'pendingRent' ||
      metricType === 'leasesExpiringSoon'
    ),
  });

  // 4. Fetch leases
  const { data: leases = [], isLoading: loadingLeases } = useQuery({
    queryKey: ['leases'],
    queryFn: () => api.leasing.getLeases(),
    enabled: open && (metricType === 'monthlyRevenue' || metricType === 'leasesExpiringSoon'),
  });

  // 5. Fetch payments
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.payments.getAll(),
    enabled: open && (metricType === 'pendingRent' || metricType === 'monthlyRevenue'),
  });

  // 6. Fetch expenses
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.expenses.getAll(),
    enabled: open && metricType === 'expenses',
  });

  // 7. Fetch work orders
  const { data: workOrders = [], isLoading: loadingWorkOrders } = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => api.workOrders.getAll(),
    enabled: open && metricType === 'openMaintenance',
  });

  // Reset search term when modal opens/closes
  React.useEffect(() => {
    if (!open) setSearchTerm('');
  }, [open]);

  // Compute title, icon, and filtered rows based on metricType
  const modalConfig = useMemo(() => {
    if (!metricType) return null;

    switch (metricType) {
      // 1. TOTAL PROPERTIES
      case 'properties': {
        const list = properties.map((p: any) => ({
          id: p.id,
          propertyId: p.id,
          propertyName: p.name,
          address: p.address || `${p.city || 'Austin'}, ${p.state || 'TX'}`,
          type: p.type || 'Residential',
          totalUnits: p.totalUnits || p.units?.length || 0,
          occupiedUnits: p.units?.filter((u: any) => u.status === 'Occupied').length || 0,
          vacantUnits: p.units?.filter((u: any) => u.status === 'Vacant').length || 0,
          occupancyRate: p.units?.length ? `${Math.round(((p.units.filter((u: any) => u.status === 'Occupied').length) / p.units.length) * 100)}%` : '0%',
          monthlyRevenue: p.monthlyRevenue ? `$${p.monthlyRevenue.toLocaleString()}` : '$0',
        }));

        const filtered = list.filter((item: any) =>
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.type.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          title: 'Total Properties Details Matrix',
          description: 'Comprehensive breakdown of all properties in your portfolio',
          icon: <Building2 className="w-6 h-6 text-primary" />,
          badgeBg: 'bg-primary/10 text-primary border-primary/20',
          count: list.length,
          countLabel: 'Properties',
          data: filtered,
          rawData: list,
          reportTitle: 'TOTAL_PROPERTIES_REPORT',
          columns: [
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Address', accessorKey: 'address' },
            { header: 'Type', accessorKey: 'type' },
            { header: 'Total Units', accessorKey: 'totalUnits' },
            { header: 'Occupied Units', accessorKey: 'occupiedUnits' },
            { header: 'Vacant Units', accessorKey: 'vacantUnits' },
            { header: 'Occupancy %', accessorKey: 'occupancyRate' },
            { header: 'Monthly Revenue', accessorKey: 'monthlyRevenue' },
          ],
        };
      }

      // 2. TOTAL UNITS
      case 'totalUnits': {
        const list = units.map((u: any) => {
          const tenant = tenants.find((t: any) => t.unitId === u.id || t.id === u.tenantId);
          const prop = properties.find((p: any) => p.id === u.propertyId || p.name === u.propertyName);
          return {
            id: u.id,
            unitId: u.id,
            propertyId: u.propertyId || prop?.id,
            tenantId: tenant?.id,
            unitNumber: `Unit ${u.unitNumber}`,
            propertyName: u.propertyName || prop?.name || 'Property',
            floor: `Floor ${u.floor || 1}`,
            bedroomsBathrooms: `${u.bedrooms || 0} Beds / ${u.bathrooms || 1} Baths`,
            squareFootage: `${(u.squareFootage || 0).toLocaleString()} sqft`,
            rentAmount: `$${(u.rentAmount || 0).toLocaleString()}`,
            tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : (u.status === 'Occupied' ? 'Active Resident' : 'Vacant'),
            status: u.status || 'Vacant',
          };
        });

        const filtered = list.filter((item: any) =>
          item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          title: 'Total Portfolio Units Breakdown',
          description: 'Complete inventory list of all units across properties',
          icon: <Home className="w-6 h-6 text-blue-500" />,
          badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          count: list.length,
          countLabel: 'Units',
          data: filtered,
          rawData: list,
          reportTitle: 'TOTAL_UNITS_REPORT',
          columns: [
            { header: 'Unit #', accessorKey: 'unitNumber' },
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Floor', accessorKey: 'floor' },
            { header: 'Layout', accessorKey: 'bedroomsBathrooms' },
            { header: 'SqFt', accessorKey: 'squareFootage' },
            { header: 'Monthly Rent', accessorKey: 'rentAmount' },
            { header: 'Resident', accessorKey: 'tenantName' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 3. OCCUPIED UNITS
      case 'occupiedUnits': {
        const occupiedList = units
          .filter((u: any) => u.status === 'Occupied')
          .map((u: any) => {
            const tenant = tenants.find((t: any) => t.unitId === u.id || t.id === u.tenantId);
            const prop = properties.find((p: any) => p.id === u.propertyId || p.name === u.propertyName);
            return {
              id: u.id,
              unitId: u.id,
              propertyId: u.propertyId || prop?.id,
              tenantId: tenant?.id,
              unitNumber: `Unit ${u.unitNumber}`,
              propertyName: u.propertyName || prop?.name || 'Property',
              tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Active Resident',
              tenantEmail: tenant?.email || 'N/A',
              moveInDate: tenant?.moveInDate ? tenant.moveInDate.split('T')[0] : 'N/A',
              rentAmount: `$${(u.rentAmount || 0).toLocaleString()}`,
              securityDeposit: `$${(u.securityDeposit || 0).toLocaleString()}`,
              leaseStatus: tenant?.status || 'Active',
            };
          });

        const filtered = occupiedList.filter((item: any) =>
          item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tenantName.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          title: 'Occupied Units Matrix',
          description: 'Details of all currently occupied units and resident profiles',
          icon: <UserCheck className="w-6 h-6 text-emerald-500" />,
          badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          count: occupiedList.length,
          countLabel: 'Occupied',
          data: filtered,
          rawData: occupiedList,
          reportTitle: 'OCCUPIED_UNITS_REPORT',
          columns: [
            { header: 'Unit #', accessorKey: 'unitNumber' },
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Resident Name', accessorKey: 'tenantName' },
            { header: 'Contact Email', accessorKey: 'tenantEmail' },
            { header: 'Move-In Date', accessorKey: 'moveInDate' },
            { header: 'Monthly Rent', accessorKey: 'rentAmount' },
            { header: 'Security Deposit', accessorKey: 'securityDeposit' },
            { header: 'Lease Status', accessorKey: 'leaseStatus' },
          ],
        };
      }

      // 4. VACANT UNITS
      case 'vacantUnits': {
        const vacantList = units
          .filter((u: any) => u.status === 'Vacant')
          .map((u: any) => {
            const prop = properties.find((p: any) => p.id === u.propertyId || p.name === u.propertyName);
            return {
              id: u.id,
              unitId: u.id,
              propertyId: u.propertyId || prop?.id,
              unitNumber: `Unit ${u.unitNumber}`,
              propertyName: u.propertyName || prop?.name || 'Property',
              floor: `Floor ${u.floor || 1}`,
              bedroomsBathrooms: `${u.bedrooms || 0} Beds / ${u.bathrooms || 1} Baths`,
              squareFootage: `${(u.squareFootage || 0).toLocaleString()} sqft`,
              rentAmount: `$${(u.rentAmount || 0).toLocaleString()}`,
              availabilityDate: u.availabilityDate ? u.availabilityDate.split('T')[0] : 'Immediate',
              advertised: u.advertiseListing ? 'Active Listing' : 'Not Advertised',
            };
          });

        const filtered = vacantList.filter((item: any) =>
          item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.advertised.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          title: 'Vacant Units Matrix',
          description: 'Detailed inventory of vacant units ready for leasing & marketing',
          icon: <AlertCircle className="w-6 h-6 text-rose-500" />,
          badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          count: vacantList.length,
          countLabel: 'Vacant',
          data: filtered,
          rawData: vacantList,
          reportTitle: 'VACANT_UNITS_REPORT',
          columns: [
            { header: 'Unit #', accessorKey: 'unitNumber' },
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Floor', accessorKey: 'floor' },
            { header: 'Layout', accessorKey: 'bedroomsBathrooms' },
            { header: 'SqFt', accessorKey: 'squareFootage' },
            { header: 'Target Rent', accessorKey: 'rentAmount' },
            { header: 'Availability Date', accessorKey: 'availabilityDate' },
            { header: 'Marketing Status', accessorKey: 'advertised' },
          ],
        };
      }

      // 5. OCCUPANCY RATE
      case 'occupancyRate': {
        const list = properties.map((p: any) => {
          const pUnits = p.units || units.filter((u: any) => u.propertyId === p.id);
          const totalUnitsCount = pUnits.length || p.totalUnits || 0;
          const occupiedCount = pUnits.filter((u: any) => u.status === 'Occupied').length;
          const vacantCount = pUnits.filter((u: any) => u.status === 'Vacant').length;
          const rate = totalUnitsCount > 0 ? Math.round((occupiedCount / totalUnitsCount) * 100) : 0;
          const potentialRent = pUnits.reduce((sum: number, u: any) => sum + (u.rentAmount || 0), 0);
          const leasedRent = pUnits
            .filter((u: any) => u.status === 'Occupied')
            .reduce((sum: number, u: any) => sum + (u.rentAmount || 0), 0);

          return {
            id: p.id,
            propertyName: p.name,
            address: p.address || `${p.city || 'Austin'}, ${p.state || 'TX'}`,
            totalUnits: totalUnitsCount,
            occupiedUnits: occupiedCount,
            vacantUnits: vacantCount,
            occupancyRate: `${rate}%`,
            leasedRent: `$${leasedRent.toLocaleString()}`,
            potentialRent: `$${potentialRent.toLocaleString()}`,
            status: rate >= 100 ? '100% Leased' : rate >= 80 ? 'High Occupancy' : rate > 0 ? 'Moderate' : 'Vacant',
          };
        });

        const filtered = list.filter((item: any) =>
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.occupancyRate.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const displayedRate = metricsSummary?.occupancyRate !== undefined 
          ? `${metricsSummary.occupancyRate}%` 
          : `${list.length > 0 ? Math.round((list.reduce((s: number, i: any) => s + i.occupiedUnits, 0) / (list.reduce((s: number, i: any) => s + i.totalUnits, 0) || 1)) * 100) : 0}%`;

        return {
          title: 'Occupancy Rate Analysis Matrix',
          description: 'Comprehensive property-level occupancy, active tenancies, and vacancy breakdown',
          icon: <TrendingUp className="w-6 h-6 text-indigo-500" />,
          badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          count: displayedRate,
          countLabel: 'Occupancy Rate',
          data: filtered,
          rawData: list,
          reportTitle: 'OCCUPANCY_RATE_REPORT',
          columns: [
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Address', accessorKey: 'address' },
            { header: 'Total Units', accessorKey: 'totalUnits' },
            { header: 'Occupied Units', accessorKey: 'occupiedUnits' },
            { header: 'Vacant Units', accessorKey: 'vacantUnits' },
            { header: 'Occupancy %', accessorKey: 'occupancyRate' },
            { header: 'Leased Rent', accessorKey: 'leasedRent' },
            { header: 'Potential Rent', accessorKey: 'potentialRent' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 6. MONTHLY REVENUE
      case 'monthlyRevenue': {
        const activeLeases = leases.filter((l: any) => l.status === 'Active' || (l.rentAmount && l.rentAmount > 0));
        
        let revenueList: any[] = [];
        if (activeLeases.length > 0) {
          revenueList = activeLeases.map((l: any, idx: number) => {
            const unitObj = units.find((u: any) => u.id === l.unitId);
            const tenantObj = tenants.find((t: any) => t.id === l.tenantId);
            const prop = properties.find((p: any) => p.id === (l.propertyId || unitObj?.propertyId) || p.name === (l.propertyName || l.property?.name));
            return {
              id: l.id || `rev-${idx}`,
              leaseId: l.id,
              unitId: l.unitId || unitObj?.id,
              tenantId: l.tenantId || tenantObj?.id,
              propertyId: l.propertyId || unitObj?.propertyId || prop?.id,
              unitNumber: l.unitNumber ? (l.unitNumber.startsWith('Unit') ? l.unitNumber : `Unit ${l.unitNumber}`) : (unitObj ? `Unit ${unitObj.unitNumber}` : 'Unit'),
              propertyName: l.propertyName || l.property?.name || unitObj?.propertyName || prop?.name || 'Property',
              tenantName: l.tenantName || (tenantObj ? `${tenantObj.firstName} ${tenantObj.lastName}` : (l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName}` : 'Active Resident')),
              rentAmount: `$${(l.rentAmount || 0).toLocaleString()}`,
              numericRent: l.rentAmount || 0,
              securityDeposit: `$${(l.securityDeposit || 0).toLocaleString()}`,
              startDate: l.startDate ? l.startDate.split('T')[0] : 'N/A',
              endDate: l.endDate ? l.endDate.split('T')[0] : 'N/A',
              billingCycle: 'Monthly',
              status: l.status || 'Active',
            };
          });
        } else {
          // Fallback to occupied units
          revenueList = units
            .filter((u: any) => u.status === 'Occupied' || (u.rentAmount && u.rentAmount > 0))
            .map((u: any, idx: number) => {
              const tenant = tenants.find((t: any) => t.unitId === u.id || t.id === u.tenantId);
              const prop = properties.find((p: any) => p.id === u.propertyId || p.name === u.propertyName);
              return {
                id: u.id || `rev-${idx}`,
                unitId: u.id,
                tenantId: tenant?.id,
                propertyId: u.propertyId || prop?.id,
                unitNumber: `Unit ${u.unitNumber}`,
                propertyName: u.propertyName || prop?.name || 'Property',
                tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Active Resident',
                rentAmount: `$${(u.rentAmount || 0).toLocaleString()}`,
                numericRent: u.rentAmount || 0,
                securityDeposit: `$${(u.securityDeposit || 0).toLocaleString()}`,
                startDate: '2026-01-01',
                endDate: '2027-01-01',
                billingCycle: 'Monthly',
                status: 'Active',
              };
            });
        }

        const filtered = revenueList.filter((item: any) =>
          item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.rentAmount.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const totalRevenueSum = metricsSummary?.monthlyRevenue !== undefined 
            ? metricsSummary.monthlyRevenue 
            : revenueList.reduce((sum: number, item: any) => sum + (item.numericRent || 0), 0);

        return {
          title: 'Monthly Revenue Stream Matrix',
          description: 'Detailed inventory of recurring rent streams, active leases, and monthly billing breakdown',
          icon: <DollarSign className="w-6 h-6 text-emerald-500" />,
          badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          count: `$${totalRevenueSum.toLocaleString()}`,
          countLabel: 'Monthly Revenue',
          data: filtered,
          rawData: revenueList,
          reportTitle: 'MONTHLY_REVENUE_REPORT',
          columns: [
            { header: 'Unit #', accessorKey: 'unitNumber' },
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Resident Name', accessorKey: 'tenantName' },
            { header: 'Monthly Rent', accessorKey: 'rentAmount' },
            { header: 'Deposit', accessorKey: 'securityDeposit' },
            { header: 'Lease Start', accessorKey: 'startDate' },
            { header: 'Lease End', accessorKey: 'endDate' },
            { header: 'Billing Cycle', accessorKey: 'billingCycle' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 7. PENDING RENT
      case 'pendingRent': {
        const pendingPayments = payments
          .filter((p: any) => p.status === 'Pending' || p.status === 'Overdue' || p.status === 'Late' || p.status === 'Unpaid')
          .map((p: any) => {
            const tenant = tenants.find((t: any) => t.id === p.tenantId || `${t.firstName} ${t.lastName}` === p.tenantName);
            const prop = properties.find((propItem: any) => propItem.id === p.propertyId || propItem.name === p.propertyName);
            return {
              id: p.id,
              paymentId: p.id,
              receiptNumber: p.receiptNumber || `#INV-${p.id.slice(0, 6).toUpperCase()}`,
              tenantId: p.tenantId || tenant?.id,
              tenantName: p.tenantName || (tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Resident'),
              propertyId: p.propertyId || prop?.id,
              propertyName: p.propertyName || prop?.name || 'Property',
              unitId: p.unitId,
              unitNumber: p.unitNumber ? (p.unitNumber.startsWith('Unit') ? p.unitNumber : `Unit ${p.unitNumber}`) : 'Unassigned',
              amount: `$${(p.amount || 0).toLocaleString()}`,
              numericAmount: p.amount || 0,
              dueDate: p.dueDate ? p.dueDate.split('T')[0] : (p.paidDate || 'Immediate'),
              paymentMethod: p.paymentMethod || 'ACH',
              status: p.status || 'Pending',
            };
          });

        const filtered = pendingPayments.filter((item: any) =>
          item.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const totalPending = metricsSummary?.pendingRent !== undefined 
          ? metricsSummary.pendingRent 
          : pendingPayments.reduce((s: number, p: any) => s + p.numericAmount, 0);

        return {
          title: 'Pending & Delinquent Rent Matrix',
          description: 'Itemized outstanding rent invoices, overdue accounts, and receivables pending collection',
          icon: <AlertCircle className="w-6 h-6 text-amber-500" />,
          badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          count: `$${totalPending.toLocaleString()}`,
          countLabel: 'Pending Rent',
          data: filtered,
          rawData: pendingPayments,
          reportTitle: 'PENDING_RENT_REPORT',
          columns: [
            { header: 'Invoice / Ref #', accessorKey: 'receiptNumber' },
            { header: 'Resident Name', accessorKey: 'tenantName' },
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Unit #', accessorKey: 'unitNumber' },
            { header: 'Outstanding Amount', accessorKey: 'amount' },
            { header: 'Due Date', accessorKey: 'dueDate' },
            { header: 'Method', accessorKey: 'paymentMethod' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 8. EXPENSES
      case 'expenses': {
        const expenseList = expenses.map((e: any, idx: number) => {
          const prop = properties.find((p: any) => p.id === e.propertyId || p.name === e.propertyName);
          return {
            id: e.id || `exp-${idx}`,
            expenseId: e.id,
            propertyId: e.propertyId || prop?.id,
            category: e.category || 'Maintenance & Operations',
            vendorName: e.vendorName || 'General Contractor',
            propertyName: e.propertyName || prop?.name || 'Portfolio-wide',
            amount: `$${(e.amount || 0).toLocaleString()}`,
            numericAmount: e.amount || 0,
            date: e.date ? e.date.split('T')[0] : 'N/A',
            description: typeof e.description === 'string' && !e.description.startsWith('{') ? e.description : (e.category || 'Operating Expense'),
            status: e.status || 'Cleared',
          };
        });

        const filtered = expenseList.filter((item: any) =>
          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const totalExpenses = metricsSummary?.expenses !== undefined 
          ? metricsSummary.expenses 
          : expenseList.reduce((s: number, e: any) => s + e.numericAmount, 0);

        return {
          title: 'Operating Expenses Matrix',
          description: 'Detailed ledger of property expenses, vendor disbursements, and operational costs',
          icon: <DollarSign className="w-6 h-6 text-rose-500" />,
          badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          count: `$${totalExpenses.toLocaleString()}`,
          countLabel: 'Expenses',
          data: filtered,
          rawData: expenseList,
          reportTitle: 'OPERATING_EXPENSES_REPORT',
          columns: [
            { header: 'Category', accessorKey: 'category' },
            { header: 'Payee / Vendor', accessorKey: 'vendorName' },
            { header: 'Property', accessorKey: 'propertyName' },
            { header: 'Amount', accessorKey: 'amount' },
            { header: 'Transaction Date', accessorKey: 'date' },
            { header: 'Description', accessorKey: 'description' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 9. OPEN MAINTENANCE
      case 'openMaintenance': {
        const openOrders = workOrders
          .filter((w: any) => ['Open', 'InProgress', 'Pending', 'In Progress', 'New', 'Submitted', 'Assigned'].includes(w.status))
          .map((w: any, idx: number) => {
            const prop = properties.find((p: any) => p.id === w.propertyId || p.name === w.propertyName);
            return {
              id: w.id || `wo-${idx}`,
              workOrderId: w.id,
              propertyId: w.propertyId || prop?.id,
              unitId: w.unitId,
              workOrderNumber: w.workOrderNumber || `#WO-${1001 + idx}`,
              title: w.title || 'General Maintenance Request',
              propertyName: w.propertyName || prop?.name || 'Property',
              unitNumber: w.unitNumber ? (w.unitNumber.startsWith('Unit') ? w.unitNumber : `Unit ${w.unitNumber}`) : 'Common Area',
              assignedTechnician: w.assignedTechnician || w.vendorName || 'Unassigned',
              priority: w.priority || 'Normal',
              estimatedCost: w.estimatedCost ? `$${Number(w.estimatedCost).toLocaleString()}` : '$0',
              scheduledDate: w.scheduledDate || (w.createdAt ? w.createdAt.split('T')[0] : 'Pending'),
              status: w.status || 'Open',
            };
          });

        const filtered = openOrders.filter((item: any) =>
          item.workOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.assignedTechnician.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.priority.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          title: 'Open Maintenance Orders Matrix',
          description: 'Active work orders, unresolved repairs, and scheduled technician dispatches',
          icon: <Wrench className="w-6 h-6 text-amber-500" />,
          badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          count: openOrders.length,
          countLabel: 'Open Orders',
          data: filtered,
          rawData: openOrders,
          reportTitle: 'OPEN_MAINTENANCE_REPORT',
          columns: [
            { header: 'Work Order #', accessorKey: 'workOrderNumber' },
            { header: 'Title / Issue', accessorKey: 'title' },
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Unit #', accessorKey: 'unitNumber' },
            { header: 'Assigned Tech / Vendor', accessorKey: 'assignedTechnician' },
            { header: 'Priority', accessorKey: 'priority' },
            { header: 'Est. Cost', accessorKey: 'estimatedCost' },
            { header: 'Status', accessorKey: 'status' },
          ],
        };
      }

      // 10. LEASES EXPIRING SOON
      case 'leasesExpiringSoon': {
        const now = new Date();
        const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

        const expiringList = leases
          .filter((l: any) => {
            if (l.status !== 'Active') return false;
            if (!l.endDate) return false;
            const end = new Date(l.endDate);
            return end <= sixtyDaysFromNow;
          })
          .map((l: any) => {
            const end = new Date(l.endDate);
            const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const tenant = tenants.find((t: any) => t.id === l.tenantId);
            const prop = properties.find((p: any) => p.id === l.propertyId || p.name === (l.propertyName || l.property?.name));
            return {
              id: l.id,
              leaseId: l.id,
              propertyId: l.propertyId || prop?.id,
              tenantId: l.tenantId || tenant?.id,
              unitId: l.unitId,
              unitNumber: l.unitNumber ? (l.unitNumber.startsWith('Unit') ? l.unitNumber : `Unit ${l.unitNumber}`) : (l.unit?.unitNumber ? `Unit ${l.unit.unitNumber}` : 'Unit'),
              propertyName: l.propertyName || l.property?.name || prop?.name || 'Property',
              tenantName: l.tenantName || (tenant ? `${tenant.firstName} ${tenant.lastName}` : (l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName}` : 'Resident')),
              rentAmount: `$${(l.rentAmount || 0).toLocaleString()}`,
              startDate: l.startDate ? l.startDate.split('T')[0] : 'N/A',
              endDate: l.endDate ? l.endDate.split('T')[0] : 'N/A',
              daysRemaining: diffDays < 0 ? `${Math.abs(diffDays)}d Expired` : diffDays === 0 ? 'Expires Today' : `${diffDays} days`,
              renewalStatus: diffDays <= 15 ? 'Immediate Action' : diffDays <= 30 ? 'Expiring Soon' : 'Upcoming Expiration',
              status: l.status || 'Active',
            };
          })
          .sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

        const filtered = expiringList.filter((item: any) =>
          item.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.renewalStatus.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.endDate.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return {
          title: 'Expiring Leases Matrix',
          description: 'Active leases expiring within the next 60 days requiring renewal or tenant outreach',
          icon: <Calendar className="w-6 h-6 text-purple-500" />,
          badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          count: expiringList.length,
          countLabel: 'Expiring Leases',
          data: filtered,
          rawData: expiringList,
          reportTitle: 'EXPIRING_LEASES_REPORT',
          columns: [
            { header: 'Unit #', accessorKey: 'unitNumber' },
            { header: 'Property Name', accessorKey: 'propertyName' },
            { header: 'Resident Name', accessorKey: 'tenantName' },
            { header: 'Current Rent', accessorKey: 'rentAmount' },
            { header: 'Start Date', accessorKey: 'startDate' },
            { header: 'Expiration Date', accessorKey: 'endDate' },
            { header: 'Time Remaining', accessorKey: 'daysRemaining' },
            { header: 'Renewal Status', accessorKey: 'renewalStatus' },
          ],
        };
      }

      default:
        return null;
    }
  }, [metricType, properties, units, tenants, leases, payments, expenses, workOrders, searchTerm, metricsSummary]);

  if (!open || !modalConfig) return null;

  const isLoading = 
    (metricType === 'properties' && loadingProps) ||
    (metricType === 'totalUnits' && loadingUnits) ||
    (metricType === 'occupiedUnits' && loadingUnits) ||
    (metricType === 'vacantUnits' && loadingUnits) ||
    (metricType === 'occupancyRate' && (loadingProps || loadingUnits)) ||
    (metricType === 'monthlyRevenue' && (loadingLeases || loadingUnits)) ||
    (metricType === 'pendingRent' && loadingPayments) ||
    (metricType === 'expenses' && loadingExpenses) ||
    (metricType === 'openMaintenance' && loadingWorkOrders) ||
    (metricType === 'leasesExpiringSoon' && loadingLeases);

  // Export handlers
  const handleExportCSV = () => {
    const list = modalConfig.data;
    if (list.length === 0) return;

    const exportRows = list.map((item: any) => {
      const row: Record<string, any> = {};
      modalConfig.columns.forEach((col) => {
        row[col.header] = item[col.accessorKey] ?? 'N/A';
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Matrix Details');
    XLSX.writeFile(workbook, `${modalConfig.reportTitle}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const list = modalConfig.data;
    if (list.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(modalConfig.title.toUpperCase(), 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${list.length}`, 14, 21);

    const headers = modalConfig.columns.map((c) => c.header);
    const tableRows = list.map((item: any) =>
      modalConfig.columns.map((c) => String(item[c.accessorKey] ?? 'N/A'))
    );

    autoTable(doc, {
      startY: 26,
      head: [headers],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
    });

    doc.save(`${modalConfig.reportTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-5xl h-[85vh] max-h-[85vh] p-6 overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden gap-3">
          {/* Header Section */}
          <DialogHeader className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-secondary/80 rounded-2xl shrink-0">
                {modalConfig.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-extrabold text-foreground">
                    {modalConfig.title}
                  </DialogTitle>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${modalConfig.badgeBg}`}>
                    {modalConfig.count} {modalConfig.countLabel}
                  </span>
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {modalConfig.description}
                </DialogDescription>
              </div>
            </div>

            {/* Action Export Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={isLoading || modalConfig.data.length === 0}
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                Export Excel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleExportPDF}
                disabled={isLoading || modalConfig.data.length === 0}
                className="flex items-center gap-1.5 text-xs font-bold"
              >
                <FileText className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </DialogHeader>

          {/* Search & Filter Bar */}
          <div className="shrink-0 flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Search ${modalConfig.countLabel.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Showing {modalConfig.data.length} of {modalConfig.rawData.length} entries
            </span>
          </div>

          {/* Table Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto border border-border rounded-xl">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3 text-muted-foreground">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold">Loading matrix details...</p>
              </div>
            ) : modalConfig.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 text-muted-foreground">
                <AlertCircle className="w-10 h-10 text-muted-foreground/50" />
                <p className="font-extrabold text-sm text-foreground">No Records Found</p>
                <p className="text-xs max-w-xs">
                  {searchTerm ? `No results match your search "${searchTerm}".` : 'No data available for this metric category.'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-secondary/90 sticky top-0 border-b border-border z-10 text-muted-foreground font-extrabold uppercase text-[10px] tracking-wider backdrop-blur-md">
                  <tr>
                    {modalConfig.columns.map((col) => (
                      <th key={col.accessorKey} className="px-4 py-3 bg-secondary/90">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {modalConfig.data.map((row: any, idx: number) => (
                    <tr
                      key={row.id || idx}
                      className="hover:bg-secondary/40 transition-colors font-medium text-foreground"
                    >
                      {modalConfig.columns.map((col) => {
                        const val = row[col.accessorKey];

                        // Custom Badge Renderers
                        if (col.accessorKey === 'status' || col.accessorKey === 'leaseStatus' || col.accessorKey === 'paymentStatus') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3">
                              <StatusBadge status={val} />
                            </td>
                          );
                        }

                        if (col.accessorKey === 'advertised') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  val === 'Active Listing'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                                }`}
                              >
                                {val}
                              </span>
                            </td>
                          );
                        }

                        if (col.accessorKey === 'renewalStatus') {
                          const isImmediate = val === 'Immediate Action';
                          const isExpiring = val === 'Expiring Soon';
                          return (
                            <td key={col.accessorKey} className="px-4 py-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  navigate({ to: '/leasing/renewals' });
                                }}
                                title="Review expiring leases and take action immediately in Renewals Directory"
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm group ${
                                  isImmediate
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20 ring-1 ring-rose-500/30'
                                    : isExpiring
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                                }`}
                              >
                                <span>{val}</span>
                                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                              </button>
                            </td>
                          );
                        }

                        if (col.accessorKey === 'priority') {
                          const isUrgent = val === 'Urgent' || val === 'High';
                          const isMed = val === 'Medium' || val === 'Normal';
                          return (
                            <td key={col.accessorKey} className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isUrgent
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                    : isMed
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                                }`}
                              >
                                {val}
                              </span>
                            </td>
                          );
                        }

                        if (col.accessorKey === 'workOrderNumber') {
                          const woId = row.workOrderId || row.id;
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 font-mono font-bold text-primary">
                              {woId ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                    navigate({ to: `/maintenance/work-orders/${woId}` });
                                  }}
                                  className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 text-left font-mono font-bold group"
                                  title="View Maintenance Work Order"
                                >
                                  <span>{val}</span>
                                  <ExternalLink className="w-3 h-3 text-primary opacity-60 group-hover:opacity-100" />
                                </button>
                              ) : (
                                val
                              )}
                            </td>
                          );
                        }

                        if (col.accessorKey === 'receiptNumber') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 font-mono font-bold text-primary">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  navigate({ to: '/payments' });
                                }}
                                className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 text-left font-mono font-bold group"
                                title="View Payments & Ledger"
                              >
                                <span>{val}</span>
                                <ExternalLink className="w-3 h-3 text-primary opacity-60 group-hover:opacity-100" />
                              </button>
                            </td>
                          );
                        }

                        if (col.accessorKey === 'category' && metricType === 'expenses') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 font-bold text-foreground">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClose();
                                  navigate({ to: '/accounting/expenses' });
                                }}
                                className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 text-left group"
                                title="View in Accounting Expenses"
                              >
                                <span>{val}</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                              </button>
                            </td>
                          );
                        }

                        if (col.accessorKey === 'occupancyRate' && metricType === 'occupancyRate') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-500/20">
                                {val}
                              </span>
                            </td>
                          );
                        }

                        if (col.accessorKey === 'propertyName') {
                          const targetPropId = (metricType === 'properties' || metricType === 'occupancyRate') ? row.id : row.propertyId;
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 font-bold text-foreground">
                              {targetPropId ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                    navigate({ to: `/properties/${targetPropId}` });
                                  }}
                                  className="text-foreground hover:text-primary hover:underline cursor-pointer inline-flex items-center gap-1 text-left group font-bold"
                                  title="View Property Details"
                                >
                                  <span>{val}</span>
                                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                                </button>
                              ) : (
                                val
                              )}
                            </td>
                          );
                        }

                        if (col.accessorKey === 'unitNumber') {
                          const isExpiringUnit = metricType === 'leasesExpiringSoon';
                          const isRevenueLease = metricType === 'monthlyRevenue' && row.leaseId;
                          const targetUnitId = row.unitId || ((metricType === 'totalUnits' || metricType === 'occupiedUnits' || metricType === 'vacantUnits') ? row.id : null);

                          return (
                            <td key={col.accessorKey} className="px-4 py-3 font-bold text-foreground">
                              {isExpiringUnit ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                    navigate({ to: `/leases/${row.id}` });
                                  }}
                                  className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 text-left"
                                  title="View Lease Contract"
                                >
                                  <span>{val}</span>
                                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-70" />
                                </button>
                              ) : isRevenueLease ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                    navigate({ to: `/leases/${row.leaseId}` });
                                  }}
                                  className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 text-left"
                                  title="View Lease Details"
                                >
                                  <span>{val}</span>
                                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-70" />
                                </button>
                              ) : targetUnitId ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                    navigate({ to: `/properties/units/${targetUnitId}` });
                                  }}
                                  className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 text-left font-bold"
                                  title="View Unit Details"
                                >
                                  <span>{val}</span>
                                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-70" />
                                </button>
                              ) : (
                                val
                              )}
                            </td>
                          );
                        }

                        if (col.accessorKey === 'tenantName') {
                          return (
                            <td key={col.accessorKey} className="px-4 py-3 font-medium text-foreground">
                              {row.tenantId ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                    navigate({ to: `/tenants/${row.tenantId}` });
                                  }}
                                  className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1 text-left group"
                                  title="View Resident Profile"
                                >
                                  <span>{val}</span>
                                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                                </button>
                              ) : (
                                val
                              )}
                            </td>
                          );
                        }

                        return (
                          <td key={col.accessorKey} className="px-4 py-3 text-muted-foreground">
                            {val || 'N/A'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-border flex items-center justify-between shrink-0 text-xs text-muted-foreground">
            <span>Real-time portfolio intelligence breakdown</span>
            <Button variant="outline" size="sm" onClick={onClose} className="px-6">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MetricDetailsModal;
