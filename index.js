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

async function get_address_data(address, explorerUrl = EXPLORER_API_URL) {
    let url = explorerUrl + "api/v1/addresses/" + address + "/balance/confirmed";
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

async function get_token_data(tokenName, limit, offset, explorerUrl = EXPLORER_API_URL) {
    let url = explorerUrl + "api/v1/tokens/search?query=" + tokenName + "&limit=" + limit + "&offset=" + offset;
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

async function get_box_address(boxId, explorerUrl = EXPLORER_API_URL) {
    let url = explorerUrl + "api/v1/boxes/" + boxId;
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

async function get_token_transaction_data(tokenId, explorerUrl = EXPLORER_API_URL) {
    let total = await get_max_transactions_for_token(tokenId);
    let url = explorerUrl + "api/v1/assets/search/byTokenId?query=" + tokenId + "&limit=1&offset=" + (total-1);
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data['items']} )
}

async function get_max_transactions_for_token(tokenId, explorerUrl = EXPLORER_API_URL) {
    let url = explorerUrl + "api/v1/assets/search/byTokenId?query=" + tokenId + "&limit=1";
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data['total']} )
}

async function get_last_transaction(data) {
    return data[data.length - 1];
}

async function get_first_transaction(data) {
    return data[0];
}

async function get_settlement_height_from_box_data(data) {
    return data["settlementHeight"];
}

async function get_timestmap_from_block_data(data) {
    return data["block"]["header"]["timestamp"];
}

async function get_box_id_from_transaction_data(data) {
    return data['boxId'];
}

async function get_block_id_from_box_data(data) {
    return data["blockId"];
}

async function get_block_by_block_height(height, explorerUrl = EXPLORER_API_URL) {
    let url = explorerUrl + "api/v1/blocks/" + height;
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data })
}

async function get_box_by_id(boxId, explorerUrl = EXPLORER_API_URL) {
    let url = explorerUrl + "api/v1/boxes/" + boxId;
    return await fetch(url)
        .then(res => res.json())
        .then(data => { return data }) 
}

export async function resolve_ergoname(name) {
    name = reformat_name(name);
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
    name = reformat_name(name);
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

export async function get_total_amount_owned(address) {
    let owned = await reverse_search(address);
    return owned.length;
}

export async function check_name_price(name) {
    name = reformat_name(name);
    return name;
}

export async function get_block_id_registered(name) {
    name = reformat_name(name);
    let tokenData = await create_token_data(name);
    if (tokenData != null) {
        let tokenArray = await convert_token_data_to_token(tokenData);
        let tokenId = await get_asset_minted_at_address(tokenArray);
        let tokenTransactions = await get_token_transaction_data(tokenId);
        let tokenFirstTransactions = await get_first_transaction(tokenTransactions);
        let tokenMintBoxId = await get_box_id_from_transaction_data(tokenFirstTransactions);
        let tokenMintBox = await get_box_by_id(tokenMintBoxId);
        let blockId = await get_block_id_from_box_data(tokenMintBox);
        return blockId;
    }
    return null;
}

export async function get_block_registered(name) {
    name = reformat_name(name);
    let tokenData = await create_token_data(name);
    if (tokenData != null) {
        let tokenArray = await convert_token_data_to_token(tokenData);
        let tokenId = await get_asset_minted_at_address(tokenArray);
        let tokenTransactions = await get_token_transaction_data(tokenId);
        let tokenFirstTransactions = await get_first_transaction(tokenTransactions);
        let tokenMintBoxId = await get_box_id_from_transaction_data(tokenFirstTransactions);
        let tokenMintBox = await get_box_by_id(tokenMintBoxId);
        let height = await get_settlement_height_from_box_data(tokenMintBox);
        return height;
    }
    return null;
}

export async function get_timestamp_registered(name) {
    name = reformat_name(name);
    let blockRegistered = await get_block_id_registered(name);
    if (blockRegistered != null) {
        let blockData = await get_block_by_block_height(blockRegistered);
        let timestamp = await get_timestmap_from_block_data(blockData);
        return timestamp;
    }
    return null;
}

export async function get_date_registered(name) {
    name = reformat_name(name);
    let blockRegistered = await get_block_id_registered(name);
    if (blockRegistered != null) {
        let blockData = await get_block_by_block_height(blockRegistered);
        let timestamp = await get_timestmap_from_block_data(blockData);
        let date = new Date(timestamp);
        return date;
    }
    return null;
}

export function reformat_name(name) {
    return name.toLowerCase();
}

export function check_name_valid(name) {
    for (let i=0; i<name.length; i++) {
        let charCode = name.charCodeAt(i);
        if (charCode <= 44) {
            return false;
        } else if (charCode == 47) {
            return false;
        } else if (charCode >= 58 && charCode <= 94) {
            return false;
        } else if (charCode == 96) {
            return false;
        } else if (charCode >= 123 && charCode <= 125) {
            return false;
        } else if (charCode >= 127) {
            return false;
        }
    }
    return true;
}