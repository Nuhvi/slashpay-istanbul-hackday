import b4a from 'b4a';
import Debug from 'debug';
import chalk from 'chalk';
import Protomux from 'protomux';
import { SlashPayProtocol } from './protocol.js';

const debug = Debug('slashpay:server');

export class SlashPayServer {
  constructor(opts) {
    this.server = opts.sdk.swarm.dht.createServer();
    this.server.on('connection', (socket) =>
      this.onConnection(socket, opts.callbacks),
    );
  }

  onConnection(socket, callbacks) {
    const mux = new Protomux(socket);

    const slashpay = SlashPayProtocol(mux, callbacks);
    slashpay.open();
  }

  async listen(keypair) {
    debug('Starting SlashPay server');
    await this.server.listen(keypair);

    const url =
      'slashpeer://' + b4a.toString(this.server.address().publicKey, 'hex');
    debug('SlashPay server listening on: ', chalk.blue.bold(url));
  }
}
