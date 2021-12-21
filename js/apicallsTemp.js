// Note:
// All code notation in lowerCamelCase, all variables FROM API and TO Database with underscore.

// To do: Split in multiple files / functions

require('dotenv').config();

const start = Date.now();

const runTest = false;

const baseTwitterUsername = 'crypto_coven';   // Todo: update username to 'id' twitters unique id

const baseOpenseaSlug = 'cryptocoven';    // slug is OpenSea's unique collection name



// Website Data Collection
// Url, twitter username, and Open Sea slugs scrapped from website in popup.js 
const baseWebsite = 'https://www.cryptocoven.xyz/';  // tab.url in popus.js

const twitterUsernameArray = ['crypto_coven']  // Twitter handles from popups.js (todo arrays)

const openseaSlugArray = ['cryptocoven'] // OpenSea slugs from popups.js (todo arrays)


function transformWebsiteScrape(baseWebsite) {

    try {

        const data = {
            'url': baseWebsite,
            'twitter_username_array': twitterUsernameArray,
            'opensea_slug_array': openseaSlugArray
        };

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
// API FUNCTIONS
//-----------------------------------------------

const needle = require('needle');

// Twitter Data Collection
// Twitter API call as in Twitter-API-v2-sample-code
// https://github.com/twitterdev/Twitter-API-v2-sample-code/blob/main/User-Lookup/get_users_with_bearer_token.js
// https://developer.twitter.com/en/docs/twitter-api/users/lookup/api-reference/get-users-by-username-username

const bearerToken = process.env.BEARER_TOKEN;

const twitterEndpointURL = "https://api.twitter.com/2/users/by/username/:username"
//"https://api.twitter.com/2/users/by?usernames=";


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

   
    console.log(username)
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
        console.log("getTwitterRequest " + twitterEndpointURL + " " + params)
        return res.body;
    } else {
       
        throw new Error('Unsuccessful Twitter request');
    }
}

async function transformTwitterResponse(username) {

    try {
        // Get Twitter response 
        const response = await getTwitterRequest(username);

        // Parsing of response continues async
        const data = response['data'][0];

        data['expanded_url'] = data['entities']['url']['urls'][0]['expanded_url'];
        data['followers_count'] = data['public_metrics']['followers_count'];
        data['following_count'] = data['public_metrics']['following_count'];
        data['tweet_count'] = data['public_metrics']['tweet_count'];

        delete data['entities'];
        delete data['public_metrics'];

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


// OpenSea Data Collection
// OpenSea API call as in API Reference 'Retrieving a single collection'
// https://docs.opensea.io/reference/retrieving-a-single-collection
// https://docs.opensea.io/reference/collection-model

const openseaKey = process.env.OPENSEA_API_KEY;

const openseaEndpointURL = "https://api.opensea.io/api/v1/collection/";

const openseaAttributesArray = [

    'created_date',
    'description',
    'external_url',
    'external_url',
    'instagram_username',
    'is_subject_to_whitelist',
    'name',
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
        throw new Error('Unsuccessful OpenSea request');
    }
}

async function transformOpenseaResponse(collectionName) {

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

    const twitterData = await transformTwitterResponse(baseTwitterUsername);

    const openseaData = await transformOpenseaResponse(baseOpenseaSlug);

    const websiteData = transformWebsiteScrape(baseWebsite);

    data = {

        'baseTwitter': baseTwitterUsername,
        'baseSlug': baseOpenseaSlug,
        'baseWebsite': baseWebsite,
        'twitterData': twitterData,
        'openseaData': openseaData,
        'websiteData': websiteData
    }

    return data;
}


//  Annotate confidence flags
async function confidenceFlags() {

    const data = await collectData();

    const rating = {};

    // Specs on sameness 
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness
    rating['is_twitter_verified'] = data['twitterData']['verified'] === true;
    rating['is_opensea_safelist'] = data['openseaData']['safelist_request_status'] === 'verified';
    rating['is_twitter_link_same_website'] = data['twitterData']['expanded_url'] === baseWebsite;
    rating['is_opensea_link_same_website'] = data['openseaData']['external_url'] === baseWebsite;
    rating['is_twitter_username_in_website'] = data['twitterData']['username'] === twitterUsernameArray[0];
    rating['is_slug_in_website'] = data['openseaData']['slug'] === openseaSlugArray[0];
    rating['is_twitter_username_in_blocklist'] = false  // To do: create Blocklist
    rating['is_opensea_slug_in_blocklist'] = false  // To do: create Blocklist
    rating['is_website_in_blocklist'] = false  // To do: create Blocklist

    return rating;

}

//  Assign A-F rating
// To do: add recommended sites in rating
// TBC: All ratings need more insights
(async function confidenceRating() {

    const data = await collectData();

    const rating = await confidenceFlags();

    if ( // Accounts are verified and match then rate 'A'

        rating['is_twitter_verified'] &&
        rating['is_opensea_safelist'] &&
        rating['is_twitter_link_same_website'] &&
        rating['is_opensea_link_same_website'] &&
        rating['is_twitter_username_in_website'] &&
        rating['is_slug_in_website']

    ) {

        rating['rate'] = 'A';

    } else if ( // Accounts not verified but match then rate 'B'

        rating['is_twitter_link_same_website'] &&
        rating['is_opensea_link_same_website'] &&
        rating['is_twitter_username_in_website'] &&
        rating['is_slug_in_website']

    ) {

        rating['rate'] = 'B';

    } else if ( // Accounts not verified, mismatch, or data clash then rate 'C'  

        rating['is_twitter_link_same_website'] ||
        rating['is_opensea_link_same_website'] ||
        rating['is_twitter_username_in_website'] ||
        rating['is_slug_in_website']

    ) {

        rating['rate'] = 'C';

    } else if ( // Accounts not verified, mismatch, and data clash then rate 'D'

        !(rating['is_twitter_link_same_website'] ||
            rating['is_opensea_link_same_website'] ||
            rating['is_twitter_username_in_website'] ||
            rating['is_slug_in_website'])

    ) {

        rating['rate'] = 'D';

    } else if ( // Website, Twitter username, or OpenSea sug in Blacklist then rate 'F'

        rating['is_twitter_username_in_blocklist'] ||
        rating['is_opensea_slug_in_blocklist'] ||
        rating['is_website_in_blocklist'] 

    ) {

        rating['rate'] = 'D';

    }

    data['rating'] = rating;

    if (runTest === false) {

        data['runTest'] = runTest;
        data['timestamp'] = Date.now();
        data['runTimeMSecs'] = `${Math.floor((Date.now() - start))}`;

    } else {

        data['runTest'] = runTest;
        data['timestamp'] = start - start;
        data['runTimeMSecs'] = `${Math.floor((start - start))}`;

    }

    console.log(data)

})();
