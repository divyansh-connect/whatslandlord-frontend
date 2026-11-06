import { apiClient } from '../../../api/client';
import { api, getSoftDeletedIds } from '../../../api';
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
    if (p?.id && !['Inactive', 'Deleted', 'Draft'].includes(p.status) && !softDeletedPropIds.includes(p.id)) {
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
    if (propStatus && ['Inactive', 'Deleted', 'Draft'].includes(propStatus)) return false;
    if (propMap.size > 0 && u.propertyId && !propMap.has(u.propertyId)) return false;
    if (softDeletedPropIds.includes(u.propertyId)) return false;
    return true;
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

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
        l.status !== 'Deleted' &&
        l.tenantId &&
        tenantMap.has(l.tenantId)
    );

    const activeLease = validLeases.find((l: any) => l.status === 'Active') || null;
    const displayLease = activeLease || (params?.status && validLeases.length > 0 ? validLeases[0] : null);

    const validUnitTenants = Array.isArray(u.tenants) ? u.tenants.filter(isTenantValid) : [];

    const tenantObj =
      (displayLease?.tenantId && tenantMap.get(displayLease.tenantId)) ||
      (validUnitTenants.length > 0 ? validUnitTenants[0] : null) ||
      unitTenantMap.get(u.id) ||
      null;

    const effectiveUnitStatus =
      !activeLease && !tenantObj && hadOrphanOrDeletedLease ? 'Vacant' : u.status || 'Vacant';

    // Strict Occupancy Rule: Must have an Active Lease OR (Unit is marked Occupied AND has an Active Tenant)
    const isOccupied =
      Boolean(activeLease && activeLease.status === 'Active') ||
      (effectiveUnitStatus === 'Occupied' && Boolean(tenantObj));

    const tenantName =
      isOccupied && tenantObj
        ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() || 'N/A'
        : displayLease && tenantObj
        ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() || 'N/A'
        : 'N/A';

    const leaseStatus = activeLease
      ? 'Active'
      : displayLease?.status
      ? displayLease.status
      : isOccupied
      ? 'Active'
      : 'Vacant';

    const unitStatus = isOccupied ? 'Occupied' : effectiveUnitStatus === 'Occupied' ? 'Vacant' : effectiveUnitStatus;

    const unitMarketRent = Number(u.rentAmount ?? 0);
    const activeRent = Number(activeLease ? activeLease.rentAmount ?? unitMarketRent : unitMarketRent);

    const potentialRent = isOccupied ? activeRent : unitMarketRent;
    const monthlyRent = isOccupied ? activeRent : 0;
    const vacancyLoss = isOccupied ? 0 : unitMarketRent;
    const securityDeposit = isOccupied
      ? Number(activeLease ? activeLease.depositAmount ?? u.securityDeposit ?? 0 : u.securityDeposit ?? 0)
      : 0;

    const startDate = displayLease?.startDate
      ? new Date(displayLease.startDate).toISOString().split('T')[0]
      : isOccupied && tenantObj?.moveInDate
      ? String(tenantObj.moveInDate).split('T')[0]
      : 'N/A';

    const endDate = displayLease?.endDate
      ? new Date(displayLease.endDate).toISOString().split('T')[0]
      : 'N/A';

    let daysToExpiry = 'N/A';
    let daysToExpiryNum: number | null = null;
    if (endDate !== 'N/A' && (isOccupied || displayLease?.status === 'Expired')) {
      const endD = new Date(endDate);
      endD.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((endD.getTime() - todayMs) / (1000 * 60 * 60 * 24));
      daysToExpiryNum = diffDays;
      if (diffDays < 0) {
        daysToExpiry = `Expired (${Math.abs(diffDays)}d ago)`;
      } else if (diffDays === 0) {
        daysToExpiry = 'Expires Today';
      } else {
        daysToExpiry = `${diffDays} Days`;
      }
    }

    const rawUnitNum = u.unitNumber ? String(u.unitNumber).trim() : '101';
    const unitNumber = rawUnitNum.toLowerCase().startsWith('unit') ? rawUnitNum : `Unit ${rawUnitNum}`;
    const propertyName = u.property?.name || propMap.get(u.propertyId)?.name || u.propertyName || 'Property';

    return {
      id: displayLease?.id || u.id,
      leaseId: displayLease?.id || null,
      propertyId: u.propertyId,
      unitId: u.id,
      tenantId: tenantObj?.id || displayLease?.tenantId || null,
      propertyName,
      unitNumber,
      tenantName,
      startDate,
      endDate,
      daysToExpiry,
      daysToExpiryNum,
      leaseStatus,
      potentialRent,
      monthlyRent,
      vacancyLoss,
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
          String(item.leaseStatus).toLowerCase().replace(/[\s_-]/g, '') === ls.replace(/[\s_-]/g, '') ||
          String(item.unitStatus).toLowerCase().replace(/[\s_-]/g, '') === ls.replace(/[\s_-]/g, '')
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
  } else if (params?.sortBy === 'potentialRent') {
    mappedItems.sort((a, b) => (a.potentialRent - b.potentialRent) * sortOrder);
  } else if (params?.sortBy === 'vacancyLoss') {
    mappedItems.sort((a, b) => (a.vacancyLoss - b.vacancyLoss) * sortOrder);
  } else if (params?.sortBy === 'securityDeposit') {
    mappedItems.sort((a, b) => (a.securityDeposit - b.securityDeposit) * sortOrder);
  } else if (params?.sortBy === 'daysToExpiry') {
    mappedItems.sort((a, b) => {
      const valA = a.daysToExpiryNum !== null && a.daysToExpiryNum !== undefined ? a.daysToExpiryNum : 999999;
      const valB = b.daysToExpiryNum !== null && b.daysToExpiryNum !== undefined ? b.daysToExpiryNum : 999999;
      return (valA - valB) * sortOrder;
    });
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
  const totalPotentialRent = mappedItems.reduce((sum, item) => sum + (item.potentialRent || 0), 0);
  const totalVacancyLoss = mappedItems.reduce((sum, item) => sum + (item.vacancyLoss || 0), 0);
  const totalSecurityDeposits = mappedItems.reduce((sum, item) => sum + (item.securityDeposit || 0), 0);
  const occupiedCount = mappedItems.filter(
    (item) => item.unitStatus === 'Occupied' || item.leaseStatus === 'Active'
  ).length;
  const vacantCount = Math.max(0, mappedItems.length - occupiedCount);

  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 50;
  const totalRecords = mappedItems.length;
  const totalPages = Math.ceil(totalRecords / limit) || (totalRecords > 0 ? 1 : 0);
  const skip = (page - 1) * limit;
  const paginatedData = mappedItems.slice(skip, skip + limit);

  return {
    data: paginatedData,
    summary: {
      totalMonthlyRent,
      totalPotentialRent,
      totalVacancyLoss,
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

const buildProfitLossFallback = async (params: any = {}): Promise<any> => {
  const [
    propertiesRes,
    unitsRes,
    tenantsRes,
    paymentsRes,
    invoicesRes,
    workOrdersRes,
    serviceRequestsRes,
  ]: any[] = await Promise.all([
    apiClient.get('/properties').catch(() => ({ data: [] })),
    apiClient.get('/units').catch(() => ({ data: [] })),
    apiClient.get('/tenants').catch(() => ({ data: [] })),
    apiClient.get('/payments').catch(() => ({ data: [] })),
    apiClient.get('/invoices').catch(() => ({ data: [] })),
    apiClient.get('/work-orders').catch(() => ({ data: [] })),
    apiClient.get('/service-requests').catch(() => ({ data: [] })),
  ]);

  const extractArray = (res: any): any[] =>
    Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

  const softDeletedPropIds = new Set(getSoftDeletedIds('Property'));
  const softDeletedUnitIds = new Set(getSoftDeletedIds('Unit'));
  const softDeletedTenantIds = new Set(getSoftDeletedIds('Tenant'));
  const softDeletedLeaseIds = new Set(getSoftDeletedIds('Lease'));
  const softDeletedPaymentIds = new Set(getSoftDeletedIds('Payment'));
  const softDeletedInvoiceIds = new Set(getSoftDeletedIds('Invoice'));
  const softDeletedWorkOrderIds = new Set(getSoftDeletedIds('WorkOrder'));
  const softDeletedServiceReqIds = new Set(getSoftDeletedIds('ServiceRequest'));

  const rawProperties = extractArray(propertiesRes);
  const rawUnits = extractArray(unitsRes);
  const rawTenants = extractArray(tenantsRes);
  const rawPayments = extractArray(paymentsRes);
  const rawInvoices = extractArray(invoicesRes);
  const rawWorkOrders = extractArray(workOrdersRes);
  const rawServiceRequests = extractArray(serviceRequestsRes);

  const activePropMap = new Map<string, any>();
  rawProperties.forEach((p: any) => {
    if (!p || !p.id) return;
    if (softDeletedPropIds.has(p.id)) return;
    if (['Inactive', 'Deleted', 'Draft'].includes(p.status)) return;
    if (params?.propertyId && p.id !== params.propertyId) return;
    activePropMap.set(p.id, p);
  });

  const emptyResult = {
    data: {
      income: [],
      expenses: [],
      transactions: [],
      summary: { totalIncome: 0, totalExpenses: 0, netProfit: 0 },
    },
    transactions: [],
    summary: { totalIncome: 0, totalExpenses: 0, netProfit: 0 },
    pagination: { page: 1, limit: 50, totalRecords: 0, totalPages: 0 },
  };

  if (activePropMap.size === 0) {
    return emptyResult;
  }

  const activeUnits = rawUnits.filter((u: any) => {
    if (!u || !u.id || u.status === 'Deleted' || softDeletedUnitIds.has(u.id)) return false;
    const pId = u.propertyId || u.property?.id;
    return pId && activePropMap.has(pId);
  });
  const activeUnitIds = new Set<string>(activeUnits.map((u: any) => u.id));
  const unitByIdMap = new Map<string, any>(activeUnits.map((u: any) => [u.id, u]));

  const activeTenants = rawTenants.filter((t: any) => {
    if (!t || !t.id || softDeletedTenantIds.has(t.id)) return false;
    if (['Inactive', 'Deleted'].includes(t.status)) return false;
    return true;
  });
  const activeTenantIds = new Set<string>(activeTenants.map((t: any) => t.id));
  const activeTenantByIdMap = new Map<string, any>(activeTenants.map((t: any) => [t.id, t]));

  const normalizeUnitNum = (val?: string | null) =>
    String(val || '')
      .toLowerCase()
      .replace(/^unit\s*/i, '')
      .trim();

  const formatUnitDisplay = (val?: string | null) => {
    const raw = String(val || '').trim();
    if (!raw) return 'N/A';
    return raw.toLowerCase().startsWith('unit') ? raw : `Unit ${raw}`;
  };

  const resolveUnitFromPropAndNumber = (propId?: string | null, unitNumber?: string | null) => {
    if (!propId || !unitNumber) return null;
    const targetNum = normalizeUnitNum(unitNumber);
    if (!targetNum) return null;
    return (
      activeUnits.find(
        (u: any) =>
          (u.propertyId === propId || u.property?.id === propId) &&
          normalizeUnitNum(u.unitNumber) === targetNum
      ) || null
    );
  };

  const getTenantDedupKey = (tenantId?: string | null, tenantName?: string | null, propId?: string | null) => {
    if (tenantId) return `id:${tenantId}`;
    return `name:${String(tenantName || '').trim().toLowerCase()}_${propId || ''}`;
  };

  const remainingPaymentCreditByTenant = new Map<string, number>();
  const allTransactions: any[] = [];

  // 1. Paid / PartiallyPaid Rent Payments
  rawPayments.forEach((p: any) => {
    if (!p || !p.id || softDeletedPaymentIds.has(p.id)) return;
    if (p.leaseId && softDeletedLeaseIds.has(p.leaseId)) return;
    const pStatus = String(p.status || '').toLowerCase().replace(/[\s_-]/g, '');
    if (pStatus !== 'paid' && pStatus !== 'partiallypaid') return;

    if (p.referenceNumber && String(p.referenceNumber).toUpperCase().startsWith('REFUND-')) {
      return;
    }

    const propId = p.propertyId || p.property?.id || p.unit?.propertyId || '';
    if (!propId || !activePropMap.has(propId)) return;

    const resolvedTenantId = p.tenantId || p.tenant?.id || '';
    if (!resolvedTenantId || !activeTenantIds.has(resolvedTenantId)) return;
    if (p.tenant && ['Inactive', 'Deleted'].includes(p.tenant.status)) return;

    const tenantObj = activeTenantByIdMap.get(resolvedTenantId) || p.tenant;
    if (!tenantObj) return;

    const resolvedUnitId = p.unitId || p.unit?.id || tenantObj?.unitId || '';
    const matchedUnit =
      (resolvedUnitId ? unitByIdMap.get(resolvedUnitId) : null) ||
      resolveUnitFromPropAndNumber(propId, p.unit?.unitNumber || p.unitNumber);

    if (!matchedUnit || !activeUnitIds.has(matchedUnit.id)) return;
    if (tenantObj.unitId && tenantObj.unitId !== matchedUnit.id) return;

    const amt = Number(p.amount || 0);
    if (amt <= 0) return;

    const tenantName =
      (tenantObj ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() : '') ||
      p.tenantName ||
      '';

    const tKey = getTenantDedupKey(resolvedTenantId, tenantName, propId);
    remainingPaymentCreditByTenant.set(tKey, (remainingPaymentCreditByTenant.get(tKey) || 0) + amt);

    const rawDate = p.paidDate || p.date || p.dueDate;
    const dateStr = rawDate ? new Date(rawDate).toISOString().split('T')[0] : 'N/A';
    const rawUnitNum = matchedUnit.unitNumber || p.unit?.unitNumber || p.unitNumber || '';

    allTransactions.push({
      id: p.id,
      date: dateStr,
      description: `Rent payment - ${tenantName || 'Tenant'}`,
      propertyId: propId,
      unitId: matchedUnit.id,
      tenantId: resolvedTenantId,
      tenantName: tenantName || 'N/A',
      propertyName: activePropMap.get(propId)?.name || p.property?.name || p.propertyName || 'Property',
      unitNumber: formatUnitDisplay(rawUnitNum),
      category: 'Rental Revenue',
      type: 'Income',
      amount: amt,
    });
  });

  // 2. Paid / Partially Paid Invoices (deduplicated against RentPayment receipts)
  rawInvoices.forEach((inv: any) => {
    if (!inv || !inv.id || softDeletedInvoiceIds.has(inv.id)) return;
    const invStatus = String(inv.status || '').toLowerCase().replace(/[\s_-]/g, '');
    if (invStatus !== 'paid' && invStatus !== 'partiallypaid') return;

    const propId = inv.propertyId || inv.property?.id || '';
    if (!propId || !activePropMap.has(propId)) return;

    const resolvedTenantId = inv.tenantId && inv.tenantId !== 'default' ? inv.tenantId : '';
    if (!resolvedTenantId || !activeTenantIds.has(resolvedTenantId)) return;

    const tenantObj = activeTenantByIdMap.get(resolvedTenantId);
    if (!tenantObj) return;

    const matchedUnit =
      (inv.unitId ? unitByIdMap.get(inv.unitId) : null) ||
      (tenantObj?.unitId ? unitByIdMap.get(tenantObj.unitId) : null) ||
      resolveUnitFromPropAndNumber(propId, inv.unitNumber);

    if (!matchedUnit || !activeUnitIds.has(matchedUnit.id)) return;
    if (tenantObj.unitId && tenantObj.unitId !== matchedUnit.id) return;

    const notesLower = String(inv.notes || '').toLowerCase();
    const lineItemsLower = String(inv.lineItems || '').toLowerCase();
    if (
      (notesLower.includes('security deposit') || lineItemsLower.includes('security_deposit')) &&
      !notesLower.includes('rent') &&
      !lineItemsLower.includes('"rent"')
    ) {
      return;
    }

    const rawPaidAmt = Number(
      inv.paidAmount > 0 ? inv.paidAmount : invStatus === 'paid' ? inv.amount : 0
    );
    if (rawPaidAmt <= 0) return;

    const tenantName =
      inv.tenantName ||
      (tenantObj ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() : '');
    const tKey = getTenantDedupKey(resolvedTenantId, tenantName, propId);
    const availableCredit = remainingPaymentCreditByTenant.get(tKey) || 0;

    if (availableCredit >= rawPaidAmt) {
      remainingPaymentCreditByTenant.set(tKey, availableCredit - rawPaidAmt);
      return;
    }

    const unaccountedAmt = rawPaidAmt - availableCredit;
    remainingPaymentCreditByTenant.set(tKey, 0);
    if (unaccountedAmt <= 0.01) return;

    const dateStr = inv.dueDate
      ? String(inv.dueDate).includes('T')
        ? String(inv.dueDate).split('T')[0]
        : String(inv.dueDate)
      : inv.createdAt
      ? new Date(inv.createdAt).toISOString().split('T')[0]
      : 'N/A';

    allTransactions.push({
      id: inv.id,
      date: dateStr,
      description: `Rent payment - ${tenantName || 'Tenant'}`,
      propertyId: propId,
      unitId: matchedUnit?.id || tenantObj?.unitId || '',
      tenantId: resolvedTenantId,
      tenantName: tenantName || 'N/A',
      propertyName: activePropMap.get(propId)?.name || inv.propertyName || 'Property',
      unitNumber: formatUnitDisplay(matchedUnit?.unitNumber || inv.unitNumber),
      category: 'Rental Revenue',
      type: 'Income',
      amount: Number(unaccountedAmt.toFixed(2)),
    });
  });

  // 3. Completed / Closed Work Orders & Service Requests as Operating Expenses
  const seenExpenseIds = new Set<string>();

  rawWorkOrders.forEach((wo: any) => {
    if (!wo || !wo.id || seenExpenseIds.has(wo.id) || softDeletedWorkOrderIds.has(wo.id)) return;
    const st = String(wo.status || '').toLowerCase().replace(/[\s_-]/g, '');
    if (st !== 'completed' && st !== 'closed') return;

    const propId = wo.propertyId || wo.property?.id || '';
    if (!propId || !activePropMap.has(propId)) return;

    const baseActual = Number(wo.actualCost ?? wo.labourCost ?? wo.cost ?? 0);
    const extra = Number(wo.extraExpenses || 0) + Number(wo.materialsCost || 0);
    const cost = baseActual + extra > 0 ? baseActual + extra : Number(wo.estimatedCost || 0);
    if (cost <= 0) return;

    const matchedUnit =
      (wo.unitId ? unitByIdMap.get(wo.unitId) : null) ||
      resolveUnitFromPropAndNumber(propId, wo.unitNumber);

    if (wo.unitId && (!activeUnitIds.has(wo.unitId) || softDeletedUnitIds.has(wo.unitId))) return;
    if (!wo.unitId && wo.unitNumber && !matchedUnit) return;

    seenExpenseIds.add(wo.id);
    const rawDate = wo.completedAt || wo.scheduledDate || wo.createdAt;
    const dateStr = rawDate ? new Date(rawDate).toISOString().split('T')[0] : 'N/A';

    allTransactions.push({
      id: wo.id,
      date: dateStr,
      description: `${wo.issue || wo.title || 'Maintenance'} - ${wo.vendorName || wo.vendor?.companyName || 'Staff'}`,
      propertyId: propId,
      unitId: matchedUnit?.id || wo.unitId || '',
      tenantId: wo.tenantId || '',
      propertyName: activePropMap.get(propId)?.name || wo.property?.name || wo.propertyName || 'Property',
      unitNumber: formatUnitDisplay(matchedUnit?.unitNumber || wo.unitNumber),
      category: 'Property Maintenance & Repairs',
      type: 'Expense',
      amount: cost,
    });
  });

  rawServiceRequests.forEach((sr: any) => {
    if (!sr || !sr.id || seenExpenseIds.has(sr.id) || softDeletedServiceReqIds.has(sr.id)) return;
    const st = String(sr.status || '').toLowerCase().replace(/[\s_-]/g, '');
    if (st !== 'completed' && st !== 'closed') return;

    const propId = sr.propertyId || sr.property?.id || '';
    if (!propId || !activePropMap.has(propId)) return;

    const baseActual = Number(sr.actualCost ?? sr.labourCost ?? sr.cost ?? 0);
    const extra = Number(sr.extraExpenses || 0) + Number(sr.materialsCost || 0);
    const cost = baseActual + extra > 0 ? baseActual + extra : Number(sr.estimatedCost || 0);
    if (cost <= 0) return;

    const matchedUnit =
      (sr.unitId ? unitByIdMap.get(sr.unitId) : null) ||
      resolveUnitFromPropAndNumber(propId, sr.unitNumber);

    if (sr.unitId && (!activeUnitIds.has(sr.unitId) || softDeletedUnitIds.has(sr.unitId))) return;
    if (!sr.unitId && sr.unitNumber && !matchedUnit) return;

    seenExpenseIds.add(sr.id);
    const rawDate = sr.completedAt || sr.scheduledDate || sr.createdAt;
    const dateStr = rawDate ? new Date(rawDate).toISOString().split('T')[0] : 'N/A';

    allTransactions.push({
      id: sr.id,
      date: dateStr,
      description: `${sr.issue || sr.title || 'Service Request'} - ${sr.vendorName || sr.assignedTo || 'Staff'}`,
      propertyId: propId,
      unitId: matchedUnit?.id || sr.unitId || '',
      tenantId: sr.tenantId || '',
      propertyName: activePropMap.get(propId)?.name || sr.propertyName || 'Property',
      unitNumber: formatUnitDisplay(matchedUnit?.unitNumber || sr.unitNumber),
      category: 'Property Maintenance & Repairs',
      type: 'Expense',
      amount: cost,
    });
  });

  allTransactions.sort((a, b) => {
    const dateA = a.date && a.date !== 'N/A' ? new Date(a.date).getTime() : 0;
    const dateB = b.date && b.date !== 'N/A' ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  const totalIncome = allTransactions
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpenses = allTransactions
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netProfit = totalIncome - totalExpenses;

  const incomeCategories = totalIncome > 0 ? [{ name: 'Rental Revenue', amount: totalIncome }] : [];
  const expenseCategories =
    totalExpenses > 0 ? [{ name: 'Property Maintenance & Repairs', amount: totalExpenses }] : [];

  return {
    data: {
      income: incomeCategories,
      expenses: expenseCategories,
      transactions: allTransactions,
      summary: { totalIncome, totalExpenses, netProfit },
    },
    transactions: allTransactions,
    summary: { totalIncome, totalExpenses, netProfit },
    pagination: {
      page: 1,
      limit: allTransactions.length || 50,
      totalRecords: allTransactions.length,
      totalPages: allTransactions.length > 0 ? 1 : 0,
    },
  };
};

const buildDelinquencyFallback = async (params: any = {}): Promise<ReportResponse<DelinquencyItem>> => {
  const [propertiesRes, unitsRes, tenantsRes, reconciledInvoices]: any[] = await Promise.all([
    apiClient.get('/properties').catch(() => ({ data: [] })),
    apiClient.get('/units').catch(() => ({ data: [] })),
    apiClient.get('/tenants').catch(() => ({ data: [] })),
    api.invoices.getAll().catch(() => []),
  ]);

  const extractArr = (res: any) => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
  const rawProperties = extractArr(propertiesRes);
  const rawUnits = extractArr(unitsRes);
  const rawTenants = extractArr(tenantsRes);
  const rawInvoices = Array.isArray(reconciledInvoices) ? reconciledInvoices : extractArr(reconciledInvoices);

  const softDeletedPropIds = new Set(getSoftDeletedIds('Property'));
  const softDeletedUnitIds = new Set(getSoftDeletedIds('Unit'));
  const softDeletedTenantIds = new Set(getSoftDeletedIds('Tenant'));
  const softDeletedInvoiceIds = new Set(getSoftDeletedIds('Invoice'));

  const activePropMap = new Map<string, any>();
  rawProperties.forEach((p: any) => {
    if (p?.id && !['Inactive', 'Deleted', 'Draft'].includes(p.status) && !softDeletedPropIds.has(p.id)) {
      activePropMap.set(p.id, p);
    }
  });

  const activeUnits = rawUnits.filter(
    (u: any) => u?.id && !softDeletedUnitIds.has(u.id) && activePropMap.has(u.propertyId || u.property?.id)
  );
  const activeUnitIds = new Set<string>(activeUnits.map((u: any) => u.id));
  const unitByIdMap = new Map<string, any>(activeUnits.map((u: any) => [u.id, u]));

  const activeTenants = rawTenants.filter(
    (t: any) => t?.id && !softDeletedTenantIds.has(t.id) && !['Inactive', 'Deleted'].includes(t.status)
  );
  rawUnits.forEach((u: any) => {
    if (Array.isArray(u?.tenants)) {
      u.tenants.forEach((t: any) => {
        if (
          t?.id &&
          !softDeletedTenantIds.has(t.id) &&
          !['Inactive', 'Deleted'].includes(t.status) &&
          !activeTenants.some((at: any) => at.id === t.id)
        ) {
          activeTenants.push(t);
        }
      });
    }
  });
  const activeTenantIds = new Set<string>(activeTenants.map((t: any) => t.id));
  const activeTenantByIdMap = new Map<string, any>(activeTenants.map((t: any) => [t.id, t]));

  const normalizeUnitNum = (val?: string | null) =>
    String(val || '')
      .toLowerCase()
      .replace(/^unit\s*/i, '')
      .trim();

  const formatUnitDisplay = (val?: string | null) => {
    const raw = String(val || '').trim();
    if (!raw) return 'N/A';
    return raw.toLowerCase().startsWith('unit') ? raw : `Unit ${raw}`;
  };

  const resolveUnitFromPropAndNumber = (propId?: string | null, unitNumber?: string | null) => {
    if (!propId || !unitNumber) return null;
    const targetNum = normalizeUnitNum(unitNumber);
    if (!targetNum) return null;
    return (
      activeUnits.find(
        (u: any) =>
          (u.propertyId === propId || u.property?.id === propId) &&
          normalizeUnitNum(u.unitNumber) === targetNum
      ) || null
    );
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const data: DelinquencyItem[] = [];

  rawInvoices.forEach((inv: any) => {
    if (!inv || !inv.id || softDeletedInvoiceIds.has(inv.id)) return;

    const propId = inv.propertyId || inv.property?.id || '';
    if (!propId || !activePropMap.has(propId)) return;

    const resolvedTenantId = inv.tenantId && inv.tenantId !== 'default' ? inv.tenantId : '';
    if (!resolvedTenantId || !activeTenantIds.has(resolvedTenantId)) return;

    const tenantObj = activeTenantByIdMap.get(resolvedTenantId);
    if (!tenantObj) return;

    const matchedUnit =
      (inv.unitId ? unitByIdMap.get(inv.unitId) : null) ||
      (tenantObj?.unitId ? unitByIdMap.get(tenantObj.unitId) : null) ||
      resolveUnitFromPropAndNumber(propId, inv.unitNumber);

    if (!matchedUnit || !activeUnitIds.has(matchedUnit.id)) return;
    if (tenantObj.unitId && tenantObj.unitId !== matchedUnit.id) return;

    const rentAmount = Number(inv.amount || 0);
    const paidAmount = Number(inv.paidAmount || 0);
    const outstandingBalance = Math.max(
      0,
      Number(inv.balance !== undefined && inv.balance !== null ? inv.balance : rentAmount - paidAmount)
    );

    const statusLower = String(inv.status || '').toLowerCase().replace(/[\s_-]/g, '');
    if (statusLower === 'cancelled' || statusLower === 'void') return;
    if ((statusLower === 'paid' || statusLower === 'cleared') && outstandingBalance <= 0.01) return;
    if (outstandingBalance <= 0.01) return;

    // Detect Late Fee amount on this invoice (from lineItems or excess over unit base rent)
    let lateFeeAmount = 0;
    try {
      const parsedItems =
        typeof inv.lineItems === 'string'
          ? JSON.parse(inv.lineItems)
          : Array.isArray(inv.lineItems)
          ? inv.lineItems
          : [];
      if (Array.isArray(parsedItems)) {
        parsedItems.forEach((li: any) => {
          if (String(li?.description || '').toLowerCase().includes('late fee')) {
            lateFeeAmount += Number(li?.amount || 0);
          }
        });
      }
    } catch {
      // ignore JSON parse errors
    }
    const unitBaseRent = Number(matchedUnit?.rentAmount || 0);
    if (lateFeeAmount <= 0 && unitBaseRent > 0 && rentAmount > unitBaseRent) {
      lateFeeAmount = Number((rentAmount - unitBaseRent).toFixed(2));
    }
    const baseRentAmount = Math.max(0, rentAmount - lateFeeAmount);

    const dueDateStr = inv.dueDate
      ? String(inv.dueDate).includes('T')
        ? String(inv.dueDate).split('T')[0]
        : String(inv.dueDate)
      : 'N/A';

    let daysLate = 0;
    if (dueDateStr && dueDateStr !== 'N/A') {
      const dueD = new Date(`${dueDateStr}T00:00:00`);
      if (!isNaN(dueD.getTime()) && todayMs > dueD.getTime()) {
        daysLate = Math.floor((todayMs - dueD.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    let paymentStatus = 'Overdue';
    if (paidAmount > 0 && outstandingBalance > 0) {
      paymentStatus = 'Partially Paid';
    } else if (daysLate > 0 || statusLower === 'overdue') {
      paymentStatus = 'Overdue';
    } else {
      paymentStatus = 'Unpaid';
    }

    const tenantName =
      (tenantObj ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() : '') ||
      inv.tenantName ||
      'N/A';

    data.push({
      id: inv.id,
      invoiceId: inv.id,
      tenantId: resolvedTenantId,
      propertyId: propId,
      unitId: matchedUnit.id,
      tenantName,
      propertyName: activePropMap.get(propId)?.name || inv.propertyName || 'Property',
      unitNumber: formatUnitDisplay(matchedUnit.unitNumber || inv.unitNumber),
      dueDate: dueDateStr,
      rentAmount,
      baseRentAmount,
      lateFeeAmount,
      paidAmount,
      outstandingBalance,
      daysLate,
      paymentStatus,
    } as any);
  });

  const sortBy = params.sortBy || 'dueDate';
  const dir = params.sortOrder === 'asc' ? 1 : -1;
  data.sort((a: any, b: any) => {
    if (sortBy === 'rentAmount' || sortBy === 'paidAmount' || sortBy === 'outstandingBalance' || sortBy === 'daysLate') {
      return (Number(a[sortBy] || 0) - Number(b[sortBy] || 0)) * dir;
    }
    if (sortBy === 'tenantName' || sortBy === 'propertyName' || sortBy === 'unitNumber' || sortBy === 'paymentStatus') {
      return String(a[sortBy] || '').localeCompare(String(b[sortBy] || '')) * dir;
    }
    const dA = a.dueDate && a.dueDate !== 'N/A' ? new Date(a.dueDate).getTime() : 0;
    const dB = b.dueDate && b.dueDate !== 'N/A' ? new Date(b.dueDate).getTime() : 0;
    return (dA - dB) * dir;
  });

  const totalDelinquentBalance = data.reduce((sum, i) => sum + Number(i.outstandingBalance || 0), 0);
  const totalOriginalAmount = data.reduce((sum, i) => sum + Number(i.rentAmount || 0), 0);
  const totalDelinquentTenants = new Set(
    data.map((i: any) => i.tenantId || i.tenantName).filter(Boolean)
  ).size;
  const totalDelinquentInvoices = data.length;
  const averageDaysLate =
    data.length > 0
      ? Math.round(data.reduce((sum, i) => sum + Number(i.daysLate || 0), 0) / data.length)
      : 0;

  return {
    data,
    summary: {
      totalDelinquentBalance,
      totalOriginalAmount,
      totalDelinquentTenants,
      totalDelinquentInvoices,
      averageDaysLate,
    },
    pagination: {
      page: 1,
      limit: data.length || 50,
      totalRecords: data.length,
      totalPages: data.length > 0 ? 1 : 0,
    },
  } as any;
};

const buildPaymentHistoryFallback = async (params: any = {}): Promise<ReportResponse<PaymentHistoryItem>> => {
  const [propertiesRes, unitsRes, tenantsRes, paymentsRes, reconciledInvoices]: any[] = await Promise.all([
    apiClient.get('/properties').catch(() => ({ data: [] })),
    apiClient.get('/units').catch(() => ({ data: [] })),
    apiClient.get('/tenants').catch(() => ({ data: [] })),
    apiClient.get('/payments').catch(() => ({ data: [] })),
    api.invoices.getAll().catch(() => []),
  ]);

  const extractArr = (res: any) => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
  const rawProperties = extractArr(propertiesRes);
  const rawUnits = extractArr(unitsRes);
  const rawTenants = extractArr(tenantsRes);
  const rawPayments = extractArr(paymentsRes);
  const rawInvoices = Array.isArray(reconciledInvoices) ? reconciledInvoices : extractArr(reconciledInvoices);

  const softDeletedPropIds = new Set(getSoftDeletedIds('Property'));
  const softDeletedUnitIds = new Set(getSoftDeletedIds('Unit'));
  const softDeletedTenantIds = new Set(getSoftDeletedIds('Tenant'));
  const softDeletedLeaseIds = new Set(getSoftDeletedIds('Lease'));
  const softDeletedPaymentIds = new Set(getSoftDeletedIds('Payment'));
  const softDeletedInvoiceIds = new Set(getSoftDeletedIds('Invoice'));

  const activePropMap = new Map<string, any>();
  rawProperties.forEach((p: any) => {
    if (p?.id && !['Inactive', 'Deleted', 'Draft'].includes(p.status) && !softDeletedPropIds.has(p.id)) {
      activePropMap.set(p.id, p);
    }
  });

  const activeUnits = rawUnits.filter(
    (u: any) => u?.id && !softDeletedUnitIds.has(u.id) && activePropMap.has(u.propertyId || u.property?.id)
  );
  const activeUnitIds = new Set<string>(activeUnits.map((u: any) => u.id));
  const unitByIdMap = new Map<string, any>(activeUnits.map((u: any) => [u.id, u]));

  const activeTenants = rawTenants.filter(
    (t: any) => t?.id && !softDeletedTenantIds.has(t.id) && !['Inactive', 'Deleted'].includes(t.status)
  );
  rawUnits.forEach((u: any) => {
    if (Array.isArray(u?.tenants)) {
      u.tenants.forEach((t: any) => {
        if (
          t?.id &&
          !softDeletedTenantIds.has(t.id) &&
          !['Inactive', 'Deleted'].includes(t.status) &&
          !activeTenants.some((at: any) => at.id === t.id)
        ) {
          activeTenants.push(t);
        }
      });
    }
  });
  const activeTenantIds = new Set<string>(activeTenants.map((t: any) => t.id));
  const activeTenantByIdMap = new Map<string, any>(activeTenants.map((t: any) => [t.id, t]));

  const normalizeUnitNum = (val?: string | null) =>
    String(val || '')
      .toLowerCase()
      .replace(/^unit\s*/i, '')
      .trim();

  const formatUnitDisplay = (val?: string | null) => {
    const raw = String(val || '').trim();
    if (!raw) return 'N/A';
    return raw.toLowerCase().startsWith('unit') ? raw : `Unit ${raw}`;
  };

  const resolveUnitFromPropAndNumber = (propId?: string | null, unitNumber?: string | null) => {
    if (!propId || !unitNumber) return null;
    const targetNum = normalizeUnitNum(unitNumber);
    if (!targetNum) return null;
    return (
      activeUnits.find(
        (u: any) =>
          (u.propertyId === propId || u.property?.id === propId) &&
          normalizeUnitNum(u.unitNumber) === targetNum
      ) || null
    );
  };

  const getTenantDedupKey = (tenantId?: string | null, tenantName?: string | null, propId?: string | null) => {
    if (tenantId) return `id:${tenantId}`;
    return `name:${String(tenantName || '').trim().toLowerCase()}_${propId || ''}`;
  };

  const remainingPaymentCreditByTenant = new Map<string, number>();
  const data: PaymentHistoryItem[] = [];

  // 1. Real RentPayment transactions
  rawPayments.forEach((p: any, idx: number) => {
    if (!p || !p.id || softDeletedPaymentIds.has(p.id)) return;
    if (p.leaseId && softDeletedLeaseIds.has(p.leaseId)) return;
    if (p.referenceNumber && String(p.referenceNumber).toUpperCase().startsWith('REFUND-')) return;

    const propId = p.propertyId || p.property?.id || p.unit?.propertyId || '';
    if (!propId || !activePropMap.has(propId)) return;

    const resolvedTenantId = p.tenantId || p.tenant?.id || '';
    if (!resolvedTenantId || !activeTenantIds.has(resolvedTenantId)) return;
    if (p.tenant && ['Inactive', 'Deleted'].includes(p.tenant.status)) return;

    const tenantObj = activeTenantByIdMap.get(resolvedTenantId) || p.tenant;
    if (!tenantObj) return;

    const resolvedUnitId = p.unitId || p.unit?.id || tenantObj?.unitId || '';
    const matchedUnit =
      (resolvedUnitId ? unitByIdMap.get(resolvedUnitId) : null) ||
      resolveUnitFromPropAndNumber(propId, p.unit?.unitNumber || p.unitNumber);

    if (!matchedUnit || !activeUnitIds.has(matchedUnit.id)) return;
    if (tenantObj.unitId && tenantObj.unitId !== matchedUnit.id) return;

    const amt = Number(p.amount || 0);
    if (amt <= 0) return;

    const tenantName =
      (tenantObj ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() : '') ||
      p.tenantName ||
      'N/A';

    const pStatusNorm = String(p.status || '').toLowerCase().replace(/[\s_-]/g, '');
    const pMethodRaw = String(p.paymentMethod || p.method || 'Offline');
    const isPartial =
      pStatusNorm === 'partiallypaid' ||
      pStatusNorm === 'partial' ||
      pMethodRaw.toLowerCase().includes('partial');

    let displayStatus = 'Paid';
    if (isPartial) {
      displayStatus = 'Partially Paid';
    } else if (pStatusNorm === 'paid' || pStatusNorm === 'cleared' || pStatusNorm === 'completed' || !pStatusNorm) {
      displayStatus = 'Paid';
    } else {
      displayStatus = p.status;
    }

    if (displayStatus === 'Paid' || displayStatus === 'Partially Paid') {
      const tKey = getTenantDedupKey(resolvedTenantId, tenantName, propId);
      remainingPaymentCreditByTenant.set(tKey, (remainingPaymentCreditByTenant.get(tKey) || 0) + amt);
    }

    const displayMethod =
      pMethodRaw === 'Offline_Partial'
        ? 'Offline (Partial)'
        : pMethodRaw;

    const rawDate = p.paidDate || p.date || p.dueDate || p.createdAt;
    const paymentDate = rawDate
      ? String(rawDate).includes('T')
        ? String(rawDate).split('T')[0]
        : new Date(rawDate).toISOString().split('T')[0]
      : 'N/A';

    const rawUnitNum = matchedUnit.unitNumber || p.unit?.unitNumber || p.unitNumber || '';

    data.push({
      id: p.id,
      paymentId: p.id,
      tenantId: resolvedTenantId,
      propertyId: propId,
      unitId: matchedUnit.id,
      receiptNo: `#${idx + 1}`,
      tenantName,
      propertyName: activePropMap.get(propId)?.name || p.property?.name || p.propertyName || 'Property',
      unitNumber: formatUnitDisplay(rawUnitNum),
      paymentDate,
      amount: amt,
      paymentMethod: displayMethod,
      referenceNumber: p.referenceNumber || `#REF-${1001 + idx}`,
      paymentStatus: displayStatus,
    } as any);
  });

  // 2. Paid / Partially Paid Invoices not already covered by RentPayment records
  rawInvoices.forEach((inv: any, idx: number) => {
    if (!inv || !inv.id || softDeletedInvoiceIds.has(inv.id)) return;
    const invStatus = String(inv.status || '').toLowerCase().replace(/[\s_-]/g, '');
    if (invStatus !== 'paid' && invStatus !== 'partiallypaid') return;

    const propId = inv.propertyId || inv.property?.id || '';
    if (!propId || !activePropMap.has(propId)) return;

    const resolvedTenantId = inv.tenantId && inv.tenantId !== 'default' ? inv.tenantId : '';
    if (!resolvedTenantId || !activeTenantIds.has(resolvedTenantId)) return;

    const tenantObj = activeTenantByIdMap.get(resolvedTenantId);
    if (!tenantObj) return;

    const matchedUnit =
      (inv.unitId ? unitByIdMap.get(inv.unitId) : null) ||
      (tenantObj?.unitId ? unitByIdMap.get(tenantObj.unitId) : null) ||
      resolveUnitFromPropAndNumber(propId, inv.unitNumber);

    if (!matchedUnit || !activeUnitIds.has(matchedUnit.id)) return;
    if (tenantObj.unitId && tenantObj.unitId !== matchedUnit.id) return;

    const notesLower = String(inv.notes || '').toLowerCase();
    const lineItemsLower = String(inv.lineItems || '').toLowerCase();
    if (
      (notesLower.includes('security deposit') || lineItemsLower.includes('security_deposit')) &&
      !notesLower.includes('rent') &&
      !lineItemsLower.includes('"rent"')
    ) {
      return;
    }

    const rawPaidAmt = Number(
      inv.paidAmount > 0 ? inv.paidAmount : invStatus === 'paid' ? inv.amount : 0
    );
    if (rawPaidAmt <= 0) return;

    const tenantName =
      inv.tenantName ||
      (tenantObj ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() : '') ||
      'N/A';

    const tKey = getTenantDedupKey(resolvedTenantId, tenantName, propId);
    const availableCredit = remainingPaymentCreditByTenant.get(tKey) || 0;

    if (availableCredit >= rawPaidAmt) {
      remainingPaymentCreditByTenant.set(tKey, availableCredit - rawPaidAmt);
      return;
    }

    const unaccountedAmt = rawPaidAmt - availableCredit;
    remainingPaymentCreditByTenant.set(tKey, 0);
    if (unaccountedAmt <= 0.01) return;

    const paymentDate = inv.dueDate
      ? String(inv.dueDate).includes('T')
        ? String(inv.dueDate).split('T')[0]
        : String(inv.dueDate)
      : inv.createdAt
      ? new Date(inv.createdAt).toISOString().split('T')[0]
      : 'N/A';

    data.push({
      id: inv.id,
      paymentId: inv.id,
      invoiceId: inv.id,
      tenantId: resolvedTenantId,
      propertyId: propId,
      unitId: matchedUnit?.id || tenantObj?.unitId || inv.unitId || '',
      receiptNo: `#INV-${1001 + idx}`,
      tenantName,
      propertyName: activePropMap.get(propId)?.name || inv.propertyName || 'Property',
      unitNumber: formatUnitDisplay(matchedUnit?.unitNumber || inv.unitNumber),
      paymentDate,
      amount: Number(unaccountedAmt.toFixed(2)),
      paymentMethod: invStatus === 'partiallypaid' ? 'Offline (Partial)' : 'Offline',
      referenceNumber: inv.invoiceNumber || `#INV-${String(inv.id).slice(0, 6).toUpperCase()}`,
      paymentStatus: invStatus === 'partiallypaid' ? 'Partially Paid' : 'Paid',
    } as any);
  });

  const sortBy = params.sortBy || 'paymentDate';
  const dir = params.sortOrder === 'asc' ? 1 : -1;
  data.sort((a: any, b: any) => {
    if (sortBy === 'amount') {
      return (Number(a.amount || 0) - Number(b.amount || 0)) * dir;
    }
    if (
      sortBy === 'tenantName' ||
      sortBy === 'propertyName' ||
      sortBy === 'unitNumber' ||
      sortBy === 'paymentMethod' ||
      sortBy === 'referenceNumber' ||
      sortBy === 'paymentStatus'
    ) {
      return String(a[sortBy] || '').localeCompare(String(b[sortBy] || '')) * dir;
    }
    const dA = a.paymentDate && a.paymentDate !== 'N/A' ? new Date(a.paymentDate).getTime() : 0;
    const dB = b.paymentDate && b.paymentDate !== 'N/A' ? new Date(b.paymentDate).getTime() : 0;
    return (dA - dB) * dir;
  });

  const paidRows = data.filter((p: any) =>
    ['Paid', 'Partially Paid', 'PartiallyPaid', 'Cleared', 'Completed'].includes(p.paymentStatus)
  );
  const totalCollectedAmount = paidRows.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalTransactions = data.length;
  const averageTransaction = totalTransactions > 0 ? Math.round(totalCollectedAmount / totalTransactions) : 0;

  return {
    data,
    summary: {
      totalCollectedAmount,
      totalTransactions,
      averageTransaction,
    },
    pagination: {
      page: 1,
      limit: data.length || 50,
      totalRecords: data.length,
      totalPages: data.length > 0 ? 1 : 0,
    },
  } as any;
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
    try {
      return await buildDelinquencyFallback(params);
    } catch (err) {
      console.warn('Delinquency calculation fallback error, trying direct endpoint:', err);
      const res: any = await apiClient.get(`/reports/delinquency${buildQuery(params)}`);
      return res;
    }
  },

  getProfitLoss: async (params: any): Promise<{ data: ProfitLossData }> => {
    try {
      return await buildProfitLossFallback(params);
    } catch (err) {
      console.warn('Profit & Loss calculation fallback error, trying direct endpoint:', err);
      const res: any = await apiClient.get(`/reports/profit-loss${buildQuery(params)}`);
      return res;
    }
  },

  getMaintenance: async (params: any): Promise<ReportResponse<MaintenanceItem>> => {
    const res: any = await apiClient.get(`/reports/maintenance${buildQuery(params)}`);
    return res;
  },

  getPaymentHistory: async (params: any): Promise<ReportResponse<PaymentHistoryItem>> => {
    try {
      return await buildPaymentHistoryFallback(params);
    } catch (err) {
      console.warn('Payment History calculation fallback error, trying direct endpoint:', err);
      const res: any = await apiClient.get(`/reports/payment-history${buildQuery(params)}`);
      return res;
    }
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
