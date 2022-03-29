import c from 'compact-encoding';
import cstruct from 'compact-encoding-struct';

const Request = cstruct.compile({
  amount: c.uint,
  description: c.string,
  methods: c.array(c.string),
});

const Invoice = cstruct.compile({
  method: c.string,
  data: c.string,
});

const Receipt = cstruct.compile({
  orderId: c.string,
  data: c.string,
});

export const SlashPayProtocol = (mux, callbacks) => {
  const protocol = mux.createChannel({
    protocol: 'slashpay:alpha',
  });

  protocol.addMessage({
    encoding: Request,
    onmessage(request) {
      callbacks.onRequest(request, sendInvoice, sendReceipt);
    },
  });

  const invoiceMessage = protocol.addMessage({
    encoding: Invoice,
    onmessage(invoice) {
      callbacks.onInvoice(invoice);
    },
  });

  const receiptMessage = protocol.addMessage({
    encoding: Receipt,
    onmessage(receipt) {
      callbacks.onReceipt(receipt);
    },
  });

  protocol.addMessage({
    encoding: c.string,
    onmessage(error) {
      callbacks.onError(error);
    },
  });

  function sendInvoice(invoice) {
    invoiceMessage.send(invoice);
  }

  function sendReceipt(receipt) {
    receiptMessage.send(receipt);
  }

  return protocol;
};
