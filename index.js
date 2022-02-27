import { DHT } from 'dht-universal';
import Hyperswarm from 'hyperswarm';
import Corestore from 'corestore';
import { formatDidUri, parseDidUri } from './url-utils.js';
import RAM from 'random-access-memory';
import b4a from 'b4a';
import chalk from 'chalk';
import cliSpinners from 'cli-spinners';
import logUpdate from 'log-update';

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
        console.log('\n>> received request:\n   ', chalk.green.bold(data));
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
    chalk.green.bold(address),
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
  console.log('\n>> Added the new address to:\n   ', chalk.red.bold(slashtag));
  return slashtag;
};

export const slashtagsPayClient = async (slashtag, request) => {
  const dht = await DHT.create({ relays: ['wss://dht-relay.synonym.to'] });
  const corestore = new Corestore(RAM);
  await corestore.ready();
  const swarm = new Hyperswarm({ dht });

  swarm.on('connection', (connection, info) => corestore.replicate(connection));

  console.log(
    '\n>> Resolving slashtags document for:\n   ',
    chalk.red.bold(slashtag),
  );

  const { key } = parseDidUri(slashtag);

  const core = corestore.get({ key, valueEncoding: 'json' });
  await core.ready();

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

  const latest = await core.get(core.length - 1);

  if (!latest?.services || latest.services.length === 0) {
    throw new Error('No slashtags services found for' + slashtag);
  }

  const slashpay = latest.services.find(
    (service) => service.type === 'SlashPay',
  );

  console.log(
    '\n>> Connecting slashtags pay address:\n   ',
    chalk.green.bold(slashpay.serviceEndpoint),
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
    noiseSocket.on('open', function () {
      noiseSocket.write(JSON.stringify(request));

      noiseSocket.on('data', (data) => {
        console.log(
          '\n>> Got LN invoice:\n   ',
          chalk.bold.green(JSON.parse(data.toString())),
        );
        resolve(data.toString());
      });
    });
  });
};
