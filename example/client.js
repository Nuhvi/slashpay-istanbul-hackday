import Debug from 'debug';
import { SDK } from 'slashtags-sdk';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { SlashPayClient } from '../index.js';

import b4a from 'b4a';
import chalk from 'chalk';

const debug = Debug('slashpay:example:client');
const cachePath = path.join('example/.cached-client-answers.json');

main();

async function main() {
  // Setup the sdk to pass to the SlashPayClient
  let sdk = SDK.init({ profile: b4a.from('b'.repeat(64), 'hex') });

  const {
    slashtag: url,
    amount,
    description,
    preferredMethod,
    fallbackMethod,
  } = await prompt();

  debug(
    'Resolving ' +
      chalk.yellow.bold(' ' + url) +
      chalk.bgBlack.rgb(255, 255, 0)('/.well-known/.slashpay.json '),
  );

  sdk = await sdk;

  // Create a SlashPayClient instance
  const client = new SlashPayClient({
    sdk,
    supportedMethods: [preferredMethod, fallbackMethod],
  });

  // Resolve the Slashtag slashpay.json configuration and contact the server
  await client.request({
    url,
    amount,
    description,
    onInvoice() {
      debug('Invoice received, paying...');
    },
    onReceipt() {},
    onError(error) {
      debug('Got an error', error);
    },
  });

  await sdk.close();
}

async function prompt() {
  let lasttime = {};
  try {
    const json = await fs.readFileSync(cachePath, 'utf8');
    lasttime = JSON.parse(json);
  } catch (error) {}

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'slashtag',
      message: 'Select a Slashtag to pay',
      default: lasttime.slashtag || '',
    },
    {
      type: 'list',
      name: 'preferredMethod',
      message: 'Select your preferred payment method',
      choices: ['bolt11', 'p2wpkh', 'p2sh', 'p2pkh'],
      default: 'bolt11',
    },
    {
      type: 'list',
      name: 'fallbackMethod',
      message: 'Select an alternative payment method',
      choices: ['bolt11', 'p2wpkh', 'p2sh', 'p2pkh'],
      default: 'p2wpkh',
    },
    {
      type: 'input',
      name: 'amount',
      message: 'Enter the amount to pay',
      default: lasttime.amount || 21000000,
    },
    {
      type: 'input',
      name: 'description',
      message: 'Enter a description',
      default: lasttime.description || 'Parting with my dear sats',
    },
  ]);

  try {
    fs.writeFile(
      cachePath,
      JSON.stringify({
        slashtag: answers.slashtag,
        amount: answers.amount,
        description: answers.description,
      }),
      () => {},
    );
  } catch (error) {}

  return answers;
}
