import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseExcelWorkbookToSheets, parseRowsToJobs } from '../src/lib/csvHelper';

describe('Excel & Vault Parser', () => {
  it('should successfully parse varun.xlsx and extract all valid job applications', async () => {
    const filePath = path.resolve(__dirname, '../varun.xlsx');
    const fileBuffer = fs.readFileSync(filePath);
    
    const sheets = await parseExcelWorkbookToSheets(fileBuffer);
    expect(sheets.length).toBeGreaterThan(0);
    expect(sheets[0].name).toBe('jayssson');

    const jobs = parseRowsToJobs(sheets[0].rows);
    expect(jobs.length).toBeGreaterThanOrEqual(26);

    // Verify first job structure
    const firstJob = jobs[0];
    expect(firstJob.role).toBeTruthy();
    expect(firstJob.company).toBeTruthy();
    expect(firstJob.url).toMatch(/^https?:\/\//);
    expect(firstJob.status).toBe('not_applied');
    expect(firstJob.dateAdded).toBe('08/20/2026');
  });

  it('should handle CSV and TSV string input seamlessly', async () => {
    const csvContent = `Company,Role,URL,Status,Date Added\nGoogle,Software Engineer,https://careers.google.com/jobs/123,Applied,2026-08-21\nMeta,Product Manager,https://metacareers.com/jobs/456,To Apply,2026-08-22`;
    const encoder = new TextEncoder();
    const buffer = encoder.encode(csvContent).buffer;

    const sheets = await parseExcelWorkbookToSheets(buffer);
    expect(sheets.length).toBe(1);

    const jobs = parseRowsToJobs(sheets[0].rows);
    expect(jobs.length).toBe(2);
    expect(jobs[0].company).toBe('Google');
    expect(jobs[0].status).toBe('applied');
    expect(jobs[1].company).toBe('Meta');
    expect(jobs[1].status).toBe('not_applied');
  });
});
