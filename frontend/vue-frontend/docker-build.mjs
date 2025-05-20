#!/usr/bin/env node

/**
 * Simple build script for Docker that skips type checking.
 * This is used as a workaround for issues with vue-tsc in Docker.
 */

import { execSync } from 'child_process';

console.log('Building Vue app for Docker (skipping type check)...');

try {
  // Run Vite build directly
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} 