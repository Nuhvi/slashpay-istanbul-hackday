import Debug from 'debug';
import { SDK } from 'slashtags-sdk';

const debug = Debug('slashpay:example:wallet');

import { SlashPayServer } from '../index.js';

const mockCB = async (request, onInvoice, onReceipt) => {
  onInvoice({
    error: false,
    method: 'bolt11',
    data: 'this is an ln invoice for ' + JSON.stringify(request),
  });

  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 5000);
  });

  onReceipt({
    error: false,
    orderId: '12345',
    data: 'this is a reciept because I say it is',
  });
};

const main = async () => {
  debug('Setting up slashtags SDK');
  const sdk = await SDK.init({ profile: Buffer.from('a'.repeat(64), 'hex') });

  const server = new SlashPayServer({ sdk, callback: mockCB });

  await server.listen();
};

main();
