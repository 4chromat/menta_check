//-----------------------------------------------
// SCORING FUNCTIONS
//-----------------------------------------------

//  Annotate confidence flags
async function confidenceFlags(mentaObj, edgecaseList) {

    const rating = {};

    rating['baseWebsite'] = mentaObj.baseWebsite;
    rating['baseTwitter'] = mentaObj.baseTwitter;
    rating['baseSlug'] = mentaObj.baseSlug;
    rating['frontTabCategory'] = mentaObj.frontTabCategory;

    // Set collection metadata
    rating['floorPrice'] = mentaObj.openseaData && 'floor_price' in mentaObj.openseaData ?
        mentaObj.openseaData.floor_price : null;
    rating['totalVolume'] = mentaObj.openseaData && 'total_volume' in mentaObj.openseaData ?
        mentaObj.openseaData.total_volume : null;
    rating['followersCount'] = mentaObj.twitterData && 'followers_count' in mentaObj.twitterData ?
        mentaObj.twitterData.followers_count : null;

    rating['edgecaseList'] = edgecaseList;

    // linked sites often list http, no www, and /$, standarize before comparison
    const linkInOpensea = ('external_url' in mentaObj.openseaData) ? standarizeUrl(mentaObj['openseaData']['external_url']) : null;
    const linkInTwitter = ('expanded_url' in mentaObj.twitterData) ? standarizeUrl(mentaObj['twitterData']['expanded_url']) : null;
    const websiteLink = standarizeUrl(mentaObj.baseWebsite);

    // twitter handles are case insensitive
    const twitterUsername = mentaObj['twitterData']['username'] ? mentaObj['twitterData']['username'].toLowerCase() : null;
    const twitterInOpensea = mentaObj['openseaData']['twitter_username'] ? mentaObj['openseaData']['twitter_username'].toLowerCase() : null;
    const baseTwitterLower = mentaObj.baseTwitter ? mentaObj.baseTwitter.toLowerCase() : null;
    const isTwitterVerified = mentaObj['twitterData']['verified'];

    // OpenSea slugs are case sensitive
    const slugInTwitter = twitterUsername && mentaObj['twitterData']['expanded_url'] ?
        mentaObj['twitterData']['expanded_url'].split("opensea.io/collection/")[1] : null;
    const isOpenseaSafelist = (mentaObj['openseaData']['safelist_request_status'] === 'verified') ||
        (mentaObj['openseaData']['safelist_request_status'] === 'approved');

    rating['is_website_found'] = ('url' in mentaObj.websiteData) ? true : false;
    rating['is_twitter_found'] = ('id' in mentaObj.twitterData) ? true : false;
    rating['is_opensea_found'] = ('slug' in mentaObj.openseaData) ? true : false;
    rating['is_twitter_found_in_opensea'] = ('twitter_username' in mentaObj.openseaData) &&
        mentaObj.openseaData.twitter_username !== null ? true : false;
    rating['is_twitter_verified'] = isTwitterVerified === true;
    rating['is_opensea_safelist'] = isOpenseaSafelist

    rating['is_twitter_username_match_opensea_twitter'] = twitterInOpensea === twitterUsername;
    rating['is_opensea_webpage_match_twitter_webpage'] = linkInOpensea === linkInTwitter;

    // drop console print before updating on Chrome Store
    // console.log("websiteLink: " + websiteLink)
    // console.log("linkInTwitter: " + linkInTwitter)
    // console.log("linkInOpensea: " + linkInOpensea)

    rating['is_twitter_link_same_website'] = (linkInTwitter !== null) &&
        ((linkInTwitter === websiteLink) ||
            ((slugInTwitter !== null) && (slugInTwitter === mentaObj.baseSlug)));
    rating['is_opensea_link_same_website'] = (linkInOpensea === websiteLink) && (linkInOpensea !== null);
    rating['is_twitter_link_linktree'] = linkInTwitter === "linktr.ee";

    rating['is_twitter_username_in_website'] = twitterUsername === baseTwitterLower;
    rating['is_slug_in_website'] = mentaObj['openseaData']['slug'] === mentaObj.baseSlug !== null;

    rating['is_twitter_username_in_blocklist'] = false; // To do: create Blocklist
    rating['is_opensea_slug_in_blocklist'] = false; // To do: create Blocklist
    rating['is_website_in_blocklist'] = false; // To do: create Blocklist

    return rating;

}

//  Assign A-F rating
// To do: add recommended sites in rating and stats validation
async function confidenceRating(mentaObj, edgecaseList) {

    console.log("Assigning confidence flags...")
    const rating = await confidenceFlags(mentaObj, edgecaseList);

    console.log("Computing confidence rating...")

    // drop console print before updating on Chrome Store
    // console.log('mentaObj in confidenceRating is:', mentaObj)

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

    } else if ( // Front tab is a verified OpenSea, even if others are missing
        (rating['is_opensea_safelist'] && 
        rating['frontTabCategory'] == 'opensea') || 
        (rating['is_twitter_verified'] && 
        rating['frontTabCategory'] == 'twitter')
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

    // console.log(rating);  // drop console print before updating on Chrome Store
    mentaObj['rating'] = rating;
    mentaObj['timestamp'] = Date.now();

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
    link = link.split("?")[0]
    return link.toLowerCase()
}

export { confidenceRating, standarizeUrl };