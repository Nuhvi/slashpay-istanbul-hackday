import b4a from 'b4a';
import Debug from 'debug';
import chalk from 'chalk';
import { Slashtag } from 'slashtags-sdk';
import Protomux from 'protomux';
import { SlashPayProtocol } from './protocol.js';

const debug = Debug('slashpay:client');

const SLASHPAY_CONFIG_PATH = '/.well-known/slashpay.json';

export class SlashPayClient {
  constructor(opts) {
    this.sdk = opts.sdk;
    this.supportedMethods = opts.supportedMethods;
  }

  async request(opts) {
    const url = opts.url;

    const slashtag = await Slashtag.init({
      url,
      sdk: this.sdk,
      lookup: true,
    });

    if (!slashtag) {
      throw new Error('No SlashDrive found for: ' + url);
    }

    const slashpayjson = await slashtag.drive.read(SLASHPAY_CONFIG_PATH);

    if (!slashpayjson) {
      throw new Error('No slashpay.json found for' + slashtag);
    }

    debug('Resolved slashpay.json: ', chalk.blue.bold(slashpayjson));

    const slashpayconfig = JSON.parse(slashpayjson.toString());

    const swarmAddress = slashpayconfig.url.replace('slashpeer://', '');

    const noiseSocket = this.sdk.swarm.dht.connect(
      Buffer.from(swarmAddress, 'hex'),
    );

    return new Promise((resolve) => {
      const mux = new Protomux(noiseSocket);

      const slashpay = SlashPayProtocol(mux, { onInvoice, onReceipt });
      slashpay.open();

      slashpay.messages[0].send({
        amount: opts.amount,
        description: opts.description,
        methods: this.supportedMethods,
      });

      function onInvoice(invoice) {
        debug('Received invoice: ', invoice);
        opts.onInvoice(invoice);
      }

      function onReceipt(receipt) {
        debug('Received receipt: ', receipt);

        opts.onReceipt(receipt);
        noiseSocket.destroy();
        resolve(receipt);
      }
    });
  }

  static async SetConfig(opts) {
    const { url, slashtag } = opts;
    const slashpayjson = JSON.stringify({ url });
    await slashtag.drive.write(SLASHPAY_CONFIG_PATH, b4a.from(slashpayjson));

    debug(
      'Updated ' +
        chalk.bgBlack.rgb(255, 165, 0)(' ' + slashtag.url) +
        chalk.bgBlack.rgb(255, 255, 0)(' /.well-known/.slashpay.json ') +
        ':',
    );
    debug(slashpayjson);
  }
}
