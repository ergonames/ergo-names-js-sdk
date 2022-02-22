import fetch from "node-fetch";

const ergonamesTestnetAPIBaseUrl = "https://testnet-api.ergonames.com";
const ergonamesMainnetAPIBaseUrl = "https://api.ergonames.com";

function create_url(name) {
    var url = ergonamesTestnetAPIBaseUrl + "/ergonames/resolve/" + name;
    return url
}

async function resolve_response(url) {
    return await fetch(url)
        .then(res => res.json())
        .then(data => {
            return data;
        })
}

export async function lookup_owner_address(name) {
    let url = create_url(name);
    let response = await resolve_response(url);
    let address = response['ergo'];
    return address;
}

export async function check_name_exists(name) {
    let address = await lookup_owner_address(name);
    if (address == null) {
        return false;
    }
    return true;
}