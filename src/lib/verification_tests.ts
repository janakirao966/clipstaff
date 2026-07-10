import * as db from './db';
import { normalizeUrl, getJobId } from './extractor';
import { Job } from '../types';

export async function runAllVerificationTests() {
  console.log('=== STARTING CLIPSTAFF PRO VERIFICATION TESTS ===');

  // Test 1: URL Normalization
  console.log('\n--- 1. Testing URL Normalization ---');
  const urls = [
    'https://company.com/jobs/123',
    'https://company.com/jobs/123/',
    'https://company.com/jobs/123?utm_source=linkedin',
    'https://company.com/jobs/123?utm_campaign=test&ref=homepage',
    'https://COMPANY.com/jobs/123',
    'https://company.com/jobs/123#apply'
  ];
  
  // Clean first
  const existingJobs = await db.getAllJobs();
  for (const url of urls) {
    const normUrl = normalizeUrl(url);
    const id = existingJobs.find((j: Job) => j.url === normUrl)?.id;
    if (id) await db.deleteJob(id);
  }

  console.log('Adding 6 different URL variations...');
  for (const url of urls) {
    const normUrl = normalizeUrl(url);
    const id = getJobId(normUrl);
    try {
      await db.addJob({
        id,
        company: 'Test Co',
        role: 'Engineer',
        url: normUrl,
        status: 'not_applied',
        version: 1
      });
    } catch (e) {
      console.warn(`Encountered error while adding URL: ${url}`, e);
    }
  }

  const allJobsAfterAdd = await db.getAllJobs();
  const normalizedMatch = allJobsAfterAdd.filter((j: Job) => j.company === 'Test Co');
  console.log(`Deduplication Result: Found ${normalizedMatch.length} job(s) in IndexedDB. (Expected: 1)`);
  if (normalizedMatch.length === 1) {
    console.log('✅ URL Normalization & Deduplication test passed!');
  } else {
    console.error('❌ URL Normalization test failed.');
  }

  // Clean up Test 1
  for (const j of normalizedMatch) {
    await db.deleteJob(j.id);
  }

  // Test 2: Database Race Conditions
  console.log('\n--- 2. Testing Concurrent Database Saves (Race Condition) ---');
  const rawUrl = 'https://example.com/job/concurrent-123';
  const normUrlRace = normalizeUrl(rawUrl);
  const idRace = getJobId(normUrlRace);
  const sameJob = {
    id: idRace,
    url: normUrlRace,
    company: 'Concurrent Co',
    role: 'Engineer',
    status: 'not_applied' as const,
    version: 1
  };

  const existingJobsForRace = await db.getAllJobs();
  const idForRace = existingJobsForRace.find((j: Job) => j.url === sameJob.url)?.id;
  if (idForRace) await db.deleteJob(idForRace);

  console.log('Triggering 10 concurrent saves at once...');
  const promises = Array(10).fill(null).map(() => db.addJob(sameJob));
  await Promise.all(promises);

  const finalJobs = await db.getAllJobs();
  const concurrentMatch = finalJobs.filter((j: Job) => j.company === 'Concurrent Co');
  console.log(`Race Condition Result: Found ${concurrentMatch.length} job(s) in IndexedDB. (Expected: 1)`);
  if (concurrentMatch.length === 1) {
    console.log('✅ Concurrent DB saves test passed!');
  } else {
    console.error('❌ Concurrent DB saves test failed.');
  }

  // Clean up Test 2
  for (const j of concurrentMatch) {
    await db.deleteJob(j.id);
  }

  // Test 3: Large Dataset Performance
  console.log('\n--- 3. Testing 5000+ Jobs Performance Benchmarks ---');
  const largeJobSet: Job[] = Array(5000).fill(null).map((_, i) => ({
    id: `job-benchmark-${i}`,
    company: `Company ${i}`,
    role: `Role ${i}`,
    url: `https://example.com/job/${i}`,
    status: 'not_applied',
    dateAdded: new Date().toLocaleDateString(),
    version: 1
  }));

  console.log('Inserting 5000 benchmark records in bulk...');
  console.time('Bulk Insert Time (5000 jobs)');
  await db.importJobsBulk(largeJobSet);
  console.timeEnd('Bulk Insert Time (5000 jobs)');

  console.time('IndexedDB Query Time (5000 jobs)');
  const fetched = await db.getAllJobs();
  console.timeEnd('IndexedDB Query Time (5000 jobs)');
  console.log(`Fetched ${fetched.length} total jobs from database.`);

  // Cleanup benchmark jobs
  console.log('Cleaning up benchmark records...');
  console.time('Bulk Delete Time (5000 jobs)');
  const batchSize = 100;
  for (let i = 0; i < 5000; i += batchSize) {
    const chunkPromises = [];
    for (let j = i; j < i + batchSize && j < 5000; j++) {
      chunkPromises.push(db.deleteJob(`job-benchmark-${j}`));
    }
    await Promise.all(chunkPromises);
  }
  console.timeEnd('Bulk Delete Time (5000 jobs)');
  console.log('✅ Cleanup complete!');
  console.log('\n=== ALL DIAGNOSTIC TESTS RUN COMPLETE ===');
}
