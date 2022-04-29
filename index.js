import fetch from "node-fetch";

const EXPLORER_API_URL = "https://api-testnet.ergoplatform.com/";
const MINT_ADDRESS = "3WwKzFjZGrtKAV7qSCoJsZK9iJhLLrUa3uwd4yw52bVtDVv6j5TL";

class Token {
    constructor(id, boxId, name) {
        this.id = id;
        this.boxId = boxId;
        this.name = name;
    }
}

async function get_address_data(address) {
    let url = EXPLORER_API_URL + "api/v1/addresses/" + address + "/balance/confirmed";
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data })
}

async function create_address_data(address) {
    let tokensRaw = await get_address_data(address);
    let tokens = tokensRaw["tokens"];
    return tokens;
}

async function create_address_tokens_array(tokenData) {
    let tokenArray = []
    for (let i=0; i<Object.keys(tokenData).length; i++) {
        let tk = new Token(tokenData[i]["tokenId"], "none", tokenData[i]["name"]);
        tokenArray.push(tk);
    }
    return tokenArray;
}

async function remove_wrong_names_tokens(tokenArray) {
    let newArr = []
    for (let i=0; i<tokenArray.length; i++) {
        if (tokenArray[i].name[0] ==  "~") {
            newArr.push(tokenArray[i]);
        }
    }
    return newArr;
}

async function check_correct_ownership(tokenArray, address) {
    let ownedErgoNames = [];
    for (let i=0; i<tokenArray.length; i++) {
        let ownerAddress = await resolve_ergoname(tokenArray[i].name);
        if (ownerAddress == MINT_ADDRESS) {
            ownedErgoNames.push(tokenArray[i]);
        }
    }
    return ownedErgoNames;
}

async function get_token_data(tokenName, limit, offset) {
    let url = EXPLORER_API_URL + "api/v1/tokens/search?query=" + tokenName + "&limit=" + limit + "&offset=" + offset;
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data} )
}

async function create_token_data(tokenName) {
    let totalRaw = await get_token_data(tokenName, 1, 0);
    let total = totalRaw['total'];
    let neededCalls = Math.floor(total / 500) + 1;
    let tokenData = [];
    let offset = 0;
    if (total > 0) {
        for (let i=0; i<neededCalls; i++) {
            let dataRaw = await get_token_data(tokenName, 500, offset);
            let data = dataRaw['items']
            tokenData.push(data);
            offset += 500;
        }
        return tokenData[0];
    } else {
        return null;
    }
}

async function convert_token_data_to_token(data) {
    let tokenArray = []
    for (let i=0; i<Object.keys(data).length; i++) {
        let tk = new Token(data[i]['id'], data[i]['boxId'], data[i]['name']);
        tokenArray.push(tk);
    }
    return tokenArray;
}

async function get_box_address(boxId) {
    let url = EXPLORER_API_URL + "api/v1/boxes/" + boxId;
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data['address']} )
}

async function check_box_address(address) {
    if (address == MINT_ADDRESS) {
        return true;
    }
    return false;
}

async function get_asset_minted_at_address(tokenArray) {
    for (let i=0; i<tokenArray.length; i++) {
        let address = await get_box_address(tokenArray[i].boxId);
        if (await check_box_address(address)) {
            return tokenArray[i].id;
        }
    }
    return null;
}

async function get_token_transaction_data(tokenId) {
    let total = await get_max_transactions_for_token(tokenId);
    let url = EXPLORER_API_URL + "api/v1/assets/search/byTokenId?query=" + tokenId + "&limit=1&offset=" + (total-1);
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data['items']} )
}

async function get_max_transactions_for_token(tokenId) {
    let url = EXPLORER_API_URL + "api/v1/assets/search/byTokenId?query=" + tokenId + "&limit=1";
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data['total']} )
}

async function get_last_transaction(data) {
    return data[data.length - 1];
}

async function get_box_id_from_transaction_data(data) {
    return data['boxId'];
}

export async function resolve_ergoname(name) {
    let tokenData = await create_token_data(name);
    if (tokenData != null) {
        let tokenArray = await convert_token_data_to_token(tokenData);
        let tokenId = await get_asset_minted_at_address(tokenArray);
        let tokenTransactions = await get_token_transaction_data(tokenId);
        let tokenLastTransaction = await get_last_transaction(tokenTransactions);
        let tokenCurrentBoxId = await get_box_id_from_transaction_data(tokenLastTransaction);
        return await get_box_address(tokenCurrentBoxId);
    }
    else {
        return null;
    }
}

export async function check_already_registered(name) {
    let address = await resolve_ergoname(name);
    if (address != null) {
        return true;
    }
    return false;
}

export async function reverse_search(address) {
    let tokenData = await create_address_data(address);
    let tokenArray = await create_address_tokens_array(tokenData);
    tokenArray = await remove_wrong_names_tokens(tokenArray);
    let owned = await check_correct_ownership(tokenArray, address);
    return owned;
}