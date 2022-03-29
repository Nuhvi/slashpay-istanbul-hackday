import { DHT } from 'dht-universal';
import b4a from 'b4a';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import { SDK, Slashtag } from 'slashtags-sdk';
import Debug from 'debug';
import { SlashPayServer } from './lib/server.js';

export { SlashPayServer };

const debugClient = Debug('Slashpay:Client');

export const slashtagsPayClient = async () => {
  let lasttime = {};
  try {
    const json = await fs.readFileSync('cached-choices.json', 'utf8');
    lasttime = JSON.parse(json);
  } catch (error) {}

  let sdk = SDK.init({ profile: b4a.from('b'.repeat(64), 'hex') });

  const answers = inquirer.prompt([
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

  const {
    slashtag: url,
    amount,
    description,
    preferredMethod,
    fallbackMethod,
  } = await answers;

  try {
    fs.writeFile(
      'cached-choices.json',
      JSON.stringify({ slashtag: url, amount, description }),
      () => {},
    );
  } catch (error) {}

  debugClient(
    'Resolving ' +
      chalk.yellow.bold(' ' + url) +
      chalk.bgBlack.rgb(255, 255, 0)('/.well-known/.slashpay.json '),
  );

  sdk = await sdk;

  const slashtag = await Slashtag.init({ url, sdk, lookup: true });

  if (!slashtag) {
    throw new Error('No SlashDrive found for: ' + url);
  }

  const slashpayjson = await slashtag.drive.read('/.well-known/slashpay.json');

  if (!slashpayjson) {
    throw new Error('No slashpay.json found for' + slashtag);
  }

  debugClient('Resolved slashpay.json: ', chalk.blue.bold(slashpayjson));

  const slashpayconfig = JSON.parse(slashpayjson.toString());

  const swarmAddress = slashpayconfig.url.replace('slashpeer://', '');

  const noiseSocket = sdk.swarm.dht.connect(Buffer.from(swarmAddress, 'hex'));

  return new Promise((resolve) => {
    noiseSocket.on('error', (error) => {
      console.log('>> ', chalk.red.bold(error.message));
      resolve();
    });

    noiseSocket.on('open', function () {
      noiseSocket.write(
        JSON.stringify({
          methods: [preferredMethod, fallbackMethod],
          amount,
          description,
        }),
      );

      noiseSocket.on('data', (data) => {
        const response = JSON.parse(data.toString());

        let i = 0;
        let interval;

        if (response.error === true) {
          console.log('\n>> Got an error:\n   ', chalk.bold.red(response.data));
          resolve(response.data.toString());
          return;
        } else if (response.orderId !== undefined) {
          if (interval) clearInterval(interval);

          console.log(
            '\n>> Got a receipt for:',
            chalk.green.bold(amount),
            'sats',
            '\n     orderId:',
            chalk.green.bold(response.orderId),
            '\n     receipt:',
            chalk.green.bold(response.data),
          );
          resolve(response.data.toString());
          return;
        } else {
          console.log(
            '\n>> Got ',
            chalk.bold.green(response.method),
            ':\n   ',
            chalk.bold.green(response.data),
          );
          console.log('\n');
        }
      });
    });
  });
};
