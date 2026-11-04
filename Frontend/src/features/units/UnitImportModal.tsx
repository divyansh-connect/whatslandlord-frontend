import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  HelpCircle,
  Users,
  BarChart3,
} from 'lucide-react';
import { clsx } from 'clsx';

interface UnitImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (count: number) => void;
}

export type ValidationStatus = 'Ready' | 'File Duplicate' | 'DB Duplicate' | 'Error';

export interface ParsedUnitRow {
  rowIndex: number;
  propertyName: string;
  propertyId?: string;
  unitNumber: string;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  rentAmount: number;
  securityDeposit: number;
  status: 'Vacant' | 'Occupied';

  // Occupied Specific Fields
  tenantFirstName?: string;
  tenantLastName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  moveInDate?: string;
  invoiceStartDate?: string;
  pastRentStatus?: string;
  includeLateFee?: boolean;
  outstandingBalance?: number;

  validationStatus: ValidationStatus;
  isValid: boolean;
  errors: string[];
}

export interface ExecutionSummaryData {
  totalProcessed: number;
  importedCount: number;
  importedOccupied: number;
  importedVacant: number;
  occupancyRate: number;
  skippedCount: number;
  failedCount: number;
  isPartial: boolean;
}

export const UnitImportModal: React.FC<UnitImportModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch real registered properties
  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ['properties'],
    queryFn: () => api.property.getAll(),
  });

  // Fetch real registered units for DB Duplicate pre-validation
  const { data: existingUnits = [] } = useQuery<any[]>({
    queryKey: ['units'],
    queryFn: () => api.unit.getAll(),
  });

  const availablePropertyNames = properties
    .map((p: any) => p.name)
    .filter((name: string) => Boolean(name && name.trim()));

  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedUnitRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [executionSummary, setExecutionSummary] = useState<ExecutionSummaryData | null>(null);

  const normalizeKey = (key: string): string => {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const getPastMonthsCount = (startDateStr?: string) => {
    if (!startDateStr) return 0;
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return 0;
    const now = new Date();
    let count = 0;
    let curYear = start.getFullYear();
    let curMonth = start.getMonth();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth();
    if (curYear > endYear || (curYear === endYear && curMonth > endMonth)) return 0;
    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      count++;
      curMonth++;
      if (curMonth > 11) {
        curMonth = 0;
        curYear++;
      }
    }
    return count;
  };

  // Download Vacant Units Template
  const handleDownloadVacantTemplate = () => {
    const sampleProp1 = availablePropertyNames[0] || 'Sunset View Apartments';
    const sampleProp2 = availablePropertyNames[1] || sampleProp1;

    const templateData = [
      {
        'Property Name*': sampleProp1,
        'Unit Number*': '101',
        'Monthly Rent ($)*': 1450,
        'Floor': 1,
        'Bedrooms': 2,
        'Bathrooms': 1.5,
        'Square Footage': 850,
        'Security Deposit ($)': 1450,
        'Status': 'Vacant',
      },
      {
        'Property Name*': sampleProp1,
        'Unit Number*': '102',
        'Monthly Rent ($)*': 1200,
        'Floor': 1,
        'Bedrooms': 1,
        'Bathrooms': 1.0,
        'Square Footage': 650,
        'Security Deposit ($)': 1200,
        'Status': 'Vacant',
      },
      {
        'Property Name*': sampleProp2,
        'Unit Number*': '201',
        'Monthly Rent ($)*': 1950,
        'Floor': 2,
        'Bedrooms': 3,
        'Bathrooms': 2.0,
        'Square Footage': 1150,
        'Security Deposit ($)': 1950,
        'Status': 'Vacant',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 28 }, // Property Name*
      { wch: 16 }, // Unit Number*
      { wch: 20 }, // Monthly Rent ($)*
      { wch: 12 }, // Floor
      { wch: 12 }, // Bedrooms
      { wch: 12 }, // Bathrooms
      { wch: 18 }, // Square Footage
      { wch: 22 }, // Security Deposit ($)
      { wch: 14 }, // Status
    ];

    const instructionsData = [
      {
        'Requirement Level': '★ MANDATORY',
        'Column Header Name': 'Property Name*',
        'Description / Instructions': 'Exact registered name of your active property. Must match an existing property in the system.',
        'Example Value': sampleProp1,
        'System Automation': 'Links the imported unit directly under this property.',
      },
      {
        'Requirement Level': '★ MANDATORY',
        'Column Header Name': 'Unit Number*',
        'Description / Instructions': 'Unique unit, flat, or door number (e.g., 101, Apt 4B). Duplicates are prevented.',
        'Example Value': '101',
        'System Automation': 'Creates the unit record.',
      },
      {
        'Requirement Level': '★ MANDATORY',
        'Column Header Name': 'Monthly Rent ($)*',
        'Description / Instructions': 'Standard monthly rental rate (must be greater than 0).',
        'Example Value': '1450',
        'System Automation': 'Sets the unit base rent rate.',
      },
      {
        'Requirement Level': '○ OPTIONAL',
        'Column Header Name': 'Floor / Bedrooms / Bathrooms / Sqft',
        'Description / Instructions': 'Physical unit specifications. If omitted, defaults to 1 Floor, 1 Bed, 1 Bath.',
        'Example Value': 'Floor: 1 | Beds: 2 | Baths: 1.5 | Sqft: 850',
        'System Automation': 'Saves physical unit specs.',
      },
      {
        'Requirement Level': '○ OPTIONAL',
        'Column Header Name': 'Security Deposit ($)',
        'Description / Instructions': 'Security deposit amount. If omitted, defaults to 1 month rent.',
        'Example Value': '1450',
        'System Automation': 'Records initial security deposit in the ledger.',
      },
      {
        'Requirement Level': '○ OPTIONAL',
        'Column Header Name': 'Status',
        'Description / Instructions': 'Fixed as "Vacant". Unit will be imported ready for leasing.',
        'Example Value': 'Vacant',
        'System Automation': 'Listed as Vacant on the units ledger.',
      },
    ];

    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [
      { wch: 22 },
      { wch: 28 },
      { wch: 55 },
      { wch: 30 },
      { wch: 40 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vacant_Units');
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions_&_Guide');
    XLSX.writeFile(workbook, 'Unit_Vacant_Import_Template.xlsx');
  };

  // Download Occupied Units Template
  const handleDownloadOccupiedTemplate = () => {
    const sampleProp1 = availablePropertyNames[0] || 'Sunset View Apartments';
    const sampleProp2 = availablePropertyNames[1] || sampleProp1;

    const templateData = [
      {
        'Property Name*': sampleProp1,
        'Unit Number*': '101',
        'Monthly Rent ($)*': 1000,
        'Floor': 1,
        'Bedrooms': 2,
        'Bathrooms': 1.5,
        'Square Footage': 850,
        'Security Deposit ($)': 1000,
        'Status': 'Occupied',
        'Tenant First Name*': 'John',
        'Tenant Last Name*': 'Doe',
        'Tenant Email*': 'john.doe@example.com',
        'Tenant Phone*': '(512) 555-0199',
        'Move-In Date*': '2026-06-01',
        'Invoices From Date*': '2026-06-01',
        'Past Rent Status': 'All Paid',
        'Include Late Fee ($50)': 'NO',
        'Outstanding Balance ($)': 0,
      },
      {
        'Property Name*': sampleProp1,
        'Unit Number*': '102',
        'Monthly Rent ($)*': 1000,
        'Floor': 1,
        'Bedrooms': 1,
        'Bathrooms': 1.0,
        'Square Footage': 650,
        'Security Deposit ($)': 1000,
        'Status': 'Occupied',
        'Tenant First Name*': 'Sarah',
        'Tenant Last Name*': 'Miller',
        'Tenant Email*': 'sarah.miller@example.com',
        'Tenant Phone*': '(512) 555-0245',
        'Move-In Date*': '2026-06-01',
        'Invoices From Date*': '2026-06-01',
        'Past Rent Status': 'Partial / Custom',
        'Include Late Fee ($50)': 'YES',
        'Outstanding Balance ($)': 2000,
      },
      {
        'Property Name*': sampleProp2,
        'Unit Number*': '201',
        'Monthly Rent ($)*': 1000,
        'Floor': 2,
        'Bedrooms': 3,
        'Bathrooms': 2.0,
        'Square Footage': 1150,
        'Security Deposit ($)': 1000,
        'Status': 'Occupied',
        'Tenant First Name*': 'Michael',
        'Tenant Last Name*': 'Brown',
        'Tenant Email*': 'michael.brown@example.com',
        'Tenant Phone*': '(512) 555-0378',
        'Move-In Date*': '2026-06-01',
        'Invoices From Date*': '2026-06-01',
        'Past Rent Status': 'All Unpaid',
        'Include Late Fee ($50)': 'YES',
        'Outstanding Balance ($)': 6000,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet['!cols'] = [
      { wch: 26 },
      { wch: 14 },
      { wch: 18 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 20 },
      { wch: 12 },
      { wch: 20 },
      { wch: 20 },
      { wch: 26 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
      { wch: 20 },
      { wch: 22 },
      { wch: 24 },
    ];

    const instructionsData = [
      {
        'Section / Category': '📌 MANDATORY FIELD',
        'Column Header Name': 'Property Name*',
        'Description / Instructions': 'Exact registered name of your active property. Must match an active property in the system.',
        'Example Value': sampleProp1,
        'System Automation': 'Links the imported unit and tenant directly to this property.',
      },
      {
        'Section / Category': '📌 MANDATORY FIELD',
        'Column Header Name': 'Unit Number*',
        'Description / Instructions': 'Unique unit, flat, or door number (e.g. 101, Apt 4B). Duplicates are prevented.',
        'Example Value': '101',
        'System Automation': 'Creates the occupied unit record.',
      },
      {
        'Section / Category': '📌 MANDATORY FIELD',
        'Column Header Name': 'Monthly Rent ($)*',
        'Description / Instructions': 'Contracted monthly rental rate for this tenant (must be greater than 0).',
        'Example Value': '1000',
        'System Automation': 'Sets lease rent amount and recurring monthly billing charge.',
      },
      {
        'Section / Category': '📌 MANDATORY FIELD',
        'Column Header Name': 'Tenant First Name* & Last Name*',
        'Description / Instructions': 'Full legal first and last name of the resident occupying the unit.',
        'Example Value': 'John Doe',
        'System Automation': 'Creates an Active Resident profile in the system.',
      },
      {
        'Section / Category': '📌 MANDATORY FIELD',
        'Column Header Name': 'Tenant Email* & Phone*',
        'Description / Instructions': 'Primary email address and contact mobile phone number of the resident.',
        'Example Value': 'john.doe@example.com / (512) 555-0199',
        'System Automation': 'Configures tenant portal login access and SMS notifications.',
      },
      {
        'Section / Category': '📌 MANDATORY FIELD',
        'Column Header Name': 'Move-In Date*',
        'Description / Instructions': 'Resident original move-in date (Format: YYYY-MM-DD, e.g., 2026-06-01 for 6 months ago).',
        'Example Value': '2026-06-01',
        'System Automation': 'Sets the effective start date for the 1-Year Active Lease agreement.',
      },
      {
        'Section / Category': '📌 MANDATORY FIELD',
        'Column Header Name': 'Invoices From Date*',
        'Description / Instructions': 'Date to start historical invoice generation (Format: YYYY-MM-DD). Put 6 months ago (e.g., 2026-06-01).',
        'Example Value': '2026-06-01',
        'System Automation': 'Auto-generates individual monthly invoices from this start date up to the current month.',
      },
      {
        'Section / Category': '⚙️ INVOICING SETUP',
        'Column Header Name': 'Past Rent Status',
        'Description / Instructions': 'Historical payment status: Select "All Paid", "Partial / Custom", or "All Unpaid".',
        'Example Value': 'All Paid / Partial / Custom / All Unpaid',
        'System Automation': 'Determines whether historical monthly invoices are generated as Paid or Overdue.',
      },
      {
        'Section / Category': '⚙️ INVOICING SETUP',
        'Column Header Name': 'Include Late Fee ($50)',
        'Description / Instructions': 'Whether to apply a $50 late fee to overdue historical months ("YES" or "NO").',
        'Example Value': 'YES or NO',
        'System Automation': 'Appends $50 overdue fee item to unpaid monthly invoices.',
      },
      {
        'Section / Category': '⚙️ INVOICING SETUP',
        'Column Header Name': 'Outstanding Balance ($)',
        'Description / Instructions': 'Total accumulated overdue balance currently owed by the resident. Enter 0 if fully paid.',
        'Example Value': '0 or 2000 or 6000',
        'System Automation': 'Distributes balance using FIFO: older months are Paid, newest months remain Due.',
      },
    ];

    const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData);
    instructionsSheet['!cols'] = [
      { wch: 25 },
      { wch: 32 },
      { wch: 85 },
      { wch: 30 },
      { wch: 65 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Occupied_Units');
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Detailed_Instructions_Guide');
    XLSX.writeFile(workbook, 'Unit_Occupied_Import_Template.xlsx');
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setIsParsing(true);
    setParseError(null);
    setErrorMessage(null);
    setExecutionSummary(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('The uploaded file contains no sheets.');
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          throw new Error('No unit rows found in the sheet. Please make sure data rows are filled.');
        }

        // Build set of existing units in DB for DB Duplicate pre-validation
        const existingDbUnitKeys = new Set<string>();
        existingUnits.forEach((u: any) => {
          const uNum = String(u.unitNumber || '').trim().toLowerCase();
          if (!uNum) return;
          if (u.propertyId) {
            existingDbUnitKeys.add(`${u.propertyId.toLowerCase()}_${uNum}`);
          }
          if (u.property?.id) {
            existingDbUnitKeys.add(`${u.property.id.toLowerCase()}_${uNum}`);
          }
          if (u.property?.name) {
            existingDbUnitKeys.add(`${u.property.name.toLowerCase().trim()}_${uNum}`);
          }
        });

        const seenFileKeys = new Set<string>();

        const rows: ParsedUnitRow[] = rawJson.map((row, idx) => {
          const normRow: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            normRow[normalizeKey(k)] = row[k];
          });

          const rawPropertyName = String(
            normRow['propertyname'] ||
            normRow['property'] ||
            normRow['buildingname'] ||
            ''
          ).trim();

          // Smart tolerant property matching
          const cleanInput = rawPropertyName.toLowerCase().trim();
          const alphaInput = cleanInput.replace(/[^a-z0-9]/g, '');

          let matchedProp = properties.find(
            (p: any) => p.name?.toLowerCase().trim() === cleanInput
          );

          if (!matchedProp && alphaInput) {
            matchedProp = properties.find(
              (p: any) => p.name?.toLowerCase().replace(/[^a-z0-9]/g, '') === alphaInput
            );
          }

          if (!matchedProp && cleanInput) {
            matchedProp = properties.find((p: any) => {
              const pClean = (p.name || '').toLowerCase().trim();
              return pClean && (cleanInput.includes(pClean) || pClean.includes(cleanInput));
            });
          }

          if (!matchedProp && cleanInput) {
            const firstWord = cleanInput.split(/\s+/)[0];
            if (firstWord && firstWord.length >= 3) {
              const wordMatches = properties.filter((p: any) => {
                const pFirstWord = (p.name || '').toLowerCase().trim().split(/\s+/)[0];
                return pFirstWord === firstWord;
              });
              if (wordMatches.length === 1) {
                matchedProp = wordMatches[0];
              }
            }
          }

          if (!matchedProp && properties.length === 1) {
            matchedProp = properties[0];
          }

          const propertyName = matchedProp?.name || rawPropertyName;
          const propertyId = matchedProp?.id;

          const unitNumber = String(
            normRow['unitnumber'] ||
            normRow['unit'] ||
            normRow['door'] ||
            normRow['number'] ||
            ''
          ).trim();

          const floor = Math.max(1, parseInt(normRow['floor'] || '1', 10) || 1);
          const bedrooms = Math.max(0, parseInt(normRow['bedrooms'] || normRow['beds'] || '1', 10) || 1);
          const bathrooms = Math.max(0.5, parseFloat(normRow['bathrooms'] || normRow['baths'] || '1.0') || 1.0);
          const squareFootage = Math.max(0, parseFloat(normRow['squarefootage'] || normRow['sqft'] || '0') || 0);
          const rentAmount = parseFloat(normRow['monthlyrent'] || normRow['rentamount'] || normRow['rent'] || '0') || 0;
          const rawDeposit = normRow['securitydeposit'] || normRow['deposit'];
          const securityDeposit = rawDeposit !== '' && rawDeposit !== undefined && !isNaN(Number(rawDeposit))
            ? Number(rawDeposit)
            : rentAmount;

          // Status & Occupied Tenant Details Detection
          const rawStatus = String(normRow['status'] || '').trim().toLowerCase();
          const hasTenantColumns = Boolean(
            normRow['tenantfirstname'] ||
            normRow['firstname'] ||
            normRow['tenantname'] ||
            normRow['tenantemail'] ||
            normRow['moveindate'] ||
            normRow['invoicesfromdate'] ||
            rawStatus.includes('occup')
          );

          const status: 'Vacant' | 'Occupied' = hasTenantColumns || rawStatus.includes('occup') ? 'Occupied' : 'Vacant';

          // Tenant Details
          const tenantFirstName = String(
            normRow['tenantfirstname'] || normRow['firstname'] || normRow['tenant'] || ''
          ).trim();
          const tenantLastName = String(
            normRow['tenantlastname'] || normRow['lastname'] || ''
          ).trim();
          const tenantEmail = String(
            normRow['tenantemail'] || normRow['email'] || ''
          ).trim();
          const tenantPhone = String(
            normRow['tenantphone'] || normRow['phone'] || normRow['mobilephone'] || ''
          ).trim();

          const rawMoveIn = String(
            normRow['moveindate'] || normRow['movein'] || normRow['tenancystart'] || ''
          ).trim();

          let moveInDate = '';
          if (rawMoveIn) {
            const parsedD = new Date(rawMoveIn);
            if (!isNaN(parsedD.getTime())) {
              moveInDate = parsedD.toISOString().split('T')[0];
            } else {
              moveInDate = rawMoveIn;
            }
          }

          const rawInvoiceStart = String(
            normRow['invoicesfromdate'] ||
            normRow['invoicesstartdate'] ||
            normRow['invoicedate'] ||
            normRow['billingstartdate'] ||
            ''
          ).trim();

          let invoiceStartDate = '';
          if (rawInvoiceStart) {
            const parsedInvD = new Date(rawInvoiceStart);
            if (!isNaN(parsedInvD.getTime())) {
              invoiceStartDate = parsedInvD.toISOString().split('T')[0];
            } else {
              invoiceStartDate = rawInvoiceStart;
            }
          } else {
            invoiceStartDate = moveInDate;
          }

          const pastRentStatus = String(
            normRow['pastrentstatus'] || normRow['rentstatus'] || 'All Paid'
          ).trim();

          const rawLateFee = String(
            normRow['includelatefee'] || normRow['latefee'] || normRow['addlatefee'] || ''
          ).trim().toLowerCase();
          const includeLateFee = rawLateFee === 'yes' || rawLateFee === 'true' || rawLateFee === '1';

          const rawBalance = normRow['outstandingbalance'] || normRow['balance'] || normRow['previousbalance'];
          const outstandingBalance = rawBalance !== '' && rawBalance !== undefined && !isNaN(Number(rawBalance))
            ? Math.max(0, Number(rawBalance))
            : 0;

          const errors: string[] = [];

          if (!rawPropertyName) {
            errors.push('Missing Property Name');
          } else if (properties.length > 0 && !matchedProp) {
            errors.push(`Property "${rawPropertyName}" not found in system`);
          }

          if (!unitNumber) {
            errors.push('Missing Unit Number');
          }

          if (rentAmount <= 0) {
            errors.push('Rent must be greater than 0');
          }

          // Occupied Specific Validations
          if (status === 'Occupied') {
            if (!tenantFirstName) {
              errors.push('Missing Tenant First Name');
            }
            if (!tenantLastName) {
              errors.push('Missing Tenant Last Name');
            }
            if (!tenantEmail && !tenantPhone) {
              errors.push('Missing Tenant Email or Phone');
            }
            if (!moveInDate) {
              errors.push('Missing Move-In Date');
            }
          }

          const unitNumClean = unitNumber.toLowerCase().trim();
          const propIdKey = (propertyId || matchedProp?.id || '').toLowerCase().trim();
          const propNameKey = (propertyName || rawPropertyName).toLowerCase().trim();

          let validationStatus: ValidationStatus = 'Ready';

          if (errors.length > 0) {
            validationStatus = 'Error';
          } else if (unitNumClean) {
            const fileKey = `${propIdKey || propNameKey}_${unitNumClean}`;
            const isSeenInFile = seenFileKeys.has(fileKey);
            const isSeenInDb =
              (propIdKey && existingDbUnitKeys.has(`${propIdKey}_${unitNumClean}`)) ||
              (propNameKey && existingDbUnitKeys.has(`${propNameKey}_${unitNumClean}`));

            if (isSeenInFile) {
              validationStatus = 'File Duplicate';
              errors.push(`Duplicate Unit "${unitNumber}" in this file for this property`);
            } else if (isSeenInDb) {
              validationStatus = 'DB Duplicate';
              errors.push(`Unit "${unitNumber}" already exists in database for this property`);
              seenFileKeys.add(fileKey);
            } else {
              validationStatus = 'Ready';
              seenFileKeys.add(fileKey);
            }
          }

          return {
            rowIndex: idx + 2,
            propertyName,
            propertyId,
            unitNumber,
            floor,
            bedrooms,
            bathrooms,
            squareFootage,
            rentAmount,
            securityDeposit,
            status,
            tenantFirstName,
            tenantLastName,
            tenantEmail,
            tenantPhone,
            moveInDate,
            invoiceStartDate,
            pastRentStatus,
            includeLateFee,
            outstandingBalance,
            validationStatus,
            isValid: validationStatus === 'Ready',
            errors,
          };
        });

        setParsedRows(rows);
      } catch (err: any) {
        setParseError(err?.message || 'Failed to read file. Please ensure valid Excel/CSV format.');
        setParsedRows([]);
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setParseError('Unable to read selected file.');
      setIsParsing(false);
    };

    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleReset = () => {
    setFileName(null);
    setParsedRows([]);
    setParseError(null);
    setErrorMessage(null);
    setExecutionSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const importMutation = useMutation({
    mutationFn: async (validItems: ParsedUnitRow[]) => {
      const payload = validItems.map((item) => ({
        propertyName: item.propertyName,
        propertyId: item.propertyId,
        unitNumber: item.unitNumber,
        floor: item.floor,
        bedrooms: item.bedrooms,
        bathrooms: item.bathrooms,
        squareFootage: item.squareFootage,
        rentAmount: item.rentAmount,
        securityDeposit: item.securityDeposit,
        status: item.status,

        // Occupied fields matching Web Flow
        tenantFirstName: item.tenantFirstName,
        tenantLastName: item.tenantLastName,
        tenantEmail: item.tenantEmail,
        tenantPhone: item.tenantPhone,
        moveInDate: item.moveInDate,
        invoiceStartDate: item.invoiceStartDate,
        pastRentStatus: item.pastRentStatus,
        includeLateFee: item.includeLateFee,
        outstandingBalance: item.outstandingBalance,
      }));

      return api.unit.bulkImport(payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['leases'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });

      const imported = data?.count || validCount;
      if (onSuccess) onSuccess(imported);

      const totalProcessedBefore = parsedRows.length;
      const remainingRows = parsedRows.filter((r) => !r.isValid);

      if (remainingRows.length > 0) {
        // Partial import: show execution summary and preserve remaining invalid rows for user correction
        const occImported = data?.importedOccupied ?? validRows.filter((r) => r.status === 'Occupied').length;
        const vacImported = data?.importedVacant ?? validRows.filter((r) => r.status === 'Vacant').length;
        const occRate = data?.occupancyRate ?? (imported > 0 ? Math.round((occImported / imported) * 100) : 0);

        setExecutionSummary({
          totalProcessed: totalProcessedBefore,
          importedCount: imported,
          importedOccupied: occImported,
          importedVacant: vacImported,
          occupancyRate: occRate,
          skippedCount: remainingRows.length,
          failedCount: 0,
          isPartial: true,
        });
        setParsedRows(remainingRows);
      } else {
        // Complete import of all rows
        onOpenChange(false);
        handleReset();
      }
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to import units. Please verify subscription limits.');
    },
  });

  const validRows = parsedRows.filter((r) => r.isValid);
  const validCount = validRows.length;
  const readyCount = parsedRows.filter((r) => r.validationStatus === 'Ready').length;
  const dbDupCount = parsedRows.filter((r) => r.validationStatus === 'DB Duplicate').length;
  const fileDupCount = parsedRows.filter((r) => r.validationStatus === 'File Duplicate').length;
  const errorCount = parsedRows.filter((r) => r.validationStatus === 'Error').length;
  const occupiedCount = parsedRows.filter((r) => r.status === 'Occupied').length;
  const vacantCount = parsedRows.filter((r) => r.status === 'Vacant').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3 border-b border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Bulk Import Units (Vacant & Occupied)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Import vacant or occupied rental units with automated tenant accounts & active leases.
                </DialogDescription>
              </div>
            </div>

            {/* Template Download Options */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadVacantTemplate}
                className="text-xs font-semibold flex items-center gap-1.5 border-dashed hover:bg-muted"
                title="Download simple template for vacant units"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                Vacant Template (.xlsx)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadOccupiedTemplate}
                className="text-xs font-semibold flex items-center gap-1.5 border-dashed hover:bg-muted bg-amber-500/5 border-amber-500/30 text-amber-600 dark:text-amber-400"
                title="Download full template with tenant, move-in date & balance"
              >
                <Users className="w-3.5 h-3.5 text-amber-500" />
                Occupied Template (.xlsx)
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* 6-Month Invoicing Feature Hint Banner */}
          <div className="p-2.5 px-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <span>💡</span>
              <span>
                <strong>6-Month Past Invoicing Supported:</strong> Enter a start date from 6 months ago (e.g. 2026-06-01) in "Invoices From Date*" in the Occupied Template. The system will auto-generate all 6 monthly invoices and payment receipts chronologically. Full guide included in the template.
              </span>
            </span>
          </div>

          {/* Import Execution Summary Banner & KPI Cards (Image 2) */}
          {executionSummary && (
            <div className="border border-border/80 rounded-xl p-4 bg-card/60 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold tracking-wider uppercase text-foreground">
                    IMPORT EXECUTION SUMMARY
                  </span>
                </div>
                {executionSummary.isPartial ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" /> Partial Success
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Complete Success
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Card 1: Total Processed */}
                <div className="border border-border/80 rounded-xl p-3 bg-muted/20">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                    TOTAL ROWS PROCESSED
                  </span>
                  <div className="text-2xl font-extrabold text-foreground mt-1">
                    {executionSummary.totalProcessed}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    From uploaded spreadsheet
                  </span>
                </div>

                {/* Card 2: Successfully Imported */}
                <div className="border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-3 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 tracking-wider block">
                    SUCCESSFULLY IMPORTED
                  </span>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {executionSummary.importedCount}
                  </div>
                  <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-medium block mt-0.5">
                    {executionSummary.importedOccupied} Occ · {executionSummary.importedVacant} Vac
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    ({executionSummary.occupancyRate}% Occ.)
                  </span>
                </div>

                {/* Card 3: Skipped (Pre-validation) */}
                <div className="border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 bg-amber-50/50 dark:bg-amber-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 tracking-wider">
                      SKIPPED (PRE-VALIDATION)
                    </span>
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                  </div>
                  <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                    {executionSummary.skippedCount}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Duplicates or format errors
                  </span>
                </div>

                {/* Card 4: Failed (Server Rejection) */}
                <div className="border border-rose-200 dark:border-rose-800/60 rounded-xl p-3 bg-rose-50/50 dark:bg-rose-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 tracking-wider">
                      FAILED (SERVER REJECTION)
                    </span>
                    <XCircle className="w-3 h-3 text-rose-500" />
                  </div>
                  <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                    {executionSummary.failedCount}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    {executionSummary.failedCount === 0 ? 'None' : 'Errors'}
                  </span>
                </div>
              </div>

              {/* Green Partial Success Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">
                  {executionSummary.isPartial ? (
                    <>
                      Partial Success: Successfully imported {executionSummary.importedCount} units ({executionSummary.importedOccupied} Occupied, {executionSummary.importedVacant} Vacant · {executionSummary.occupancyRate}% Occupancy Rate)! {executionSummary.skippedCount} invalid rows were skipped and preserved below. You can correct and import them.
                    </>
                  ) : (
                    <>
                      Complete Success: Successfully imported all {executionSummary.importedCount} units ({executionSummary.importedOccupied} Occupied, {executionSummary.importedVacant} Vacant · {executionSummary.occupancyRate}% Occupancy Rate)!
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {(parseError || errorMessage) && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2.5">
              <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{parseError || errorMessage}</div>
            </div>
          )}

          {/* Upload Dropzone */}
          {parsedRows.length === 0 ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 min-h-[260px]',
                dragActive
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-border/80 hover:border-primary/60 hover:bg-muted/30 bg-muted/10'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                {isParsing ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <Upload className="w-7 h-7" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {isParsing
                    ? 'Analyzing spreadsheet & validating records...'
                    : 'Click to select or drag & drop Excel / CSV file'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .xlsx, .xls, and .csv files with Vacant or Occupied records. System automatically detects tenant details.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info & Stats Row (Image 1, 3, 5) */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-muted/20 rounded-xl border border-border/60">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">{fileName}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {parsedRows.length} total rows detected ({occupiedCount} Occupied, {vacantCount} Vacant)
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                    {readyCount} Ready to Import
                  </span>

                  {dbDupCount > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                      <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                      {dbDupCount} DB Duplicate
                    </span>
                  )}

                  {fileDupCount > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      {fileDupCount} File Duplicate
                    </span>
                  )}

                  {errorCount > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                      {errorCount} Needs Attention
                    </span>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground font-medium flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Choose Another File
                  </Button>
                </div>
              </div>

              {/* Review / Preview Table (Image 1, 3, 5) */}
              <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm max-h-[380px] overflow-x-auto overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                  <thead className="bg-muted/50 text-muted-foreground uppercase font-bold sticky top-0 z-10 border-b border-border/60">
                    <tr>
                      <th className="py-2.5 px-3">ROW</th>
                      <th className="py-2.5 px-3">VALIDATION</th>
                      <th className="py-2.5 px-3">STATUS</th>
                      <th className="py-2.5 px-3">PROPERTY NAME</th>
                      <th className="py-2.5 px-3">UNIT NUMBER</th>
                      <th className="py-2.5 px-3 text-right">RENT ($)</th>
                      <th className="py-2.5 px-3 text-center">FLOOR / SPECS</th>
                      <th className="py-2.5 px-3">OCCUPANT / TENANT</th>
                      <th className="py-2.5 px-3">MOVE-IN / INVOICES DATE</th>
                      <th className="py-2.5 px-3 text-right">BALANCE ($)</th>
                      <th className="py-2.5 px-3">REVIEW NOTES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={clsx(
                          'hover:bg-muted/20 transition-colors',
                          !row.isValid && 'bg-rose-50/30 dark:bg-rose-950/10'
                        )}
                      >
                        {/* ROW */}
                        <td className="py-2.5 px-3 font-mono text-muted-foreground font-medium whitespace-nowrap">
                          #{row.rowIndex}
                        </td>

                        {/* VALIDATION */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {row.validationStatus === 'Ready' && (
                            <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Ready
                            </span>
                          )}
                          {row.validationStatus === 'File Duplicate' && (
                            <span className="inline-flex items-center text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                              File Duplicate
                            </span>
                          )}
                          {row.validationStatus === 'DB Duplicate' && (
                            <span className="inline-flex items-center text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                              <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" /> DB Duplicate
                            </span>
                          )}
                          {row.validationStatus === 'Error' && (
                            <span className="inline-flex items-center text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                              <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" /> Error ({row.errors.length})
                            </span>
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {row.status === 'Occupied' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Occupied
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                              Vacant
                            </span>
                          )}
                        </td>

                        {/* PROPERTY NAME */}
                        <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                          {row.propertyName || <span className="text-rose-500 italic font-normal">Missing Property</span>}
                        </td>

                        {/* UNIT NUMBER */}
                        <td className="py-2.5 px-3 font-mono font-bold text-foreground whitespace-nowrap">
                          {row.unitNumber ? (
                            row.unitNumber
                          ) : (
                            <span className="text-rose-500 italic font-normal">Missing</span>
                          )}
                        </td>

                        {/* RENT ($) */}
                        <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                          {row.rentAmount > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ${row.rentAmount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-rose-500 italic font-normal">$0.00</span>
                          )}
                        </td>

                        {/* FLOOR / SPECS */}
                        <td className="py-2.5 px-3 text-center text-muted-foreground whitespace-nowrap">
                          F{row.floor} · {row.bedrooms}B/{row.bathrooms}B
                        </td>

                        {/* OCCUPANT / TENANT */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {row.status === 'Occupied' ? (
                            row.tenantFirstName || row.tenantLastName ? (
                              <div>
                                <span className="font-bold text-foreground block">
                                  {row.tenantFirstName} {row.tenantLastName}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {row.tenantPhone || row.tenantEmail || 'No contact info'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-rose-500 text-[11px] font-semibold">Tenant details required</span>
                            )
                          ) : (
                            <span className="text-muted-foreground text-[11px] italic">— No Tenant (Vacant) —</span>
                          )}
                        </td>

                        {/* MOVE-IN / INVOICES DATE */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {row.status === 'Occupied' ? (
                            <div>
                              <span className="font-medium text-foreground block">
                                Move-in: {row.moveInDate || '—'}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                Billing: {row.invoiceStartDate || row.moveInDate || '—'}
                              </span>
                              {getPastMonthsCount(row.invoiceStartDate || row.moveInDate) > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5">
                                  ⚡ {getPastMonthsCount(row.invoiceStartDate || row.moveInDate)} Invoices Auto-Generated
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>

                        {/* BALANCE ($) */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap font-medium">
                          {row.status === 'Occupied' ? (
                            <div>
                              {(row.outstandingBalance || 0) > 0 ? (
                                <>
                                  <span className="text-amber-600 dark:text-amber-400 font-bold block">
                                    ${(row.outstandingBalance || 0).toLocaleString()}
                                  </span>
                                  {row.includeLateFee && (
                                    <span className="text-[9px] text-rose-500 font-semibold block">
                                      +$50 Late Fee
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold block">
                                  $0.00
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground block font-normal">
                                {row.pastRentStatus || 'All Paid'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* REVIEW NOTES */}
                        <td className="py-2.5 px-3 text-[11px] whitespace-nowrap">
                          {row.validationStatus === 'Ready' && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Ready for automated import
                            </span>
                          )}
                          {row.validationStatus === 'File Duplicate' && (
                            <span className="text-rose-500 font-medium">
                              Duplicate unit in this file for this property
                            </span>
                          )}
                          {row.validationStatus === 'DB Duplicate' && (
                            <span className="text-rose-500 font-medium">
                              Unit already exists in database for this property
                            </span>
                          )}
                          {row.validationStatus === 'Error' && (
                            <span className="text-rose-500 font-semibold">{row.errors.join(' • ')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0" />
            Occupied units automatically create Active Tenants, 1-year Leases & Opening Balance invoices.
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                handleReset();
              }}
              disabled={importMutation.isPending}
            >
              {executionSummary ? 'Close' : 'Cancel'}
            </Button>
            {validCount > 0 && (
              <Button
                size="sm"
                onClick={() => importMutation.mutate(validRows)}
                disabled={importMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Importing {validCount} Units...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Confirm & Import ({validCount})
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnitImportModal;
