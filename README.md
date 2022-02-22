# Ergo Names JavaScript SDK

A simple SDK for resolving Ergo Names.

### Installation

To install the library:

```
npm install https://github.com/ergonames/ergo-names-js
```

To import the functions:

```js
import { check_name_exists, lookup_owner_address } from "ergo-names-js";
```

### Example

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