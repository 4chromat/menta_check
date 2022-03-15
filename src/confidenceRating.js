//-----------------------------------------------
// SCORING FUNCTIONS
//-----------------------------------------------

//  Annotate confidence flags
async function confidenceFlags(mentaObj, edgecaseList) {

    const rating = {};

    // linked sites often list http, no www, and /$, standarize before comparison
    const linkInOpensea = ('external_url' in mentaObj.openseaData) ? standarizeUrl(mentaObj['openseaData']['external_url']) : null;
    const linkInTwitter = ('expanded_url' in mentaObj.twitterData) ? standarizeUrl(mentaObj['twitterData']['expanded_url']) : null;
    const websiteLink = ('url' in mentaObj.websiteData) ? standarizeUrl(mentaObj.websiteData.url) : null;

    // twitter handles are case insensitive
    const twitterUsername = mentaObj['twitterData']['username'] ? mentaObj['twitterData']['username'].toLowerCase() : null;
    const twitterInOpensea = mentaObj['openseaData']['twitter_username'] ? mentaObj['openseaData']['twitter_username'].toLowerCase() : null;
    const isTwitterVerified = mentaObj['twitterData']['verified'];

    // OpenSea slugs are case sensitive
    const openseaSlug = 'slug' in mentaObj['openseaData'] ? mentaObj['openseaData']['slug'] : null;
    console.log("break")
    const slugInTwitterLink = twitterUsername && mentaObj['twitterData']['expanded_url'] ? mentaObj['twitterData']['expanded_url'].split("opensea.io/collection/")[1] : null;
    const isOpenseaSafelist = (mentaObj['openseaData']['safelist_request_status'] === 'verified') ||
        (mentaObj['openseaData']['safelist_request_status'] === 'approved');

    rating['baseWebsite'] = mentaObj.baseWebsite;
    rating['baseTwitter'] = mentaObj.baseTwitter;
    rating['baseSlug'] = mentaObj.baseSlug;
    rating['frontTabCategory'] = mentaObj.frontTabCategory;

    // Set collection metadata
    rating['floorPrice'] = 'floor_price' in mentaObj.openseaData ? mentaObj.openseaData.floor_price : null;
    rating['totalVolume'] = 'total_volume' in mentaObj.openseaData ? mentaObj.openseaData.total_volume : null;
    rating['followersCount'] = 'followers_count' in mentaObj.twitterData ? mentaObj.twitterData.followers_count : null;

    rating['edgecaseList'] = edgecaseList;

    // Check if each profiles' data was obtained from APIs
    rating['is_website_found'] = ('url' in mentaObj.websiteData) ? true : false;
    rating['is_twitter_found'] = ('id' in mentaObj.twitterData) ? true : false;
    rating['is_opensea_found'] = ('slug' in mentaObj.openseaData) ? true : false;

    // Check verified/approved status
    rating['is_twitter_verified'] = isTwitterVerified === true;
    rating['is_opensea_safelist'] = isOpenseaSafelist;

    // Exception case for linktrees. TO DO: Scrape link tree
    rating['is_twitter_link_linktree'] = linkInTwitter === "linktr.ee";

    // Check if any profile in blocklist
    rating['is_twitter_username_in_blocklist'] = false; // To do: create Blocklist
    rating['is_opensea_slug_in_blocklist'] = false; // To do: create Blocklist
    rating['is_website_in_blocklist'] = false; // To do: create Blocklist

    // Flag if Twitter found in opensea page (API or scrape)
    rating['is_twitter_found_in_opensea'] = ('twitter_username' in mentaObj.openseaData) &&
        mentaObj.openseaData.twitter_username !== null ? true : false;

    //// Verify cross-referenced data checks out:

    // Same twitter handle in Twitter API response and OpenSea API response (or opensea scrape)
    rating['is_twitter_username_match_opensea_twitter'] = twitterInOpensea === twitterUsername;
    // Same external_url (website) listed in Twitter API and OpenSea API
    rating['is_opensea_webpage_match_twitter_webpage'] = linkInOpensea === linkInTwitter;
    // Same external_url in OpenSea API and our unique URL
    rating['is_opensea_link_same_website'] = (linkInOpensea !== null) && (linkInOpensea === websiteLink);
    // Same link listed in twitter profile in website url OR opensea collection page
    rating['is_twitter_link_same_website'] = (linkInTwitter !== null) &&
        ((linkInTwitter === websiteLink) ||
            ((slugInTwitterLink !== null) && (slugInTwitterLink === mentaObj.baseSlug)));

    // Same twitter handle from API is also on website
    if ('twitter_username_array' in mentaObj.websiteData)
        var twitterUsernamesInWebsite = mentaObj['websiteData']['twitter_username_array'];
    else
        var twitterUsernamesInWebsite = [];

    if (twitterUsernamesInWebsite.length > 0)
        // true: username in website
        // false: another username in website
        // null: no usernames in website
        rating['is_twitter_username_in_website'] = twitterUsernamesInWebsite.includes(twitterUsername) ? true : false;
    else
        rating['is_twitter_username_in_website'] = null;

    // Same slug from API is also on website
    if ('opensea_slug_array' in mentaObj.websiteData)
        var slugsInWebsite = mentaObj['websiteData']['opensea_slug_array'];
    else
        var slugsInWebsite = [];

    if (slugsInWebsite.length > 0)
        rating['is_slug_in_website'] = slugsInWebsite.includes(openseaSlug) ? true : false;
    else
        rating['is_slug_in_website'] = null;

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
        rating['is_opensea_link_same_website'] &&
        rating['is_slug_in_website'] !== false
    ) {

        rating['rate'] = 'A+';

    } else if ( // One account verified and other found, plus match, then rate 'A'
        (rating['is_twitter_verified'] &&
            rating['is_twitter_link_same_website'] &&
            rating['is_opensea_found'] &&
            rating['is_twitter_username_match_opensea_twitter'] &&
            rating['is_slug_in_website'] !== false) ||
        (rating['is_opensea_safelist'] &&
            rating['is_opensea_link_same_website'] &&
            rating['is_twitter_found'] &&
            rating['is_twitter_username_match_opensea_twitter'] &&
            rating['is_slug_in_website'] !== false)
    ) {

        rating['rate'] = 'A';

    } else if ( // Front tab is a verified OpenSea/Twitter, even if others are missing
        (rating['is_opensea_safelist'] &&
            rating['frontTabCategory'] == 'opensea') ||
        (rating['is_twitter_verified'] &&
            rating['frontTabCategory'] == 'twitter')
    ) {

        rating['rate'] = 'A';

    } else if ( // One account verified and other found, or all found, then rate 'B'
        (rating['is_twitter_verified'] &&
            rating['is_twitter_link_same_website'] &&
            rating['is_opensea_found'] &&
            rating['is_slug_in_website'] !== false) ||
        (rating['is_opensea_safelist'] &&
            rating['is_opensea_link_same_website'] &&
            rating['is_twitter_found'] &&
            rating['is_slug_in_website'] !== false) ||
        (rating['is_twitter_found'] &&
            rating['is_opensea_found'] &&
            rating['is_opensea_link_same_website'] &&
            rating['is_twitter_found_in_opensea'] &&
            rating['is_slug_in_website'] !== false &&
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
            !rating['is_twitter_found'] &&
            rating['is_slug_in_website'] !== false
        ) ||
        (rating['is_opensea_found'] &&
            rating['is_twitter_found'] &&
            rating['is_slug_in_website'] !== false)
    ) {

        rating['rate'] = 'C';

    } else if ( // Accounts not verified, mismatch, or data clash then rate 'D'
        !(rating['is_twitter_link_same_website'] ||
            rating['is_opensea_link_same_website']) ||
        rating['is_slug_in_website'] === false
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