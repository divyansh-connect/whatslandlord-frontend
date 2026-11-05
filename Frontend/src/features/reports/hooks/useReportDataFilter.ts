import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../api';
import { ReportFiltersState } from '../types/report.types';

export const useReportDataFilter = (reportItems: any[], filters: ReportFiltersState) => {
  // Query properties
  const { data: propertiesData = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });
  const properties = Array.isArray(propertiesData) ? propertiesData : [];

  // Query units
  const { data: unitsData = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => api.unit.getAll(),
  });
  const units = Array.isArray(unitsData) ? unitsData : [];

  // Query tenants
  const { data: tenantsData = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.tenant.getAll(),
  });
  const tenants = Array.isArray(tenantsData) ? tenantsData : [];

  // Find selected entities from dropdown values
  const selectedProperty = useMemo(
    () => properties.find((p: any) => p.id === filters.propertyId),
    [properties, filters.propertyId]
  );

  const selectedUnit = useMemo(
    () => units.find((u: any) => u.id === filters.unitId),
    [units, filters.unitId]
  );

  const selectedTenant = useMemo(
    () => tenants.find((t: any) => t.id === filters.tenantId),
    [tenants, filters.tenantId]
  );

  const filteredItems = useMemo(() => {
    if (!Array.isArray(reportItems)) return [];

    return reportItems.filter((item: any) => {
      if (!item) return false;

      // 1. Property Filter
      if (filters.propertyId) {
        const itemPropId = item.propertyId || item.property?.id;
        const targetPropName = selectedProperty?.name?.toLowerCase().trim();
        const itemPropName = (item.propertyName || item.property?.name)?.toLowerCase().trim();

        const idMatches = itemPropId && itemPropId === filters.propertyId;
        const nameMatches = targetPropName && itemPropName && (
          itemPropName === targetPropName ||
          itemPropName.includes(targetPropName) ||
          targetPropName.includes(itemPropName)
        );

        if (!idMatches && !nameMatches) {
          return false;
        }
      }

      // 2. Unit Filter
      if (filters.unitId) {
        const itemUnitId = item.unitId || item.unit?.id;
        const targetUnitNum = selectedUnit?.unitNumber?.toString().toLowerCase().replace(/^unit\s*/i, '').trim();
        const itemUnitNum = (item.unitNumber || item.unit?.unitNumber)?.toString().toLowerCase().replace(/^unit\s*/i, '').trim();

        const idMatches = itemUnitId && itemUnitId === filters.unitId;
        const numMatches = targetUnitNum && itemUnitNum && (
          itemUnitNum === targetUnitNum ||
          itemUnitNum.endsWith(targetUnitNum) ||
          targetUnitNum.endsWith(itemUnitNum)
        );

        if (!idMatches && !numMatches) {
          return false;
        }
      }

      // 3. Tenant Filter
      if (filters.tenantId) {
        const itemTenantId = item.tenantId || item.tenant?.id;
        const targetTenantName = selectedTenant
          ? `${selectedTenant.firstName || ''} ${selectedTenant.lastName || ''}`.toLowerCase().trim()
          : '';
        const itemTenantName = (
          item.tenantName ||
          (item.tenant ? `${item.tenant.firstName || ''} ${item.tenant.lastName || ''}` : '')
        )?.toLowerCase().trim();

        const idMatches = itemTenantId && itemTenantId === filters.tenantId;
        const nameMatches = targetTenantName && itemTenantName && (
          itemTenantName === targetTenantName ||
          itemTenantName.includes(targetTenantName) ||
          targetTenantName.includes(itemTenantName)
        );

        if (!idMatches && !nameMatches) {
          return false;
        }
      }

      // 4. Status Filter
      if (filters.status) {
        const statusVal = item.status || item.leaseStatus || item.unitStatus || item.paymentStatus;
        if (statusVal) {
          const sv = String(statusVal).toLowerCase().replace(/[\s_-]/g, '');
          const fv = String(filters.status).toLowerCase().replace(/[\s_-]/g, '');
          if (sv !== fv && !sv.includes(fv) && !fv.includes(sv)) {
            return false;
          }
        }
      }

      // 5. Priority Filter (Maintenance)
      if (filters.priority) {
        const priorityVal = item.priority;
        if (priorityVal && String(priorityVal).toLowerCase() !== String(filters.priority).toLowerCase()) {
          return false;
        }
      }

      // 6. Payment Method Filter (Payment History)
      if (filters.paymentMethod) {
        const methodVal = item.paymentMethod;
        if (methodVal && String(methodVal).toLowerCase() !== String(filters.paymentMethod).toLowerCase()) {
          return false;
        }
      }

      // 7. Search Filter
      if (filters.search) {
        const q = String(filters.search).toLowerCase().trim();
        const pName = String(item.propertyName || item.property?.name || '').toLowerCase();
        const uNum = String(item.unitNumber || item.unit?.unitNumber || '').toLowerCase();
        const tName = String(item.tenantName || (item.tenant ? `${item.tenant.firstName || ''} ${item.tenant.lastName || ''}` : '') || '').toLowerCase();
        const desc = String(item.description || item.title || item.notes || '').toLowerCase();
        const code = String(item.id || item.workOrderNumber || item.invoiceNumber || '').toLowerCase();

        const matchesSearch = pName.includes(q) || uNum.includes(q) || tName.includes(q) || desc.includes(q) || code.includes(q);
        if (!matchesSearch) return false;
      }

      // 8. Date Range Filter (startDate & endDate)
      if (filters.startDate || filters.endDate) {
        const itemStartDateStr = item.startDate && item.startDate !== 'N/A' ? item.startDate : null;
        const itemEndDateStr = item.endDate && item.endDate !== 'N/A' ? item.endDate : null;
        const itemGeneralDateStr = item.date || item.dueDate || item.paidDate || item.paymentDate || item.createdAt;
        const itemDateStr = itemGeneralDateStr && itemGeneralDateStr !== 'N/A' ? itemGeneralDateStr : null;

        if (!itemStartDateStr && !itemEndDateStr && !itemDateStr) {
          return false;
        }

        if (filters.startDate) {
          const filterStart = new Date(filters.startDate).getTime();
          const targetStart = itemStartDateStr ? new Date(itemStartDateStr).getTime() : (itemDateStr ? new Date(itemDateStr).getTime() : null);
          if (targetStart !== null && targetStart < filterStart) {
            return false;
          }
        }

        if (filters.endDate) {
          const filterEnd = new Date(filters.endDate);
          filterEnd.setHours(23, 59, 59, 999);
          const filterEndTime = filterEnd.getTime();

          const targetEnd = itemEndDateStr ? new Date(itemEndDateStr).getTime() : (itemDateStr ? new Date(itemDateStr).getTime() : (itemStartDateStr ? new Date(itemStartDateStr).getTime() : null));
          if (targetEnd !== null && targetEnd > filterEndTime) {
            return false;
          }
        }
      }

      return true;
    });
  }, [reportItems, filters, selectedProperty, selectedUnit, selectedTenant]);

  return filteredItems;
};
