import { slashtagsPayClient } from './index.js';

const slashtag = process.argv[2];
const amount = process.argv[3];
const description = process.argv[4];

(async () => {
  const response = await slashtagsPayClient(slashtag, { amount, description });

  process.exit();
})();
