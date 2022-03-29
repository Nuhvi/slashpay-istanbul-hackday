import Debug from 'debug';
import { SDK } from 'slashtags-sdk';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { SlashPayServer } from '../index.js';

const debug = Debug('slashpay:example:wallet');
const cachePath = path.join('example/.cached-server-keypair.txt');

const profile = Buffer.from('a'.repeat(64), 'hex');
main();

// Start here
async function main() {
  debug('Setting up slashtags SDK');
  // Create an SDK instance
  let sdk = SDK.init({ profile });

  const useCached = await checkUseCached();

  sdk = await sdk;

  // Create a SlashPay server instance
  const server = new SlashPayServer({
    sdk,
    // Pass your custom logic
    callbacks: mockServerCallbacks,
  });

  const keyPair = keyPairFromCache(useCached, sdk);

  // Listen for incoming connections
  await server.listen(keyPair);

  writeCache(keyPair);
}

// The payment negotiation logic goes here
var mockServerCallbacks = {
  async onRequest(request, sendInvoice, sendReceipt) {
    debug('Got a payment request', request);
    sendInvoice({
      error: false,
      method: 'bolt11',
      data: 'this is an ln invoice for ' + JSON.stringify(request),
    });

    debug('Waiting for invoice payment for');
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 3000);
    });

    debug('Payment received, sending receipt');
    sendReceipt({
      error: false,
      orderId: '12345',
      data: 'this is a reciept because I say it is',
    });
  },
  onError(error) {
    console.log('Got an error from the client', error);
  },
};

function writeCache(cached) {
  fs.writeFileSync(
    cachePath,
    JSON.stringify({
      publicKey: cached.publicKey.toString('hex'),
      secretKey: cached.secretKey.toString('hex'),
    }),
  );
}

function keyPairFromCache(useCached, sdk) {
  let keyPair;
  if (useCached) {
    try {
      keyPair = JSON.parse(fs.readFileSync(cachePath).toString());
      keyPair.publicKey = Buffer.from(keyPair.publicKey, 'hex');
      keyPair.secretKey = Buffer.from(keyPair.secretKey, 'hex');
    } catch (error) {}

    keyPair = keyPair || sdk.swarm.dht.defaultKeyPair;
  } else {
    keyPair = sdk.swarm.dht.defaultKeyPair;
  }

  return keyPair;
}

async function checkUseCached() {
  const { useCached } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useCached',
      message: 'Use the same server address as last time?',
      default: true,
    },
  ]);

  return useCached;
}
