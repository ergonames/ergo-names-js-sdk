import fetch from "node-fetch";

var name = fetch("https://testnet-api.ergonames.com/ergonames/resolve/bob.ergo")
    .then(res => res.text())
    .then(data => {
        console.log(data);
    })
    .catch(err => console.log(err));

