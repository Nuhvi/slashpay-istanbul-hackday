import { slashtagsPayServer } from './index.js';

const mockCB = async (request, onInvoice, onReceipt) => {
  onInvoice({
    error: false,
    method: 'bolt11',
    data: 'this is an ln invoice for ' + JSON.stringify(request),
  });

  await new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 5000);
  });

  onReceipt({
    error: false,
    orderId: '12345',
    data: 'this is a reciept because I say it is',
  });
};

(async () => {
  await slashtagsPayServer(mockCB);
})();
