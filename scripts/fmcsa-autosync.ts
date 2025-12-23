#!/usr/bin/env ts-node
import 'tsconfig-paths/register';
import { runFMCSAAutosyncJob } from '../lib/jobs/fmcsaAutosyncJob';

async function main() {
  console.log('=== FMCSA Autosync Job Started ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    await runFMCSAAutosyncJob();
    console.log('=== FMCSA Autosync Job Completed Successfully ===');
    process.exit(0);
  } catch (error: any) {
    console.error('=== FMCSA Autosync Job Failed ===');
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

main();
