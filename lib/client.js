import b4a from 'b4a';
import Debug from 'debug';
import chalk from 'chalk';

const debug = Debug('slashpay:client');

const SLASHPAY_CONFIG_PATH = '/.well-known/slashpay.json';

export class SlashPayClient {
  constructor(opts) {
    this.supportedMethods = opts.supportedMethods || [];
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
