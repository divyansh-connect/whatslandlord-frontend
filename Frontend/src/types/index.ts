export interface Property {
  id: string;
  name: string;
  type: 'Apartment' | 'Commercial' | 'Single Family' | 'Multi Family' | 'HOA';
  status: 'Active' | 'Inactive' | 'Under Review' | 'Archived' | 'Draft';
  owner: any;
  ownershipPercentage: number;
  managementCompany: string;
  address: string; // Combined format
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  unitsCount: number;
  occupiedUnits: number;
  occupancyRate: number;
  monthlyRevenue: number;
  yearBuilt: number;
  totalBuildings: number;
  squareFootage: number;
  purchasePrice: number;
  currentValue: number;
  monthlyExpenses: number;
  createdAt: string;
  nycBin?: string;
  imageUrl?: string;
  photos?: string[];
  documents?: string[];
}

export interface Unit {
  id: string;
  propertyId: string;
  propertyName: string;
  buildingId?: string;
  buildingName?: string;
  unitNumber: string;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  rentAmount: number;
  securityDeposit: number;
  availabilityDate: string;
  status: 'Occupied' | 'Vacant' | 'Reserved' | 'Under Maintenance';
  tenantId?: string;
  tenantName?: string;
}

export interface Building {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  floors: number;
  unitsCount: number;
  occupancyRate?: number;
  address?: string;
  status?: 'Active' | 'Inactive';
}

export interface Tenant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  unitId?: string;
  unitNumber?: string;
  propertyId?: string;
  propertyName?: string;
  status: 'Active' | 'Inactive' | 'Pending';
  invoices?: Invoice[];
  previousBalance?: number;
  openingBalance?: number;
  ssn?: string;
  employer?: string;
  emergencyPhone?: string;
  jobPhone?: string;
}

export interface Lead {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  propertyOfInterestId?: string;
  propertyName?: string;
  property?: string;
  budget?: number;
  moveInDate?: string;
  priority?: string;
  assignedAgent?: string;
  notes?: string;
  status: 'New' | 'Contacted' | 'Tour Scheduled' | 'Application Sent' | 'Negotiating' | 'Lease Signed' | 'Lost' | 'Showing Scheduled' | 'Applied';
  createdAt: string;
}

export interface Application {
  id: string;
  tenantName: string;
  email: string;
  propertyName: string;
  unitNumber: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedDate: string;
  rentProposed: number;
}

export interface Lease {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  status: 'Active' | 'Pending' | 'Expired' | 'Terminated';
}

export interface Renewal {
  id: string;
  leaseId: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  currentEndDate: string;
  newStartDate: string;
  newEndDate: string;
  newRentAmount: number;
  status: 'Pending' | 'Accepted' | 'Declined';
}

export interface Owner {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  propertiesOwnedCount: number;
  payoutMethod: string;
}

export interface RentPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'Paid' | 'Unpaid' | 'Overdue' | 'Partial' | 'Pending' | 'Partially Paid' | 'Failed' | 'Refunded' | 'Voided';
  paymentMethod: string;
  referenceNumber: string;
  createdBy: string;
  leaseId?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'Income' | 'Expense';
  category: string;
  amount: number;
  propertyName: string;
  description: string;
  reference?: string;
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  unitName?: string;
  tenantName: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent' | 'Emergency';
  status: 'New' | 'Submitted' | 'Approved' | 'Assigned' | 'In Progress' | 'Waiting for Parts' | 'Completed' | 'Cancelled';
  assignedVendorId?: string;
  assignedVendorName?: string;
  createdAt: string;
  preferredTime?: string;
  cost?: number;
  messages?: { id: string; senderName: string; role: 'Tenant' | 'Manager'; text: string; timestamp: string }[];
  notes?: string;
  resolutionNotes?: string;
  date?: string;
}


export interface Vendor {
  id: string;
  name: string;
  category: string;
  phone: string;
  email: string;
  rating: number;
  primaryContact?: string;
  licenseNumber?: string;
  insuranceExpiration?: string;
  emergencyAvailability?: boolean;
  preferred?: boolean;
  activeJobs?: number;
  completedJobs?: number;
  responseTime?: string;
  status?: string;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  vendorId?: string;
  vendorName: string;
  assignedTechnician: string;
  scheduledDate: string;
  estimatedCost: number;
  actualCost: number;
  status: 'Draft' | 'Assigned' | 'Scheduled' | 'In Progress' | 'Waiting' | 'Completed' | 'Closed' | 'Cancelled' | 'Rejected' | 'New';
  issue?: string;
  description?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  rejectReason?: string;
  extraExpenses?: number;
  resolutionNotes?: string;
  advancePaymentAmount?: number;
  advancePaymentMethod?: string;
  advancePaymentDate?: string;
  advancePaymentRef?: string;
}

export interface PreventiveTask {
  id: string;
  task: string;
  assetId?: string;
  assetName: string;
  propertyId: string;
  propertyName: string;
  frequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
  nextDue: string;
  assignedVendorName: string;
  status: 'Scheduled' | 'Overdue' | 'Completed';
}

export interface MaintenanceAsset {
  id: string;
  assetName: string;
  serialNumber: string;
  propertyId: string;
  propertyName: string;
  location: string;
  purchaseDate: string;
  warrantyExpiration: string;
  manufacturer: string;
  model: string;
  expectedLife: number;
  currentCondition: number;
}

export interface InventoryItem {
  id: string;
  item: string;
  sku: string;
  category: string;
  quantity: number;
  reorderLevel: number;
  vendorName: string;
  unitCost: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export interface VendorInvoice {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  workOrderNumber: string;
  propertyName: string;
  amount: number;
  dueDate: string;
  status: 'Draft' | 'Pending' | 'Approved' | 'Paid' | 'Rejected';
}

export interface InspectionRecord {
  id: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  type: 'Move In' | 'Move Out' | 'Routine' | 'Annual' | 'Safety' | 'Fire' | 'Insurance' | 'Vendor Completion';
  checklist: { section: string; status: 'Pass' | 'Fail' | 'N/A'; notes?: string }[];
  status: 'Scheduled' | 'In Progress' | 'Completed';
  date: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
  propertyId?: string;
  tenantId?: string;
}

export interface Report {
  id: string;
  name: string;
  category: 'Financial' | 'Leasing' | 'Maintenance' | 'Tenant';
  description: string;
}

export interface DashboardMetrics {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  monthlyRevenue: number;
  pendingRent: number;
  expenses: number;
  openMaintenance: number;
  leasesExpiringSoon: number;
  occupancyRate: number;
}

export interface RevenueGrowthData {
  month: string;
  revenue: number;
}

export interface IncomeExpenseData {
  month: string;
  income: number;
  expenses: number;
}

export interface OccupancyTrendData {
  month: string;
  rate: number;
}

export interface MaintenanceAnalyticsData {
  category: string;
  count: number;
}

export interface DashboardChartData {
  revenueGrowth: RevenueGrowthData[];
  incomeVsExpenses: IncomeExpenseData[];
  occupancyTrend: OccupancyTrendData[];
  maintenanceAnalytics: MaintenanceAnalyticsData[];
}
export type PropertyType = 'Apartment' | 'Commercial' | 'Single Family' | 'Multi Family' | 'HOA';
export type PropertyStatus = 'Active' | 'Inactive' | 'Under Review' | 'Archived';
export type UnitStatus = 'Occupied' | 'Vacant' | 'Reserved' | 'Under Maintenance';

export interface Invoice {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Partially Paid' | 'Overdue' | 'Cancelled';
  lineItems: { description: string; amount: number }[];
  notes?: string;
}

export interface Charge {
  id: string;
  name: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  frequency: 'One Time' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annually';
  amount: number;
  status: 'Active' | 'Disabled';
  type: string;
}

export interface SecurityDeposit {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyName: string;
  amount: number;
  heldBalance: number;
  refundableAmount: number;
  status: 'Held' | 'Partially Refunded' | 'Refunded' | 'Forfeited';
}

export interface PaymentPlan {
  id: string;
  tenantId: string;
  tenantName: string;
  originalBalance: number;
  remainingBalance: number;
  installments: number;
  nextDueDate: string;
  status: 'Active' | 'Completed' | 'Defaulted' | 'Cancelled';
}

export interface Refund {
  id: string;
  tenantId: string;
  tenantName: string;
  paymentId: string;
  amount: number;
  method: string;
  status: 'Pending' | 'Processed' | 'Failed' | 'Cancelled';
  date: string;
}

export interface CoAAccount {
  id: string;
  accountNumber: string;
  accountName: string;
  parentAccount?: string;
  accountType: 'Assets' | 'Liabilities' | 'Equity' | 'Income' | 'Expenses' | 'Other Income' | 'Other Expense';
  subType?: string;
  description?: string;
  currency: string;
  status: 'Active' | 'Inactive';
  balance: number;
}

export interface JournalEntryLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  referenceNumber?: string;
  description: string;
  status: 'Draft' | 'Posted' | 'Reversed';
  createdBy: string;
  lines: JournalEntryLine[];
}

export interface GeneralLedgerRecord {
  id: string;
  date: string;
  accountId: string;
  accountName: string;
  description: string;
  reference?: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: 'Checking' | 'Savings' | 'Escrow' | 'Trust';
  openingBalance: number;
  currentBalance: number;
  currency: string;
  status: 'Active' | 'Inactive';
}

export interface ExpenseRecord {
  id: string;
  vendorId?: string;
  vendorName: string;
  propertyId: string;
  propertyName: string;
  category: string;
  date: string;
  amount: number;
  tax: number;
  paymentMethod: string;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected';
  notes?: string;
}

export interface IncomeRecord {
  id: string;
  date: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  category: string;
  amount: number;
  status: 'Pending' | 'Cleared' | 'Failed';
}

export interface VendorBill {
  id: string;
  billNumber: string;
  vendorId?: string;
  vendorName: string;
  dueDate: string;
  amount: number;
  balance: number;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Paid' | 'Overdue';
  lineItems: { description: string; amount: number }[];
}

export interface RecurringTransaction {
  id: string;
  name: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  transactionType: 'Expense' | 'Income' | 'Bill';
  amount: number;
  startDate: string;
  endDate?: string;
  nextRun: string;
  status: 'Active' | 'Paused' | 'Ended';
}

export interface Budget {
  id: string;
  propertyId: string;
  propertyName: string;
  category: string;
  year: number;
  amount: number;
  actualAmount: number;
}

export interface OwnerStatement {
  id: string;
  ownerName: string;
  propertyName: string;
  period: string;
  income: number;
  expenses: number;
  netDistribution: number;
  status: 'Generated' | 'Paid' | 'Held';
}

export interface TaxRate {
  id: string;
  name: string;
  percentage: number;
  effectiveDate: string;
  status: 'Active' | 'Inactive';
}

export interface OwnerDistribution {
  id: string;
  distributionNumber: string;
  propertyName: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Scheduled' | 'Paid' | 'Cancelled';
  method: string;
}

export interface OwnerDocument {
  id: string;
  name: string;
  category: 'Statements' | 'Tax Documents' | 'Contracts' | 'Insurance' | 'Property Photos' | 'Maintenance Reports' | 'Inspection Reports' | 'Other';
  uploadedAt: string;
  size: string;
  fileUrl?: string;
}

export interface OwnerMessage {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
}

export interface OwnerSupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  description: string;
  status: 'Open' | 'Pending' | 'Resolved' | 'Closed';
  createdAt: string;
}

export interface TenantVisitor {
  id: string;
  visitorName: string;
  phone: string;
  vehicle?: string;
  licensePlate?: string;
  visitDate: string;
  arrivalTime: string;
  departureTime: string;
  notes?: string;
  status: 'Scheduled' | 'Checked In' | 'Checked Out' | 'Cancelled';
}

export interface TenantPackage {
  id: string;
  carrier: string;
  trackingNumber: string;
  deliveredDate: string;
  pickupStatus: 'Pending' | 'Picked Up';
  details?: string;
}

export interface TenantInsurancePolicy {
  id: string;
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  effectiveDate: string;
  expirationDate: string;
  policyFile?: string;
}

export interface TenantAnnouncement {
  id: string;
  title: string;
  category: 'Community' | 'Maintenance' | 'Events' | 'Safety' | 'Emergency';
  publishDate: string;
  priority: 'Low' | 'Normal' | 'High' | 'Emergency';
  body: string;
  read: boolean;
}

export interface TenantSupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  description: string;
  status: 'Open' | 'Pending' | 'Resolved' | 'Closed';
  createdAt: string;
}

export interface CommMessage {
  id: string;
  sender: string;
  recipient: string;
  body: string;
  timestamp: string;
  channel: 'Email' | 'SMS' | 'Notification' | 'Chat';
  status: 'Sent' | 'Delivered' | 'Read' | 'Failed';
}

export interface CommEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'Sent' | 'Draft' | 'Scheduled' | 'Failed';
}

export interface CommSMS {
  id: string;
  recipient: string;
  message: string;
  sentAt: string;
  status: 'Sent' | 'Delivered' | 'Failed' | 'Scheduled';
}

export interface CommAnnouncement {
  id: string;
  title: string;
  category: 'Community' | 'Emergency' | 'Maintenance' | 'Events' | 'Security' | 'General';
  audience: 'All Tenants' | 'Owners' | 'Vendors' | 'Employees';
  publishDate: string;
  status: 'Draft' | 'Scheduled' | 'Published' | 'Expired';
}

export interface CommCampaign {
  id: string;
  name: string;
  type: 'Email' | 'SMS' | 'Mixed';
  audience: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  status: 'Draft' | 'Scheduled' | 'Running' | 'Completed' | 'Cancelled';
}

export interface CommTemplate {
  id: string;
  title: string;
  category: 'Rent Reminder' | 'Lease Renewal' | 'Welcome' | 'Maintenance Update' | 'Payment Receipt' | 'Late Fee Notice' | 'Inspection Reminder' | 'General';
  body: string;
}

export interface CommContact {
  id: string;
  name: string;
  role: 'Tenant' | 'Owner' | 'Vendor' | 'Applicant' | 'Employee';
  property?: string;
  email: string;
  phone: string;
  status: string;
}

export interface CommConversation {
  id: string;
  contactName: string;
  lastMessage: string;
  channel: 'Email' | 'SMS' | 'Chat';
  assignedUser: string;
  status: 'Open' | 'Closed' | 'Snoozed';
  lastActivity: string;
}

export interface CommNotification {
  id: string;
  type: 'System' | 'Maintenance' | 'Payment' | 'Lease' | 'Inspection' | 'Documents' | 'Messages';
  title: string;
  body: string;
  status: 'Read' | 'Unread';
  createdAt: string;
}

export interface CommActivity {
  id: string;
  timestamp: string;
  user: string;
  channel: 'Email' | 'SMS' | 'Notification' | 'System';
  action: string;
}

// --- Phase 10: Document Management System ---

export type DocCategory =
  | 'Lease' | 'Invoice' | 'Receipt' | 'Statement' | 'Inspection'
  | 'Maintenance' | 'Tax' | 'Insurance' | 'Identification' | 'Contract'
  | 'Vendor' | 'Owner' | 'Tenant' | 'Financial' | 'Legal' | 'Other';

export type DocStatus = 'Active' | 'Archived' | 'Expired' | 'Draft' | 'Pending';

export interface DmsDocument {
  id: string;
  name: string;
  category: DocCategory;
  folderId?: string;
  folderName?: string;
  owner: string;
  property?: string;
  relatedEntity?: string;
  size: string;
  version: number;
  status: DocStatus;
  updatedAt: string;
  createdAt: string;
  expiresAt?: string;
  tags?: string[];
  description?: string;
}

export interface DmsFolder {
  id: string;
  name: string;
  parentId?: string;
  path: string;
  documentCount: number;
  createdAt: string;
}

export interface DmsTag {
  id: string;
  label: string;
  color: string;
}

export interface DmsTemplate {
  id: string;
  name: string;
  type: 'Lease Agreement' | 'Rental Application' | 'Owner Agreement' | 'Vendor Contract'
  | 'Inspection Report' | 'Notice' | 'Invoice' | 'Receipt' | 'Statement' | 'Other';
  body: string;
  createdAt: string;
}

export type SignatureStatus = 'Draft' | 'Sent' | 'Viewed' | 'Signed' | 'Declined' | 'Expired' | 'Cancelled';

export interface DmsSignatureRequest {
  id: string;
  documentId: string;
  documentName: string;
  requestedBy: string;
  signers: string[];
  status: SignatureStatus;
  sentAt: string;
  completedAt?: string;
  expiresAt: string;
}

export interface DmsFileVersion {
  id: string;
  documentId: string;
  documentName: string;
  versionNumber: number;
  uploadedBy: string;
  createdAt: string;
  size: string;
  notes?: string;
}

export interface DmsPermission {
  id: string;
  role: string;
  canView: boolean;
  canUpload: boolean;
  canDownload: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  canSign: boolean;
  canManageVersions: boolean;
}

export interface DmsDocumentRequest {
  id: string;
  title: string;
  description: string;
  requiredDocuments: string[];
  dueDate: string;
  recipient: string;
  recipientType: 'Tenant' | 'Owner' | 'Vendor' | 'Applicant';
  status: 'Draft' | 'Sent' | 'Submitted' | 'Completed' | 'Expired';
  createdAt: string;
}

export interface DmsAuditRecord {
  id: string;
  documentId: string;
  documentName: string;
  action: 'Upload' | 'Download' | 'Preview' | 'Edit' | 'Delete' | 'Share'
  | 'Signature Sent' | 'Signature Completed' | 'Permission Changed';
  performedBy: string;
  property?: string;
  timestamp: string;
}

export interface DmsShare {
  id: string;
  documentId: string;
  documentName: string;
  sharedBy: string;
  sharedWith: string;
  permissions: ('View' | 'Download' | 'Comment' | 'Edit' | 'Sign')[];
  expiresAt?: string;
  status: 'Active' | 'Expired' | 'Revoked';
}

// --- Phase 11: Reports, Analytics & Business Intelligence ---

export interface AnalyticsKpi {
  id: string;
  label: string;
  value: number;
  formatted: string;
  change: number;    // % vs previous period
  trend: 'up' | 'down' | 'flat';
  unit?: string;
}

export interface ChartDataPoint {
  period: string;   // "Jan 2026", "Week 3", etc.
  value: number;
  secondary?: number;
  tertiary?: number;
  label?: string;
}

export interface PropertyAnalyticsRecord {
  id: string;
  property: string;
  units: number;
  occupied: number;
  vacant: number;
  occupancyRate: number;
  revenue: number;
  expenses: number;
  noi: number;
  roi: number;
  maintenanceCost: number;
}

export interface TenantAnalyticsRecord {
  id: string;
  tenant: string;
  property: string;
  unit: string;
  leaseStatus: string;
  paymentStatus: string;
  outstandingBalance: number;
}

export interface LeasingFunnelStage {
  stage: string;
  count: number;
  conversion: number;
}

export interface VendorPerformanceRecord {
  id: string;
  vendor: string;
  jobsCompleted: number;
  avgResponseTime: string;
  rating: number;
  totalCost: number;
}

export interface ReportDefinition {
  id: string;
  name: string;
  category: 'Property' | 'Financial' | 'Tenant' | 'Leasing' | 'Maintenance' | 'Owner' | 'Custom';
  dataSource: string;
  fields: string[];
  filters: Record<string, string>;
  visualization: 'Table' | 'Bar' | 'Line' | 'Pie' | 'Area' | 'Funnel';
  createdAt: string;
  createdBy: string;
  isShared: boolean;
}

export interface SavedReport extends ReportDefinition {
  lastRun: string;
  rowCount: number;
}

export type ScheduleFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
export type ExportFormat = 'PDF' | 'CSV' | 'Excel';

export interface ScheduledReport {
  id: string;
  reportId: string;
  reportName: string;
  frequency: ScheduleFrequency;
  recipients: string[];
  format: ExportFormat;
  nextRun: string;
  status: 'Active' | 'Paused';
  createdAt: string;
}

export interface DashboardWidget {
  id: string;
  type: 'MetricCard' | 'LineChart' | 'BarChart' | 'PieChart' | 'Table' | 'Funnel' | 'Calendar';
  title: string;
  dataSource: string;
  col: number;
  row: number;
  w: number;
  h: number;
}

export interface CustomDashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  createdBy: string;
  createdAt: string;
  isShared: boolean;
}

export interface ExportRecord {
  id: string;
  name: string;
  type: ExportFormat;
  createdAt: string;
  createdBy: string;
  status: 'Processing' | 'Completed' | 'Failed';
  size?: string;
}

export interface ForecastDataPoint {
  period: string;
  actual?: number;
  forecast: number;
  lower: number;
  upper: number;
}

export interface Violation {
  id: string;
  propertyId: string;
  propertyName: string;
  unitNumber?: string;
  violationCode: string;
  issuingAuthority: string;
  description: string;
  fineAmount: number;
  dueDate: string;
  severity: 'Critical' | 'Warning';
  status: 'Open' | 'Resolved' | 'Disputed' | 'Settled';
  workOrderId?: string;
}

export interface ScreeningCheck {
  id: string;
  applicantId?: string;
  applicationId?: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  propertyId?: string;
  propertyName: string;
  unitId?: string;
  unitNumber: string;
  companyName?: string;
  screeningPackage: 'Basic' | 'Comprehensive';
  paymentResponsibility: 'Applicant' | 'Manager';
  paymentStatus?: 'Pending' | 'Paid' | 'Waived';
  applicantStatus: 'Invited' | 'Started' | 'Submitted';
  screeningStatus: 'Pending' | 'Processing' | 'Completed' | 'Approved' | 'Declined' | 'Pending Approval' | 'Pending Documents';
  identityVerificationStatus: 'Pending' | 'Verified' | 'Failed';
  creditScore?: number;
  creditRecommendation?: 'Approved' | 'Conditional' | 'Review Recommended' | 'Declined';
  criminalStatus: 'No Records Found' | 'Records Found' | 'Pending';
  evictionStatus: 'No Records Found' | 'Records Found' | 'Pending';
  incomeVerified?: boolean;
  screeningProvider?: string;
  invitationSentAt: string;
  consentSubmittedAt?: string;
  paymentCompletedAt?: string;
  reportGeneratedAt?: string;
  approvedAt?: string;
  declinedAt?: string;
  creditReportUrl?: string;
  criminalReportUrl?: string;
  evictionReportUrl?: string;
  dob?: string;
  ssn?: string;
  authorized?: boolean;
  documentUrl?: string;
  documentName?: string;
}
export interface RestoreBinItem {
  id: string;
  entityType: 'Property' | 'Unit' | 'Tenant' | 'Lease' | 'Owner' | 'Invoice' | 'Payment' | 'WorkOrder' | 'ServiceRequest' | 'Vendor' | 'Document' | string;
  entityId: string;
  title: string;
  subtitle?: string;
  deletedBy?: string;
  companyId?: string;
  deletedAt: string;
  createdAt?: string;
  data: any;
}


