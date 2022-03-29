import { SDK, Slashtag } from 'slashtags-sdk';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import Debug from 'debug';

const debug = Debug('slashpay:example:wallet');

import { SlashPayClient } from '../lib/client.js';

/**
 * This is an example of the wallet side of the owner of the SlashPay server.
 *
 * After running the server, or signing up for a service that provides the server,
 * you can update your Slashtag to point to the server address.
 */

/** The profile is the master key where all keypairs are derived from */
const profile = Buffer.from('b'.repeat(64), 'hex');

const cachePath = path.join('example/.cached-server-url.txt');

const main = async () => {
  let sdk = SDK.init({ profile });

  let cached;
  try {
    cached = fs.readFileSync(cachePath);
    cached = cached.toString();
  } catch (error) {}

  const { url } = await inquirer.prompt([
    {
      type: 'input',
      name: 'url',
      message: "SlashPay server's URL",
      default: cached || '',
    },
  ]);

  sdk = await sdk;
  debug('Creating slashtag with the name ', 'slashpay-server-owner');
  const slashtag = await Slashtag.init({
    name: 'slashpay-server-owner',
    sdk,
    announce: true,
  });

  debug('Setting up the slashpay.json config');
  await SlashPayClient.SetConfig({ slashtag, url });

  fs.writeFileSync(cachePath, url);
};

main();
