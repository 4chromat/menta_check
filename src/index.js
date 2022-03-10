import { getWebpageUrls } from './apiCalls.js';
import { transformTwitterResponse, transformOpenseaResponse, transformWebsiteScrape } from './apiCalls.js';
import { checkWhiteListFunction } from './cloudFunCalls'
import { setMainResults } from './setResults.js';
import { confidenceRating, standarizeUrl } from './confidenceRating.js';
import { getAllURLCurTab, getTwitterUsername, getOpenseaSlug } from './textParsing.js';
import { isTwitterURL, isOpenseaURL } from './textParsing.js';

(async function () {
    console.log("Clicked extension");
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: getAllURLCurTab
    }, (injectionResults) => {
        let openseaURLs = injectionResults[0].result[0];
        let twitterURLs = injectionResults[0].result[1];
        let edgecaseList = injectionResults[0].result[2];
        mainProcess(tab.url, openseaURLs, twitterURLs, edgecaseList);
    });
})();


//-----------------------------------------------
// MAIN
//-----------------------------------------------

// Main function grabs slugs and runs API for restuls
async function mainProcess(url, openseaURLs, twitterURLs, edgecaseList) {

    var frontTabCategory = 'uniqueUrl';
    var baseWebsite = null;
    var baseTwitter = null;
    var baseSlug = null;
    var websiteData = null;
    var twitterData = null;
    var openseaData = null;
    var openseaSlugs = null;
    var twitterUsernames = null;
    var rootDomain = null;
    const start = Date.now();

    console.log("Calling APIs...");
    var mentaAction = "mentalog";
    // If front tab is Twitter/OpenSea profile grab basewebsite from it
    if (isTwitterURL(url)) {

        frontTabCategory = 'twitter';
        baseTwitter = getTwitterUsername([url])[0];
        // SERVER FUNCTION - check if baseTwitter is already in Firebase
        // 'result' is an object that holds confidence flags, same as 'mentaObj.ratings'
        var result = await checkWhiteListFunction(baseTwitter, "base_twitter");
        if (result != "NOTHING") {
            // drop console print before updating on Chrome Store
            // console.log('Allowlist result via baseTwitter is', result)
            // console.log("checkWhiteListFunction pass")

            baseSlug = result.result.baseSlug;
            baseWebsite = result.result.baseWebsite;
            mentaAction = "allowlist";
            // Don't drop action to read all the result from DB yet, it may be used later for consecutive ratings
            // //const mentaBase = { 'frontTab': url }
            // //setMainResults(result, mentaBase, mentaAction)
            // // return;
        }

        twitterData = await transformTwitterResponse(baseTwitter);
        rootDomain = twitterData.expanded_url ? standarizeUrl(twitterData.expanded_url) : null;

    } else if (isOpenseaURL(url)) {

        frontTabCategory = 'opensea';
        baseSlug = getOpenseaSlug([url])[0];
        // SERVER FUNCTION - check if baseSlug is already in Firebase
        var result = await checkWhiteListFunction(baseSlug, "base_slug");

        if (result != "NOTHING") {
            // drop console print before updating on Chrome Store
            // console.log('Allowlist result via baseOpenSea is', result)
            // console.log("checkWhiteListFunction pass")

            mentaAction = "allowlist";
            baseTwitter = result.result.baseTwitter;
            baseWebsite = result.result.baseWebsite;
            // const mentaBase = { 'frontTab': url }
            // setMainResults(result, mentaBase, mentaAction)
            // return;
        }
        openseaData = await transformOpenseaResponse(baseSlug);
        rootDomain = openseaData.external_url ? standarizeUrl(openseaData.external_url) : null;
        
        // Newer OpenSea profiles do not return twitter in API, only scrape
        if (!'twitter_username' in openseaData || !openseaData.twitter_username) {
            const temp = getTwitterUsername(twitterURLs);
            openseaData.twitter_username = temp.length > 0 ? temp[0] : null;
        }
        
    } else if (standarizeUrl(url) === 'opensea.io') {

        frontTabCategory = 'opensea';
        rateEdgeCase('openseaNotInCollection', edgecaseList, url);
        return;

    } else if (standarizeUrl(url) === 'checkmenta.com') {

        frontTabCategory = 'menta';
        rateEdgeCase('checkMentaSite', edgecaseList, url);
        return;

    } else if (frontTabCategory === 'uniqueUrl') {
        // If front tab is a unique url scrape Twitter and OpenSea handles from it

        baseWebsite = url;
        rootDomain = baseWebsite ? standarizeUrl(baseWebsite) : null;

        // SERVER FUNCTION - check if baseWebsite is already in Firebase
        var result = await checkWhiteListFunction(rootDomain, "root_domain");
        if (result != "NOTHING") {
            // drop console print before updating on Chrome Store
            // console.log('Allowlist result via baseWebsite is', result)
            // console.log("checkWhiteListFunction pass")

            mentaAction = "allowlist";
            baseTwitter = result.result.baseTwitter;
            baseSlug = result.result.baseSlug;
            // const mentaBase = { 'frontTab': url }
            // setMainResults(result, mentaBase, mentaAction)
            // return;
        }
        openseaSlugs = getOpenseaSlug(openseaURLs);
        twitterUsernames = getTwitterUsername(twitterURLs)

        websiteData = transformWebsiteScrape(baseWebsite, twitterUsernames, openseaSlugs);

    }

    if (frontTabCategory !== 'uniqueUrl' && (!baseTwitter || !baseSlug || !websiteData)) {
        // If front tab is Twitter/OpenSea profile then scrape the external url link listed 
        // to get the missing data

        console.log("Using profiles for unique URL")

        if (!baseWebsite && openseaData && openseaData.external_url)
            baseWebsite = openseaData.external_url;
        if (!baseWebsite && twitterData && twitterData.expanded_url)
            baseWebsite = twitterData.expanded_url;

        console.log("URL: " + baseWebsite);

        if (baseWebsite) {

            var links = await getWebpageUrls(baseWebsite);
            const openseaURLsWeb = []
            const twitterURLsWeb = []
            if (links.length > 0) {
                for (var link of links) {
                    // only get twitter and openSea links
                    if (isOpenseaURL(link)) openseaURLsWeb.push(link);
                    if (isTwitterURL(link)) twitterURLsWeb.push(link);
                }

                openseaSlugs = getOpenseaSlug(openseaURLsWeb);
                twitterUsernames = getTwitterUsername(twitterURLsWeb);

            } else {
                console.log('No Twitter or OpenSea profiles found');
            }
        }

        websiteData = transformWebsiteScrape(baseWebsite, twitterUsernames, openseaSlugs);
    }

    if (twitterData === null) {
        if (!baseTwitter) {
            if (openseaData && openseaData.twitter_username)
                baseTwitter = openseaData.twitter_username;
            else if (twitterUsernames && twitterUsernames.length > 0) 
                baseTwitter = twitterUsernames[0];
        }
        twitterData = await transformTwitterResponse(baseTwitter);
    }

    if (openseaData === null) {
        if (!baseSlug) {
            if (mentaAction == 'allowList' && result.result.baseSlug !== "")
                baseSlug = result.result.baseSlug;
            else if (openseaSlugs)
                baseSlug = openseaSlugs[0];
        }
        openseaData = await transformOpenseaResponse(baseSlug);
    }

    // If Twitter username is not on OpenSea API response it may still be on OpenSea scrape
    if ((!'twitter_username' in openseaData || !openseaData.twitter_username) && baseSlug) {
        if (result.is_twitter_username_match_opensea_twitter)
            openseaData.twitter_username = result.baseTwitter
        else {
            var temp = "https://opensea.io/collection/" + baseSlug;
            var links = await getWebpageUrls(temp);
            const twitterURLsOpensea = []
            if (links.length > 0) {
                for (var link of links) {
                    if (isTwitterURL(link) && link != 'https://twitter.com/opensea')
                        twitterURLsOpensea.push(link);
                }
                twitterUsernames = getTwitterUsername(twitterURLsOpensea);
                openseaData.twitter_username = twitterUsernames.length > 0 ? twitterUsernames[0] : null;
            }
        }
    }

    const mentaObj = {
        'frontTab': url,
        'frontTabCategory': frontTabCategory,
        'baseTwitter': baseTwitter,
        'baseSlug': baseSlug,
        'baseWebsite': baseWebsite,
        'twitterData': twitterData,
        'openseaData': openseaData,
        'websiteData': websiteData,
        'rootDomain': rootDomain
    }

    // drop console print before updating on Chrome Store
    // console.log('Base Website: ' + baseWebsite);
    // console.log('Base Twitter: ' + baseTwitter);
    // console.log('Base OpenSea: ' + baseSlug);
    // console.log('mentaObj is:', mentaObj);

    console.log("Call confidenceRating: ");

    const resultFinal = await confidenceRating(mentaObj, edgecaseList);

    mentaObj['runTimeMSecs'] = `${Math.floor((Date.now() - start))}`;

    // console.log('mentaObj is:', mentaObj);

    setMainResults(resultFinal, mentaObj, mentaAction)

}

function rateEdgeCase(edgecaseHandle, edgecaseList, url) {
    edgecaseList.push(edgecaseHandle);
    var mentaAction = "edgecase";
    var result = { 'result': { 'edgecaseList': edgecaseList, 'rate': 'EC' } }
    const mentaBase = { 'frontTab': url }
    setMainResults(result, mentaBase, mentaAction)
    return;
}
