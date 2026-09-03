import { describe, it, expect } from 'vitest';
import { Job, VaultJob } from '../src/types';
import { parseRowsToJobs } from '../src/lib/csvHelper';
import { normalizeDateStr } from '../src/lib/extractor';

describe('Job Application Chronological Ordering & Sheet Preservation', () => {
  const parseDateStr = (dateStr?: string): Date | null => {
    const normalized = normalizeDateStr(dateStr);
    if (!normalized) return null;
    const parts = normalized.split('/');
    if (parts.length !== 3) return null;
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
    return new Date(year, month - 1, day);
  };

  const getJobSortTimestamp = (job: Job): number => {
    if (job.status === 'applied' && job.appliedAt) {
      return job.appliedAt;
    }
    if (job.updatedAt) {
      return job.updatedAt;
    }
    if (job.createdAt) {
      return job.createdAt;
    }
    if (job.dateAdded) {
      const parsed = parseDateStr(job.dateAdded);
      if (parsed) return parsed.getTime();
    }
    return 0;
  };

  const sortJobs = (jobsList: Job[], viewMode: 'local' | 'sheet' = 'local') => {
    if (viewMode === 'sheet') {
      return [...jobsList].sort((a, b) => {
        const rowA = a.rowIndex !== undefined ? a.rowIndex : 0;
        const rowB = b.rowIndex !== undefined ? b.rowIndex : 0;
        return rowA - rowB;
      });
    }

    return [...jobsList].sort((a, b) => {
      const getStatusWeight = (status: string | undefined | null) => {
        if (!status) return 0;
        const norm = status.trim().toLowerCase().replace(/\s+/g, '_');
        if (norm === 'applied') return 1;
        if (norm === 'skipped') return 2;
        return 0;
      };

      const weightDiff = getStatusWeight(a.status) - getStatusWeight(b.status);
      if (weightDiff !== 0) return weightDiff;

      const timeA = getJobSortTimestamp(a);
      const timeB = getJobSortTimestamp(b);
      if (timeA !== timeB) {
        return timeB - timeA; // Descending: newest on top
      }

      const rowA = a.rowIndex !== undefined ? a.rowIndex : 0;
      const rowB = b.rowIndex !== undefined ? b.rowIndex : 0;
      return rowA - rowB;
    });
  };

  it('should place newly saved applications at the very top (newest first)', () => {
    const job1: Job = {
      id: 'job-1',
      company: 'Google',
      role: 'Staff Engineer',
      url: 'https://careers.google.com/jobs/1',
      status: 'not_applied',
      dateAdded: '09/01/2026',
      createdAt: 1000,
      updatedAt: 1000
    };

    const job2: Job = {
      id: 'job-2',
      company: 'Microsoft',
      role: 'Principal Architect',
      url: 'https://careers.microsoft.com/jobs/2',
      status: 'not_applied',
      dateAdded: '09/02/2026',
      createdAt: 2000,
      updatedAt: 2000
    };

    const job3RecentlySaved: Job = {
      id: 'job-3',
      company: 'Apple',
      role: 'Senior Software Engineer',
      url: 'https://jobs.apple.com/3',
      status: 'not_applied',
      dateAdded: '09/02/2026',
      createdAt: 3000, // saved via Ctrl+Shift+X just now
      updatedAt: 3000
    };

    const sorted = sortJobs([job1, job2, job3RecentlySaved], 'local');

    // job3 (newest) must be at index 0, followed by job2, then job1
    expect(sorted[0].id).toBe('job-3');
    expect(sorted[0].company).toBe('Apple');
    expect(sorted[1].id).toBe('job-2');
    expect(sorted[2].id).toBe('job-1');
  });

  it('should sort recently applied jobs to the top of applied status group', () => {
    const jobA: Job = {
      id: 'job-a',
      company: 'Amazon',
      role: 'SDE III',
      url: 'https://amazon.jobs/a',
      status: 'applied',
      dateAdded: '09/01/2026',
      createdAt: 1000,
      appliedAt: 1500
    };

    const jobB: Job = {
      id: 'job-b',
      company: 'Netflix',
      role: 'Senior UI Engineer',
      url: 'https://netflix.jobs/b',
      status: 'applied',
      dateAdded: '09/02/2026',
      createdAt: 1200,
      appliedAt: 4000 // applied more recently
    };

    const sorted = sortJobs([jobA, jobB], 'local');
    expect(sorted[0].id).toBe('job-b');
    expect(sorted[1].id).toBe('job-a');
  });

  it('should preserve strict 1-to-N sheet row sequence in Sheet View', () => {
    const rawRows = [
      ['Company', 'Role', 'URL', 'Status', 'Date Added'],
      ['Stripe', 'Frontend Lead', 'https://stripe.com/jobs/1', 'not_applied', '09/02/2026'],
      ['OpenAI', 'Research Engineer', 'https://openai.com/jobs/2', 'applied', '09/01/2026'],
      ['Anthropic', 'Alignment Engineer', 'https://anthropic.com/jobs/3', 'not_applied', '09/03/2026'],
      ['Figma', 'Product Designer', 'https://figma.com/jobs/4', 'skipped', '08/30/2026']
    ];

    const parsedJobs = parseRowsToJobs(rawRows);
    expect(parsedJobs).toHaveLength(4);
    expect(parsedJobs[0].rowIndex).toBe(1);
    expect(parsedJobs[1].rowIndex).toBe(2);
    expect(parsedJobs[2].rowIndex).toBe(3);
    expect(parsedJobs[3].rowIndex).toBe(4);

    const sortedInSheetMode = sortJobs(parsedJobs, 'sheet');
    expect(sortedInSheetMode[0].company).toBe('Stripe');
    expect(sortedInSheetMode[1].company).toBe('OpenAI');
    expect(sortedInSheetMode[2].company).toBe('Anthropic');
    expect(sortedInSheetMode[3].company).toBe('Figma');
  });

  it('should correctly prioritize to_apply > applied > skipped while keeping newest on top within each group in All tab', () => {
    const toApplyOld: Job = {
      id: 't-old',
      company: 'Company Old',
      role: 'Dev',
      url: 'https://example.com/1',
      status: 'not_applied',
      createdAt: 100
    };
    const toApplyNew: Job = {
      id: 't-new',
      company: 'Company New',
      role: 'Dev',
      url: 'https://example.com/2',
      status: 'not_applied',
      createdAt: 500
    };
    const appliedOld: Job = {
      id: 'a-old',
      company: 'Applied Old',
      role: 'Dev',
      url: 'https://example.com/3',
      status: 'applied',
      appliedAt: 200
    };
    const appliedNew: Job = {
      id: 'a-new',
      company: 'Applied New',
      role: 'Dev',
      url: 'https://example.com/4',
      status: 'applied',
      appliedAt: 600
    };
    const skippedJob: Job = {
      id: 's-1',
      company: 'Skipped Co',
      role: 'Dev',
      url: 'https://example.com/5',
      status: 'skipped',
      updatedAt: 700
    };

    const sorted = sortJobs([appliedOld, toApplyOld, skippedJob, appliedNew, toApplyNew], 'local');
    
    // Group 1: to_apply (newest first)
    expect(sorted[0].id).toBe('t-new');
    expect(sorted[1].id).toBe('t-old');

    // Group 2: applied (newest first)
    expect(sorted[2].id).toBe('a-new');
    expect(sorted[3].id).toBe('a-old');

    // Group 3: skipped
    expect(sorted[4].id).toBe('s-1');
  });
});
