import fetch from "node-fetch";

const EXPLORER_API_URL = "https://api-testnet.ergoplatform.com/";
const MINT_ADDRESS = "3WwKzFjZGrtKAV7qSCoJsZK9iJhLLrUa3uwd4yw52bVtDVv6j5TL";

class Transaction {
    constructor(id, inclusionHeight, outputs) {
        this.id = id;
        this.inclusionHeight = inclusionHeight;
        this.outputs = outputs;
    }
}

class Output {
    constructor(assets) {
        this.assets = assets;
    }
}

class Asset {
    constructor(tokenId, name) {
        this.tokenId = tokenId;
        this.name = name;
    }
}

async function get_total_transactions_of_mint_address() {
    let url = EXPLORER_API_URL + "api/v1/addresses/" + MINT_ADDRESS + "/transactions?limit=1";
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data['total'] });
}

async function get_raw_transaction_data(offset) {
    let url = EXPLORER_API_URL + "api/v1/addresses/" + MINT_ADDRESS + "/transactions?limit=500&offset=" + offset;
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data['items'] });
}

async function create_small_transaction_array(offset) {
    let transactionData = await get_raw_transaction_data(offset);
    let transactionArray = [];
    let transactionCount = Object.keys(transactionData).length;
    for (let i=0; i<transactionCount; i++) {
        let id = transactionData[i].id;
        let inclusionHeight = transactionData[i].inclusionHeight;
        let outputs = transactionData[i].outputs;
        let tx = new Transaction(id, inclusionHeight, outputs);
        transactionArray.push(tx);
    }
    return transactionArray;
}

async function create_complete_transaction_array() {
    let total = await get_total_transactions_of_mint_address();
    let neededCalls = Math.floor(total / 500) + 1;
    let offset = 0;
    let transactionArray = [];
    for (let i=0; i<neededCalls; i++) {
        let smallArray = await create_small_transaction_array(offset);
        transactionArray = transactionArray.concat(smallArray);
        offset += 500;
    }
    return transactionArray;
}

async function update_transaction_array(transactionArray) {
    for (let i=0; i<transactionArray.length; i++) {
        let assets = transactionArray[i].outputs[0]['assets'];
        let opt = new Output(assets);
        transactionArray[i].outputs = opt;
        for (let j=0; i<transactionArray[i].outputs.assets; j++) {
            let tokenId = transactionArray[i].outputs.assets[j]['tokenId'];
            let name = transactionArray[i].outputs.assets[j]['name'];
            let asset = new Asset(tokenId, name);
            transactionArray[i].outputs.assets[j] = asset;
        }
    }
    return transactionArray;
}

async function get_asset_id(transactionArray, name) {
    let exists = false;
    let id = "";
    for (let i=0; i<transactionArray.length; i++) {
        for (let j=0; j<transactionArray[i].outputs.assets.length; j++) {
            if (name == transactionArray[i].outputs.assets[j].name) {
                exists = true;
                id = transactionArray[i].outputs.assets[j].tokenId;
                break;
            }
        }
    }
    if (exists) {
        return id;
    } else {
        return null;
    }
}

async function get_box_id_of_asset(id) {
    if (id !== null) {
        let url = EXPLORER_API_URL + "api/v1/tokens/" + id;
        return await fetch(url)
            .then(res => res.json())
            .then(data => { return data['boxId'] });
    } else {
        return null;
    }
}

async function get_box_id_address(boxId) {
    if (boxId !== null) {
        let url = EXPLORER_API_URL + "api/v1/boxes/" + boxId;
        return await fetch(url)
            .then(res => res.json())
            .then(data => { return data['address'] });
    } else {
        return null;
    }
}

async function check_if_transaction_mints_token() {
    return true;
}

export async function resolve_ergoname(name) {
    let transactionArray = await create_complete_transaction_array();
    transactionArray = await update_transaction_array(transactionArray);
    let id = await get_asset_id(transactionArray, name);
    let boxId = await get_box_id_of_asset(id);
    let address = await get_box_id_address(boxId);
    return address;
}

let start_time = new Date().getTime();

let address = await resolve_ergoname("test mint v0.1.1");
console.log(address);

console.log("\nProgram takes " + (((new Date().getTime()) - start_time) / 1000) + " seconds to run");