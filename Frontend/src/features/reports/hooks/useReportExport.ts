import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportApi } from '../services/reportApi';

export const useReportExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  // Helper to format key names nicely (e.g. "tenantName" -> "Tenant Name")
  const formatHeaderKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Helper to sanitize row objects into flat clean display values
  const sanitizeExportData = (data: any[]) => {
    if (!data || data.length === 0) return [];

    return data.map((item) => {
      const row: Record<string, any> = {};
      Object.keys(item).forEach((k) => {
        // Exclude internal metadata IDs or helper sort fields
        if (
          k === 'id' ||
          k === 'leaseId' ||
          k === 'propertyId' ||
          k === 'unitId' ||
          k === 'tenantId' ||
          k === 'companyId' ||
          k === 'daysToExpiryNum'
        ) {
          return;
        }
        const val = item[k];
        if (val === null || val === undefined) {
          row[formatHeaderKey(k)] = 'N/A';
        } else if (typeof val === 'object') {
          row[formatHeaderKey(k)] = val.name || val.title || JSON.stringify(val);
        } else if (typeof val === 'boolean') {
          row[formatHeaderKey(k)] = val ? 'Yes' : 'No';
        } else {
          row[formatHeaderKey(k)] = val;
        }
      });
      return row;
    });
  };

  // 1. Local CSV Export
  const exportToCSV = (data: any[], fileName: string) => {
    const sanitized = sanitizeExportData(data);
    if (sanitized.length === 0) {
      alert('No data available to export.');
      return;
    }
    const headers = Object.keys(sanitized[0]);
    const csvRows = [
      headers.join(','),
      ...sanitized.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            const cleanVal = val === null || val === undefined ? '' : String(val);
            return `"${cleanVal.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM for Excel compatibility
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Local Excel Export (.xlsx)
  const exportToExcel = (data: any[], fileName: string) => {
    const sanitized = sanitizeExportData(data);
    if (sanitized.length === 0) {
      alert('No data available to export.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(sanitized);
    const colWidths = Object.keys(sanitized[0]).map((key) => ({
      wch: Math.max(key.length + 4, 15),
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  // 3. Local PDF Export (.pdf)
  const exportToPDF = (data: any[], reportType: string, fileName: string) => {
    const sanitized = sanitizeExportData(data);
    if (sanitized.length === 0) {
      alert('No data available to export.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Document Title
    const titleText = `${reportType.replace(/_/g, ' ')} REPORT`;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(titleText, 14, 15);

    // Subheader / Date stamp
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${sanitized.length}`, 14, 21);

    // Build Table
    const headers = Object.keys(sanitized[0]);
    const tableRows = sanitized.map((row) => headers.map((h) => String(row[h] ?? '')));

    autoTable(doc, {
      startY: 26,
      head: [headers],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235], // Blue-600
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { top: 25, right: 14, bottom: 15, left: 14 },
      didDrawPage: (dataArg) => {
        const str = `Page ${dataArg.pageNumber}`;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
      },
    });

    doc.save(`${fileName}.pdf`);
  };

  const handleExport = async (params: {
    reportType: string;
    filters: any;
    data: any[];
    totalRecords: number;
    fileType: 'CSV' | 'PDF' | 'XLSX';
  }) => {
    const { reportType, filters, data, totalRecords, fileType } = params;
    setIsExporting(true);

    try {
      const fileName = `${reportType.toLowerCase()}_report_${Date.now()}`;

      // Trigger backend export log asynchronously (silent)
      reportApi
        .triggerExport({
          reportType,
          filters,
          fileName: `${fileName}.${fileType.toLowerCase()}`,
          fileType,
        })
        .catch((err) => console.warn('Backend export audit log error:', err));

      // Direct instant file downloads
      if (fileType === 'CSV') {
        exportToCSV(data, fileName);
      } else if (fileType === 'XLSX') {
        exportToExcel(data, fileName);
      } else if (fileType === 'PDF') {
        exportToPDF(data, reportType, fileName);
      }
    } catch (e) {
      console.error('Export failed:', e);
      alert('Failed to generate export file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    handleExport,
    exportToCSV,
    exportToExcel,
    exportToPDF,
  };
};
