import { apiClient } from '../../../api/client';
import { getSoftDeletedIds } from '../../../api';
import { ReportResponse, RentRollItem, OccupancyItem, DelinquencyItem, ProfitLossData, MaintenanceItem, PaymentHistoryItem, ExportHistoryItem } from '../types/report.types';

const buildQuery = (params: any): string => {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.append(key, String(val));
    }
  });
  const str = searchParams.toString();
  return str ? `?${str}` : '';
};

let hasHealedOrphanLeases = false;

const buildRentRollFallback = async (params: any = {}): Promise<ReportResponse<RentRollItem>> => {
  const [unitsRes, tenantsRes, propertiesRes]: any[] = await Promise.all([
    apiClient.get('/units').catch(() => ({ data: [] })),
    apiClient.get('/tenants').catch(() => ({ data: [] })),
    apiClient.get('/properties').catch(() => ({ data: [] })),
  ]);

  const softDeletedUnitIds = getSoftDeletedIds('Unit');
  const softDeletedPropIds = getSoftDeletedIds('Property');
  const softDeletedTenantIds = getSoftDeletedIds('Tenant');
  const softDeletedLeaseIds = getSoftDeletedIds('Lease');

  const rawUnits: any[] = Array.isArray(unitsRes?.data)
    ? unitsRes.data
    : Array.isArray(unitsRes)
    ? unitsRes
    : [];
  const rawTenants: any[] = Array.isArray(tenantsRes?.data)
    ? tenantsRes.data
    : Array.isArray(tenantsRes)
    ? tenantsRes
    : [];
  const rawProperties: any[] = Array.isArray(propertiesRes?.data)
    ? propertiesRes.data
    : Array.isArray(propertiesRes)
    ? propertiesRes
    : [];

  const propMap = new Map<string, any>();
  rawProperties.forEach((p: any) => {
    if (p?.id && !['Inactive', 'Deleted'].includes(p.status) && !softDeletedPropIds.includes(p.id)) {
      propMap.set(p.id, p);
    }
  });

  const isTenantValid = (t: any): boolean => {
    if (!t || !t.id) return false;
    if (softDeletedTenantIds.includes(t.id)) return false;
    if (['Inactive', 'Deleted'].includes(t.status)) return false;
    return true;
  };

  const tenantMap = new Map<string, any>();
  const unitTenantMap = new Map<string, any>();
  rawTenants.forEach((t: any) => {
    if (isTenantValid(t)) {
      tenantMap.set(t.id, t);
      if (t.unitId && !unitTenantMap.has(t.unitId)) {
        unitTenantMap.set(t.unitId, t);
      }
    }
  });
  rawUnits.forEach((u: any) => {
    if (Array.isArray(u?.tenants)) {
      u.tenants.forEach((t: any) => {
        if (isTenantValid(t)) {
          tenantMap.set(t.id, t);
          if (!unitTenantMap.has(u.id)) {
            unitTenantMap.set(u.id, t);
          }
        }
      });
    }
  });

  // Auto-heal any orphaned Active leases (where tenantId points to a deleted tenant)
  if (!hasHealedOrphanLeases) {
    hasHealedOrphanLeases = true;
    const activeLeases = rawUnits.flatMap((u: any) =>
      Array.isArray(u?.leases) ? u.leases.filter((l: any) => l && l.status === 'Active') : []
    );
    const suspectedOrphans = activeLeases.filter((l: any) => !l.tenantId || !tenantMap.has(l.tenantId));
    if (suspectedOrphans.length > 0) {
      await Promise.all(
        suspectedOrphans.map(async (l: any) => {
          let exists = false;
          if (l.tenantId && !softDeletedTenantIds.includes(l.tenantId)) {
            try {
              const tRes: any = await apiClient.get(`/tenants/${l.tenantId}`);
              const fetchedTenant = tRes?.data || tRes;
              if (isTenantValid(fetchedTenant)) {
                exists = true;
                tenantMap.set(l.tenantId, fetchedTenant);
              }
            } catch {
              exists = false;
            }
          }
          if (!exists) {
            l.status = 'Ended';
            l._isOrphaned = true;
            await apiClient.put(`/leases/${l.id}`, { status: 'Ended' }).catch(() => {});
            await apiClient
              .post('/restore-bin', { entityType: 'Lease', entityId: l.id, title: 'Orphaned Lease Cleanup' })
              .catch(() => {});
            await apiClient.delete(`/leases/${l.id}`).catch(() => {});
          }
        })
      );
    }
  }

  const validUnits = rawUnits.filter((u: any) => {
    if (!u || u.status === 'Deleted' || softDeletedUnitIds.includes(u.id)) return false;
    const propStatus = u.property?.status || propMap.get(u.propertyId)?.status;
    if (propStatus && ['Inactive', 'Deleted'].includes(propStatus)) return false;
    if (softDeletedPropIds.includes(u.propertyId)) return false;
    return true;
  });

  let mappedItems: any[] = validUnits.map((u: any) => {
    const rawUnitLeases = Array.isArray(u.leases) ? u.leases : [];
    const hadOrphanOrDeletedLease = rawUnitLeases.some(
      (l: any) => l._isOrphaned || softDeletedLeaseIds.includes(l.id) || !l.tenantId || !tenantMap.has(l.tenantId)
    );

    const validLeases = rawUnitLeases.filter(
      (l: any) =>
        l &&
        !l._isOrphaned &&
        !softDeletedLeaseIds.includes(l.id) &&
        !['Deleted', 'Terminated', 'Ended', 'Expired'].includes(l.status) &&
        l.tenantId &&
        tenantMap.has(l.tenantId)
    );

    const activeLease = validLeases.find((l: any) => l.status === 'Active') || validLeases[0] || null;
    const validUnitTenants = Array.isArray(u.tenants) ? u.tenants.filter(isTenantValid) : [];

    const tenantObj =
      (activeLease?.tenantId && tenantMap.get(activeLease.tenantId)) ||
      (validUnitTenants.length > 0 ? validUnitTenants[0] : null) ||
      unitTenantMap.get(u.id) ||
      null;

    const effectiveUnitStatus =
      !activeLease && !tenantObj && hadOrphanOrDeletedLease ? 'Vacant' : u.status || 'Vacant';

    const isOccupied =
      Boolean(activeLease && activeLease.status === 'Active') ||
      Boolean(tenantObj) ||
      effectiveUnitStatus === 'Occupied';

    const tenantName = tenantObj
      ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim()
      : isOccupied
      ? 'Tenant Assigned'
      : 'Vacant';

    const leaseStatus = activeLease ? activeLease.status || 'Active' : isOccupied ? 'Active' : 'Vacant';
    const unitStatus = isOccupied ? 'Occupied' : effectiveUnitStatus === 'Occupied' ? 'Vacant' : effectiveUnitStatus;

    const monthlyRent = Number(activeLease ? activeLease.rentAmount ?? u.rentAmount ?? 0 : u.rentAmount ?? 0);
    const securityDeposit = Number(
      activeLease ? activeLease.depositAmount ?? u.securityDeposit ?? 0 : u.securityDeposit ?? 0
    );

    const startDate = activeLease?.startDate
      ? new Date(activeLease.startDate).toISOString().split('T')[0]
      : tenantObj?.moveInDate
      ? String(tenantObj.moveInDate).split('T')[0]
      : 'N/A';

    const endDate = activeLease?.endDate
      ? new Date(activeLease.endDate).toISOString().split('T')[0]
      : 'N/A';

    const rawUnitNum = u.unitNumber ? String(u.unitNumber).trim() : '101';
    const unitNumber = rawUnitNum.toLowerCase().startsWith('unit') ? rawUnitNum : `Unit ${rawUnitNum}`;
    const propertyName = u.property?.name || propMap.get(u.propertyId)?.name || u.propertyName || 'Property';

    return {
      id: activeLease?.id || u.id,
      leaseId: activeLease?.id || null,
      propertyId: u.propertyId,
      unitId: u.id,
      tenantId: tenantObj?.id || activeLease?.tenantId || null,
      propertyName,
      unitNumber,
      tenantName,
      startDate,
      endDate,
      leaseStatus,
      monthlyRent,
      securityDeposit,
      unitStatus,
    };
  });

  // Apply filters
  if (params?.propertyId) {
    mappedItems = mappedItems.filter((item) => item.propertyId === params.propertyId);
  }
  if (params?.unitId) {
    mappedItems = mappedItems.filter((item) => item.unitId === params.unitId);
  }
  if (params?.tenantId) {
    mappedItems = mappedItems.filter((item) => item.tenantId === params.tenantId);
  }
  if (params?.status) {
    const ls = String(params.status).toLowerCase().trim();
    if (ls === 'active' || ls === 'occupied') {
      mappedItems = mappedItems.filter((item) => item.leaseStatus === 'Active' || item.unitStatus === 'Occupied');
    } else if (ls === 'vacant') {
      mappedItems = mappedItems.filter((item) => item.unitStatus === 'Vacant' && item.leaseStatus !== 'Active');
    } else if (ls !== 'all' && ls !== 'all statuses' && ls !== 'all_statuses') {
      mappedItems = mappedItems.filter(
        (item) =>
          String(item.leaseStatus).toLowerCase() === ls || String(item.unitStatus).toLowerCase() === ls
      );
    }
  }
  if (params?.search) {
    const q = String(params.search).toLowerCase().trim();
    mappedItems = mappedItems.filter(
      (item) =>
        String(item.propertyName).toLowerCase().includes(q) ||
        String(item.unitNumber).toLowerCase().includes(q) ||
        String(item.tenantName).toLowerCase().includes(q)
    );
  }

  // Sort
  const sortOrder = params?.sortOrder === 'desc' ? -1 : 1;
  if (params?.sortBy === 'monthlyRent' || params?.sortBy === 'rentAmount') {
    mappedItems.sort((a, b) => (a.monthlyRent - b.monthlyRent) * sortOrder);
  } else if (params?.sortBy === 'securityDeposit') {
    mappedItems.sort((a, b) => (a.securityDeposit - b.securityDeposit) * sortOrder);
  } else if (params?.sortBy === 'unitNumber') {
    mappedItems.sort((a, b) => String(a.unitNumber).localeCompare(String(b.unitNumber)) * sortOrder);
  } else {
    mappedItems.sort((a, b) => {
      const pCmp = String(a.propertyName).localeCompare(String(b.propertyName));
      if (pCmp !== 0) return pCmp;
      return String(a.unitNumber).localeCompare(String(b.unitNumber));
    });
  }

  const totalMonthlyRent = mappedItems.reduce((sum, item) => sum + (item.monthlyRent || 0), 0);
  const totalSecurityDeposits = mappedItems.reduce((sum, item) => sum + (item.securityDeposit || 0), 0);
  const occupiedCount = mappedItems.filter(
    (item) => item.unitStatus === 'Occupied' || item.leaseStatus === 'Active'
  ).length;
  const vacantCount = Math.max(0, mappedItems.length - occupiedCount);

  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 25;
  const totalRecords = mappedItems.length;
  const totalPages = Math.ceil(totalRecords / limit) || (totalRecords > 0 ? 1 : 0);
  const skip = (page - 1) * limit;
  const paginatedData = mappedItems.slice(skip, skip + limit);

  return {
    data: paginatedData,
    summary: {
      totalMonthlyRent,
      totalSecurityDeposits,
      occupiedCount,
      vacantCount,
      totalUnits: totalRecords,
    },
    pagination: {
      page,
      limit,
      totalRecords,
      totalPages,
    },
  };
};

export const reportApi = {
  getRentRoll: async (params: any): Promise<ReportResponse<RentRollItem>> => {
    const cleanData = await buildRentRollFallback(params);
    if (cleanData.data.length > 0 || hasHealedOrphanLeases) {
      return cleanData;
    }
    try {
      const res: any = await apiClient.get(`/reports/rent-roll${buildQuery(params)}`);
      if (res && Array.isArray(res.data)) {
        return res;
      }
      return cleanData;
    } catch (err) {
      console.warn('Rent roll endpoint failed, using units/tenants fallback:', err);
      return cleanData;
    }
  },

  getOccupancy: async (params: any): Promise<ReportResponse<OccupancyItem>> => {
    const res: any = await apiClient.get(`/reports/occupancy${buildQuery(params)}`);
    return res;
  },

  getDelinquency: async (params: any): Promise<ReportResponse<DelinquencyItem>> => {
    const res: any = await apiClient.get(`/reports/delinquency${buildQuery(params)}`);
    return res;
  },

  getProfitLoss: async (params: any): Promise<{ data: ProfitLossData }> => {
    const res: any = await apiClient.get(`/reports/profit-loss${buildQuery(params)}`);
    return res;
  },

  getMaintenance: async (params: any): Promise<ReportResponse<MaintenanceItem>> => {
    const res: any = await apiClient.get(`/reports/maintenance${buildQuery(params)}`);
    return res;
  },

  getPaymentHistory: async (params: any): Promise<ReportResponse<PaymentHistoryItem>> => {
    const res: any = await apiClient.get(`/reports/payment-history${buildQuery(params)}`);
    return res;
  },

  getExports: async (params: any): Promise<ReportResponse<ExportHistoryItem>> => {
    const res: any = await apiClient.get(`/reports/exports${buildQuery(params)}`);
    return res;
  },

  triggerExport: async (data: { reportType: string; filters: any; fileName: string; fileType: string }): Promise<ExportHistoryItem> => {
    const res: any = await apiClient.post('/reports/exports', data);
    return res;
  },
};
