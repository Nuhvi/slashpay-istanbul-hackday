# Lightning Hackday Istanbul SlashPay

[Read more](https://docs.google.com/document/d/10rgPbDMer6uL7L8QZ5ve-KU_pkI_YSwSO4dmzUmjU6s/edit)

## Install

```
npm i
```

## example

Run a new SlashPay server

```
$ DEBUG=* node example/server.js

? Use the same server address as last time? No
  slashpay:server Starting SlashPay server +0ms
  slashpay:server SlashPay server listening on:  slashpeer://6ef445de1247d377d5acdc8bad69ac07cbd3860ec31492d99804aa6a900fd28d +393ms
```

Update the receiver Slashtag with the server address

```
$ DEBUG=* node example/wallet.js

? SlashPay server's URL slashpeer://6ef445de1247d377d5acdc8bad69ac07cbd3860ec31492d99804aa6a900fd28d

slashpay:client Updated  slash://7de7sg6t4yyttwcmet22kg32ilfosrcxpgs37jan3mdxcgl7rdrq /.well-known/.slashpay.json : +0ms
```

Try to pay to the receiver Slashtag you got from running example/wallet

```
$ DEBUG=* node example/client.js

? Select a Slashtag to pay slash://7de7sg6t4yyttwcmet22kg32ilfosrcxpgs37jan3mdxcgl7rdrq
```
