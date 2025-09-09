#!/usr/bin/env node

import { main } from "./src/main.js";
import { aiMain } from "./src/ai.js";

const args = process.argv.slice(2);

if (args.includes("-ai")) {
  aiMain();
} else {
  main();
}
