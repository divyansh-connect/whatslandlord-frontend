import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  Building2,
  HelpCircle,
  Info,
} from 'lucide-react';
import { clsx } from 'clsx';

interface PropertyImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (count: number) => void;
}

export interface ParsedPropertyRow {
  rowIndex: number;
  name: string;
  type: string;
  status: string;
  ownerName: string;
  ownershipPercentage: number;
  managementCompany: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  yearBuilt: number;
  totalBuildings: number;
  totalFloors: number;
  squareFootage: number;
  purchasePrice: number;
  currentValue: number;
  nycBin: string;
  isValid: boolean;
  errors: string[];
}

export const PropertyImportModal: React.FC<PropertyImportModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedPropertyRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Normalize object keys to lowercase alphanumeric for robust column mapping
  const normalizeKey = (key: string): string => {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Property Name*': 'Sunset View Apartments',
        'Property Type': 'Apartment',
        'Status': 'Active',
        'Owner Name': 'Sarah Jenkins',
        'Ownership Percentage (%)': 100,
        'Management Company': 'Apex Property Management',
        'Street Address*': '1200 Ocean Drive',
        'City*': 'Miami',
        'State*': 'FL',
        'Zip Code*': '33139',
        'Country': 'USA',
        'Total Units': 24,
        'Occupied Units': 22,
        'Occupancy Rate (%)': 92,
        'Monthly Revenue ($)': 48000,
        'Monthly Expenses ($)': 4500,
        'Year Built': 2021,
        'Total Buildings': 1,
        'Total Floors': 4,
        'Square Footage': 28000,
        'Purchase Price ($)': 3500000,
        'Current Value ($)': 4200000,
        'NYC BIN #': '1088421',
      },
      {
        'Property Name*': 'Highland Commerce Plaza',
        'Property Type': 'Commercial',
        'Status': 'Active',
        'Owner Name': 'Robert Sterling',
        'Ownership Percentage (%)': 100,
        'Management Company': 'Apex Property Management',
        'Street Address*': '450 Congress Ave',
        'City*': 'Austin',
        'State*': 'TX',
        'Zip Code*': '78701',
        'Country': 'USA',
        'Total Units': 8,
        'Occupied Units': 7,
        'Occupancy Rate (%)': 88,
        'Monthly Revenue ($)': 32000,
        'Monthly Expenses ($)': 2800,
        'Year Built': 2019,
        'Total Buildings': 1,
        'Total Floors': 2,
        'Square Footage': 16000,
        'Purchase Price ($)': 2100000,
        'Current Value ($)': 2600000,
        'NYC BIN #': '1099234',
      },
      {
        'Property Name*': 'Pine Ridge Townhomes',
        'Property Type': 'Multi Family',
        'Status': 'Active',
        'Owner Name': 'Elena Rostova',
        'Ownership Percentage (%)': 100,
        'Management Company': 'Apex Property Management',
        'Street Address*': '884 Pine Ridge Way',
        'City*': 'Denver',
        'State*': 'CO',
        'Zip Code*': '80203',
        'Country': 'USA',
        'Total Units': 6,
        'Occupied Units': 6,
        'Occupancy Rate (%)': 100,
        'Monthly Revenue ($)': 15000,
        'Monthly Expenses ($)': 1200,
        'Year Built': 2022,
        'Total Buildings': 2,
        'Total Floors': 2,
        'Square Footage': 9200,
        'Purchase Price ($)': 1400000,
        'Current Value ($)': 1650000,
        'NYC BIN #': '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Format column widths for great readability
    worksheet['!cols'] = [
      { wch: 28 }, // Property Name
      { wch: 18 }, // Type
      { wch: 14 }, // Status
      { wch: 22 }, // Owner Name
      { wch: 24 }, // Ownership %
      { wch: 25 }, // Management Company
      { wch: 26 }, // Street Address
      { wch: 16 }, // City
      { wch: 10 }, // State
      { wch: 12 }, // Zip Code
      { wch: 12 }, // Country
      { wch: 14 }, // Total Units
      { wch: 16 }, // Occupied Units
      { wch: 18 }, // Occupancy Rate
      { wch: 20 }, // Monthly Revenue
      { wch: 20 }, // Monthly Expenses
      { wch: 14 }, // Year Built
      { wch: 16 }, // Total Buildings
      { wch: 14 }, // Total Floors
      { wch: 18 }, // Square Footage
      { wch: 18 }, // Purchase Price
      { wch: 18 }, // Current Value
      { wch: 14 }, // NYC BIN #
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Properties_Template');
    XLSX.writeFile(workbook, 'Property_Full_Import_Template.xlsx');
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setIsParsing(true);
    setParseError(null);
    setErrorMessage(null);

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
          throw new Error('No data rows found in the sheet. Please ensure rows are filled.');
        }

        const rows: ParsedPropertyRow[] = rawJson.map((row, idx) => {
          // Normalize row keys for flexible header handling
          const normRow: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            normRow[normalizeKey(k)] = row[k];
          });

          const name = String(
            normRow['propertyname'] ||
            normRow['name'] ||
            normRow['property'] ||
            normRow['buildingname'] ||
            ''
          ).trim();

          const type = String(
            normRow['propertytype'] ||
            normRow['type'] ||
            'Apartment'
          ).trim();

          const status = String(normRow['status'] || 'Active').trim();

          const ownerName = String(
            normRow['ownername'] ||
            normRow['owner'] ||
            ''
          ).trim();

          const ownershipPercentage = parseFloat(normRow['ownershippercentage'] || normRow['ownership'] || '100') || 100;
          const managementCompany = String(normRow['managementcompany'] || normRow['management'] || 'Apex Property Management').trim();

          const streetAddress = String(
            normRow['streetaddress'] ||
            normRow['address'] ||
            normRow['street'] ||
            ''
          ).trim();

          const city = String(normRow['city'] || 'Austin').trim();
          const state = String(normRow['state'] || 'TX').trim();
          const zip = String(normRow['zipcode'] || normRow['zip'] || normRow['postalcode'] || '78701').trim();
          const country = String(normRow['country'] || 'USA').trim();

          const totalUnits = Math.max(1, parseInt(normRow['totalunits'] || normRow['units'] || normRow['unitscount'] || '1', 10) || 1);
          const occupiedUnits = Math.max(0, parseInt(normRow['occupiedunits'] || normRow['occupied'] || '0', 10) || 0);
          
          let occupancyRate = parseFloat(normRow['occupancyrate'] || normRow['occupancy'] || '0');
          if (isNaN(occupancyRate) || occupancyRate === 0) {
            occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
          }

          const monthlyRevenue = parseFloat(normRow['monthlyrevenue'] || normRow['revenue'] || normRow['monthlyrent'] || '0') || 0;
          const monthlyExpenses = parseFloat(normRow['monthlyexpenses'] || normRow['expenses'] || '0') || 0;

          const yearBuilt = parseInt(normRow['yearbuilt'] || normRow['year'] || '2020', 10) || 2020;
          const totalBuildings = Math.max(1, parseInt(normRow['totalbuildings'] || normRow['buildings'] || '1', 10) || 1);
          const totalFloors = Math.max(1, parseInt(normRow['totalfloors'] || normRow['floors'] || '1', 10) || 1);
          const squareFootage = parseFloat(normRow['squarefootage'] || normRow['sqft'] || '10000') || 10000;
          const purchasePrice = parseFloat(normRow['purchaseprice'] || normRow['price'] || '1000000') || 1000000;
          const currentValue = parseFloat(normRow['currentvalue'] || normRow['value'] || '1200000') || 1200000;
          const nycBin = String(normRow['nycbin'] || normRow['bin'] || '').trim();

          const errors: string[] = [];
          if (!name) errors.push('Missing Property Name');
          if (!streetAddress) errors.push('Missing Street Address');

          return {
            rowIndex: idx + 2, // Excel 1-based index including header
            name,
            type,
            status,
            ownerName,
            ownershipPercentage,
            managementCompany,
            streetAddress,
            city,
            state,
            zip,
            country,
            totalUnits,
            occupiedUnits,
            occupancyRate,
            monthlyRevenue,
            monthlyExpenses,
            yearBuilt,
            totalBuildings,
            totalFloors,
            squareFootage,
            purchasePrice,
            currentValue,
            nycBin,
            isValid: errors.length === 0,
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Bulk Import Mutation
  const importMutation = useMutation({
    mutationFn: async (validItems: ParsedPropertyRow[]) => {
      const payload = validItems.map((item) => ({
        name: item.name,
        type: item.type,
        status: item.status,
        ownerName: item.ownerName,
        ownershipPercentage: item.ownershipPercentage,
        managementCompany: item.managementCompany,
        streetAddress: item.streetAddress,
        city: item.city,
        state: item.state,
        zip: item.zip,
        country: item.country,
        totalUnits: item.totalUnits,
        unitsCount: item.totalUnits,
        occupiedUnits: item.occupiedUnits,
        occupancyRate: item.occupancyRate,
        monthlyRevenue: item.monthlyRevenue,
        monthlyExpenses: item.monthlyExpenses,
        yearBuilt: item.yearBuilt,
        totalBuildings: item.totalBuildings,
        totalFloors: item.totalFloors,
        squareFootage: item.squareFootage,
        purchasePrice: item.purchasePrice,
        currentValue: item.currentValue,
        nycBin: item.nycBin,
      }));

      return api.property.bulkImport(payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      const count = data?.count || validCount;
      if (onSuccess) onSuccess(count);
      onOpenChange(false);
      handleReset();
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'Failed to import properties. Please verify subscription limits.');
    },
  });

  const validRows = parsedRows.filter((r) => r.isValid);
  const validCount = validRows.length;
  const invalidCount = parsedRows.length - validCount;

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
                  Bulk Import Properties (All Details)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Import full property records including owner, units, occupancy, financials, and addresses.
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-xs font-semibold flex items-center gap-1.5 border-dashed hover:bg-muted"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              Download Full Template (.xlsx)
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
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
                'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 min-h-[240px]',
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
                    ? 'Analyzing complete spreadsheet...'
                    : 'Click to select or drag & drop Excel / CSV file'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .xlsx, .xls, and .csv files with all property fields (financials, owner, addresses, units).
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info & Stats Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/30 rounded-xl border border-border/60">
                <div className="flex items-center space-x-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                  <div>
                    <span className="text-xs font-bold text-foreground block">{fileName}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {parsedRows.length} total property rows detected
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {validCount} Ready to Import
                  </span>
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      {invalidCount} Needs Attention
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Choose Another File
                  </Button>
                </div>
              </div>

              {/* Comprehensive Preview Table with horizontal scroll */}
              <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm max-h-[350px] overflow-x-auto overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                  <thead className="bg-muted/50 text-muted-foreground uppercase font-bold sticky top-0 z-10 border-b border-border/60">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Property Name</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Owner</th>
                      <th className="py-2.5 px-3">Street Address</th>
                      <th className="py-2.5 px-3">City, State Zip</th>
                      <th className="py-2.5 px-3 text-right">Units (Occ/Tot)</th>
                      <th className="py-2.5 px-3 text-right">Occupancy %</th>
                      <th className="py-2.5 px-3 text-right">Revenue ($)</th>
                      <th className="py-2.5 px-3 text-right">Expenses ($)</th>
                      <th className="py-2.5 px-3 text-center">Year / SqFt</th>
                      <th className="py-2.5 px-3 text-right">Current Value</th>
                      <th className="py-2.5 px-3">BIN #</th>
                      <th className="py-2.5 px-3">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {parsedRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={clsx(
                          'hover:bg-muted/20 transition-colors',
                          !row.isValid && 'bg-rose-500/5'
                        )}
                      >
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {row.isValid ? (
                            <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[11px] font-bold text-rose-500">
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Error
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                          {row.name || <span className="text-rose-500 italic">Required</span>}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                          {row.type}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-foreground">
                          {row.ownerName || <span className="text-muted-foreground italic">Auto-assign</span>}
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px] truncate text-muted-foreground">
                          {row.streetAddress || <span className="text-rose-500 italic">Required</span>}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                          {row.city}, {row.state} {row.zip}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground whitespace-nowrap">
                          {row.occupiedUnits} / {row.totalUnits}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground whitespace-nowrap">
                          {row.occupancyRate}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          ${row.monthlyRevenue.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-rose-500 whitespace-nowrap">
                          ${row.monthlyExpenses.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center text-muted-foreground whitespace-nowrap">
                          {row.yearBuilt} · {row.squareFootage.toLocaleString()} sq ft
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground whitespace-nowrap">
                          ${row.currentValue.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-amber-500">
                          {row.nycBin || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] whitespace-nowrap">
                          {row.isValid ? (
                            <span className="text-muted-foreground">All details mapped</span>
                          ) : (
                            <span className="text-rose-500 font-medium">{row.errors.join(', ')}</span>
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
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            All financial, unit, owner, and structural details are securely stored. Existing records remain safe.
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
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => importMutation.mutate(validRows)}
              disabled={validCount === 0 || importMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Importing {validCount} Properties...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Confirm & Import ({validCount})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyImportModal;
