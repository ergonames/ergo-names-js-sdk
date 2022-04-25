import fetch from "node-fetch";

const EXPLORER_API_URL = "https://api-testnet.ergoplatform.com/";
const MINT_ADDRESS = "3WwKzFjZGrtKAV7qSCoJsZK9iJhLLrUa3uwd4yw52bVtDVv6j5TL";

class Token {
    constructor(id, boxId, emmissionAmount, name, description, type, decimals) {
        this.id = id;
        this.boxId = boxId;
        this.emmissionAmount = emmissionAmount;
        this.name = name;
        this.description = description;
        this.type = type;
        this.decimals = decimals;
    }
}

export async function get_token_data(tokenName, limit, offset) {
    let url = EXPLORER_API_URL + "api/v1/tokens/search?query=" + tokenName + "&limit=" + limit + "&offset=" + offset;
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data} )
}

export async function create_token_data(tokenName) {
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

export async function convert_token_data_to_token(data) {
    let tokenArray = []
    for (let i=0; i<Object.keys(data).length; i++) {
        let tk = new Token(data[i]['id'], data[i]['boxId'], data[i]['emmissionAmount'], data[i]['name'], data[i]['description'], data[i]['type'], data[i]['decimals']);
        tokenArray.push(tk);
    }
    return tokenArray;
}

export async function get_box_address(boxId) {
    let url = EXPLORER_API_URL + "api/v1/boxes/" + boxId;
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data['address']} )
}

export async function check_box_address(address) {
    if (address == MINT_ADDRESS) {
        return true;
    }
    return false;
}

export async function get_asset_minted_at_address(tokenArray) {
    for (let i=0; i<tokenArray.length; i++) {
        let address = await get_box_address(tokenArray[i].boxId);
        if (await check_box_address(address)) {
            return tokenArray[i].id;
        }
    }
    return null;
}

export async function get_token_transaction_data(tokenId) {
    let total = await get_max_transactions_for_token(tokenId);
    let url = EXPLORER_API_URL + "api/v1/assets/search/byTokenId?query=" + tokenId + "&limit=1&offset=" + (total-1);
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data['items']} )
}

export async function get_max_transactions_for_token(tokenId) {
    let url = EXPLORER_API_URL + "api/v1/assets/search/byTokenId?query=" + tokenId + "&limit=1";
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data['total']} )
}

export async function get_last_transaction(data) {
    return data[data.length - 1];
}

export async function get_box_id_from_transaction_data(data) {
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