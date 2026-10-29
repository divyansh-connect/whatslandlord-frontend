import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';
import { ReportFiltersState } from '../types/report.types';
import { FilterX } from 'lucide-react';

interface ReportFiltersProps {
  filters: ReportFiltersState;
  onChange: (key: keyof ReportFiltersState, value: any) => void;
  onReset: () => void;
  showStatusFilter?: boolean;
  statusOptions?: string[];
  showPriorityFilter?: boolean;
  priorityOptions?: string[];
  showPaymentMethodFilter?: boolean;
  paymentMethodOptions?: string[];
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  filters,
  onChange,
  onReset,
  showStatusFilter = false,
  statusOptions = [],
  showPriorityFilter = false,
  priorityOptions = [],
  showPaymentMethodFilter = false,
  paymentMethodOptions = [],
}) => {
  // Query properties
  const { data: propertiesData = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });
  const properties = Array.isArray(propertiesData) ? propertiesData : [];

  // Query units (optionally filtered by selected property)
  const { data: unitsData = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => api.unit.getAll(),
  });
  const units = Array.isArray(unitsData) ? unitsData : [];

  const filteredUnits = filters.propertyId
    ? units.filter((u: any) => u.propertyId === filters.propertyId || u.property?.id === filters.propertyId)
    : units;

  // Query tenants
  const { data: tenantsData = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.tenant.getAll(),
  });
  const tenants = Array.isArray(tenantsData) ? tenantsData : [];

  // Cascading tenant filter based on selected Unit or Property
  const filteredTenants = tenants.filter((t: any) => {
    if (filters.unitId) {
      return t.unitId === filters.unitId || t.unit?.id === filters.unitId;
    }
    if (filters.propertyId) {
      return (
        t.propertyId === filters.propertyId ||
        t.unit?.propertyId === filters.propertyId ||
        t.unit?.property?.id === filters.propertyId ||
        (Array.isArray(t.leases) && t.leases.some((l: any) => l.propertyId === filters.propertyId))
      );
    }
    return true;
  });

  const handlePropertyChange = (propId: string) => {
    onChange('propertyId', propId);
    if (filters.unitId) onChange('unitId', '');
    if (filters.tenantId) onChange('tenantId', '');
  };

  const handleUnitChange = (unitId: string) => {
    onChange('unitId', unitId);
    if (filters.tenantId) onChange('tenantId', '');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
      {/* Property Select */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Property</label>
        <select
          value={filters.propertyId || ''}
          onChange={(e) => handlePropertyChange(e.target.value)}
          className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Properties</option>
          {properties.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Unit Select */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Unit</label>
        <select
          value={filters.unitId || ''}
          onChange={(e) => handleUnitChange(e.target.value)}
          className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Units</option>
          {filteredUnits.map((u: any) => (
            <option key={u.id} value={u.id}>
              Unit {u.unitNumber} {u.propertyName || u.property?.name ? `(${u.propertyName || u.property?.name})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Tenant Select */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Tenant</label>
        <select
          value={filters.tenantId || ''}
          onChange={(e) => onChange('tenantId', e.target.value)}
          className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Tenants</option>
          {filteredTenants.map((t: any) => (
            <option key={t.id} value={t.id}>
              {t.firstName || ''} {t.lastName || ''} {t.unit?.unitNumber ? `(Unit ${t.unit.unitNumber})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Start Date */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Start Date</label>
        <input
          type="date"
          value={filters.startDate || ''}
          onChange={(e) => onChange('startDate', e.target.value)}
          className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* End Date */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">End Date</label>
        <input
          type="date"
          value={filters.endDate || ''}
          onChange={(e) => onChange('endDate', e.target.value)}
          className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Status Filter */}
      {showStatusFilter && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => onChange('status', e.target.value)}
            className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Priority Filter */}
      {showPriorityFilter && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Priority</label>
          <select
            value={filters.priority || ''}
            onChange={(e) => onChange('priority', e.target.value)}
            className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            {priorityOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Payment Method Filter */}
      {showPaymentMethodFilter && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Payment Method</label>
          <select
            value={filters.paymentMethod || ''}
            onChange={(e) => onChange('paymentMethod', e.target.value)}
            className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Methods</option>
            {paymentMethodOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Search Filter */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Search</label>
        <input
          type="text"
          value={filters.search || ''}
          onChange={(e) => onChange('search', e.target.value)}
          placeholder="Search..."
          className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Unfilter Reset Button */}
      <div className="flex items-end">
        <button
          onClick={onReset}
          className="w-full h-10 px-4 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <FilterX className="w-4 h-4 text-slate-400" />
          Unfilter
        </button>
      </div>
    </div>
  );
};
export default ReportFilters;
