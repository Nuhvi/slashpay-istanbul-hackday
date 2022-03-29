import b4a from 'b4a';
import Debug from 'debug';
import chalk from 'chalk';
import Protomux from 'protomux';

const debug = Debug('slashpay:server');

export class SlashPayServer {
  constructor(opts) {
    this.server = opts.sdk.swarm.dht.createServer();
    this.server.on('connection', (socket) =>
      this.onConnection(socket, opts.callback),
    );
  }

  onConnection(socket, callback) {
    // const mux = new Protomux(socket);

    // const slashpay = mux.createChannel({ protocol: 'slashpay:alpha' });

    socket.on('open', () => {
      socket.on('data', async (data) => {
        const request = JSON.parse(data.toString());

        debug('Recieved request: ', request);

        callback(
          request,
          (invoice) => socket.write(Buffer.from(JSON.stringify(invoice))),
          (reciept) => {
            debug('Sending reciept: ', reciept);
            socket.write(Buffer.from(JSON.stringify(reciept)));
          },
        );
      });
    });
  }

  async listen(keypair) {
    debug('Starting SlashPay server');
    await this.server.listen(keypair);

    const url =
      'slashpeer://' + b4a.toString(this.server.address().publicKey, 'hex');
    debug('SlashPay server listening on: ', chalk.blue.bold(url));
  }
}
