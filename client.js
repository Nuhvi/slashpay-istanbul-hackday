#!/usr/bin/env node
import { slashtagsPayClient } from './index.js';

(async () => {
  await slashtagsPayClient();
  process.exit();
})();
