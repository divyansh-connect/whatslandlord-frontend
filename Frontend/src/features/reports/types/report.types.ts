export interface PaginationInfo {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

export interface ReportResponse<T, S = any> {
  data: T[];
  summary?: S;
  pagination: PaginationInfo;
}

export interface ReportFiltersState {
  propertyId: string;
  unitId: string;
  tenantId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  status: string;
  priority: string;
  search: string;
  paymentMethod: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface RentRollItem {
  propertyName: string;
  unitNumber: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  leaseStatus: string;
  monthlyRent: number;
  securityDeposit: number;
  unitStatus: string;
}

export interface OccupancyItem {
  propertyName: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyPercentage: number;
}

export interface DelinquencyItem {
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  dueDate: string;
  rentAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  daysLate: number;
  paymentStatus: string;
}

export interface ProfitLossData {
  income: { name: string; amount: number }[];
  expenses: { name: string; amount: number }[];
  transactions?: any[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
  };
}

export interface MaintenanceItem {
  ticketId: string;
  propertyName: string;
  unitNumber: string;
  issue: string;
  priority: string;
  status: string;
  assignedPerson: string;
  vendor: string;
  estimatedCost: number;
  actualCost: number;
  createdDate: string;
  completedDate: string | null;
}

export interface PaymentHistoryItem {
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  paymentStatus: string;
}

export interface ExportHistoryItem {
  id: string;
  reportType: string;
  filters: string;
  fileName: string;
  fileUrl: string | null;
  fileType: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Failed';
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}
