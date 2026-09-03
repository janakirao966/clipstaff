import { Job } from '../types';
import { toast } from 'sonner';
import { extractCompanyFromUrl, extractRoleFromUrl, getJobId, normalizeUrl, sanitizeProfileName, compareUrls, normalizeDateStr } from './extractor';

// Robust CSV Parser (RFC 4180 compliant)
// ... (omitting lines 6-107 for brevity) ...

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
  let str = String(val);
  
  // Prevent CSV formula injection in spreadsheet software
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r') || str.startsWith("'")) {
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

export async function exportToExcel(
  jobs: Job[], 
  profileName?: string | null,
  onDownloadTriggered?: (fileUrl: string, filename: string) => void
) {
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
    if (jobs.length > 0) {
      const cleanTabName = (profileName || 'Sheet1').replace(/[^a-zA-Z0-9_]/g, '_');
      const uniqueTableName = `Table_${cleanTabName}_${Date.now()}`;
      
      worksheet.addTable({
        name: uniqueTableName,
        ref: 'A1',
        headerRow: true,
        totalsRow: false,
        style: {
          theme: 'TableStyleMedium2', // Slate/Blue themed table style
          showRowStripes: true,
        },
        columns: [
          { name: 'S.No.', filterButton: true },
          { name: 'Company', filterButton: true },
          { name: 'Role', filterButton: true },
          { name: 'URL', filterButton: true },
          { name: 'Status', filterButton: true },
          { name: 'Date Added', filterButton: true }
        ],
        rows: jobs.map((job, index) => [
          index + 1,
          job.company,
          job.role,
          job.url,
          job.status,
          job.dateAdded ? normalizeDateStr(job.dateAdded) : ''
        ])
      });
    } else {
      worksheet.columns = [
        { header: 'S.No.', key: 'sno', width: 8 },
        { header: 'Company', key: 'company', width: 25 },
        { header: 'Role', key: 'role', width: 30 },
        { header: 'URL', key: 'url', width: 45 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Date Added', key: 'dateAdded', width: 18 }
      ];
    }

    // Format headers and rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.height = 28;
        row.eachCell((cell) => {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E293B' } // Slate-800
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        return;
      }

      row.height = 24;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } }; // Slate-700
        cell.alignment = { vertical: 'middle' };

        // Center S.No, Status, and Date columns
        if (colNumber === 1 || colNumber === 5 || colNumber === 6) {
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
          const val = cell.value.toString().toLowerCase();
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
    
    const prefix = profileName ? sanitizeProfileName(profileName) : 'clipstaff';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${prefix}_applications_${dateStr}.xlsx`;

    toast.dismiss(loadingToast);

    if (onDownloadTriggered) {
      onDownloadTriggered(fileUrl, filename);
    } else {
      const downloadLink = document.createElement('a');
      downloadLink.setAttribute('href', fileUrl);
      downloadLink.setAttribute('download', filename);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(fileUrl);
      toast.success('Excel Export Completed');
    }
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

// Parse an Excel file (XLSX, XLS, CSV) into sheets and rows using SheetJS
export async function parseExcelWorkbookToSheets(data: ArrayBuffer | ArrayBufferView | string): Promise<{ name: string; rows: string[][] }[]> {
  const XLSX = await import('xlsx');
  let workbook: any;

  if (typeof data === 'string') {
    // If base64 or binary string
    workbook = XLSX.read(data, { type: 'binary', cellDates: true });
  } else if (ArrayBuffer.isView(data)) {
    workbook = XLSX.read(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), { type: 'array', cellDates: true });
  } else {
    // ArrayBuffer
    workbook = XLSX.read(new Uint8Array(data), { type: 'array', cellDates: true });
  }

  const result: { name: string; rows: string[][] }[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (sheetName === '__meta__') continue;
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    // Convert sheet to 2D array of string values
    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      raw: false,
      dateNF: 'yyyy-mm-dd'
    }) as any[][];

    const rows: string[][] = rawRows
      .map(row => (Array.isArray(row) ? row.map(c => (c !== null && c !== undefined ? String(c).trim() : '')) : []))
      .filter(row => row.some(c => c.length > 0));

    if (rows.length > 0) {
      result.push({ name: sheetName, rows });
    }
  }

  return result;
}

// Convert an ExcelJS or custom Worksheet to string[][] (same format as parseCSV output)
export function worksheetToRows(sheet: any): string[][] {
  if (!sheet) return [];
  const rows: string[][] = [];
  if (typeof sheet.eachRow === 'function') {
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
        cells[colNumber - 1] = val.trim();
      });
      rows.push(cells);
    });
  }
  return rows;
}

// Parse rows (from CSV or XLSX) into Job objects with dynamic column detection
export function parseRowsToJobs(rows: string[][], existingJobs?: Job[]): Job[] {
  if (rows.length === 0) return [];

  const headers = rows[0].map(h => (h || '').toLowerCase().trim());

  // Dynamic Column Detection
  let urlIdx = headers.findIndex(h => 
    h === 'url' || h === 'link' || h === 'job url' || h === 'job link' || h === 'apply link' ||
    h.includes('link') || h.includes('url') || h.includes('apply') || h.includes('website') || h.includes('href')
  );
  
  const companyIdx = headers.findIndex((h, idx) => 
    idx !== urlIdx && (
      h === 'company' || h === 'company name' || h === 'employer' || h === 'org' || h === 'organization' ||
      h.includes('company') || h.includes('employer') || h.includes('org') || h.includes('firm')
    )
  );
  
  const roleIdx = headers.findIndex((h, idx) => 
    idx !== urlIdx && idx !== companyIdx && (
      h === 'role' || h === 'role title' || h === 'job title' || h === 'position' || h === 'title' ||
      h.includes('role') || h.includes('title') || h.includes('job') || h.includes('position') || h.includes('vacancy') || h.includes('designation')
    )
  );
  
  const dateIdx = headers.findIndex((h, idx) => 
    idx !== urlIdx && idx !== companyIdx && idx !== roleIdx && (
      h === 'date added' || h === 'date' || h === 'added on' || h === 'applied date' ||
      h.includes('date') || h.includes('added') || h.includes('posted') || h.includes('time') || h.includes('day')
    )
  );
  
  const statusIdx = headers.findIndex((h, idx) => 
    idx !== urlIdx && idx !== companyIdx && idx !== roleIdx && idx !== dateIdx && (
      h === 'status' || h === 'state' || h.includes('status')
    )
  );

  // Fallback: scan first data row for URLs if no header matched
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

    let dateAdded = dateIdx !== -1 && dateIdx !== urlIdx && dateIdx !== companyIdx && dateIdx !== roleIdx
      ? (row[dateIdx] || '').trim()
      : undefined;
    if (dateAdded) {
      dateAdded = normalizeDateStr(dateAdded);
    }

    // Detect status from spreadsheet data
    let status: Job['status'] = 'not_applied';
    if (statusIdx !== -1) {
      const statusVal = (row[statusIdx] || '').trim().toLowerCase().replace(/[\s_-]+/g, '_');
      if (statusVal === 'applied' || statusVal === 'done' || statusVal === 'submitted' || statusVal === 'yes') {
        status = 'applied';
      } else if (statusVal === 'skipped' || statusVal === 'rejected' || statusVal === 'ignore' || statusVal === 'no') {
        status = 'skipped';
      } else {
        status = 'not_applied';
      }
    }

    // Merge with existing job status if available
    let existingJob: Job | undefined;
    if (existingJobs) {
      existingJob = existingJobs.find(j => compareUrls(j.url, url));
      if (existingJob) {
        status = existingJob.status;
      }
    }

    const id = getJobId(url, i);
    const now = Date.now();

    parsedJobs.push({ 
      id, 
      company, 
      role, 
      url, 
      dateAdded, 
      status,
      rowIndex: i,
      createdAt: existingJob?.createdAt || (now - (rows.length - i) * 10),
      updatedAt: existingJob?.updatedAt || now,
      appliedAt: status === 'applied' ? (existingJob?.appliedAt || now) : undefined
    });
  }

  return parsedJobs;
}
