import { describe, it, expect } from 'vitest';
import { normalizeUrl, getJobId, compareUrls } from './extractor';

describe('URL Normalization', () => {
  it('should lowercase the hostname', () => {
    expect(normalizeUrl('https://GOOGLE.COM/jobs')).toBe('https://google.com/jobs');
  });

  it('should strip common tracking parameters', () => {
    expect(normalizeUrl('https://google.com/jobs?utm_source=linkedin&ref=123')).toBe('https://google.com/jobs');
  });

  it('should strip fragments and hashes', () => {
    expect(normalizeUrl('https://google.com/jobs#section-2')).toBe('https://google.com/jobs');
  });

  it('should trim trailing slashes from path', () => {
    expect(normalizeUrl('https://google.com/jobs/')).toBe('https://google.com/jobs');
  });

  it('should not trim trailing slash from root domain', () => {
    expect(normalizeUrl('https://google.com/')).toBe('https://google.com/');
  });

  it('should sort remaining query parameters alphabetically', () => {
    expect(normalizeUrl('https://google.com/jobs?z=1&a=2&b=3')).toBe('https://google.com/jobs?a=2&b=3&z=1');
  });

  it('should prepend https protocol if missing', () => {
    expect(normalizeUrl('google.com/jobs')).toBe('https://google.com/jobs');
  });
});

describe('Deterministic Job IDs', () => {
  it('should generate same ID for identical normalized URLs', () => {
    const id1 = getJobId('https://google.com/jobs?utm_source=linkedin');
    const id2 = getJobId('google.com/jobs?ref=123');
    expect(id1).toBe(id2);
  });

  it('should append index deterministically if provided', () => {
    const idWithIdx = getJobId('https://google.com/jobs', 3);
    expect(idWithIdx).toContain('-idx-3');
  });
});

describe('URL Comparison', () => {
  it('should return true for matching normalized URLs', () => {
    expect(compareUrls('https://google.com/jobs/', 'google.com/jobs?utm_campaign=winter')).toBe(true);
  });

  it('should return false for different URLs', () => {
    expect(compareUrls('https://google.com/jobs', 'https://yahoo.com/jobs')).toBe(false);
  });
});
