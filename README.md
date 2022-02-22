# Ergo Names JavaScript SDK

A simple SDK for resolving [Ergo Names](https://ergonames.com).

### Installation

To install the library:

```
npm install https://github.com/ergonames/ergo-names-js
```

A published package will be available once Ergo Names is released on mainnet.

To import the functions:

```js
import { check_name_exists, lookup_owner_address } from "ergo-names-js";
```

### Documentation

Checking if address exists

```js
import { check_name_exists } from "ergo-names-js";

let exists = await check_name_exists("bob.ergo");
console.log(exists);
```

Lookup owner address

```js
import { lookup_owner_address } from "ergo-names-js";

let address = await lookup_owner_address("bob.ergo");
console.log(address);
```