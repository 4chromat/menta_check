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

const start = Date.now();

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

        if (username) {

            const response = await getTwitterRequest(username);

            const data = response['data'][0];

            data['expanded_url'] = data['entities']['url']['urls'][0]['expanded_url'];
            data['followers_count'] = data['public_metrics']['followers_count'];
            data['following_count'] = data['public_metrics']['following_count'];
            data['tweet_count'] = data['public_metrics']['tweet_count'];

            delete data['entities'];
            delete data['public_metrics'];

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

async function transformOpenseaResponse(collectionName) {

    try {

        if (collectionName) {

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
                } catch (e) {
                    var temp = e;
                } finally {
                    data[v] = temp;
                }
            }

            data['status'] = 'completed';

            return data;

        } else {
            return {
                'status': 'missing baseOpensea'
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


//-----------------------------------------------
// SCORING FUNCTIONS
//-----------------------------------------------


//  Annotate confidence flags
async function confidenceFlags(mentaObj) {

    const rating = {};

    // linked sites often list http, no www, and /$, standarize before comparison
    const linkInOpensea = ('external_url' in mentaObj.openseaData) ? standarizeUrl(mentaObj['openseaData']['external_url']) : null;
    const linkInTwitter = ('expanded_url' in mentaObj.twitterData) ? standarizeUrl(mentaObj['twitterData']['expanded_url']) : null;
    const linkInWebsite = standarizeUrl(mentaObj.baseWebsite);

    // twitter handles are case insensitive
    const twitterUsername = mentaObj['twitterData']['username'] ? mentaObj['twitterData']['username'].toLowerCase() : null;
    const twitter_in_opensea = mentaObj['openseaData']['twitter_username'] ? mentaObj['openseaData']['twitter_username'].toLowerCase() : null;
    const baseTwitterUsernameLower = mentaObj.baseTwitterUsername? mentaObj.baseTwitterUsername.toLowerCase() : null;
    const isTwitterVerified = mentaObj['twitterData']['verified'];
   
    // OpenSea slugs are case sensitive
    const isOpenseaSafelist = (mentaObj['openseaData']['safelist_request_status'] === 'verified') ||
        (mentaObj['openseaData']['safelist_request_status'] === 'approved');

    rating['is_twitter_found'] = ('id' in mentaObj.twitterData) ? true : false;
    rating['is_opensea_found'] = ('slug' in mentaObj.openseaData) ? true : false;
    rating['is_twitter_found_in_opensea'] = ('twitter_username' in mentaObj.openseaData) ? true : false;

    rating['is_twitter_verified'] = isTwitterVerified === true;
    rating['is_opensea_safelist'] = isOpenseaSafelist

    rating['is_twitter_username_match_opensea_twitter'] = twitter_in_opensea === twitterUsername;
    rating['is_opensea_webpage_match_twitter_webpage'] = linkInOpensea === linkInTwitter;

    rating['is_twitter_link_same_website'] = (linkInTwitter === linkInWebsite) && (linkInTwitter !== null);
    rating['is_opensea_link_same_website'] = (linkInOpensea === linkInWebsite) && (linkInOpensea !== null);
    rating['is_twitter_link_linktree'] = linkInTwitter === "linktr.ee";

    rating['is_twitter_username_in_website'] = twitterUsername === baseTwitterUsernameLower;
    rating['is_slug_in_website'] = mentaObj['openseaData']['slug'] === mentaObj.baseOpenseaSlug !== null;

    rating['is_twitter_username_in_blocklist'] = false; // To do: create Blocklist
    rating['is_opensea_slug_in_blocklist'] = false; // To do: create Blocklist
    rating['is_website_in_blocklist'] = false; // To do: create Blocklist

    return rating;

}

//  Assign A-F rating
// To do: add recommended sites in rating and stats validation
async function confidenceRating(mentaObj) {

    console.log("Assigning confidence flags...")
    const rating = await confidenceFlags(mentaObj);

    console.log("Computing confidence rating...")

    if ( // OpenSea and Twitter not found, then rate NA
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
            rating['is_twitter_username_match_opensea_twitter']) ||
        (rating['is_opensea_safelist'] &&
            rating['is_opensea_link_same_website'] &&
            rating['is_twitter_found'] &&
            rating['is_twitter_username_match_opensea_twitter'])
    ) {

        rating['rate'] = 'A';

    } else if ( // One account verified and other found, or all found, then rate 'B'
        (rating['is_twitter_verified'] &&
            rating['is_twitter_link_same_website'] &&
            rating['is_opensea_found']) ||
        (rating['is_opensea_safelist'] &&
            rating['is_opensea_link_same_website'] &&
            rating['is_twitter_found']) ||
        (rating['is_twitter_found'] &&
            rating['is_opensea_found'] &&
            rating['is_opensea_link_same_website'] &&
            rating['is_twitter_found_in_opensea'] &&
            (rating['is_twitter_link_same_website'] || rating['is_twitter_link_linktree']))
    ) {

        rating['rate'] = 'B';

    } else if ( // Accounts not verified, at least one found, then rate 'C'  
        (rating['is_twitter_found'] &&
            rating['is_twitter_link_same_website'] &&
            !rating['is_opensea_found']
        ) ||
        (rating['is_opensea_found'] &&
            rating['is_opensea_link_same_website'] &&
            !rating['is_twitter_found']
        ) ||
        (rating['is_opensea_found'] &&
            rating['is_twitter_found'])
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
    // console.log(rating);  // drop console print before updating on Chrome Store

    mentaObj['rating'] = rating;


    mentaObj['timestamp'] = Date.now();
    mentaObj['runTimeMSecs'] = `${Math.floor((Date.now() - start))}`;

    // console.log(mentaObj);  // drop console print before updating on Chrome Store

    return mentaObj;
}

function standarizeUrl(link) {
    //  Clean domain name and extension from url for matching 
    // i.e.  https://www.website.com/#3223/  -> website.com
    // i.e. https://clonex.rtfkt.com/ -> rtfkt.com

    if (link === undefined || link === null) { return null }

    link = link.replace('https://', '').replace('http://', '');
    link = link.replace(/^www\./, '');
    link = link.replace(/\/.*$/g, '');
    link = link.split(".").slice(-2).join('.')
    return link.toLowerCase()
}

export { confidenceRating, getWebpageUrls, standarizeUrl };
export { transformTwitterResponse, transformOpenseaResponse, transformWebsiteScrape };