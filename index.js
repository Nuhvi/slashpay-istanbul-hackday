import { DHT } from 'dht-universal';
import Hyperswarm from 'hyperswarm';
import Corestore from 'corestore';
import { formatDidUri, parseDidUri } from './url-utils.js';
import RAM from 'random-access-memory';
import b4a from 'b4a';
import chalk from 'chalk';
import cliSpinners from 'cli-spinners';
import logUpdate from 'log-update';
import inquirer from 'inquirer';
import fs from 'fs';

export const slashtagsPayServer = async (callback) => {
  const dht = await DHT.create({});
  const corestore = new Corestore('store');
  await corestore.ready();
  const swarm = new Hyperswarm({ dht });

  swarm.on('connection', (connection, info) => corestore.replicate(connection));

  const serever = dht.createServer((noiseSocket) => {
    noiseSocket.on('open', () => {
      noiseSocket.on('data', async (data) => {
        const request = JSON.parse(data.toString());
        console.log(
          '\n>> received request:\n   ',
          'pay:',
          chalk.green.bold(request.amount),
          'sats, over:',
          chalk.green.bold(request.methods.join(' or ')),
          '\n    with description:',
          chalk.green(request.description),
        );
        const response = await callback(request);
        noiseSocket.write(Buffer.from(JSON.stringify(response)));
      });
    });
  });
  const keyPair = DHT.keyPair();
  serever.listen(keyPair);

  const address = 'hyper:peer://' + b4a.toString(keyPair.publicKey, 'hex');
  console.log(
    '\n>> Lightning node listening on:\n   ',
    chalk.blue.bold(address),
  );

  const core = corestore.get({
    name: 'main slashtags identity',
    valueEncoding: 'json',
  });

  await core.ready();

  await swarm
    .join(core.discoveryKey, { server: true, client: false })
    .flushed();

  await core.append({
    services: [{ id: '#slashpay', type: 'SlashPay', serviceEndpoint: address }],
  });

  const slashtag = formatDidUri(core.key);
  console.log(
    '\n>> Added the new address to:\n   ',
    chalk.yellow.bold(slashtag),
  );
  return slashtag;
};

export const slashtagsPayClient = async () => {
  let lasttime = {};
  try {
    const json = await fs.readFileSync('cached-choices.json', 'utf8');
    lasttime = JSON.parse(json);
  } catch (error) {}

  const answers = inquirer.prompt([
    {
      type: 'input',
      name: 'slashtag',
      message: 'Select a Slashtag to pay',
      default: lasttime.slashtag || '',
    },
    {
      type: 'list',
      name: 'preferedMethod',
      message: 'Select your prefered payment method',
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
    {
      type: 'input',
      name: 'cache',
      message: 'Use cached slashtag document instead of resolving it Y/n',
      default: 'Y',
    },
  ]);

  const dht = await DHT.create({ relays: ['wss://dht-relay.synonym.to'] });
  const corestore = new Corestore('client-store');
  await corestore.ready();
  const swarm = new Hyperswarm({ dht });

  swarm.on('connection', (connection, info) => corestore.replicate(connection));

  const {
    slashtag,
    amount,
    description,
    cache,
    preferedMethod,
    fallbackMethod,
  } = await answers;

  try {
    fs.writeFile(
      'cached-choices.json',
      JSON.stringify({ slashtag, amount, description }),
      () => {},
    );
  } catch (error) {}

  console.log(
    '\n>> Resolving slashtags document for:\n   ',
    chalk.yellow.bold(slashtag),
  );

  const { key } = parseDidUri(slashtag);

  const core = corestore.get({ key, valueEncoding: 'json' });
  await core.ready();

  if (core.length === 0 || cache.toLowerCase() === 'n') {
    const timerLabel = '         resolved in';
    console.time(timerLabel);
    await swarm.join(core.discoveryKey, { server: false, client: true });
    const spinner = cliSpinners['moon'];
    let i = 0;

    const interval = setInterval(() => {
      const { frames } = spinner;
      logUpdate('   ' + frames[(i = ++i % frames.length)] + ' Resolving...');
    }, spinner.interval);

    await swarm.flush();
    clearInterval(interval);
    await core.update();

    if (core.length === 0) {
      throw new Error('No slashtags document found for' + slashtag);
    }
    console.timeEnd(timerLabel);
  }

  const latest = await core.get(core.length - 1);

  if (!latest?.services || latest.services.length === 0) {
    throw new Error('No slashtags services found for' + slashtag);
  }

  const slashpay = latest.services.find(
    (service) => service.type === 'SlashPay',
  );

  console.log(
    '\n>> Connecting slashtags pay address:\n   ',
    chalk.blue.bold(slashpay.serviceEndpoint),
  );

  const swarmAddress = slashpay.serviceEndpoint.replace('hyper:peer://', '');

  try {
    Buffer.from(swarmAddress, 'hex');
  } catch (error) {
    console.warn('Invalid slashtags pay address:', slashpay.serviceEndpoint);
    process.exit();
  }

  const noiseSocket = dht.connect(Buffer.from(swarmAddress, 'hex'));

  return new Promise((resolve) => {
    noiseSocket.on('error', (error) => {
      console.log('>> ', chalk.red.bold(error.message));
      resolve();
    });

    noiseSocket.on('open', function () {
      noiseSocket.write(
        JSON.stringify({
          methods: [preferedMethod, fallbackMethod],
          amount,
          description,
        }),
      );

      noiseSocket.on('data', (data) => {
        const response = JSON.parse(data.toString());

        if (response.error) {
          console.log('\n>> Got an error:\n   ', chalk.bold.red(response.data));
          resolve(response.data.toString());
          return;
        }
        console.log(
          '\n>> Got ',
          chalk.bold.green(response.method),
          ':\n   ',
          chalk.bold.green(response.data),
        );
        resolve(response.data.toString());
      });
    });
  });
};
