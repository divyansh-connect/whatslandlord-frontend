import { useState, useCallback } from 'react';
import { ReportFiltersState } from '../types/report.types';

const initialFilters: ReportFiltersState = {
  propertyId: '',
  unitId: '',
  tenantId: '',
  ownerId: '',
  startDate: '',
  endDate: '',
  status: '',
  priority: '',
  search: '',
  paymentMethod: '',
  page: 1,
  limit: 25,
  sortBy: '',
  sortOrder: 'desc',
};

export const useReportFilters = (defaultSortBy = '') => {
  const [filters, setFilters] = useState<ReportFiltersState>({
    ...initialFilters,
    sortBy: defaultSortBy,
  });

  const setFilterVal = useCallback((key: keyof ReportFiltersState, value: any) => {
    setFilters((prev) => {
      const updated: any = {
        ...prev,
        [key]: value,
        // Reset page back to 1 when any search/filter key changes to prevent empty offsets
        ...(key !== 'page' && key !== 'limit' && key !== 'sortBy' && key !== 'sortOrder' ? { page: 1 } : {}),
      };

      // Cascade clear child filters when parent filter changes
      if (key === 'propertyId') {
        updated.unitId = '';
        updated.tenantId = '';
      } else if (key === 'unitId') {
        updated.tenantId = '';
      }

      return updated;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      ...initialFilters,
      sortBy: defaultSortBy,
    });
  }, [defaultSortBy]);

  return {
    filters,
    setFilterVal,
    resetFilters,
  };
};
