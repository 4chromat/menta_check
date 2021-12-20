const start = Date.now();

const runTest = false;

const base_twitter_username = 'worldofwomennft'

const base_opensea_slug = 'world-of-women-nft'  // slug is OpenSea's unique collection name



//-----------------------------------------------
// API FUNCTIONS
//-----------------------------------------------

const needle = require('needle');



// Twitter API call as in Twitter-API-v2-sample-code
// https://github.com/twitterdev/Twitter-API-v2-sample-code/blob/main/User-Lookup/get_users_with_bearer_token.js
// https://developer.twitter.com/en/docs/twitter-api/users/lookup/api-reference/get-users-by-username-username

const bearerToken = process.env.BEARER_TOKEN;

const twitterEndpointURL = "https://api.twitter.com/2/users/by?usernames="

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
]

async function getTwitterRequest(username) {

    // Parameters for the API request
    const params = {
        usernames: username,
        "user.fields": twitterFieldsArray.join(',')
    }

    // HTTP header that adds Twitter's bearer token authentication
    const res = await needle('get', twitterEndpointURL, params, {
        headers: {
            "User-Agent": "v2UserLookupJS",
            "authorization": `Bearer ${bearerToken}`
        }
    })

    if (res.body) {
        return res.body;
    } else {
        console.log(res.body);
        throw new Error('Unsuccessful Twitter request')
    }
}

async function transformTwitterResponse(username) {

    try {
        // Get Twitter response 
        const response = await getTwitterRequest(username);

        // Parsing of response continues async
        const data = response['data'][0]

        data['expanded_url'] = data['entities']['url']['urls'][0]['expanded_url']
        data['followers_count'] = data['public_metrics']['followers_count']
        data['following_count'] = data['public_metrics']['following_count']
        data['tweet_count'] = data['public_metrics']['tweet_count']

        delete data['entities'];
        delete data['public_metrics'];

        return data;

    } catch (e) {
        return {
            'status': 'failed',
            'errorMessage': `${e}`
        };
    }
}



// OpenSea API call as in API Reference 'Retrieving a single collection'
// https://docs.opensea.io/reference/retrieving-a-single-collection
// https://docs.opensea.io/reference/collection-model

const openseaKey = process.env.OPENSEA_API_KEY;

const openseaEndpointURL = "https://api.opensea.io/api/v1/collection/"

const openseaAttributesArray = [
    'created_date',
    'description',
    'external_url',
    'external_url',
    'instagram_username',
    'is_subject_to_whitelist',
    'safelist_request_status',
    'twitter_username'
]

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
]

const openseaContractsArray = [
    'address',
    'payout_address'
]

async function getOpenseaRequest(collectionName) {

    // API Request with HTTP header that adds OpenSea API key
    const res = await needle('get', openseaEndpointURL + collectionName, {
        headers: {
            "X-API-KEY": `${openseaKey}`
        }
    })

    if (res.body) {
        return res.body;
    } else {
        console.log(res.body);
        throw new Error('Unsuccessful OpenSea request')
    }
}

async function transformOpenseaResponse(collectionName = base_opensea_slug) {

    try {
        // Get OpenSea response 
        const response = await getOpenseaRequest(collectionName);

        // Parsing of response continues async
        let data = {};

        for (var v of openseaAttributesArray) {

            data[v] = response['collection'][v];
        }

        for (var v of openseaStatsArray) {
            data[v] = response['collection']['stats'][v];
        }

        for (var v of openseaContractsArray) {
            data[v] = response['collection']['primary_asset_contracts'][0][v];
        }

        data['status'] = 'completed';

        return data;

    } catch (e) {
        // console.log(e);
        return {
            'status': 'failed',
            'errorMessage': `${e}`
        };
    }
}

//-----------------------------------------------
// SCORING FUNCTIONS
//-----------------------------------------------

//  Data collection from Twitter and OpenSea
async function collectData() {

    const twitterData = await transformTwitterResponse(base_twitter_username);

    const openseaData = await transformOpenseaResponse(base_opensea_slug);

    data = {
        'baseSlug': base_opensea_slug,
        'baseTwitter': base_twitter_username,
        'openseaData': openseaData,
        'twitterData': twitterData
    }

    return data;
}

//  Assign A-F grade
(async () => {

    const data = await collectData();

    if (runTest === false) {

        data['runTest'] = runTest;
        data['timestamp'] = Date.now();
        data['runTimeMSecs'] = `${Math.floor((Date.now() - start))}`;

    } else {

        data['runTest'] = runTest;
        data['timestamp'] = start - start;
        data['runTimeMSecs'] = `${Math.floor((start - start))}`;

    }

    if (data['openseaData']['safelist_request_status'] === 'verified' && 
        data['twitterData']['verified'] === true) {

        data['rating'] = 'A';

    }
    
    // To do: Compare OpenSea and Twitter data with known og/fake DB following spec doc

    // else if () {

    //     data['rating'] = 'B';

    // } else if () {

    //     data['rating'] = 'C';

    // } else if () {

    //     data['rating'] = 'D';

    // } else if () {

    //     data['rating'] = 'F';

    // }

    console.log(data)

})();