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
      : 'N/A';

    const leaseStatus = activeLease ? activeLease.status || 'Active' : isOccupied ? 'Active' : 'Vacant';
    const unitStatus = isOccupied ? 'Occupied' : effectiveUnitStatus === 'Occupied' ? 'Vacant' : effectiveUnitStatus;

    const marketRent = Number(u.rentAmount ?? 0);
    const actualRent = isOccupied ? Number(activeLease ? activeLease.rentAmount ?? marketRent : marketRent) : 0;
    const potentialRent = isOccupied ? actualRent : marketRent;
    const vacancyLoss = isOccupied ? 0 : marketRent;
    const securityDeposit = isOccupied
      ? Number(activeLease ? activeLease.depositAmount ?? u.securityDeposit ?? 0 : u.securityDeposit ?? 0)
      : 0;

    const startDate = activeLease?.startDate
      ? new Date(activeLease.startDate).toISOString().split('T')[0]
      : tenantObj?.moveInDate
      ? String(tenantObj.moveInDate).split('T')[0]
      : 'N/A';

    const endDate = activeLease?.endDate
      ? new Date(activeLease.endDate).toISOString().split('T')[0]
      : 'N/A';

    let daysToExpiry = 'N/A';
    let daysToExpiryNum: number | null = null;
    if (isOccupied && endDate !== 'N/A') {
      const endMs = new Date(endDate).getTime();
      if (!isNaN(endMs)) {
        const diffDays = Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24));
        daysToExpiryNum = diffDays;
        daysToExpiry = diffDays < 0 ? `Expired (${Math.abs(diffDays)}d ago)` : `${diffDays} days`;
      }
    }

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
      daysToExpiry,
      daysToExpiryNum,
      leaseStatus,
      potentialRent,
      monthlyRent: actualRent,
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
  } else if (params?.sortBy === 'potentialRent') {
    mappedItems.sort((a, b) => ((a.potentialRent || 0) - (b.potentialRent || 0)) * sortOrder);
  } else if (params?.sortBy === 'vacancyLoss') {
    mappedItems.sort((a, b) => ((a.vacancyLoss || 0) - (b.vacancyLoss || 0)) * sortOrder);
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
  const totalPotentialRent = mappedItems.reduce((sum, item) => sum + (item.potentialRent || 0), 0);
  const totalVacancyLoss = mappedItems.reduce((sum, item) => sum + (item.vacancyLoss || 0), 0);
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
  const emptyPL = {
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

  const [propertiesRes, unitsRes, tenantsRes, paymentsRes, invoicesRes, workOrdersRes, serviceReqsRes]: any[] =
    await Promise.all([
      apiClient.get('/properties').catch(() => ({ data: [] })),
      apiClient.get('/units').catch(() => ({ data: [] })),
      apiClient.get('/tenants').catch(() => ({ data: [] })),
      apiClient.get('/payments').catch(() => ({ data: [] })),
      apiClient.get('/invoices').catch(() => ({ data: [] })),
      apiClient.get('/work-orders').catch(() => ({ data: [] })),
      apiClient.get('/service-requests').catch(() => ({ data: [] })),
    ]);

  const unwrap = (res: any): any[] =>
    Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

  const softDeletedPropIds = new Set(getSoftDeletedIds('Property'));
  const softDeletedUnitIds = new Set(getSoftDeletedIds('Unit'));
  const softDeletedTenantIds = new Set(getSoftDeletedIds('Tenant'));
  const softDeletedLeaseIds = new Set(getSoftDeletedIds('Lease'));
  const softDeletedInvoiceIds = new Set(getSoftDeletedIds('Invoice'));
  const softDeletedPaymentIds = new Set([
    ...getSoftDeletedIds('Payment'),
    ...getSoftDeletedIds('RentPayment'),
  ]);
  const softDeletedWorkOrderIds = new Set(getSoftDeletedIds('WorkOrder'));
  const softDeletedServiceReqIds = new Set(getSoftDeletedIds('ServiceRequest'));

  // 1. Active isolated properties belonging to the logged-in manager
  const activeProps = unwrap(propertiesRes).filter(
    (p: any) =>
      p &&
      p.id &&
      !['Inactive', 'Deleted', 'Draft'].includes(p.status) &&
      !softDeletedPropIds.has(p.id) &&
      (!params?.propertyId || p.id === params.propertyId)
  );

  if (activeProps.length === 0) {
    return emptyPL;
  }

  const propMap = new Map<string, any>(activeProps.map((p: any) => [p.id, p]));

  // 2. Active non-deleted units belonging to active properties
  const activeUnits = unwrap(unitsRes).filter(
    (u: any) =>
      u &&
      u.id &&
      u.status !== 'Deleted' &&
      !softDeletedUnitIds.has(u.id) &&
      propMap.has(u.propertyId)
  );
  const activeUnitIds = new Set<string>(activeUnits.map((u: any) => u.id));
  const unitByIdMap = new Map<string, any>(activeUnits.map((u: any) => [u.id, u]));

  // 3. Active non-deleted tenants
  const activeTenants = unwrap(tenantsRes).filter(
    (t: any) =>
      t &&
      t.id &&
      !['Inactive', 'Deleted'].includes(t.status) &&
      !softDeletedTenantIds.has(t.id)
  );
  const activeTenantIds = new Set<string>(activeTenants.map((t: any) => t.id));
  const tenantByIdMap = new Map<string, any>(activeTenants.map((t: any) => [t.id, t]));
  const tenantByUnitIdMap = new Map<string, any>();
  activeTenants.forEach((t: any) => {
    const uId = t.unitId || t.unit?.id;
    if (uId && !tenantByUnitIdMap.has(uId)) {
      tenantByUnitIdMap.set(uId, t);
    }
  });

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
        (u: any) => u.propertyId === propId && normalizeUnitNum(u.unitNumber) === targetNum
      ) || null
    );
  };

  const getTenantDedupKey = (tenantId?: string | null, tenantName?: string | null, propId?: string | null) => {
    if (tenantId) return `id:${tenantId}`;
    return `name:${String(tenantName || '').trim().toLowerCase()}_${propId || ''}`;
  };

  const remainingPaymentCreditByTenant = new Map<string, number>();
  const allTransactions: any[] = [];

  // 4. Paid / PartiallyPaid Rent Payments
  unwrap(paymentsRes).forEach((p: any) => {
    if (!p || !p.id || softDeletedPaymentIds.has(p.id)) return;
    if (!propMap.has(p.propertyId)) return;
    if (p.leaseId && softDeletedLeaseIds.has(p.leaseId)) return;
    if (!['Paid', 'PartiallyPaid', 'Partially Paid'].includes(p.status)) return;
    if (p.referenceNumber && String(p.referenceNumber).toUpperCase().startsWith('REFUND-')) return;

    const resolvedUnitId = p.unitId || p.tenant?.unitId || null;
    if (resolvedUnitId && !activeUnitIds.has(resolvedUnitId)) return;
    if (p.tenantId && !activeTenantIds.has(p.tenantId)) return;
    if (p.tenant && ['Inactive', 'Deleted'].includes(p.tenant.status)) return;

    const amt = Number(p.amount || 0);
    if (amt <= 0) return;

    const tenantObj = p.tenant || (p.tenantId ? tenantByIdMap.get(p.tenantId) : null);
    const tenantName = tenantObj
      ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim()
      : p.tenantName || '';
    const tKey = getTenantDedupKey(p.tenantId, tenantName, p.propertyId);
    remainingPaymentCreditByTenant.set(tKey, (remainingPaymentCreditByTenant.get(tKey) || 0) + amt);

    const dateObj = p.paidDate || p.dueDate;
    const dateStr = dateObj ? new Date(dateObj).toISOString().split('T')[0] : 'N/A';
    const unitObj = resolvedUnitId ? unitByIdMap.get(resolvedUnitId) : null;
    const rawUnitNum = p.unit?.unitNumber || unitObj?.unitNumber || p.unitNumber || '';

    allTransactions.push({
      id: p.id,
      date: dateStr,
      description: `Rent payment - ${tenantName || 'Tenant'}`,
      propertyId: p.propertyId,
      unitId: resolvedUnitId || '',
      tenantId: p.tenantId || '',
      tenantName: tenantName || 'N/A',
      propertyName: p.property?.name || propMap.get(p.propertyId)?.name || 'Property',
      unitNumber: formatUnitDisplay(rawUnitNum),
      category: 'Rental Revenue',
      type: 'Income',
      amount: Number(amt.toFixed(2)),
    });
  });

  // 5. Paid / Partially Paid Invoices (Strictly deduplicated against RentPayments)
  unwrap(invoicesRes).forEach((inv: any) => {
    if (!inv || !inv.id || softDeletedInvoiceIds.has(inv.id)) return;
    if (!propMap.has(inv.propertyId)) return;
    if (!['Paid', 'Partially Paid', 'PartiallyPaid'].includes(inv.status)) return;
    if (inv.tenantId && inv.tenantId !== 'default' && !activeTenantIds.has(inv.tenantId)) return;

    const tenantObj = inv.tenantId ? tenantByIdMap.get(inv.tenantId) : null;
    const matchedUnit =
      (tenantObj?.unitId ? unitByIdMap.get(tenantObj.unitId) : null) ||
      resolveUnitFromPropAndNumber(inv.propertyId, inv.unitNumber);

    if (tenantObj?.unitId && !activeUnitIds.has(tenantObj.unitId)) return;
    if (inv.unitNumber && !matchedUnit) return;

    const notesLower = String(inv.notes || '').toLowerCase();
    const lineItemsLower = String(
      typeof inv.lineItems === 'string' ? inv.lineItems : JSON.stringify(inv.lineItems || '')
    ).toLowerCase();
    if (
      (notesLower.includes('security deposit') || lineItemsLower.includes('security_deposit')) &&
      !notesLower.includes('rent') &&
      !lineItemsLower.includes('"rent"')
    ) {
      return;
    }

    const rawPaidAmt = Number(
      inv.paidAmount > 0 ? inv.paidAmount : inv.status === 'Paid' ? inv.amount : 0
    );
    if (rawPaidAmt <= 0) return;

    const tenantName =
      inv.tenantName ||
      (tenantObj ? `${tenantObj.firstName || ''} ${tenantObj.lastName || ''}`.trim() : '');
    const tKey = getTenantDedupKey(inv.tenantId, tenantName, inv.propertyId);
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
      propertyId: inv.propertyId,
      unitId: matchedUnit?.id || tenantObj?.unitId || '',
      tenantId: inv.tenantId || '',
      tenantName: tenantName || 'N/A',
      propertyName: propMap.get(inv.propertyId)?.name || inv.propertyName || 'Property',
      unitNumber: formatUnitDisplay(matchedUnit?.unitNumber || inv.unitNumber),
      category: 'Rental Revenue',
      type: 'Income',
      amount: Number(unaccountedAmt.toFixed(2)),
    });
  });

  // 6. Completed / Closed Work Orders & Service Requests ONLY (never Open / In Progress)
  const seenExpenseIds = new Set<string>();

  unwrap(workOrdersRes).forEach((wo: any) => {
    if (!wo || !wo.id || seenExpenseIds.has(wo.id) || softDeletedWorkOrderIds.has(wo.id) || softDeletedServiceReqIds.has(wo.id)) return;
    if (!propMap.has(wo.propertyId)) return;
    const st = String(wo.status || '').toLowerCase().replace(/[\s_-]/g, '');
    if (st !== 'completed' && st !== 'closed') return;

    const baseActual = Number(wo.actualCost ?? wo.labourCost ?? wo.cost ?? 0);
    const extra = Number(wo.extraExpenses || 0) + Number(wo.materialsCost || 0);
    const cost = baseActual + extra > 0 ? baseActual + extra : Number(wo.estimatedCost || 0);
    if (cost <= 0) return;

    const matchedUnit = resolveUnitFromPropAndNumber(wo.propertyId, wo.unitNumber);
    if (matchedUnit && softDeletedUnitIds.has(matchedUnit.id)) return;
    seenExpenseIds.add(wo.id);

    const unitTenant = matchedUnit ? tenantByUnitIdMap.get(matchedUnit.id) : null;
    const unitTenantName = unitTenant
      ? `${unitTenant.firstName || ''} ${unitTenant.lastName || ''}`.trim()
      : 'N/A';

    const categoryName = wo.vendor?.serviceType
      ? `Maintenance - ${wo.vendor.serviceType}`
      : 'Property Maintenance & Repairs';

    allTransactions.push({
      id: wo.id,
      date: wo.createdAt ? new Date(wo.createdAt).toISOString().split('T')[0] : 'N/A',
      description: wo.title || 'Completed Work Order',
      propertyId: wo.propertyId,
      unitId: matchedUnit?.id || '',
      tenantId: unitTenant?.id || '',
      tenantName: unitTenantName || 'N/A',
      propertyName: wo.property?.name || propMap.get(wo.propertyId)?.name || 'Property',
      unitNumber: formatUnitDisplay(matchedUnit?.unitNumber || wo.unitNumber),
      category: categoryName,
      type: 'Expense',
      amount: Number(cost.toFixed(2)),
    });
  });

  unwrap(serviceReqsRes).forEach((sr: any) => {
    if (!sr || !sr.id || seenExpenseIds.has(sr.id) || softDeletedServiceReqIds.has(sr.id)) return;
    if (!propMap.has(sr.propertyId)) return;
    const st = String(sr.status || '').toLowerCase().replace(/[\s_-]/g, '');
    if (st !== 'completed' && st !== 'closed') return;
    if (sr.tenantId && softDeletedTenantIds.has(sr.tenantId)) return;

    const matchedUnit = resolveUnitFromPropAndNumber(sr.propertyId, sr.unitNumber);
    if (matchedUnit && softDeletedUnitIds.has(matchedUnit.id)) return;

    const baseActual = Number(sr.labourCost || sr.cost || 0);
    const extra = Number(sr.extraExpenses || 0);
    const cost = baseActual + extra > 0 ? baseActual + extra : Number(sr.estimatedCost || 0);
    if (cost <= 0) return;

    seenExpenseIds.add(sr.id);

    const unitTenant = matchedUnit ? tenantByUnitIdMap.get(matchedUnit.id) : null;
    const resolvedTenantId = sr.tenantId || unitTenant?.id || '';
    const resolvedTenantName =
      sr.tenantName ||
      (unitTenant ? `${unitTenant.firstName || ''} ${unitTenant.lastName || ''}`.trim() : 'N/A');

    const categoryName =
      sr.category && sr.category !== 'General'
        ? `Maintenance - ${sr.category}`
        : 'Property Maintenance & Repairs';

    allTransactions.push({
      id: sr.id,
      date: sr.createdAt ? new Date(sr.createdAt).toISOString().split('T')[0] : 'N/A',
      description: sr.title || 'Completed Service Request',
      propertyId: sr.propertyId,
      unitId: matchedUnit?.id || '',
      tenantId: resolvedTenantId,
      tenantName: resolvedTenantName || 'N/A',
      propertyName: propMap.get(sr.propertyId)?.name || sr.propertyName || 'Property',
      unitNumber: formatUnitDisplay(matchedUnit?.unitNumber || sr.unitNumber),
      category: categoryName,
      type: 'Expense',
      amount: Number(cost.toFixed(2)),
    });
  });

  // Sort transactions by date descending
  allTransactions.sort((a, b) => {
    const dateA = a.date && a.date !== 'N/A' ? new Date(a.date).getTime() : 0;
    const dateB = b.date && b.date !== 'N/A' ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  const incomeMap: Record<string, number> = {};
  const expensesMap: Record<string, number> = {};

  allTransactions.forEach((t) => {
    const amt = Number(t.amount || 0);
    const cat = t.category || (t.type === 'Income' ? 'Rental Revenue' : 'Property Maintenance & Repairs');
    if (t.type === 'Income') {
      incomeMap[cat] = Number(((incomeMap[cat] || 0) + amt).toFixed(2));
    } else if (t.type === 'Expense') {
      expensesMap[cat] = Number(((expensesMap[cat] || 0) + amt).toFixed(2));
    }
  });

  const income = Object.keys(incomeMap).map((k) => ({ name: k, amount: incomeMap[k] }));
  const expenses = Object.keys(expensesMap).map((k) => ({ name: k, amount: expensesMap[k] }));
  const totalIncome = Number(income.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2));
  const totalExpenses = Number(expenses.reduce((acc, curr) => acc + curr.amount, 0).toFixed(2));
  const netProfit = Number((totalIncome - totalExpenses).toFixed(2));

  return {
    data: {
      income,
      expenses,
      transactions: allTransactions,
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
      },
    },
    transactions: allTransactions,
    summary: {
      totalIncome,
      totalExpenses,
      netProfit,
    },
    pagination: {
      page: 1,
      limit: allTransactions.length || 50,
      totalRecords: allTransactions.length,
      totalPages: allTransactions.length > 0 ? 1 : 0,
    },
  };
};

export const reportApi = {
  getRentRoll: async (params: any): Promise<ReportResponse<RentRollItem>> => {
    if (!hasHealedOrphanLeases) {
      await buildRentRollFallback(params).catch(() => {});
    }
    try {
      const res: any = await apiClient.get(`/reports/rent-roll${buildQuery(params)}`);
      if (res && Array.isArray(res.data)) {
        const softDeletedUnitIds = getSoftDeletedIds('Unit');
        const softDeletedPropIds = getSoftDeletedIds('Property');
        const softDeletedTenantIds = getSoftDeletedIds('Tenant');
        const softDeletedLeaseIds = getSoftDeletedIds('Lease');

        const filteredData = res.data.filter((item: any) => {
          if (!item) return false;
          if (item.unitId && softDeletedUnitIds.includes(item.unitId)) return false;
          if (item.propertyId && softDeletedPropIds.includes(item.propertyId)) return false;
          if (item.leaseId && softDeletedLeaseIds.includes(item.leaseId)) return false;
          if (item.tenantId && softDeletedTenantIds.includes(item.tenantId)) return false;
          return true;
        });

        return {
          ...res,
          data: filteredData,
        };
      }
      return await buildRentRollFallback(params);
    } catch (err) {
      console.warn('Rent roll endpoint failed, using units/tenants fallback:', err);
      return await buildRentRollFallback(params);
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
    return await buildProfitLossFallback(params);
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
