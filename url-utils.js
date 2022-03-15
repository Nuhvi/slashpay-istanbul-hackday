// @ts-ignore
import { varint } from '@synonymdev/slashtags-common';
import { base32 } from 'multiformats/bases/base32';
import b4a from 'b4a';

const URL_PREFIX = 'slash://';

/**
 * @param {Buffer} publicKey
 * @param {'ES256K' | 'EdDSA'} [type = 'ES256K']
 * @returns {string}
 */
export function formatUri(publicKey, type) {
  const codec = type === 'ES256K' ? 0xe7 : 0xed;
  return URL_PREFIX + base32.encode(varint.prepend(codec, publicKey));
}

/**
 * @param {string} uri
 */
export function parseUri(uri) {
  const id = uri.replace(URL_PREFIX, '');
  const multiHash = base32.decode(id);
  const codec = multiHash.slice(1)[0];
  const key = b4a.from(multiHash.slice(2));
  return { key, type: codec === 0xe7 ? 'ES256K' : 'EdDSA' };
}
