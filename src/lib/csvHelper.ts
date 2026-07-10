import { Job } from '../types';
import { toast } from 'sonner';
import { extractCompanyFromUrl, extractRoleFromUrl, getJobId, normalizeUrl, sanitizeProfileName, compareUrls } from './extractor';

// Robust CSV Parser (RFC 4180 compliant)
export function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip LF of CRLF
        }
        row.push(cell.trim());
        result.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
  }
  
  if (cell || row.length > 0) {
    row.push(cell.trim());
    result.push(row);
  }
  
  return result.filter(r => r.some(c => c.length > 0));
}

// Convert Google Sheet edit URL to export CSV URL
export const getSpreadsheetExportUrl = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const id = match[1];
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
};

export function escapeCSVCell(val: string): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(jobs: Job[], profileName?: string | null) {
  if (jobs.length === 0) {
    toast.error('No jobs to export.');
    return;
  }
  
  const headers = ['Company', 'Role', 'URL', 'Status', 'Date Added'];
  const rows = jobs.map(job => [
    job.company,
    job.role,
    job.url,
    job.status,
    job.dateAdded || ''
  ]);
  
  const csvContent = [
    headers.map(escapeCSVCell).join(','),
    ...rows.map(row => row.map(escapeCSVCell).join(','))
  ].join('\r\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);

  const prefix = profileName ? sanitizeProfileName(profileName) : 'clipstaff';
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `${prefix}_applications_${dateStr}.csv`);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success('CSV Export Completed');
}

export async function exportToExcel(jobs: Job[], profileName?: string | null) {
  if (jobs.length === 0) {
    toast.error('No jobs to export.');
    return;
  }

  const loadingToast = toast.loading('Building styled Excel sheet...');

  try {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Job Applications');

    // Define columns
    worksheet.columns = [
      { header: 'S.No.', key: 'sno', width: 8 },
      { header: 'Company', key: 'company', width: 25 },
      { header: 'Role', key: 'role', width: 30 },
      { header: 'URL', key: 'url', width: 45 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Date Added', key: 'dateAdded', width: 18 }
    ];

    // Add row data
    jobs.forEach((job, index) => {
      worksheet.addRow({
        sno: index + 1,
        company: job.company,
        role: job.role,
        url: job.url,
        status: job.status,
        dateAdded: job.dateAdded || ''
      });
    });

    // Format headers
    const headerRow = worksheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' } // Slate-800
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'double', color: { argb: 'FF0F172A' } }
      };
    });

    // Format grid rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip headers
      row.height = 24;

      const isEven = rowNumber % 2 === 0;
      const rowColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF'; // Alternate slate-50 / white

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } }; // Slate-700
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowColor }
        };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        // Centered S.No.
        if (colNumber === 1) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // Clickable URL Hyperlinks (Column 4)
        if (colNumber === 4 && cell.value) {
          const rawUrl = cell.value.toString();
          cell.value = { text: rawUrl, hyperlink: rawUrl };
          cell.font = {
            name: 'Segoe UI',
            size: 10,
            color: { argb: 'FF2563EB' }, // Blue-600
            underline: true
          };
        }

        // Color-coded Status badges (Column 5)
        if (colNumber === 5 && cell.value) {
          const val = cell.value.toString();
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          if (val === 'applied') {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF059669' } }; // Green-600
            cell.value = 'Applied';
          } else if (val === 'skipped') {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFDC2626' } }; // Red-600
            cell.value = 'Skipped';
          } else {
            cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF64748B' } }; // Slate-500
            cell.value = 'To Apply';
          }
        }

        // Centered Date Added (Column 6)
        if (colNumber === 6) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });

    // Auto-fit widths based on contents
    worksheet.columns.forEach((column) => {
      let maxLen = column.header ? column.header.toString().length : 10;
      if (column.eachCell) {
        column.eachCell({ includeEmpty: false }, (cell) => {
          const val = cell.value;
          if (val) {
            const valStr = typeof val === 'object' && 'text' in val ? val.text.toString() : val.toString();
            if (valStr.length > maxLen) {
              maxLen = valStr.length;
            }
          }
        });
      }
      column.width = Math.min(Math.max(maxLen + 4, 12), 65);
    });

    // Write file buffer and initiate download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileUrl = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', fileUrl);

    const prefix = profileName ? sanitizeProfileName(profileName) : 'clipstaff';
    const dateStr = new Date().toISOString().split('T')[0];
    downloadLink.setAttribute('download', `${prefix}_applications_${dateStr}.xlsx`);

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(fileUrl);

    toast.dismiss(loadingToast);
    toast.success('Excel Export Completed');
  } catch (err: any) {
    console.error('Failed to export styled Excel sheet:', err);
    toast.dismiss(loadingToast);
    toast.error('Excel Export Failed', {
      description: err.message || 'An error occurred during worksheet building.'
    });
  }
}

// Extract spreadsheet ID from a Google Sheets URL
export const getSpreadsheetId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

// Build XLSX export URL from a Google Sheets URL
export const getSpreadsheetXlsxExportUrl = (url: string): string | null => {
  const id = getSpreadsheetId(url);
  if (!id) return null;
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
};

// Convert an ExcelJS Worksheet to string[][] (same format as parseCSV output)
export function worksheetToRows(sheet: any): string[][] {
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row: any) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
      let val = '';
      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === 'object' && 'text' in cell.value) {
          val = (cell.value as any).text?.toString() || '';
        } else if (typeof cell.value === 'object' && 'hyperlink' in cell.value) {
          val = (cell.value as any).hyperlink?.toString() || '';
        } else {
          val = cell.value.toString();
        }
      }
      cells[colNumber - 1] = val;
    });
    rows.push(cells);
  });
  return rows;
}

// Parse rows (from CSV or XLSX) into Job objects with dynamic column detection
export function parseRowsToJobs(rows: string[][], existingJobs?: Job[]): Job[] {
  if (rows.length === 0) return [];

  const headers = rows[0].map(h => (h || '').toLowerCase().trim());

  // Dynamic Column Detection
  let urlIdx = headers.findIndex(h => h.includes('link') || h.includes('url') || h.includes('apply') || h.includes('website') || h.includes('href'));
  const companyIdx = headers.findIndex((h, idx) => idx !== urlIdx && (h.includes('company') || h.includes('employer') || h.includes('org') || h.includes('firm') || h.includes('name')));
  const roleIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && (h.includes('role') || h.includes('title') || h.includes('job') || h.includes('position') || h.includes('vacancy') || h.includes('designation')));
  const dateIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && idx !== roleIdx && (h.includes('date') || h.includes('added') || h.includes('posted') || h.includes('time') || h.includes('day')));
  const statusIdx = headers.findIndex((h, idx) => idx !== urlIdx && idx !== companyIdx && idx !== roleIdx && idx !== dateIdx && (h.includes('status')));

  // Fallback: scan first data row for URLs
  if (urlIdx === -1 && rows.length > 1) {
    const firstDataRow = rows[1];
    for (let col = 0; col < (firstDataRow || []).length; col++) {
      const val = firstDataRow[col] || '';
      if (val.startsWith('http://') || val.startsWith('https://')) {
        urlIdx = col;
        break;
      }
    }
  }
  if (urlIdx === -1) urlIdx = 0;

  const parsedJobs: Job[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawUrl = (row[urlIdx] || '').trim();
    if (!rawUrl || (!rawUrl.startsWith('http') && !rawUrl.includes('.'))) continue;

    const url = normalizeUrl(rawUrl);

    let company = '';
    if (companyIdx !== -1 && companyIdx !== urlIdx) {
      company = (row[companyIdx] || '').trim();
    }
    if (!company || company.startsWith('http')) {
      company = extractCompanyFromUrl(url);
    }

    let role = '';
    if (roleIdx !== -1 && roleIdx !== urlIdx) {
      role = (row[roleIdx] || '').trim();
    }
    if (!role || role === 'Job Opportunity') {
      role = extractRoleFromUrl(url);
    }

    const dateAdded = dateIdx !== -1 && dateIdx !== urlIdx && dateIdx !== companyIdx && dateIdx !== roleIdx
      ? (row[dateIdx] || '').trim()
      : undefined;

    // Detect status from spreadsheet data
    let status: Job['status'] = 'not_applied';
    if (statusIdx !== -1) {
      const statusVal = (row[statusIdx] || '').trim().toLowerCase().replace(/\s+/g, '_');
      if (statusVal === 'applied') status = 'applied';
      else if (statusVal === 'skipped') status = 'skipped';
    }

    // Merge with existing job status if available
    if (existingJobs) {
      const existingJob = existingJobs.find(j => compareUrls(j.url, url));
      if (existingJob) {
        status = existingJob.status;
      }
    }

    const id = getJobId(url, i);

    parsedJobs.push({ id, company, role, url, dateAdded, status });
  }

  return parsedJobs;
}
