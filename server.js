import { slashtagsPayServer } from './index.js';

const mockCB = (request = { amount: 100, description: 'foo' }) => {
  return 'this is an ln invoice for ' + JSON.stringify(request);
};

(async () => {
  const slashtag = await slashtagsPayServer(mockCB);
})();
