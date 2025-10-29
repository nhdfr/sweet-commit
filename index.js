#!/usr/bin/env node
import { main } from './src/main.js';

main().catch((error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
