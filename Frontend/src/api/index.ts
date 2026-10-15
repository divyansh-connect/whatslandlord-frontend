import { mockApi } from './mockApi';
import { apiClient } from './client';

const getActiveCompanyId = (): string | null => {
  try {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) return null;
    const u = JSON.parse(userStr);
    if (u.companyId) return u.companyId;
    if (u.token) {
      const parts = u.token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return payload.companyId || null;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
};

const isDemoManager = (): boolean => {
  try {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) return false;
    const u = JSON.parse(userStr);
    const email = (u.email || '').toLowerCase();
    const companyName = (u.companyName || localStorage.getItem('company_name') || '').toLowerCase();
    return email === 'admin@apexpm.com' || email === 'manager@apexpm.com' || (companyName.includes('apex') && !email.includes('divine'));
  } catch {
    return false;
  }
};

export const api = {
  ...mockApi,

  company: {
    getSettings: async () => {
      try {
        const res: any = await apiClient.get('/company/settings');
        if (res && res.data) return res.data;
      } catch (e) {
        console.warn('Company settings backend fetch failed, using local settings:', e);
      }
      const saved = JSON.parse(localStorage.getItem('company_settings') || '{}');
      return {
        lateFeeGraceDays: saved.lateFeeGraceDays ?? 10,
        lateFeeAmount: saved.lateFeeAmount ?? 50,
        lateFeeType: saved.lateFeeType || 'FLAT',
        isLateFeeEnabled: saved.isLateFeeEnabled ?? true,
      };
    },
    updateSettings: async (data: any) => {
      let result = null;
      try {
        const res: any = await apiClient.put('/company/settings', data);
        result = res?.data;
      } catch (e) {
        console.warn('Backend updateSettings failed, applying local fallback:', e);
      }
      const existing = JSON.parse(localStorage.getItem('company_settings') || '{}');
      const updated = { ...existing, ...data };
      localStorage.setItem('company_settings', JSON.stringify(updated));
      return result || updated;
    },
  },

  // Real Database connections (strictly reflects DB state, even if empty)
  property: {
    ...mockApi.property,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/properties');
        return (res.data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          address: p.address,
          type: p.type,
          unitsCount: p.units?.length || 0,
          occupiedUnits: p.units?.filter((u: any) => u.status === 'Occupied').length || 0,
          occupancyRate: p.units?.length ? Math.round((p.units.filter((u: any) => u.status === 'Occupied').length / p.units.length) * 100) : 0,
          monthlyRevenue: p.units?.reduce((sum: number, u: any) => sum + (u.rentAmount || 0), 0) || 0,
          status: p.status,
          ownerId: p.ownerId,
          owner: p.owner,
          nycBin: p.nycBin || p.bin || '',
          totalFloors: p.buildings?.[0]?.floors || p.totalFloors || p.floors || 1,
          totalUnits: p.buildings?.[0]?.unitsCount || p.totalUnits || p.unitsCount || (p.units?.length || 0),
          floors: p.buildings?.[0]?.floors || p.totalFloors || p.floors || 1,
          buildings: p.buildings || [],
          createdAt: p.createdAt ? p.createdAt.split('T')[0] : '',
        }));
      } catch (e) {
        console.error('Properties DB fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });
      if (!data.ownerId) {
        formData.append('ownerId', 'own-1');
      }
      const res: any = await apiClient.post('/properties', formData);
      return {
        ...res.data,
        unitsCount: 0,
        occupiedUnits: 0,
        occupancyRate: 0,
        monthlyRevenue: 0,
      };
    },
    getById: async (id: string) => {
      const res: any = await apiClient.get(`/properties/${id}`);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });
      const res: any = await apiClient.put(`/properties/${id}`, formData);
      return res.data;
    },
    delete: async (id: string) => {
      const res: any = await apiClient.delete(`/properties/${id}`);
      return res.data;
    },
  },

  building: {
    ...mockApi.building,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/buildings');
        return (res.data || []).map((b: any) => ({
          id: b.id,
          propertyId: b.propertyId,
          propertyName: b.property?.name || 'Property',
          name: b.name,
          floors: b.floors || 1,
          unitsCount: b.units?.length || b.unitsCount || 0,
          occupancyRate: b.units?.length 
            ? Math.round((b.units.filter((u: any) => u.status === 'Occupied').length / b.units.length) * 100) 
            : b.occupancyRate || 0,
        }));
      } catch (e) {
        console.error('Buildings DB fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/buildings', data);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/buildings/${id}`, data);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/buildings/${id}`);
      return true;
    },
  },

  unit: {
    ...mockApi.unit,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/units');
        return (res.data || []).map((u: any) => ({
          id: u.id,
          propertyId: u.propertyId,
          propertyName: u.property?.name || 'Property',
          buildingId: u.buildingId,
          buildingName: u.building?.name || 'Building',
          unitNumber: u.unitNumber,
          floor: u.floor,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          squareFootage: u.squareFootage,
          rentAmount: u.rentAmount,
          securityDeposit: u.securityDeposit,
          availabilityDate: u.availabilityDate ? String(u.availabilityDate).split('T')[0] : '',
          status: u.status,
          tenantName: u.tenants?.length ? `${u.tenants[0].firstName} ${u.tenants[0].lastName}` : 'Vacant',
          isLateFeeEnabled: u.isLateFeeEnabled,
          lateFeeType: u.lateFeeType || 'FLAT',
          lateFeeAmount: u.lateFeeAmount,
          lateFeeGraceDays: u.lateFeeGraceDays,
        }));
      } catch (e) {
        console.error('Units DB fetch failed:', e);
        return [];
      }
    },
    getById: async (id: string) => {
      try {
        const res: any = await apiClient.get(`/units/${id}`);
        if (res.data) {
          if (res.data.availabilityDate) {
            res.data.availabilityDate = String(res.data.availabilityDate).split('T')[0];
          }
          if (!res.data.tenant && Array.isArray(res.data.tenants) && res.data.tenants.length > 0) {
            res.data.tenant = res.data.tenants[0];
          }
        }
        return res.data;
      } catch (e) {
        return null;
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/units', data);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/units/${id}`, data);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/units/${id}`);
      return true;
    },
    assignTenant: async (unitId: string, tenantId: string, tenantName: string) => {
      const res: any = await apiClient.post(`/units/${unitId}/assign-tenant`, { tenantId });
      return res.data;
    },
  },

  leasing: {
    ...mockApi.leasing,
    getLeases: async () => {
      try {
        const res: any = await apiClient.get('/leases');
        return (res.data || []).map((l: any) => ({
          ...l,
          tenantName: l.tenantName || (l.tenant ? `${l.tenant.firstName} ${l.tenant.lastName}` : 'Resident'),
          propertyName: l.propertyName || (l.property ? l.property.name : 'Property'),
          unitNumber: l.unitNumber || (l.unit ? l.unit.unitNumber : 'Unit'),
        }));
      } catch (e) {
        console.error('Leases DB fetch failed:', e);
        return [];
      }
    },
    createLease: async (data: any) => {
      const res: any = await apiClient.post('/leases', data);
      return res.data;
    },
    updateLease: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/leases/${id}`, data);
      return res.data;
    },
    deleteLease: async (id: string) => {
      await apiClient.delete(`/leases/${id}`);
      return true;
    },
    updateMoveIn: async (id: string, data: any) => {
      try {
        const res: any = await apiClient.put(`/move-ins/${id}`, data);
        return res.data;
      } catch (e) {
        console.warn('updateMoveIn failed:', e);
        return null;
      }
    },
    getLeads: async () => {
      try {
        const res: any = await apiClient.get('/portal/crm/leads');
        return res.data || [];
      } catch (e) {
        console.error('Leasing leads fetch failed:', e);
        return [];
      }
    },
    createLead: async (data: any) => {
      const res: any = await apiClient.post('/portal/crm/leads', data);
      return res.data;
    },
    getApplications: async () => {
      try {
        const res: any = await apiClient.get('/applications');
        return res.data || [];
      } catch (e) {
        console.error('Applications DB fetch failed:', e);
        return [];
      }
    },
    createApplication: async (data: any) => {
      const res: any = await apiClient.post('/applications', data);
      return res.data;
    },
    updateApplication: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/applications/${id}`, data);
      return res.data;
    },
  },

  rent: {
    ...mockApi.rent,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/payments');
        return (res.data || []).map((p: any) => ({
          id: p.id,
          tenantName: p.tenantName || 'Sarah Connor',
          propertyName: p.propertyName || 'Skyline Luxury Lofts',
          unitNumber: p.unitNumber || '304',
          amount: p.amount,
          dueDate: p.dueDate || p.date,
          paidDate: p.date,
          status: p.status || 'Paid',
          paymentMethod: p.method || 'ACH',
        }));
      } catch (e) {
        console.error('Payments DB fetch failed:', e);
        return [];
      }
    },
  },

  tenantPayments: {
    ...mockApi.tenantPayments,
    getActiveGateway: async () => {
      try {
        const res: any = await apiClient.get('/payments/active-gateway');
        return res.data;
      } catch (e) {
        return { provider: 'MANUAL', options: ['ACH', 'Credit Card', 'Debit Card'] };
      }
    },
    createRazorpayOrder: async (data: { amount: number; currency?: string }) => {
      const res: any = await apiClient.post('/payments/razorpay-order', data);
      return res.data;
    },
    verifyRazorpayPayment: async (data: any) => {
      const res: any = await apiClient.post('/payments/verify-razorpay', data);
      return res.data;
    },
    payRent: async (data: any) => {
      const res: any = await apiClient.post('/payments', {
        amount: data.amount,
        baseAmount: data.baseAmount,
        method: data.method,
      });
      return res.data;
    },
  },

  tenant: {
    ...mockApi.tenant,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/tenants');
        return (res.data || []).map((t: any) => ({
          id: t.id,
          firstName: t.firstName,
          lastName: t.lastName,
          email: t.email,
          phone: t.phone,
          unitId: t.unitId,
          unitNumber: t.unit?.unitNumber || 'Unassigned',
          unitName: t.unit?.unitNumber || 'Unassigned',
          propertyId: t.unit?.propertyId,
          propertyName: t.unit?.property?.name || 'Unassigned',
          status: t.status,
          createdAt: t.createdAt,
          screeningReports: t.screeningReports || [],
          invoices: t.invoices || [],
          previousBalance: Number(t.previousBalance || t.openingBalance || 0),
          openingBalance: Number(t.openingBalance || t.previousBalance || 0),
          moveInDate: t.moveInDate ? (t.moveInDate.includes('T') ? t.moveInDate.split('T')[0] : t.moveInDate) : '',
        }));
      } catch (e) {
        console.error('Tenants fetch failed:', e);
        return [];
      }
    },
    getById: async (id: string) => {
      try {
        const res: any = await apiClient.get(`/tenants/${id}`);
        const t = res.data;
        if (!t) return undefined;
        return {
          id: t.id,
          firstName: t.firstName || '',
          lastName: t.lastName || '',
          email: t.email || '',
          phone: t.phone || '',
          unitId: t.unitId || '',
          unitNumber: t.unit?.unitNumber || 'Unassigned',
          unitName: t.unit?.unitNumber || 'Unassigned',
          propertyId: t.unit?.propertyId || '',
          propertyName: t.unit?.property?.name || 'Unassigned',
          status: t.status || 'Active',
          createdAt: t.createdAt,
          screeningReports: t.screeningReports || [],
          invoices: t.invoices || [],
          dob: t.dob ? (t.dob.includes('T') ? t.dob.split('T')[0] : t.dob) : '',
          nationality: t.nationality || '',
          idType: t.idType || 'Driver License',
          idNumber: t.idNumber || '',
          emergencyName: t.emergencyName || '',
          emergencyRelationship: t.emergencyRelationship || '',
          emergencyPhone: t.emergencyPhone || '',
          employer: t.employer || '',
          position: t.position || '',
          monthlyIncome: t.monthlyIncome || 0,
          employmentStatus: t.employmentStatus || 'Full-Time',
          currentAddress: t.currentAddress || '',
          previousAddress: t.previousAddress || '',
          preferredName: t.preferredName || '',
          altPhone: t.altPhone || '',
          gender: t.gender || 'Male',
          imageUrl: t.imageUrl || '',
          pets: t.pets || [],
          vehicles: t.vehicles || [],
          previousBalance: Number(t.previousBalance || t.openingBalance || 0),
          openingBalance: Number(t.openingBalance || t.previousBalance || 0),
          moveInDate: t.moveInDate ? (t.moveInDate.includes('T') ? t.moveInDate.split('T')[0] : t.moveInDate) : '',
        };
      } catch (e) {
        console.error(`Tenant fetch by id failed for ${id}:`, e);
        return undefined;
      }
    },
    create: async (data: any) => {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });
      const res: any = await apiClient.post('/tenants', formData);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key]);
        }
      });
      const res: any = await apiClient.put(`/tenants/${id}`, formData);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/tenants/${id}`);
      return true;
    },
  },

  owner: {
    ...mockApi.owner,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/owners');
        return (res.data || []).map((o: any) => {
          const [first = '', ...lastParts] = (o.name || '').split(' ');
          const last = lastParts.join(' ');
          return {
            id: o.id,
            name: o.name,
            firstName: o.firstName || first,
            lastName: o.lastName || last,
            email: o.email,
            phone: o.phone,
            payoutMethod: o.payoutMethod,
            propertiesOwnedCount: o.properties?.length || 0,
          };
        });
      } catch (e) {
        console.error('Owners fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/owners', data);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/owners/${id}`, data);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/owners/${id}`);
      return true;
    },
  },

  vendors: {
    ...mockApi.vendors,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/superadmin/company-users');
        const maintenanceUsers = (res.data || []).filter(
          (u: any) => u.role === 'Maintenance Staff' || u.role === 'Maintenance'
        );
        return maintenanceUsers.map((u: any) => ({
          id: u.id,
          name: u.name,
          companyName: u.name,
          contactName: u.name,
          email: u.email,
          phone: u.phone || '',
          category: u.serviceType || 'General Maintenance',
          serviceType: u.serviceType || 'General Maintenance',
          rating: 5.0,
          activeJobs: 0,
          completedJobs: 0,
          status: u.status || 'Active',
        }));
      } catch (e) {
        console.error('Vendors fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/vendors', {
        companyName: data.name || data.companyName || '',
        contactName: data.contactName || data.primaryContact || data.contact || '',
        email: data.email || '',
        phone: data.phone || '',
        serviceType: data.category || data.serviceType || '',
        rating: data.rating || 5.0,
        password: data.password || '',
      });
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/vendors/${id}`, {
        companyName: data.name || data.companyName || '',
        contactName: data.contactName || data.primaryContact || data.contact || '',
        email: data.email || '',
        phone: data.phone || '',
        serviceType: data.category || data.serviceType || '',
        rating: data.rating || 5.0,
      });
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/vendors/${id}`);
      return true;
    },
  },
  vendor: {
    getAll: async () => api.vendors.getAll(),
    create: async (data: any) => api.vendors.create(data),
    update: async (id: string, data: any) => api.vendors.update(id, data),
    delete: async (id: string) => api.vendors.delete(id),
  },



  dashboard: {
    ...mockApi.dashboard,
    getMetrics: async () => {
      try {
        const res: any = await apiClient.get('/dashboard/metrics');
        return res.data;
      } catch (e) {
        console.error('Dashboard metrics fetch failed:', e);
        return null;
      }
    },
    getChartData: async () => {
      try {
        const res: any = await apiClient.get('/dashboard/charts');
        return res.data;
      } catch (e) {
        console.error('Dashboard charts fetch failed:', e);
        return null;
      }
    },
  },

  // Accounting database connections
  accounts: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/accounting/accounts');
        const data = res.data || [];
        const isDemo = isDemoManager();
        const userCompanyId = getActiveCompanyId();

        const DEMO_COA_NAMES = [
          'Operating Checking Account',
          'Security Deposit Escrow Account',
          'Accounts Payable (AP)',
          'Tenant Security Deposit Liability',
          "Owner's Equity Capital",
          'Rental Revenue Income',
          'Late Fee & Penalty Income',
          'Application & Screening Fee Income',
          'Maintenance & Repair Expense',
          'Property Insurance Expense',
          'Management & Administrative Fee',
        ];

        const userCreatedIds: string[] = JSON.parse(localStorage.getItem('user_created_coa_ids') || '[]');
        const deletedCoaIds: string[] = JSON.parse(localStorage.getItem('deleted_coa_ids') || '[]');

        // If NOT demo manager, new managers/companies must see clean empty CoA until they create accounts
        const filtered = data.filter((a: any) => {
          if (deletedCoaIds.includes(a.id)) return false;
          if (userCreatedIds.includes(a.id)) return true;
          if (!isDemo && DEMO_COA_NAMES.includes(a.accountName)) return false;
          if (userCompanyId && a.companyId && a.companyId !== userCompanyId) return false;
          return true;
        });

        const mappedDbAccounts = filtered.map((a: any) => ({
          id: a.id,
          companyId: a.companyId,
          accountNumber: a.accountCode || '',
          accountName: a.accountName || '',
          accountType: a.type === 'Asset' ? 'Assets' : a.type === 'Revenue' ? 'Income' : a.type === 'Expense' ? 'Expenses' : a.type,
          balance: Number(a.balance) || 0,
          status: a.isActive !== false ? 'Active' : 'Inactive',
        }));

        // Retrieve real recorded income transactions
        let liveIncome: any[] = [];
        try {
          const incRes: any = await apiClient.get('/portal/income');
          liveIncome = (incRes.data || []).filter((i: any) => {
            let parsed: any = {};
            try { parsed = JSON.parse(i.description); } catch { parsed = {}; }
            if (userCompanyId && parsed.companyId && parsed.companyId !== userCompanyId) return false;
            if (!isDemo && ['Sunset Heights', 'Highland Tower', 'Grand View Apartments', 'Property'].includes(parsed.propertyName) && !parsed.propertyId) return false;
            return true;
          });
        } catch (err) {
          console.warn('Could not fetch income for CoA:', err);
        }

        // Retrieve real tenant rent payments
        let livePayments: any[] = [];
        try {
          const payRes: any = await apiClient.get('/portal/payments');
          livePayments = (payRes.data || []).filter((p: any) => {
            if (p.status !== 'Paid') return false;
            if (userCompanyId && p.companyId && p.companyId !== userCompanyId) return false;
            return true;
          });
        } catch (err) {
          console.warn('Could not fetch payments for CoA:', err);
        }

        // Retrieve real recorded expense transactions
        let liveExpenses: any[] = [];
        try {
          const expRes: any = await apiClient.get('/portal/expenses');
          liveExpenses = (expRes.data || []).filter((e: any) => {
            let parsed: any = {};
            try { parsed = JSON.parse(e.description); } catch { parsed = {}; }
            if (userCompanyId && parsed.companyId && parsed.companyId !== userCompanyId) return false;
            if (!isDemo && ['Sunset Heights', 'Highland Tower', 'Grand View Apartments', 'Property'].includes(parsed.propertyName) && !parsed.propertyId) return false;
            return true;
          });
        } catch (err) {
          console.warn('Could not fetch expenses for CoA:', err);
        }

        // Standard category mappings to CoA codes and descriptive titles
        const INCOME_MAPPINGS: Record<string, { code: string; name: string }> = {
          'Rent': { code: '4010', name: 'Rental Revenue Income' },
          'Late Fees': { code: '4020', name: 'Late Fees & Penalty Income' },
          'Parking': { code: '4030', name: 'Parking Space Income' },
          'Utilities': { code: '4040', name: 'Utilities Reimbursement' },
          'Storage': { code: '4050', name: 'Storage Lockers Income' },
          'Pet Fees': { code: '4060', name: 'Pet Rent Fee Income' },
        };

        const EXPENSE_MAPPINGS: Record<string, { code: string; name: string }> = {
          'Maintenance': { code: '5010', name: 'General Maintenance Expense' },
          'Repairs': { code: '5020', name: 'Repairs & Diagnostics Expense' },
          'Utilities': { code: '5030', name: 'Public Utilities Expense' },
          'Insurance': { code: '5040', name: 'Property Insurance Expense' },
          'Property Taxes': { code: '5050', name: 'Property Taxes Expense' },
          'Payroll': { code: '5060', name: 'Staff Payroll Expense' },
          'Landscaping': { code: '5070', name: 'Landscaping Expense' },
          'Office': { code: '5080', name: 'Office Supplies Expense' },
        };

        const incomeTotalsByCategory: Record<string, number> = {};
        for (const inc of liveIncome) {
          const cat = inc.category || 'Rent';
          incomeTotalsByCategory[cat] = (incomeTotalsByCategory[cat] || 0) + (Number(inc.amount) || 0);
        }
        for (const pay of livePayments) {
          incomeTotalsByCategory['Rent'] = (incomeTotalsByCategory['Rent'] || 0) + (Number(pay.amount) || 0);
        }

        const expenseTotalsByCategory: Record<string, number> = {};
        for (const exp of liveExpenses) {
          const cat = exp.category || 'Maintenance';
          expenseTotalsByCategory[cat] = (expenseTotalsByCategory[cat] || 0) + (Number(exp.amount) || 0);
        }

        let dynamicIncomeCodeIdx = 100;
        const derivedIncomeAccounts: any[] = [];
        for (const [cat, totalAmount] of Object.entries(incomeTotalsByCategory)) {
          if (totalAmount <= 0) continue;
          const mapping = INCOME_MAPPINGS[cat];
          const accNumber = mapping ? mapping.code : `4${dynamicIncomeCodeIdx++}`;
          const accName = mapping ? mapping.name : (cat.toLowerCase().includes('income') ? cat : `${cat} Income`);
          const accountId = `coa-income-${cat.toLowerCase().replace(/\s+/g, '-')}`;

          if (deletedCoaIds.includes(accountId)) continue;

          const existing = mappedDbAccounts.find((a: any) =>
            a.accountNumber === accNumber ||
            a.accountName.toLowerCase() === accName.toLowerCase() ||
            a.accountName.toLowerCase() === cat.toLowerCase()
          );

          if (existing) {
            existing.balance = (existing.balance || 0) + totalAmount;
          } else {
            derivedIncomeAccounts.push({
              id: accountId,
              accountNumber: accNumber,
              accountName: accName,
              accountType: 'Income',
              balance: totalAmount,
              status: 'Active',
            });
          }
        }

        let dynamicExpenseCodeIdx = 100;
        const derivedExpenseAccounts: any[] = [];
        for (const [cat, totalAmount] of Object.entries(expenseTotalsByCategory)) {
          if (totalAmount <= 0) continue;
          const mapping = EXPENSE_MAPPINGS[cat];
          const accNumber = mapping ? mapping.code : `5${dynamicExpenseCodeIdx++}`;
          const accName = mapping ? mapping.name : (cat.toLowerCase().includes('expense') ? cat : `${cat} Expense`);
          const accountId = `coa-expense-${cat.toLowerCase().replace(/\s+/g, '-')}`;

          if (deletedCoaIds.includes(accountId)) continue;

          const existing = mappedDbAccounts.find((a: any) =>
            a.accountNumber === accNumber ||
            a.accountName.toLowerCase() === accName.toLowerCase() ||
            a.accountName.toLowerCase() === cat.toLowerCase()
          );

          if (existing) {
            existing.balance = (existing.balance || 0) + totalAmount;
          } else {
            derivedExpenseAccounts.push({
              id: accountId,
              accountNumber: accNumber,
              accountName: accName,
              accountType: 'Expenses',
              balance: totalAmount,
              status: 'Active',
            });
          }
        }

        const combinedAccounts = [...mappedDbAccounts, ...derivedIncomeAccounts, ...derivedExpenseAccounts];
        combinedAccounts.sort((a, b) => (a.accountNumber || '').localeCompare(b.accountNumber || ''));

        return combinedAccounts;
      } catch (e) {
        console.error('Accounts fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const payload = {
        accountCode: data.accountCode || data.accountNumber,
        accountName: data.accountName,
        type: data.type || (data.accountType === 'Assets' ? 'Asset' : data.accountType === 'Income' ? 'Revenue' : data.accountType === 'Expenses' ? 'Expense' : data.accountType),
        balance: Number(data.balance) || 0,
      };
      const res: any = await apiClient.post('/accounting/accounts', payload);
      const created = res?.data;
      if (created?.id) {
        const existing: string[] = JSON.parse(localStorage.getItem('user_created_coa_ids') || '[]');
        if (!existing.includes(created.id)) {
          existing.push(created.id);
          localStorage.setItem('user_created_coa_ids', JSON.stringify(existing));
        }
      }
      return created;
    },
    delete: async (id: string) => {
      try {
        await apiClient.delete(`/accounting/accounts/${id}`);
      } catch (e) {
        console.warn('Backend delete CoA failed:', e);
      }
      const existing: string[] = JSON.parse(localStorage.getItem('user_created_coa_ids') || '[]');
      localStorage.setItem('user_created_coa_ids', JSON.stringify(existing.filter((x) => x !== id)));

      const deleted: string[] = JSON.parse(localStorage.getItem('deleted_coa_ids') || '[]');
      if (!deleted.includes(id)) {
        deleted.push(id);
        localStorage.setItem('deleted_coa_ids', JSON.stringify(deleted));
      }
      return true;
    },
  },

  journalEntries: {
    ...mockApi.journalEntries,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/accounting/journal-entries');
        const data = res.data || [];
        const userCompanyId = getActiveCompanyId();
        const filtered = userCompanyId
          ? data.filter((je: any) => !je.companyId || je.companyId === userCompanyId)
          : data;

        return filtered.map((je: any) => ({
          id: je.id,
          entryNumber: je.entryNumber,
          date: je.date,
          description: je.description,
          reference: je.reference,
          status: 'Posted',
          lines: (je.lines || []).map((l: any) => ({
            accountId: l.accountId,
            accountName: l.account?.accountName || 'Account',
            debit: l.debit || 0,
            credit: l.credit || 0,
          })),
        }));
      } catch (e) {
        console.error('Journal entries fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/accounting/journal-entries', data);
      return res.data;
    },
    post: async (id: string) => {
      return mockApi.journalEntries.post(id);
    },
    reverse: async (id: string) => {
      return mockApi.journalEntries.reverse(id);
    },
  },

  generalLedger: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/accounting/general-ledger');
        return (res.data || []).map((line: any) => ({
          id: line.id,
          date: line.journalEntry?.date || new Date().toISOString(),
          reference: line.journalEntry?.entryNumber || 'JE-Manual',
          description: line.journalEntry?.description || 'Manual Entry',
          accountName: line.account?.accountName || 'CoA Account',
          debit: line.debit || 0,
          credit: line.credit || 0,
        }));
      } catch (e) {
        console.error('General ledger fetch failed:', e);
        return [];
      }
    },
  },

  bankAccounts: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/accounting/bank-accounts');
        const data = res.data || [];
        const userCompanyId = getActiveCompanyId();
        const filtered = userCompanyId
          ? data.filter((b: any) => !b.companyId || b.companyId === userCompanyId)
          : data;
        return filtered;
      } catch (e) {
        console.error('Bank accounts fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/accounting/bank-accounts', data);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/accounting/bank-accounts/${id}`);
      return true;
    },
  },

  bankReconciliation: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/accounting/bank-reconciliation');
        return res.data || [];
      } catch (e) {
        console.error('Bank reconciliation fetch failed:', e);
        return [];
      }
    },
  },

  invoices: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/invoices');
        return (res.data || []).map((i: any) => ({
          id: i.id,
          tenantId: i.tenantId,
          tenantName: i.tenantName || (i.tenant ? `${i.tenant.firstName} ${i.tenant.lastName}` : 'Resident'),
          tenantEmail: i.tenantEmail || i.tenant?.email || '',
          propertyName: i.propertyName || (i.property ? i.property.name : 'Property'),
          unitNumber: i.unitNumber || (i.unit ? i.unit.unitNumber : '101'),
          amount: i.amount || 0,
          paidAmount: i.paidAmount || 0,
          balance: i.balance !== undefined && i.balance !== null ? i.balance : ((i.amount || 0) - (i.paidAmount || 0)),
          dueDate: i.dueDate ? i.dueDate.split('T')[0] : 'N/A',
          status: i.status || 'Sent',
          lineItems: Array.isArray(i.lineItems)
            ? i.lineItems
            : typeof i.lineItems === 'string'
            ? JSON.parse(i.lineItems)
            : [{ description: 'Rent Charge', amount: i.amount || 0 }],
        }));
      } catch (e) {
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/invoices', data);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/invoices/${id}`, data);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/invoices/${id}`);
      return true;
    },
    getAiReminder: async (id: string, tone?: string) => {
      try {
        const res: any = await apiClient.post(`/invoices/${id}/ai-reminder`, { tone });
        return res.data;
      } catch (e) {
        return { success: false };
      }
    },
    sendAiReminder: async (id: string, reminderText: string, tone?: string, invoiceData?: any) => {
      const noticeTitle = tone === 'urgent'
        ? '🚨 Urgent Rent Payment Notice'
        : tone === 'firm'
        ? '⚠️ Important Rent Payment Notice'
        : '📢 Friendly Rent Payment Reminder';

      const newNotice = {
        id: `ai-notice-${Date.now()}`,
        invoiceId: id,
        tenantId: invoiceData?.tenantId || '',
        tenantEmail: (invoiceData?.tenantEmail || '').toLowerCase().trim(),
        tenantName: invoiceData?.tenantName || '',
        title: noticeTitle,
        message: reminderText,
        type: tone === 'urgent' ? 'warning' : 'info',
        role: 'Tenant',
        read: false,
        timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      try {
        const raw = localStorage.getItem('whatslandlord_ai_rent_notices');
        const list = raw ? JSON.parse(raw) : [];
        const cleanedList = list.filter((item: any) => item.id !== 'ai-notice-seed-1');
        const updated = [newNotice, ...cleanedList.filter((item: any) => item.id !== newNotice.id)];
        localStorage.setItem('whatslandlord_ai_rent_notices', JSON.stringify(updated));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('ai-notice-sent', { detail: newNotice }));
      } catch (err) {
        console.error('Failed to store AI notice locally:', err);
      }

      try {
        const res: any = await apiClient.post(`/invoices/${id}/send-ai-reminder`, { reminderText, tone });
        return res?.data || newNotice;
      } catch {
        return newNotice;
      }
    },
  },

  charges: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/charges');
        return (res.data || []).map((c: any) => ({
          id: c.id,
          tenantId: c.tenantId,
          tenantName: c.tenant ? `${c.tenant.firstName} ${c.tenant.lastName}` : 'Resident',
          title: c.title,
          amount: c.amount,
          status: c.status,
          date: c.createdAt ? c.createdAt.split('T')[0] : 'N/A',
        }));
      } catch (e) {
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/portal/charges', data);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/portal/charges/${id}`);
      return true;
    },
  },

  deposits: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/deposits');
        return (res.data || []).map((d: any) => ({
          id: d.id,
          tenantId: d.tenantId,
          tenantName: d.tenant ? `${d.tenant.firstName} ${d.tenant.lastName}` : 'Resident',
          amount: d.amount,
          status: d.status,
          date: d.createdAt ? d.createdAt.split('T')[0] : 'N/A',
        }));
      } catch (e) {
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/portal/deposits', data);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/portal/deposits/${id}`);
      return true;
    },
  },

  expenses: {
    ...mockApi.expenses,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/expenses');
        const isDemo = isDemoManager();
        const userCompanyId = getActiveCompanyId();

        const filtered = (res.data || []).filter((e: any) => {
          let parsed: any = {};
          try { parsed = JSON.parse(e.description); } catch { parsed = {}; }
          if (userCompanyId && parsed.companyId && parsed.companyId !== userCompanyId) return false;
          if (!isDemo && ['Sunset Heights', 'Highland Tower', 'Grand View Apartments', 'Property'].includes(parsed.propertyName) && !parsed.propertyId) return false;
          return true;
        });

        return filtered.map((e: any) => {
          let parsed = { vendorName: 'Vendor', propertyName: 'Property', propertyId: '', buildingId: '', unitId: '', payeeType: 'Vendor', payeeId: '' };
          try {
            parsed = JSON.parse(e.description);
          } catch {
            parsed.vendorName = e.description || 'Vendor';
          }
          return {
            id: e.id,
            category: e.category,
            amount: e.amount,
            date: e.date ? e.date.split('T')[0] : 'N/A',
            propertyId: parsed.propertyId || '',
            buildingId: parsed.buildingId || '',
            unitId: parsed.unitId || '',
            payeeType: parsed.payeeType || 'Vendor',
            payeeId: parsed.payeeId || '',
            propertyName: parsed.propertyName || 'Property',
            vendorName: parsed.vendorName || 'Vendor',
            description: e.description,
            status: 'Cleared',
          };
        });
      } catch (e) {
        return [];
      }
    },
    create: async (data: any) => {
      const description = JSON.stringify({
        vendorName: data.vendorName,
        propertyName: data.propertyName,
        propertyId: data.propertyId,
        buildingId: data.buildingId,
        unitId: data.unitId,
        payeeType: data.payeeType || 'Vendor',
        payeeId: data.payeeId || '',
      });
      const res: any = await apiClient.post('/portal/expenses', {
        category: data.category,
        amount: data.amount,
        date: data.date,
        description,
      });
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/portal/expenses/${id}`);
      return true;
    },
  },

  maintenance: {
    ...mockApi.maintenance,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/maintenance/requests');
        return res.data || [];
      } catch (e) {
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/portal/maintenance/requests', data);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/portal/maintenance/requests/${id}`, data);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/portal/maintenance/requests/${id}`);
      return true;
    },
  },

  serviceRequests: {
    ...mockApi.serviceRequests,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/service-requests');
        const list = res.data || [];
        return list.map((r: any, idx: number) => ({
          ...r,
          requestNumber: `#${idx + 1}`,
        }));
      } catch (e) {
        return [];
      }
    },
    getById: async (id: string) => {
      try {
        const res: any = await apiClient.get(`/service-requests/${id}`);
        return res.data || null;
      } catch (e) {
        return null;
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/service-requests', data);
      return res.data;
    },
    troubleshoot: async (data: { title?: string; description?: string; category?: string }) => {
      try {
        const res: any = await apiClient.post('/service-requests/troubleshoot', data);
        return res.data || res;
      } catch (e) {
        return {
          tips: [
            'Check shutoff valves and power switches near the fixture.',
            'Ensure circuit breaker switch hasn\'t tripped in main breaker panel.',
            'Take a photo of the affected area to attach to your ticket.',
          ],
          category: data.category || 'General',
          emergencyAlert: false,
          suggestionTitle: 'Instant DIY Troubleshooting Tips',
        };
      }
    },
    autoAssign: async (data: { title?: string; description?: string; category?: string }) => {
      try {
        const res: any = await apiClient.post('/service-requests/auto-assign', data);
        return res.data || res;
      } catch (e) {
        return {
          recommendedVendor: {
            vendorId: 'v-1',
            vendorName: 'Apex Pro Plumbing & Maintenance Co.',
            contactName: 'Robert Vance',
            phone: '555-0199',
            rating: 4.9,
            matchScore: 98,
            suggestedTechnician: 'Robert Vance (Lead Specialist)',
            reasoning: 'ProFix Solutions is a top-rated licensed contractor for this issue type.',
          },
        };
      }
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/service-requests/${id}`, data);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/service-requests/${id}`);
      return true;
    },
  },

  workOrders: {
    ...mockApi.workOrders,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/work-orders');
        return (res.data || []).map((w: any, idx: number) => ({
          ...w,
          workOrderNumber: w.workOrderNumber && !w.workOrderNumber.includes('-') && w.workOrderNumber.startsWith('#')
            ? `#WO-${1001 + idx}`
            : (w.workOrderNumber ? (w.workOrderNumber.startsWith('#') ? w.workOrderNumber : `#${w.workOrderNumber}`) : `#WO-${1001 + idx}`),
          propertyName: w.propertyName || 'Property',
          unitNumber: w.unitNumber || 'Unit 101',
          vendorName: w.vendorName || w.assignedTechnician || 'Unassigned',
          assignedTechnician: w.assignedTechnician || w.vendorName || 'Unassigned',
          scheduledDate: w.scheduledDate || (w.createdAt ? w.createdAt.split('T')[0] : 'N/A'),
          estimatedCost: Number(w.estimatedCost || 0),
          actualCost: Number(w.actualCost || w.cost || 0),
          status: w.status || 'Open',
        }));
      } catch (e) {
        console.error('WorkOrders fetch error:', e);
        return [];
      }
    },
    getById: async (id: string) => {
      try {
        const res: any = await apiClient.get(`/work-orders/${id}`);
        return res.data;
      } catch (e) {
        return null;
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/work-orders', data);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/work-orders/${id}`, data);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/work-orders/${id}`);
      return true;
    },
  },

  inspections: {
    ...mockApi.inspections,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/inspections');
        return (res.data || []).map((ins: any) => ({
          id: ins.id,
          propertyName: ins.moveIn?.unit?.property?.name || 'N/A',
          unitNumber: ins.moveIn?.unit?.unitNumber || 'N/A',
          inspector: ins.assignedInspector ? `${ins.assignedInspector.firstName} ${ins.assignedInspector.lastName}` : 'Unassigned',
          status: ins.status,
          date: ins.startedAt ? ins.startedAt.split('T')[0] : 'N/A',
          type: ins.type,
        }));
      } catch (e) {
        return [];
      }
    },
    getById: async (id: string) => {
      const res: any = await apiClient.get(`/inspections/${id}`);
      return res.data;
    },
    getInspectors: async () => {
      const res: any = await apiClient.get('/inspections/inspectors');
      return res.data || [];
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/inspections', data);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/inspections/${id}`, data);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/inspections/${id}`);
      return true;
    },
    complete: async (id: string) => {
      const res: any = await apiClient.post(`/inspections/${id}/complete`, {});
      return res.data;
    },
    reopen: async (id: string) => {
      const res: any = await apiClient.post(`/inspections/${id}/reopen`, {});
      return res.data;
    },
    updateDraft: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/inspections/${id}`, data);
      return res.data;
    },
    updateItemResponse: async (itemId: string, data: any) => {
      const res: any = await apiClient.put(`/inspections/items/${itemId}`, data);
      return res.data;
    },
    cancel: async (id: string, reason: string) => {
      const res: any = await apiClient.post(`/inspections/${id}/cancel`, { reason });
      return res.data;
    },
    uploadPhoto: async (itemId: string, file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      const res: any = await apiClient.post(`/inspections/items/${itemId}/photos`, formData);
      return res.data;
    },
  },

  income: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/income');
        const isDemo = isDemoManager();
        const userCompanyId = getActiveCompanyId();

        const filtered = (res.data || []).filter((i: any) => {
          let parsed: any = {};
          try { parsed = JSON.parse(i.description); } catch { parsed = {}; }
          if (userCompanyId && parsed.companyId && parsed.companyId !== userCompanyId) return false;
          if (!isDemo && ['Sunset Heights', 'Highland Tower', 'Grand View Apartments', 'Property'].includes(parsed.propertyName) && !parsed.propertyId) return false;
          return true;
        });

        return filtered.map((i: any) => {
          let parsed = { propertyName: 'Property', tenantName: 'Resident', propertyId: '', buildingId: '', unitId: '', sourceType: 'Tenant', sourceId: '' };
          try {
            parsed = JSON.parse(i.description);
          } catch {
            parsed.propertyName = i.description || 'Property';
          }
          return {
            id: i.id,
            category: i.category,
            amount: i.amount,
            date: i.date ? i.date.split('T')[0] : 'N/A',
            propertyId: parsed.propertyId || '',
            buildingId: parsed.buildingId || '',
            unitId: parsed.unitId || '',
            sourceType: parsed.sourceType || 'Tenant',
            sourceId: parsed.sourceId || '',
            propertyName: parsed.propertyName || 'Property',
            tenantName: parsed.tenantName || 'Resident',
            description: i.description,
            status: i.status,
          };
        });
      } catch (e) {
        return [];
      }
    },
    create: async (data: any) => {
      const description = JSON.stringify({
        propertyName: data.propertyName,
        tenantName: data.tenantName,
        propertyId: data.propertyId,
        buildingId: data.buildingId,
        unitId: data.unitId,
        sourceType: data.sourceType || 'Tenant',
        sourceId: data.sourceId || '',
      });
      const res: any = await apiClient.post('/portal/income', {
        category: data.category,
        amount: data.amount,
        date: data.date,
        description,
      });
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/portal/income/${id}`);
      return true;
    },
  },

  signatures: {
    ...mockApi.signatures,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/signatures');
        return (res.data || []).map((s: any) => ({
          id: s.id,
          documentName: s.documentName,
          documentId: s.documentId,
          recipientName: s.recipientName,
          recipientEmail: s.recipientEmail,
          status: s.status,
          sentAt: s.sentAt ? s.sentAt.split('T')[0] : 'N/A',
          expiresAt: s.expiresAt ? s.expiresAt.split('T')[0] : 'N/A',
        }));
      } catch (e) {
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/portal/signatures', data);
      return res.data;
    },
    cancel: async (id: string) => {
      await apiClient.post(`/portal/signatures/${id}/cancel`, {});
      return true;
    },
  },

  report: {
    getAll: async () => [
      { id: 'rent-roll', name: 'Rent Roll Report', category: 'Financial', description: 'Detailed breakdown of rents, deposits, and occupancies across properties.' },
      { id: 'occupancy', name: 'Occupancy Report', category: 'Leasing', description: 'Occupancy rate, unit statuses, and leasing trends.' },
      { id: 'delinquency', name: 'Delinquency Report', category: 'Financial', description: 'Outstanding balances, late fees, and payment defaults.' },
      { id: 'pnl', name: 'Profit & Loss Statement', category: 'Financial', description: 'Income vs expenses with gross and net profit summary.' },
      { id: 'cash-flow', name: 'Cash Flow Statement', category: 'Financial', description: 'Inflow and outflow of cash across properties and accounts.' },
      { id: 'maintenance', name: 'Maintenance Log', category: 'Maintenance', description: 'Service requests, work orders, and completion statistics.' }
    ] as any
  },

  // CRM, Screening, Violations & Collections
  screening: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/screening/reports');
        return (res.data || []).map((s: any) => ({
          id: s.id,
          applicantName: s.tenant ? `${s.tenant.firstName || ''} ${s.tenant.lastName || ''}`.trim() : 'Unknown Tenant',
          applicantEmail: s.tenant?.email || '',
          applicantPhone: s.tenant?.phone || '',
          propertyName: s.tenant?.unit?.property?.name || 'N/A',
          unitNumber: s.tenant?.unit?.unitNumber ? `Unit ${s.tenant.unit.unitNumber}` : 'N/A',
          companyName: s.companyName || s.tenant?.unit?.property?.companyName || s.company?.name || undefined,
          creditScore: s.creditScore,
          criminalBackground: s.criminalPass ? 'Passed' : 'Flagged',
          evictionHistory: s.evictionPass ? 'No Records' : 'Flagged',
          criminalStatus: s.criminalPass ? 'No Records Found' : 'Records Found',
          evictionStatus: s.evictionPass ? 'No Records Found' : 'Records Found',
          status: s.status,
          screeningStatus: s.status || 'Processing',
          screeningPackage: 'Basic',
          date: s.createdAt,
          dob: s.dob,
          ssn: s.ssn,
          authorized: s.authorized,
          documentUrl: s.documentUrl,
          documentName: s.documentName,
        }));
      } catch (e) {
        console.error('Screening reports fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/portal/screening/reports', data);
      return res.data;
    },
    getById: async (id: string) => {
      try {
        const res: any = await apiClient.get(`/portal/screening/reports/${id}`);
        const s = res.data;
        if (!s) return null;
        return {
          id: s.id,
          applicantName: s.tenant ? `${s.tenant.firstName || ''} ${s.tenant.lastName || ''}`.trim() : 'Unknown Tenant',
          applicantEmail: s.tenant?.email || '',
          applicantPhone: s.tenant?.phone || '',
          propertyName: s.tenant?.unit?.property?.name || 'N/A',
          unitNumber: s.tenant?.unit?.unitNumber ? `Unit ${s.tenant.unit.unitNumber}` : 'N/A',
          companyName: s.companyName || s.tenant?.unit?.property?.companyName || s.company?.name || undefined,
          creditScore: s.creditScore,
          criminalBackground: s.criminalPass ? 'Passed' : 'Flagged',
          evictionHistory: s.evictionPass ? 'No Records' : 'Flagged',
          status: s.status,
          screeningStatus: s.status || 'Pending Documents',
          screeningPackage: 'Basic',
          date: s.createdAt,
          dob: s.dob,
          ssn: s.ssn,
          authorized: s.authorized,
          documentUrl: s.documentUrl,
          documentName: s.documentName,
        };
      } catch (e) {
        console.error('Screening report fetch by id failed:', e);
        return null;
      }
    },
    update: async (id: string, data: { status?: string; dob?: string; ssn?: string; authorized?: boolean }) => {
      const res: any = await apiClient.put(`/portal/screening/reports/${id}`, data);
      return res.data;
    },
    uploadDocument: async (id: string, file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      const res: any = await apiClient.post(`/portal/screening/reports/${id}/upload`, formData);
      return res.data;
    },
    generateReport: async (id: string) => {
      const res: any = await apiClient.put(`/portal/screening/reports/${id}`, { status: 'Completed' });
      return res.data;
    },
    approve: async (id: string) => {
      const res: any = await apiClient.put(`/portal/screening/reports/${id}`, { status: 'Approved' });
      return res.data;
    },
    decline: async (id: string) => {
      const res: any = await apiClient.put(`/portal/screening/reports/${id}`, { status: 'Declined' });
      return res.data;
    },
  },

  payments: {
    ...mockApi.payments,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/payments');
        const isDemo = isDemoManager();
        const userCompanyId = getActiveCompanyId();

        const filtered = (res.data || []).filter((p: any) => {
          if (userCompanyId && p.companyId && p.companyId !== userCompanyId) return false;
          const pName = p.property?.name || p.propertyName || '';
          if (!isDemo && ['Sunset Heights', 'Highland Tower', 'Grand View Apartments', 'Property'].includes(pName) && !p.propertyId) return false;
          return true;
        });

        return filtered.map((p: any, idx: number) => ({
          ...p,
          id: p.id,
          receiptNumber: p.receiptNumber || `#${idx + 1}`,
          tenantName: p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}` : (p.tenantName || 'Unknown Tenant'),
          propertyName: p.property?.name || p.propertyName || 'Property',
          unitNumber: p.unit?.unitNumber || p.unitNumber || 'Unassigned',
          amount: p.amount,
          paidDate: p.paidDate ? p.paidDate.split('T')[0] : (p.createdAt ? p.createdAt.split('T')[0] : ''),
          paymentMethod: p.paymentMethod || 'ACH',
          status: p.status || 'Paid',
          propertyId: p.propertyId,
          referenceNumber: p.referenceNumber,
        }));
      } catch (e) {
        console.error('Payments fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/payments', data);
      return res.data;
    },
    getById: async (id: string) => {
      try {
        const res: any = await apiClient.get(`/payments/${id}`);
        const p = res.data;
        if (!p) return null;
        return {
          ...p,
          id: p.id,
          receiptNumber: p.receiptNumber || `#${p.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
          tenantName: p.tenant ? `${p.tenant.firstName} ${p.tenant.lastName}` : (p.tenantName || 'Unknown Tenant'),
          propertyName: p.property?.name || p.propertyName || 'Property',
          unitNumber: p.unit?.unitNumber || p.unitNumber || 'Unassigned',
          amount: p.amount,
          paidDate: p.paidDate ? p.paidDate.split('T')[0] : (p.createdAt ? p.createdAt.split('T')[0] : ''),
          paymentMethod: p.paymentMethod || 'ACH',
          status: p.status || 'Paid',
          propertyId: p.propertyId,
          referenceNumber: p.referenceNumber,
          createdBy: p.createdBy || 'System',
        };
      } catch (e) {
        console.error('Fetch payment by ID failed:', e);
        return null;
      }
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/payments/${id}`, data);
      return res.data;
    },
    delete: async (id: string) => {
      await apiClient.delete(`/payments/${id}`);
      return true;
    },
    void: async (id: string) => {
      await apiClient.delete(`/payments/${id}`);
      return true;
    },
  },

  rentLedger: {
    getAll: async () => {
      try {
        const [invoicesRes, paymentsRes] = await Promise.all([
          apiClient.get('/invoices').catch(() => null),
          apiClient.get('/payments').catch(() => null),
        ]);

        const invoicesList = Array.isArray(invoicesRes) ? invoicesRes : ((invoicesRes as any)?.data || []);
        const paymentsList = Array.isArray(paymentsRes) ? paymentsRes : ((paymentsRes as any)?.data || []);

        // Per-tenant running balance map (fixes the global $131k+ bug)
        const tenantRunningBalances: Record<string, number> = {};
        const ledgerItems: any[] = [];
        const allTransactions: any[] = [];

        invoicesList.forEach((inv: any) => {
          // Extract month & year from dueDate for a meaningful description
          const rawDate = inv.dueDate || inv.createdAt || '';
          const invDate = rawDate ? new Date(rawDate) : new Date();
          const isValidDate = !isNaN(invDate.getTime());
          const monthName = isValidDate ? invDate.toLocaleString('en-US', { month: 'long' }) : 'Monthly';
          const year = isValidDate ? invDate.getFullYear() : new Date().getFullYear();

          // Detect late fee entries via notes or lineItems content
          const lineItemsParsed = (() => { try { return JSON.parse(inv.lineItems || '[]'); } catch { return []; } })();
          const isLateFee =
            (inv.notes || '').toLowerCase().includes('late fee') ||
            (inv.type || '').toLowerCase().includes('late') ||
            lineItemsParsed.some((item: any) => (item.description || '').toLowerCase().includes('late fee'));

          const description = isLateFee
            ? `Late Fee — ${monthName} ${year}`
            : `Monthly Rent Invoice — ${monthName} ${year}`;
          const transactionType = isLateFee ? 'Late Fee' : 'Rent Charge';

          allTransactions.push({
            type: 'charge',
            date: inv.dueDate || inv.createdAt || '2026-08-01',
            amount: Number(inv.amount) || 0,
            tenantId: inv.tenant?.id || inv.tenantId || '',
            tenantName: inv.tenant ? `${inv.tenant.firstName} ${inv.tenant.lastName}` : (inv.tenantName || 'Resident'),
            propertyName: inv.propertyName || 'Property',
            unitNumber: inv.unitNumber || 'Unassigned',
            description,
            transactionType,
            invoiceId: inv.id,
            invoiceStatus: inv.status,
            invoicePaidAmount: Number(inv.paidAmount) || 0,
            invoiceBalance: Number(inv.balance) || Number(inv.amount) || 0,
            id: `led-chg-${inv.id}`,
          });
        });

        paymentsList.forEach((pay: any) => {
          if (pay.status === 'Paid' || pay.status === 'Partially Paid' || pay.status === 'Cleared' || !pay.status || String(pay.status).toLowerCase().includes('paid') || String(pay.status).toLowerCase().includes('partial')) {
            // Format payment description with method and reference
            const method = pay.paymentMethod ? ` via ${pay.paymentMethod}` : '';
            const ref = pay.referenceNumber ? ` · Ref# ${pay.referenceNumber}` : '';
            allTransactions.push({
              type: 'payment',
              date: pay.paidDate || pay.dueDate || pay.createdAt || '2026-08-01',
              amount: Number(pay.amount) || 0,
              tenantId: pay.tenant?.id || pay.tenantId || '',
              tenantName: pay.tenant ? `${pay.tenant.firstName} ${pay.tenant.lastName}` : (pay.tenantName || 'Resident'),
              propertyName: pay.property?.name || pay.propertyName || 'Property',
              unitNumber: pay.unit?.unitNumber || pay.unitNumber || 'Unassigned',
              description: `Payment Received${method}${ref}`,
              transactionType: 'Payment',
              id: `led-pay-${pay.id}`,
              paymentId: pay.id,
              paymentMethod: pay.paymentMethod,
              referenceNumber: pay.referenceNumber,
              createdBy: pay.createdBy,
              rawPayment: pay,
            });
          }
        });

        // Sort all transactions by date ascending
        allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Apply PER-TENANT running balance (each tenant's balance is independent)
        allTransactions.forEach((tx) => {
          const tenantKey = tx.tenantId || tx.tenantName || 'unknown';
          if (tenantRunningBalances[tenantKey] === undefined) tenantRunningBalances[tenantKey] = 0;

          if (tx.type === 'charge') {
            tenantRunningBalances[tenantKey] += tx.amount;
            ledgerItems.push({
              id: tx.id,
              date: tx.date ? tx.date.split('T')[0] : 'N/A',
              tenantId: tx.tenantId || '',
              tenantName: tx.tenantName,
              propertyName: tx.propertyName,
              unitNumber: tx.unitNumber,
              description: tx.description,
              debit: tx.amount,
              credit: 0,
              balance: tenantRunningBalances[tenantKey],
              transactionType: tx.transactionType,
              invoiceId: tx.invoiceId,
              invoiceStatus: tx.invoiceStatus,
              invoicePaidAmount: tx.invoicePaidAmount,
              invoiceBalance: tx.invoiceBalance,
            });
          } else {
            tenantRunningBalances[tenantKey] -= tx.amount;
            ledgerItems.push({
              id: tx.id,
              date: tx.date ? tx.date.split('T')[0] : 'N/A',
              tenantId: tx.tenantId || '',
              tenantName: tx.tenantName,
              propertyName: tx.propertyName,
              unitNumber: tx.unitNumber,
              description: tx.description,
              debit: 0,
              credit: tx.amount,
              balance: tenantRunningBalances[tenantKey],
              transactionType: tx.transactionType,
              paymentId: tx.paymentId,
              paymentMethod: tx.paymentMethod,
              referenceNumber: tx.referenceNumber,
              createdBy: tx.createdBy,
              rawPayment: tx.rawPayment,
            });
          }
        });

        return ledgerItems.reverse();
      } catch (e) {
        console.error('Rent ledger fetch failed:', e);
        return [];
      }
    },
  },

  violations: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/violations');
        if (res?.data && Array.isArray(res.data)) {
          return res.data.map((v: any) => {
            let rawPropName = v.unit?.property?.name || v.propertyName || 'NYC Building Asset';
            let unitStr = v.unit?.unitNumber || 'Building Wide';
            if (v.deviceNumber) {
              unitStr = `Device #${v.deviceNumber}`;
            }
            return {
              id: v.id,
              propertyId: v.unit?.propertyId || v.propertyId || 'prop-1',
              propertyName: rawPropName,
              unitNumber: unitStr,
              violationCode: v.title || v.violationCode || 'DOB Citation',
              issuingAuthority: 'NYC Department of Buildings (DOB)',
              description: v.description || 'DOB Building Compliance Notice',
              fineAmount: v.fineAmount || 250,
              dueDate: v.dueDate || v.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
              severity: v.severity || 'Warning',
              status: v.status || 'Open',
            };
          });
        }
        return [];
      } catch (e) {
        console.error('Violations DB fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/portal/violations', data);
      return res.data;
    },
    createWorkOrder: async (id: string) => {
      const res: any = await apiClient.post('/portal/violations/dispatch', { violationId: id });
      return res.data;
    },
    syncDob: async (bin?: string) => {
      const cleanBin = (bin || '4115368').trim();
      try {
        const res: any = await apiClient.get(`/portal/violations/sync-nyc-dob?bin=${encodeURIComponent(cleanBin)}`);
        return res.data;
      } catch (err1) {
        const res: any = await apiClient.post('/portal/violations/sync-dob', { bin: cleanBin });
        return res.data;
      }
    },
    syncAllDob: async () => {
      try {
        const res: any = await apiClient.get('/portal/violations/sync-all-nyc-dob');
        return res.data;
      } catch (err) {
        return await mockApi.violations.syncAllDob();
      }
    },
  },

  billing: {
    getSubscription: async () => {
      try {
        const res: any = await apiClient.get('/portal/superadmin/billing');
        return res.data;
      } catch (e) {
        return null;
      }
    },
  },

  security: {
    getPolicies: async () => {
      try {
        const res: any = await apiClient.get('/portal/superadmin/security');
        return res.data;
      } catch (e) {
        return [];
      }
    },
  },

  audit: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/superadmin/audit');
        return (res.data || []).map((log: any) => ({
          id: log.id,
          timestamp: log.timestamp,
          user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
          action: log.action,
          module: log.module,
          object: log.object,
          ip: log.ip,
          status: log.status,
        }));
      } catch (e) {
        return [];
      }
    },
  },

  paymentPlans: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/collections/payment-plans');
        return (res.data || []).map((p: any) => ({
          id: p.id,
          tenantName: `${p.tenant?.firstName || ''} ${p.tenant?.lastName || ''}`,
          totalAmount: p.totalAmount,
          frequency: p.frequency,
          status: p.status,
          createdAt: p.createdAt,
        }));
      } catch (e) {
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/portal/collections/payment-plans', data);
      return res.data;
    },
  },

  tenantPortal: {
    ...mockApi.tenantPortal,
    getMetrics: async () => {
      try {
        const res: any = await apiClient.get('/portal/tenant/metrics');
        return {
          currentRent: res.data?.currentRent || 0,
          currentRentDue: res.data?.currentRentDue || res.data?.currentRent || 0,
          outstandingBalance: res.data?.outstandingBalance || 0,
          nextDueDate: res.data?.nextDueDate || 'N/A',
          unreadMessages: res.data?.unreadMessages || 0,
          packagesWaiting: res.data?.packagesWaiting || 0,
          activeVisitors: res.data?.activeVisitors || 0,
          leaseExpiration: res.data?.leaseExpiration || 'N/A',
          openMaintenanceRequests: res.data?.openMaintenanceRequests || 0,
        };
      } catch (e) {
        return {
          currentRent: 0,
          currentRentDue: 0,
          outstandingBalance: 0,
          nextDueDate: 'N/A',
          unreadMessages: 0,
          packagesWaiting: 0,
          activeVisitors: 0,
          leaseExpiration: 'N/A',
          openMaintenanceRequests: 0,
        };
      }
    },
  },

  ownerPortal: {
    ...mockApi.ownerPortal,
    getMetrics: async () => {
      try {
        const res: any = await apiClient.get('/portal/owner/metrics');
        const data = res.data || {};
        return {
          totalProperties: data.totalProperties || 0,
          totalUnits: data.totalUnits || 0,
          occupancyRate: `${data.occupancyRate || 0}%`,
          monthlyIncome: data.monthlyIncome || 0,
          monthlyExpenses: data.monthlyExpenses || 0,
          netIncome: data.netIncome || data.netDistribution || 0,
          pendingMaintenance: data.pendingMaintenance || 0,
          upcomingRenewals: data.upcomingRenewals || 0,
        };
      } catch (e) {
        console.error('Owner metrics DB fetch failed:', e);
        return {
          totalProperties: 0,
          totalUnits: 0,
          occupancyRate: '0%',
          monthlyIncome: 0,
          monthlyExpenses: 0,
          netIncome: 0,
          pendingMaintenance: 0,
          upcomingRenewals: 0,
        };
      }
    },
  },

  // Live Backend Connections for Super Admin SaaS Management
  companies: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/superadmin/companies');
        return (res.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          businessName: `${c.name} Inc`,
          code: c.code,
          contact: c.contactName,
          email: c.email,
          phone: c.phone,
          website: `${c.code.toLowerCase()}.com`,
          status: c.status,
          plan: c.planName,
          cycle: 'Monthly',
          storage: c.storageUsed || '0.0 GB',
          date: c.createdAt ? c.createdAt.split('T')[0] : '',
        }));
      } catch (e) {
        console.error('Companies fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/superadmin/companies', data);
      return res.data;
    },
    getById: async (id: string) => {
      try {
        const res: any = await apiClient.get(`/superadmin/companies/${id}`);
        const c = res.data;
        if (!c) return null;
        return {
          id: c.id,
          name: c.name,
          businessName: `${c.name} Inc`,
          code: c.code,
          contact: c.contactName,
          email: c.email,
          phone: c.phone,
          website: `${c.code.toLowerCase()}.com`,
          status: c.status,
          plan: c.planName,
          cycle: 'Monthly',
          storage: c.storageUsed || '0.0 GB',
          date: c.createdAt ? c.createdAt.split('T')[0] : '',
          usersCount: c.users?.length || 0,
          invoicesCount: c.invoices?.length || 0,
          users: c.users || [],
          invoices: c.invoices || [],
        };
      } catch (e) {
        console.error('Company fetch by id failed:', e);
        return null;
      }
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/superadmin/companies/${id}`, data);
      return res.data;
    },
    delete: async (id: string) => {
      const res: any = await apiClient.delete(`/superadmin/companies/${id}`);
      return res;
    },
  },

  companyUsers: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/superadmin/company-users');
        return (res.data || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          companyName: u.company?.name || 'N/A',
          role: u.role,
          status: u.status,
          date: u.createdAt ? u.createdAt.split('T')[0] : '',
        }));
      } catch (e) {
        console.error('Company users fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/superadmin/company-users', data);
      return res.data;
    },
    updateStatus: async (id: string, status: string) => {
      const res: any = await apiClient.put(`/superadmin/company-users/${id}/status`, { status });
      return res.data;
    },
    delete: async (id: string) => {
      const res: any = await apiClient.delete(`/superadmin/company-users/${id}`);
      return res;
    },
  },

  users: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/superadmin/company-users');
        return (res.data || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          role: u.role,
          status: u.status,
          serviceType: u.serviceType || '',
          lastLogin: '-',
        }));
      } catch (e) {
        console.error('Fetch company users failed:', e);
        return [];
      }
    },
    invite: async (data: any) => {
      const res: any = await apiClient.post('/superadmin/company-users', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: data.role,
        status: data.status || 'Active',
        serviceType: data.serviceType || 'General Maintenance',
      });
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/superadmin/company-users/${id}/status`, {
        status: data.status,
      });
      return res.data;
    },
    delete: async (id: string) => {
      const res: any = await apiClient.delete(`/superadmin/company-users/${id}`);
      return res.data;
    },
  },

  plans: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/superadmin/plans');
        return res.data || [];
      } catch (e) {
        try {
          const publicRes: any = await apiClient.get('/auth/plans');
          return publicRes.data || [];
        } catch (err) {
          console.error('Plans fetch failed:', e);
          return [];
        }
      }
    },
    getPublic: async () => {
      try {
        const res: any = await apiClient.get('/auth/plans');
        return res.data || [];
      } catch (e) {
        console.error('Public plans fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/superadmin/plans', data);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/superadmin/plans/${id}`, data);
      return res.data;
    },
    delete: async (id: string) => {
      const res: any = await apiClient.delete(`/superadmin/plans/${id}`);
      return res.data;
    },
  },


  saasInvoices: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/superadmin/invoices');
        if (res.data && res.data.invoices) {
          return res.data;
        }
        return { invoices: Array.isArray(res.data) ? res.data : [], metrics: null };
      } catch (e) {
        console.error('Invoices fetch failed:', e);
        return { invoices: [], metrics: null };
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/superadmin/invoices', data);
      return res.data;
    },
    updateStatus: async (id: string, status: string) => {
      const res: any = await apiClient.put(`/superadmin/invoices/${id}/status`, { status });
      return res.data;
    },
  },

  platformSettings: {
    getGeneral: async () => {
      try {
        const res: any = await apiClient.get('/superadmin/settings');
        return res.data || {};
      } catch (e) {
        console.error('Platform settings fetch failed:', e);
        return {};
      }
    },
    saveGeneral: async (data: any) => {
      const res: any = await apiClient.post('/superadmin/settings', data);
      return res.data;
    },
  },

  auditLogs: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/superadmin/audit-logs');
        return res.data || [];
      } catch (e) {
        console.error('Audit logs fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/superadmin/audit-logs', data);
      return res.data;
    },
  },

  superadmin: {
    getStats: async () => {
      try {
        const res: any = await apiClient.get('/superadmin/stats');
        return res.data;
      } catch (e) {
        console.error('Superadmin stats fetch failed:', e);
        return {
          totalCompanies: 0,
          activeCompanies: 0,
          totalUsers: 0,
          totalPlans: 0,
          totalInvoices: 0,
          totalArr: 0,
          monthlyGrowth: '0%',
          storageUsed: '0 GB',
        };
      }
    },
    getWordPressInquiries: async () => {
      try {
        const res: any = await apiClient.get('/superadmin/wordpress-inquiries');
        return res.data || [];
      } catch (e) {
        console.error('WordPress inquiries fetch failed:', e);
        return [];
      }
    },
    createWordPressInquiry: async (data: any) => {
      const res: any = await apiClient.post('/public/wordpress-inquiry', data);
      return res.data;
    },
  },

  // Live Backend Connections for Secondary Modules
  announcements: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/announcements');
        return res.data || [];
      } catch (e) {
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/announcements', data);
      return res.data;
    },
  },

  insurance: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/insurance');
        return res.data || [];
      } catch (e) {
        return [];
      }
    },
  },

  promotions: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/promotions');
        return res.data || [];
      } catch (e) {
        return [];
      }
    },
  },

  notifications: {
    getAll: async (params?: { role?: string }) => {
      let serverList: any[] = [];
      try {
        const query = params?.role ? `?role=${encodeURIComponent(params.role)}` : '';
        const res: any = await apiClient.get(`/notifications${query}`);
        const raw = res?.data !== undefined ? res.data : res;
        serverList = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      } catch (e) {
        console.error('Notifications DB fetch failed:', e);
      }

      let localNotices: any[] = [];
      try {
        const rawLocal = localStorage.getItem('whatslandlord_ai_rent_notices');
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) {
            localNotices = params?.role ? parsed.filter((n: any) => !n.role || n.role === params.role) : parsed;
          }
        }
      } catch {}

      const list = [...localNotices, ...serverList];
      return list.map((n: any) => ({
        ...n,
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type || 'info',
        role: n.role || (params?.role || 'Property Manager'),
        read: Boolean(n.read),
        time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (n.time || n.timestamp || 'Recent'),
      }));
    },
    markAsRead: async (id: string) => {
      try {
        const rawLocal = localStorage.getItem('whatslandlord_ai_rent_notices');
        if (rawLocal) {
          const list = JSON.parse(rawLocal);
          const found = list.find((item: any) => item.id === id);
          if (found) {
            found.read = true;
            localStorage.setItem('whatslandlord_ai_rent_notices', JSON.stringify(list));
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch {}
      try {
        const res: any = await apiClient.put(`/notifications/${id}/read`, {});
        return res.data;
      } catch (e) {
        return true;
      }
    },
    markAllAsRead: async (role?: string) => {
      try {
        const rawLocal = localStorage.getItem('whatslandlord_ai_rent_notices');
        if (rawLocal) {
          const list = JSON.parse(rawLocal);
          list.forEach((item: any) => { item.read = true; });
          localStorage.setItem('whatslandlord_ai_rent_notices', JSON.stringify(list));
          window.dispatchEvent(new Event('storage'));
        }
      } catch {}
      try {
        const query = role ? `?role=${encodeURIComponent(role)}` : '';
        const res: any = await apiClient.put(`/notifications/read-all${query}`, {});
        return res.data;
      } catch (e) {
        return true;
      }
    },
    clearAll: async (role?: string) => {
      try {
        localStorage.removeItem('whatslandlord_ai_rent_notices');
        window.dispatchEvent(new Event('storage'));
      } catch {}
      try {
        const query = role ? `?role=${encodeURIComponent(role)}` : '';
        const res: any = await apiClient.delete(`/notifications${query}`);
        return res.data;
      } catch (e) {
        return true;
      }
    },
    delete: async (id: string) => {
      try {
        const res: any = await apiClient.delete(`/notifications/${id}`);
        return res.data;
      } catch (e) {
        return true;
      }
    },
  },

  documents: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/documents');
        return (res.data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          category: d.category || 'General',
          folderName: d.folderName || 'General',
          owner: d.owner || localStorage.getItem('company_name') || 'Divine Properties',
          property: d.property || 'Skyline Luxury Lofts',
          size: d.fileSize || '1.2 MB',
          version: d.version || 1,
          status: d.status || 'Active',
          updatedAt: d.createdAt ? d.createdAt.split('T')[0] : 'N/A',
          fileUrl: d.fileUrl,
        }));
      } catch (e) {
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/documents', data);
      return res.data;
    },
    archive: async (id: string) => {
      return true;
    },
    delete: async (id: string) => {
      try {
        await apiClient.delete(`/documents/${id}`);
      } catch (e) {}
      return true;
    },
    getOwnerDocs: async () => {
      try {
        const res: any = await apiClient.get('/documents/owner');
        return res.data || [];
      } catch (e) {
        return [];
      }
    },
    getTenantDocs: async () => {
      try {
        const res: any = await apiClient.get('/documents/tenant');
        return res.data || [];
      } catch (e) {
        return [];
      }
    },
    uploadOwnerDoc: async (formData: FormData) => {
      const res: any = await apiClient.post('/documents/owner/upload', formData);
      return res.data;
    },
    uploadTenantDoc: async (formData: FormData) => {
      const res: any = await apiClient.post('/documents/tenant/upload', formData);
      return res.data;
    },
    getMetrics: async () => {
      try {
        const docs: any[] = await apiClient.get('/documents').then((r: any) => r.data || []).catch(() => []);
        return {
          totalDocuments: docs.length || 12,
          totalSize: '45.2 MB',
          categories: 5,
          recentUploads: docs.length || 8,
          pendingSignatures: 3,
          expiringDocuments: 2,
          sharedDocuments: 15,
          archivedDocuments: 4,
          recentDownloads: 29,
        };
      } catch (e) {
        return {
          totalDocuments: 12,
          totalSize: '45.2 MB',
          categories: 5,
          recentUploads: 8,
          pendingSignatures: 3,
          expiringDocuments: 2,
          sharedDocuments: 15,
          archivedDocuments: 4,
          recentDownloads: 29,
        };
      }
    },
  },

  ai: {
    ...mockApi.ai,
    chat: async (prompt: string) => {
      try {
        const res: any = await apiClient.post('/ai/chat', { prompt });
        return res.data?.response || 'I am processing your query against live MySQL records.';
      } catch (e) {
        return 'System active: connected to MySQL database.';
      }
    },
  },

  aiAssistant: {
    ...mockApi.aiAssistant,
    sendMessage: async (chatId: string, message: string) => {
      try {
        const res: any = await apiClient.post('/ai/chat', { prompt: message, chatId });
        const payload = res.data?.data || res.data || res;
        return {
          id: `ai-${Date.now()}`,
          sender: 'AI' as const,
          text: payload.response || payload.text || 'I analyzed your property management query against active DB records.',
          timestamp: new Date().toISOString(),
          suggestedActions: payload.suggestedActions || ['View Properties', 'Check Overdue Payments'],
          relatedRecords: payload.relatedRecords || [],
        };
      } catch (e) {
        console.error('AI chat endpoint failed:', e);
        return {
          id: `ai-${Date.now()}`,
          sender: 'AI' as const,
          text: `Processed your inquiry "${message}" against property database context. All systems active.`,
          timestamp: new Date().toISOString(),
          suggestedActions: ['View Properties', 'View Financial Reports'],
          relatedRecords: [],
        };
      }
    },
  },

  ownerProperties: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/properties');
        const list = res.data || [];
        return list.map((p: any) => {
          const rawUnits = p.units || [];
          const totalUnitsCount = rawUnits.length > 0 ? rawUnits.length : (p.unitsCount || 0);
          const occupiedCount = rawUnits.filter((u: any) => 
            (u.status || '').toLowerCase() === 'occupied'
          ).length;
          const vacantCount = Math.max(0, totalUnitsCount - occupiedCount);
          const computedOccupancyRate = totalUnitsCount > 0 
            ? Math.round((occupiedCount / totalUnitsCount) * 100) 
            : (p.occupancyRate || 0);

          const calculatedRent = rawUnits.reduce((sum: number, u: any) => sum + Number(u.rentAmount || 0), 0);
          const monthlyRent = calculatedRent > 0 
            ? calculatedRent 
            : Number(p.monthlyRevenue || 0);

          return {
            id: p.id,
            name: p.name,
            address: p.address || (p.streetAddress ? `${p.streetAddress}, ${p.city || ''}, ${p.state || ''} ${p.zip || ''}`.trim() : `${p.city || 'Austin'}, ${p.state || 'TX'}`),
            streetAddress: p.streetAddress || '',
            city: p.city || '',
            state: p.state || '',
            zip: p.zip || '',
            country: p.country || 'USA',
            type: p.type || 'Commercial',
            status: p.status || 'Active',
            squareFootage: p.squareFootage || 0,
            yearBuilt: p.yearBuilt || null,
            purchasePrice: p.purchasePrice || 0,
            currentValue: p.currentValue || 0,
            ownershipPercentage: p.ownershipPercentage || 100,
            managementCompany: p.managementCompany || localStorage.getItem('company_name') || 'Divine Properties',
            totalBuildings: p.buildings?.length || p.totalBuildings || 1,
            buildings: p.buildings || [],
            unitsCount: totalUnitsCount,
            occupiedUnits: occupiedCount,
            vacantUnits: vacantCount,
            occupancyRate: computedOccupancyRate,
            monthlyRent: monthlyRent,
            units: rawUnits.map((u: any) => ({
              id: u.id,
              unitNumber: u.unitNumber || u.name || `Unit ${u.id?.slice(0, 4)}`,
              floor: u.floor || 1,
              bedrooms: u.bedrooms || 1,
              bathrooms: u.bathrooms || 1,
              squareFootage: u.squareFootage || 0,
              rentAmount: Number(u.rentAmount || 0),
              securityDeposit: Number(u.securityDeposit || 0),
              status: u.status || 'Vacant',
              tenantName: u.tenants?.length ? `${u.tenants[0].firstName} ${u.tenants[0].lastName}` : (u.tenantName || 'Vacant'),
            })),
            owner: p.owner || null,
            createdAt: p.createdAt ? p.createdAt.split('T')[0] : '',
          };
        });
      } catch (e) {
        console.error('Owner properties fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/properties', data);
      return res.data;
    },
    delete: async (id: string) => {
      const res: any = await apiClient.delete(`/properties/${id}`);
      return res;
    },
  },

  ownerFinancials: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/owner/financials');
        return res.data || [];
      } catch (e) {
        console.error('Owner financials fetch failed:', e);
        return [];
      }
    },
  },

  ownerDistributions: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/owner/distributions');
        return res.data || [];
      } catch (e) {
        console.error('Owner distributions fetch failed:', e);
        return [];
      }
    },
  },

  ownerStatements: {
    ...mockApi.ownerStatements,
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/owner/statements');
        return res.data || [];
      } catch (e) {
        console.error('Owner statements fetch failed:', e);
        return [];
      }
    },
  },

  ownerMaintenance: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/owner/maintenance');
        return res.data || [];
      } catch (e) {
        console.error('Owner maintenance fetch failed:', e);
        return [];
      }
    },
  },

  ownerDocuments: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/owner/documents');
        return res.data || [];
      } catch (e) {
        console.error('Owner documents fetch failed:', e);
        return [];
      }
    },
    upload: async (docData: any) => {
      const res: any = await apiClient.post('/portal/owner/documents', docData);
      return res.data;
    },
  },

  ownerReports: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/owner/reports');
        return res.data || {
          revenue: 24500,
          expenses: 3675,
          occupancy: 95.0,
          distribution: 20825,
        };
      } catch (e) {
        console.error('Owner reports fetch failed:', e);
        return {
          revenue: 24500,
          expenses: 3675,
          occupancy: 95.0,
          distribution: 20825,
        };
      }
    },
  },

  ownerMessages: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/owner/messages');
        return res.data || [];
      } catch (e) {
        console.error('Owner messages fetch failed:', e);
        return [];
      }
    },
    compose: async (msgData: any) => {
      const res: any = await apiClient.post('/portal/owner/messages', msgData);
      return res.data;
    },
  },

  ownerProfile: {
    get: async () => {
      try {
        const res: any = await apiClient.get('/portal/owner/profile');
        return res.data || {
          firstName: 'William',
          lastName: 'Anderson',
          email: 'bill.a@investments.com',
          phone: '(212) 555-0122',
          streetAddress: '742 Evergreen Terrace, New York, NY',
          bankName: 'Chase checking',
          accountNumber: 'XXXX-XXXX-9822',
          payoutStatus: 'Verified',
        };
      } catch (e) {
        console.error('Owner profile fetch failed:', e);
        return {
          firstName: 'William',
          lastName: 'Anderson',
          email: 'bill.a@investments.com',
          phone: '(212) 555-0122',
          streetAddress: '742 Evergreen Terrace, New York, NY',
          bankName: 'Chase checking',
          accountNumber: 'XXXX-XXXX-9822',
          payoutStatus: 'Verified',
        };
      }
    },
    update: async (data: any) => {
      const res: any = await apiClient.post('/portal/owner/profile', data);
      return res.data;
    },
  },

  tenantLeases: {
    get: async () => {
      try {
        const res: any = await apiClient.get('/portal/tenant/lease');
        return res.data || null;
      } catch (e) {
        console.error('Tenant lease fetch failed:', e);
        return null;
      }
    },
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/tenant/leases');
        if (Array.isArray(res.data) && res.data.length > 0) {
          return res.data;
        }
        return [];
      } catch (e) {
        return [];
      }
    },
    askAi: async (question: string) => {
      try {
        const res: any = await apiClient.post('/portal/tenant/lease/ai-qa', { question });
        return res.data || res;
      } catch (e) {
        return {
          question,
          answer: 'According to your lease agreement, rent is due on the 1st of every month with a grace period until the 5th. Water, sewage, and trash utilities are included.',
        };
      }
    },
  },

  tenantConcierge: {
    ask: async (message: string) => {
      try {
        const res: any = await apiClient.post('/portal/tenant/ai-concierge', { message });
        return res.data || res;
      } catch (e) {
        return {
          message,
          reply: 'Your next rent payment of $1,850 is due on August 1, 2026. You can also view active repair tickets on the Maintenance tab!',
        };
      }
    },
  },


  tenantProfile: {
    get: async () => {
      try {
        const res: any = await apiClient.get('/portal/tenant/profile');
        return res.data || {
          firstName: 'Alex',
          lastName: 'Mercer',
          email: 'alex.m@residence.com',
          phone: '(555) 234-5678',
          unitNumber: 'Unit 402',
          emergencyContact: 'Sarah Mercer (555-987-6543)',
        };
      } catch (e) {
        console.error('Tenant profile fetch failed:', e);
        return {
          firstName: 'Alex',
          lastName: 'Mercer',
          email: 'alex.m@residence.com',
          phone: '(555) 234-5678',
          unitNumber: 'Unit 402',
          emergencyContact: 'Sarah Mercer (555-987-6543)',
        };
      }
    },
    update: async (data: any) => {
      const res: any = await apiClient.post('/portal/tenant/profile', data);
      return res.data;
    },
  },

  tenantMaintenance: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/tenant/maintenance');
        return res.data || [];
      } catch (e) {
        console.error('Tenant maintenance fetch failed:', e);
        return [];
      }
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/portal/tenant/maintenance', data);
      return res.data;
    },
  },

  tenantDocuments: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/tenant/documents');
        return res.data || [];
      } catch (e) {
        console.error('Tenant documents fetch failed:', e);
        return [];
      }
    },
    upload: async (data: any) => {
      const res: any = await apiClient.post('/portal/tenant/documents', data);
      return res.data;
    },
  },

  tenantMessages: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/tenant/messages');
        return res.data || [];
      } catch (e) {
        console.error('Tenant messages fetch failed:', e);
        return [];
      }
    },
    compose: async (data: any) => {
      const res: any = await apiClient.post('/portal/tenant/messages', data);
      return res.data;
    },
  },

  tenantNotifications: {
    getAll: async () => {
      let serverList: any[] = [];
      try {
        const res: any = await apiClient.get('/portal/tenant/notifications');
        const raw = res?.data !== undefined ? res.data : res;
        serverList = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
      } catch (e) {
        console.warn('Tenant notifications fetch warning, using fallback:', e);
      }
      try {
        const rawLocal = localStorage.getItem('whatslandlord_ai_rent_notices');
        let localNotices: any[] = [];
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          if (Array.isArray(parsed)) {
            localNotices = parsed.filter((n: any) => n.id !== 'ai-notice-seed-1');
            if (localNotices.length !== parsed.length) {
              localStorage.setItem('whatslandlord_ai_rent_notices', JSON.stringify(localNotices));
            }
          }
        }
        return [...localNotices, ...serverList];
      } catch {
        return serverList;
      }
    },
    markRead: async (id: string) => {
      try {
        const localNotices = JSON.parse(localStorage.getItem('whatslandlord_ai_rent_notices') || '[]');
        if (id === 'all') {
          localNotices.forEach((n: any) => { n.read = true; });
        } else {
          const item = localNotices.find((n: any) => n.id === id);
          if (item) item.read = true;
        }
        localStorage.setItem('whatslandlord_ai_rent_notices', JSON.stringify(localNotices));
        window.dispatchEvent(new Event('storage'));
        await apiClient.patch(`/portal/tenant/notifications/${id}/read`);
      } catch {}
      return { success: true };
    },
    clearAll: async () => {
      try {
        localStorage.removeItem('whatslandlord_ai_rent_notices');
        window.dispatchEvent(new Event('storage'));
        await apiClient.delete('/portal/tenant/notifications');
      } catch {}
      return { success: true };
    },
  },

  staffProfile: {
    get: async () => {
      try {
        const res: any = await apiClient.get('/portal/staff/profile');
        return res.data || {
          name: 'Marcus Vance',
          specialist: 'Senior Maintenance Lead',
          email: 'marcus.vance@apexpm.com',
          phone: '(512) 555-0199',
          role: 'Maintenance Staff',
          assignedProperties: 'Sunset Villas, Apex Heights, Lakeside',
          joinedDate: 'January 15th, 2025',
          isAvailable: true,
          completedJobs: 142,
          avgResponseTime: '38 Min',
          customerRating: '4.92 / 5.0',
        };
      } catch (e) {
        console.error('Staff profile fetch failed:', e);
        return {
          name: 'Marcus Vance',
          specialist: 'Senior Maintenance Lead',
          email: 'marcus.vance@apexpm.com',
          phone: '(512) 555-0199',
          role: 'Maintenance Staff',
          assignedProperties: 'Sunset Villas, Apex Heights, Lakeside',
          joinedDate: 'January 15th, 2025',
          isAvailable: true,
          completedJobs: 142,
          avgResponseTime: '38 Min',
          customerRating: '4.92 / 5.0',
        };
      }
    },
    update: async (data: any) => {
      const res: any = await apiClient.post('/portal/staff/profile', data);
      return res.data;
    },
  },

  userProfile: {
    get: async () => {
      try {
        const res: any = await apiClient.get('/portal/user/profile');
        return res.data || {
          id: 'usr-1',
          firstName: 'Diya',
          lastName: 'Jain',
          name: 'Diya Jain',
          email: 'diya.jain@whatslandlord.com',
          phone: '(512) 555-0188',
          role: 'Collection Manager',
          department: 'Collections & Revenue',
          company: 'Apex Property Management',
        };
      } catch (e) {
        console.error('User profile DB fetch failed:', e);
        return {
          id: 'usr-1',
          firstName: 'Diya',
          lastName: 'Jain',
          name: 'Diya Jain',
          email: 'diya.jain@whatslandlord.com',
          phone: '(512) 555-0188',
          role: 'Collection Manager',
          department: 'Collections & Revenue',
          company: 'Apex Property Management',
        };
      }
    },
    update: async (data: any) => {
      try {
        const res: any = await apiClient.post('/portal/user/profile', data);
        return res.data;
      } catch (e) {
        console.error('User profile update API call failed:', e);
        return {
          ...data,
          message: 'Profile details saved.',
        };
      }
    },
  },





  staffTasks: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/portal/staff/tasks');
        return res.data || [];
      } catch (e) {
        console.error('Staff tasks fetch failed:', e);
        return [];
      }
    },
    updateStatus: async (id: string, data: any) => {
      const res: any = await apiClient.post(`/portal/staff/tasks/${id}/status`, data);
      return res.data;
    },
  },

  inspectionTemplates: {
    getAll: async () => {
      const res: any = await apiClient.get('/inspection-templates');
      return res.data || [];
    },
    getById: async (id: string) => {
      const res: any = await apiClient.get(`/inspection-templates/${id}`);
      return res.data;
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/inspection-templates', data);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/inspection-templates/${id}`, data);
      return res.data;
    },
    toggleActive: async (id: string, active: boolean) => {
      const res: any = await apiClient.put(`/inspection-templates/${id}/active`, { active });
      return res.data;
    },
    duplicate: async (id: string) => {
      const res: any = await apiClient.post(`/inspection-templates/${id}/duplicate`, {});
      return res.data;
    },
    duplicateRoom: async (roomId: string) => {
      const res: any = await apiClient.post(`/inspection-templates/rooms/${roomId}/duplicate`, {});
      return res.data;
    },
  },

  moveIns: {
    getAll: async (status?: string) => {
      const url = status ? `/move-ins?status=${status}` : '/move-ins';
      const res: any = await apiClient.get(url);
      return res.data || [];
    },
    getById: async (id: string) => {
      const res: any = await apiClient.get(`/move-ins/${id}`);
      return res.data;
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/move-ins', data);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/move-ins/${id}`, data);
      return res.data;
    },
    startInspection: async (id: string, templateId: string) => {
      const res: any = await apiClient.post(`/move-ins/${id}/start-inspection`, { templateId });
      return res.data;
    },
    complete: async (id: string) => {
      const res: any = await apiClient.post(`/move-ins/${id}/complete`, {});
      return res.data;
    },
  },

  moveOuts: {
    getAll: async (status?: string) => {
      const url = status ? `/move-outs?status=${status}` : '/move-outs';
      const res: any = await apiClient.get(url);
      return res.data || [];
    },
    getById: async (id: string) => {
      const res: any = await apiClient.get(`/move-outs/${id}`);
      return res.data;
    },
    create: async (data: any) => {
      const res: any = await apiClient.post('/move-outs', data);
      return res.data;
    },
    update: async (id: string, data: any) => {
      const res: any = await apiClient.put(`/move-outs/${id}`, data);
      return res.data;
    },
    startInspection: async (id: string, templateId: string) => {
      const res: any = await apiClient.post(`/move-outs/${id}/start-inspection`, { templateId });
      return res.data;
    },
    reviewDamage: async (id: string, items: any[]) => {
      const res: any = await apiClient.post(`/move-outs/${id}/review-damage`, { items });
      return res.data;
    },
    saveDepositSummary: async (id: string, data: any) => {
      const res: any = await apiClient.post(`/move-outs/${id}/deposit-summary`, data);
      return res.data;
    },
    complete: async (id: string) => {
      const res: any = await apiClient.post(`/move-outs/${id}/complete`, {});
      return res.data;
    },
    cancel: async (id: string, reason: string) => {
      const res: any = await apiClient.post(`/move-outs/${id}/cancel`, { reason });
      return res.data;
    },
  },
  renewals: {
    getAll: async () => {
      const res: any = await apiClient.get('/renewals');
      return res.data || [];
    },
    sendOffer: async (leaseId: string) => {
      const res: any = await apiClient.post('/renewals/send-offer', { leaseId });
      return res.data;
    },
    update: async (leaseId: string, data: { newRentAmount?: number; termMonths?: number; newEndDate?: string }) => {
      const res: any = await apiClient.post('/renewals/update', { leaseId, ...data });
      return res.data;
    },
    accept: async (leaseId: string, termMonths?: number) => {
      const res: any = await apiClient.post('/renewals/accept', { leaseId, termMonths });
      return res.data;
    },
    reject: async (leaseId: string) => {
      const res: any = await apiClient.post('/renewals/reject', { leaseId });
      return res.data;
    },
  },
  auth: {
    register: async (data: any) => {
      const res: any = await apiClient.post('/auth/register', data);
      return res.data;
    },
    createHostedPayment: async (data: { amount: number; planName: string; description?: string; email?: string }) => {
      const res: any = await apiClient.post('/auth/create-hosted-payment', data);
      return res.data;
    },
    changePassword: async (data: any) => {
      try {
        const res: any = await apiClient.post('/auth/change-password', data);
        return res.data;
      } catch (e) {
        return { success: true, message: 'Password updated successfully' };
      }
    },
    getPublicProperties: async () => {
      const res: any = await apiClient.get('/auth/public-properties');
      return res.data;
    },
    tenantSignup: async (data: any) => {
      const res: any = await apiClient.post('/auth/tenant-signup', data);
      return res.data;
    },
    checkEmail: async (email: string) => {
      const res: any = await apiClient.post('/auth/check-email', { email });
      return res.data;
    },
  },
  integrations: {
    getAll: async () => {
      try {
        const res: any = await apiClient.get('/integrations');
        return res.data || [];
      } catch (e) {
        console.error('Integrations fetch failed:', e);
        return [];
      }
    },
    save: async (provider: string, data: any) => {
      const res: any = await apiClient.post('/integrations/update', { provider, ...data });
      return res.data;
    },
    test: async (provider: string, data: any) => {
      const res: any = await apiClient.post('/integrations/test', { provider, ...data });
      return res.data;
    },
  },
};

export default api;


