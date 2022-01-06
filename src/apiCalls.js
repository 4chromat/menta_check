//-----------------------------------------------
// API FUNCTIONS
//-----------------------------------------------
import axios from "axios";

const cheerio = require('cheerio');


//-----------------------------------------------
// WEBPAGE FUNCTIONS
//-----------------------------------------------
async function getWebpageUrls(url) {
    console.log("getWebpageUrls")
    var links = [];
    await axios.get(url)
    .then(res => {
        const $ = cheerio.load(res.data)
       
        // this is a mass object, not an array
        const linkObjects = $('a');
        const total = linkObjects.length;
    
        for(let i = 0; i < total; i++) {
            var tmp = linkObjects[i].attribs.href
            if(tmp!= null && tmp.indexOf("https") > -1 ) {
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

const start = Date.now();
const runTest = false;

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
    const openseaKey = getOpenseaKey()

    // API Request with HTTP header that adds OpenSea API key
    const geturlParams = openseaEndpointURL + collectionName
    const res = await axios.get(geturlParams, {
        headers: {
            "X-API-KEY": `${openseaKey}`
        }
    })
    if (res.data) {
        return res.data;
    } else {
        throw new Error('Unsuccessful OpenSea request');
    }
}



//-----------------------------------------------
// TRANSFORM FUNCTIONS
//-----------------------------------------------

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

async function transformOpenseaResponse(collectionName) {

    try {

        if (collectionName === undefined)
            collectionName = '';

        const response = await getOpenseaRequest(collectionName);

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
            }
            catch (e) {
                var temp = e;
            }
            finally {
                data[v] = temp;
            }
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

function transformWebsiteScrape(mentaObj) {

    try {

        const data = {
            'url': mentaObj.baseWebsite,
            'twitter_username_array': mentaObj.twitterUsernameArray,
            'opensea_slug_array': mentaObj.openseaSlugArray
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
// SCORING FUNCTIONS
//-----------------------------------------------

//  Data collection from Twitter and OpenSea
async function collectApiData(mentaObj) {

    const websiteData = transformWebsiteScrape(mentaObj);

    const twitterData = await transformTwitterResponse(mentaObj.baseTwitterUsername);

    const openseaData = await transformOpenseaResponse(mentaObj.baseOpenseaSlug);

    var data = {

        'baseTwitter': mentaObj.baseTwitterUsername,
        'baseSlug': mentaObj.baseOpenseaSlug,
        'baseWebsite': mentaObj.baseWebsite,
        'twitterData': twitterData,
        'openseaData': openseaData,
        'websiteData': websiteData
    }

    return data;
}

//  Annotate confidence flags
async function confidenceFlags(mentaObj, data) {
    const rating = {};

    // Twitter and OpenSea linked sites often list http, no www, and /$ 
    const link_in_opensea = standarizeUrl(data['openseaData']['external_url']);
    const link_in_twitter = standarizeUrl(data['twitterData']['expanded_url']);
    const link_in_website = standarizeUrl(mentaObj.baseWebsite);

    // Specs on sameness 
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness

    // console.log('slugggg');
    // console.log(data.openseaData.slug);
    // console.log(data.openseaData.slug === undefined);
    // console.log(data.openseaData.slug === "undefined");

    rating['is_twitter_found'] = ('id' in data.twitterData) ? true : false;
    rating['is_opensea_found'] = ('slug' in data.openseaData) ? true : false;
    rating['is_twitter_found_in_opensea'] = ('twitter_username' in data.openseaData) ? true : false;

    rating['is_twitter_verified'] = data['twitterData']['verified'] === true;
    rating['is_opensea_safelist'] = (data['openseaData']['safelist_request_status'] === 'verified') ||
        (data['openseaData']['safelist_request_status'] === 'approved');
    // || (mentaObj.baseWebsite === 'https://opensea.io');  // Special case for OpenSea website.  Todo: allowlist

    rating['is_twitter_username_match_opensea_twitter'] = data['openseaData']['twitter_username'] === data['twitterData']['username'];
    rating['is_opensea_webpage_match_twitter_webpage'] = data['openseaData']['external_url'] === data['twitterData']['expanded_url'];

    rating['is_twitter_link_same_website'] = link_in_twitter === link_in_website;
    rating['is_opensea_link_same_website'] = link_in_opensea === link_in_website;

    rating['is_twitter_username_in_website'] = data['twitterData']['username'] === mentaObj.baseTwitterUsername;//twitterUsernameArray[0];
    rating['is_slug_in_website'] = data['openseaData']['slug'] === mentaObj.baseOpenseaSlug;//openseaSlugArray[0];

    rating['is_twitter_username_in_blocklist'] = false;  // To do: create Blocklist
    rating['is_opensea_slug_in_blocklist'] = false;  // To do: create Blocklist
    rating['is_website_in_blocklist'] = false;  // To do: create Blocklist

    return rating;

}

//  Assign A-F rating
// To do: add recommended sites in rating
// TBC: All ratings need more insights
async function confidenceRating(mentaObj, data) {

    // console.log("Collecting and transforming data...")
    // const data = await collectApiData(mentaObj);
    // console.log(data);

    console.log("Assigning confidence flags...")
    const rating = await confidenceFlags(mentaObj, data);
    console.log(rating);

    console.log("Computing confidence rating...")

    if (  // OpenSea and Twitter not found, then rate NA
        !rating['is_twitter_found'] &&
        !rating['is_opensea_found']
    ) {

        rating['rate'] = 'NA';

    } else if ( // Accounts are verified and match then rate 'A+'
        rating['is_twitter_verified'] &&
        rating['is_opensea_safelist'] &&
        rating['is_twitter_found_in_opensea'] &&
        rating['is_twitter_username_match_opensea_twitter'] &&
        rating['is_twitter_link_same_website'] &&
        rating['is_opensea_link_same_website']
    ) {

        rating['rate'] = 'A+';

    } else if ( // One account verified and other found, plus match, then rate 'A'
        (rating['is_twitter_verified'] &&
            rating['is_twitter_link_same_website'] &&
            rating['is_opensea_found'] &&
            rating['is_twitter_username_match_opensea_twitter'])
        ||
        (rating['is_opensea_safelist'] &&
            rating['is_opensea_link_same_website'] &&
            rating['is_twitter_found'] &&
            rating['is_twitter_username_match_opensea_twitter'])
    ) {

        rating['rate'] = 'A';

    } else if ( // One account verified and other found, then rate 'B'
        (rating['is_twitter_verified'] &&
            rating['is_twitter_link_same_website'] &&
            rating['is_opensea_found'])
        ||
        (rating['is_opensea_safelist'] &&
            rating['is_opensea_link_same_website'] &&
            rating['is_twitter_found'])
    ) {

        rating['rate'] = 'B';

    } else if ( // Accounts not verified, at least one found, then rate 'C'  
        (rating['is_twitter_found'] &&
            rating['is_twitter_link_same_website'] &&
            !rating['is_opensea_found']
        )
        ||
        (rating['is_opensea_found'] &&
            rating['is_opensea_link_same_website'] &&
            !rating['is_twitter_found'])
    ) {

        rating['rate'] = 'C';

    } else if ( // Accounts not verified, mismatch, or data clash then rate 'D'
        !(rating['is_twitter_link_same_website'] ||
            rating['is_opensea_link_same_website'])
    ) {

        rating['rate'] = 'D';

    } else if ( // Website, Twitter username, or OpenSea sug in Blacklist then rate 'F'
        rating['is_twitter_username_in_blocklist'] ||
        rating['is_opensea_slug_in_blocklist'] ||
        rating['is_website_in_blocklist']
    ) {

        rating['rate'] = 'F';

    }

    console.log('Rating:');
    console.log(rating['rate']);
    console.log(rating);

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
    
    return data;
}

export { collectApiData, confidenceRating, getWebpageUrls };


function standarizeUrl(link) {
    //  Clean domain name and extension from url for matching 
    // i.e.  https://www.website.com/#3223/  -> website.com

    if (link === undefined || link === null) { link = '' }
    console.log('Standarized link:');
    console.log(link);
    link = link.replace('https://', '').replace('http://', '')
    link = link.replace(/^www\./, '')
    link = link.replace(/\/.*$/g, '');
    console.log(link);
    return link
}
