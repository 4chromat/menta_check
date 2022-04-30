//-----------------------------------------------
// API FUNCTIONS
//-----------------------------------------------
import axios from "axios";

const cheerio = require('cheerio');

//-----------------------------------------------
// WEBPAGE FUNCTIONS
//-----------------------------------------------

// async website scrapping needs to go through cheerio
async function getWebpageUrls(url) {
    var links = [];
    await axios.get(url)
        .then(res => {
            const $ = cheerio.load(res.data)

            // this is a mass object, not an array
            const linkObjects = $('a');
            const total = linkObjects.length;

            for (let i = 0; i < total; i++) {
                var tmp = linkObjects[i].attribs.href
                if (tmp != null && tmp.indexOf("https") > -1) {
                    links.push(linkObjects[i].attribs.href);
                }
            }
        }).catch(err => console.error(err))

    return links
}

//-----------------------------------------------
// TWITTER FUNCTIONS
//-----------------------------------------------

// Twitter Data Collection
// Twitter API call as in Twitter-API-v2-sample-code
// https://github.com/twitterdev/Twitter-API-v2-sample-code/blob/main/User-Lookup/get_users_with_bearer_token.js
// https://developer.twitter.com/en/docs/twitter-api/users/lookup/api-reference/get-users-by-username-username

import { getBearerToken, getOpenseaKey } from './getApiKeys.js'

const twitterEndpointURL = "https://api.twitter.com/2/users/by?usernames=";



const twitterFieldsArray = [
    'created_at',
    'description',
    'entities',
    'id',
    'location',
    'name',
    'public_metrics',
    'url',
    'username',
    'verified'
];

async function getTwitterRequest(username) {
    const bearerToken = getBearerToken();

    try {
        // HTTP header that adds Twitter's bearer token authentication   "User-Agent": "v2UserLookupJS",
        const geturlParams = twitterEndpointURL + username + "&user.fields=" + twitterFieldsArray.join(',')
        const res = await axios.get(geturlParams, {
            headers: {
                Authorization: `Bearer ${bearerToken}`
            }
        })
        if (res.data) {
            return res.data;
        } else {
            throw new Error('Unsuccessful Twitter request');
        }
    } catch (error) {
        console.log(error)
    }
}


//-----------------------------------------------
// OPENSEA FUNCTIONS
//-----------------------------------------------

// OpenSea Data Collection
// OpenSea API call as in API Reference 'Retrieving a single collection'
// https://docs.opensea.io/reference/retrieving-a-single-collection
// https://docs.opensea.io/reference/collection-model

const openseaEndpointUrlCollection = "https://api.opensea.io/api/v1/collection/";
const openseaEndpointUrlAsset = "https://api.opensea.io/api/v1/asset/"
const openseaEndpointUrlAssetParams = "/1/?include_orders=false";

const openseaAttributesArray = [
    'created_date',
    'description',
    'dev_seller_fee_basis_points',
    'discord_url',
    'external_url',
    'instagram_username',
    'is_subject_to_whitelist',
    'name',
    'payout_address',
    'primary_asset_contracts',
    'safelist_request_status',
    'slug',
    'twitter_username'
];

const openseaStatsArray = [
    'average_price',
    'count',
    'floor_price',
    'market_cap',
    'num_owners',
    'num_reports',
    'total_sales',
    'total_supply',
    'total_volume'
];

const openseaContractsArray = [
    'address',
    'payout_address'
];

async function getOpenseaRequestCollection(collectionName) {
    const openseaKey = getOpenseaKey()

    // API Request with HTTP header that adds OpenSea API key
    const geturlParams = openseaEndpointUrlCollection + collectionName
    const res = await axios.get(geturlParams, {
        headers: {
            "X-API-KEY": `${openseaKey}`
        }
    })
    if (res.data) {
        return res.data;
    } else {
        throw new Error('Unsuccessful OpenSea collection request');
    }
}

async function getOpenseaRequestAsset(assetAddress) {
    const openseaKey = getOpenseaKey()

    // API Request with HTTP header that adds OpenSea API key
    const geturlParams = openseaEndpointUrlAsset + assetAddress + openseaEndpointUrlAssetParams;
    const res = await axios.get(geturlParams, {
        headers: {
            "X-API-KEY": `${openseaKey}`
        }
    })
    if (res.data) {
        return res.data;
    } else {
        throw new Error('Unsuccessful OpenSea asset request');
    }
}

//-----------------------------------------------
// TRANSFORM FUNCTIONS
//-----------------------------------------------

async function transformTwitterResponse(username) {

    try {

        if (username) {

            const response = await getTwitterRequest(username);

            if ('errors' in response) {
                return response;
            }

            const data = response['data'][0];

            if ('entities' in data) {
                // The website listed in Twitter could also be in the bio text
                // Collect links in bio for later, need to collect location of t.co links
                // data['entities']['description']

                if ('url' in data['entities']) {
                    data['expanded_url'] = data['entities']['url']['urls'][0]['expanded_url'];
                } else if ('urls' in data['entities']['description']) {
                    data['expanded_url'] = data['entities']['description']['urls'][0]['expanded_url'];
                } else {
                    data['expanded_url'] = null;
                }

                data['followers_count'] = data['public_metrics']['followers_count'];
                data['tweet_count'] = data['public_metrics']['tweet_count'];

                delete data['entities'];
                delete data['public_metrics'];
            }

            data['status'] = 'completed';

            return data;

        } else {

            return {
                'status': 'missing baseTwitter'
            }
        }

    } catch (e) {

        console.log(e);

        return {
            'status': 'failed',
            'errorMessage': `${e}`
        };
    }
}

async function transformOpenseaResponse(name, openseaUrlType) {

    try {
        
        if (name) {
            if (openseaUrlType != "asset") {
                var response = await getOpenseaRequestCollection(name);
            } else if (openseaUrlType == "asset") {
                var response = await getOpenseaRequestAsset(name);
            }

            let data = {};
            for (var v of openseaAttributesArray) {
                data[v] = response['collection'][v];
            }

            for (var v of openseaStatsArray) {
                data[v] = response['collection']['stats'][v];
            }

            for (var v of openseaContractsArray) {
                try { // Collections may miss primary_asset_contracts
                    var temp = response['collection']['primary_asset_contracts'][0][v];
                } catch (e) {
                    var temp = e;
                } finally {
                    data[v] = temp;
                }
            }

            data['status'] = 'completed';

            // // drop console print before updating on Chrome Store
            // console.log('OpenSea response is', response)
            // console.log('OpenSea data is', data)

            return data;

        } else {
            return {
                'status': 'missing baseSlug'
            }
        }


    } catch (e) {

        console.log(e);

        return {
            'status': 'failed',
            'errorMessage': `${e}`
        };
    }
}

function transformWebsiteScrape(baseWebsite, twitterUsernames, openseaSlugs) {

    try {

        if (baseWebsite) {
            const data = {
                'url': baseWebsite,
                'twitter_username_array': twitterUsernames,
                'opensea_slug_array': openseaSlugs
            };

            data['status'] = 'completed';

            return data;
        } else {
            return {
                'status': 'missing baseWebsite'
            }
        }

    } catch (e) {

        console.log(e);

        return {
            'status': 'failed',
            'errorMessage': `${e}`
        };
    }
}


export { getWebpageUrls };
export { transformTwitterResponse, transformOpenseaResponse, transformWebsiteScrape };