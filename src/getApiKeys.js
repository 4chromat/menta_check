
function getBearerToken() {
    const bearerToken = process.env.BEARER_TOKEN;
    return bearerToken
}


function getOpenseaKey() {
    const openseaKey = process.env.OPENSEA_API_KEY;
    return openseaKey

}
export { getBearerToken, getOpenseaKey }
