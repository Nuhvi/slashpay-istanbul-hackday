# lightning-hackday-slashtags-pay

## Install

```
npm i lightning-hackday-slashtags-pay
```

## Usage

### Server side

```js
import { slashtagsPayServer } from './index.js';

const lnNodeResponse = (request = { amount: 100, description: 'foo' }) => {
  console.log('got request', request);
  return 'this is an ln invoice for ' + JSON.stringify(request);
};

const slashtag = slahtagsPayServer(lnNodeResponse);
```

### Client side

```js
import { slashtagsPayClient } from './index.js';
// Pass the slashtag to the client side somehow
const response = await slashtagsPayClient(slashtag);
```
