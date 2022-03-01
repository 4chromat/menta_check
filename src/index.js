import { confidenceRating, getWebpageUrls, standarizeUrl } from './apiCalls.js';
import { transformTwitterResponse, transformOpenseaResponse, transformWebsiteScrape } from './apiCalls.js';
import { checkWhiteListFunction } from './cloudFunCalls'
import { setMainResults } from './setResults.js';

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
// SCRAPPING FUNCTIONS
//-----------------------------------------------

// Function to get all links from current tab
function getAllURLCurTab() {
    var openseaURLs = [];
    var twitterURLs = [];
    var edgecaseList = [];

    var urls = document.getElementsByTagName("a");

    console.log("Collecting URLs...");

    for (var i = 0; i < urls.length; i++) {

        const cur = urls[i].getAttribute('href');
        // console.log(cur)
        if (cur == null || cur === '/') continue;

        if (cur.indexOf("https://opensea.io/collection/") > -1) {
            openseaURLs.push(cur);
        } else if (cur.indexOf("https://www.twitter.com/") > -1 || cur.indexOf("https://twitter.com/") > -1) {
            twitterURLs.push(cur);
        }

        if (cur.indexOf("solana") > -1) {
            edgecaseList.push('solanaLinkFound');
        }
    }

    // drop console print before updating on Chrome Store
    // console.log("OpenSea URLs:");
    // console.log(openseaURLs);
    // console.log("Twitter URLs:");
    // console.log(twitterURLs);

    return [openseaURLs, twitterURLs, edgecaseList]
}

function isTwitterURL(url) {
    return (url.indexOf("https://www.twitter.com/") > -1 || url.indexOf("https://twitter.com/") > -1) ? true : false
}

function isOpenseaURL(url) {
    return (url.indexOf("https://opensea.io/collection/") > -1) ? true : false
}

function getTwitterUsername(twitterURLs) {
    var twitterUsernames = [];
    for (var urls in twitterURLs) {
        if (twitterURLs[urls]) {
            var a = twitterURLs[urls].split("/");
            twitterUsernames.push(a[3])
        }
    }
    return twitterUsernames;
}

function getOpenseaSlug(openseaURLs) {
    var openseaSlugs = []
    for (var urls in openseaURLs) {
        if (openseaURLs[urls]) {
            var a = openseaURLs[urls].split("/");
            openseaSlugs.push(a[4].split("?")[0])
        }
    }
    return openseaSlugs;
}

//-----------------------------------------------

function rateEdgeCase(edgecaseHandle, edgecaseList, url) {
    edgecaseList.push(edgecaseHandle);
    var mentaAction = "edgecase";
    var result = { 'result': { 'edgecaseList': edgecaseList, 'rate': 'EC' } }
    const mentaBase = { 'frontTab': url }
    setMainResults(result, mentaBase, mentaAction)
    return;
}

//-----------------------------------------------
// MAIN
//-----------------------------------------------

// Main function grabs slugs and runs API for restuls
async function mainProcess(url, openseaURLs, twitterURLs, edgecaseList) {

    var uniqueUrl = true;
    var baseWebsite = null;
    var baseTwitter = null;
    var baseSlug = null;
    var websiteData = null;
    var twitterData = null;
    var openseaData = null;
    var openseaSlugs = null;
    var twitterUsernames = null;
    var rootDomain = null;

    console.log("Calling APIs...");
    var mentaAction = "mentalog";
    // If front tab is Twitter/OpenSea profile grab basewebsite from it
    if (isTwitterURL(url)) {

        uniqueUrl = false;
        baseTwitter = getTwitterUsername([url])[0];
        // SERVER FUNC
        // if we have  base twitter check server
        // result is an object that holds 'ratings' under 'results.result'
        var result = await checkWhiteListFunction(baseTwitter, "base_twitter");
        if (result != "NOTHING") {
            console.log("checkWhiteListFunction pass")
            mentaAction = "allowlist";
            const mentaBase = { 'frontTab': url }
            setMainResults(result, mentaBase, mentaAction)
            return;
        }
        twitterData = await transformTwitterResponse(baseTwitter);
        rootDomain = twitterData.expanded_url ? standarizeUrl(twitterData.expanded_url) : null;

    } else if (isOpenseaURL(url)) {

        uniqueUrl = false;
        baseSlug = getOpenseaSlug([url])[0];
        // SERVER FUNC
        // if we have  base openSea check server
        var result = await checkWhiteListFunction(baseSlug, "base_slug");
        if (result != "NOTHING") {
            mentaAction = "allowlist";
            console.log("checkWhiteListFunction pass")
            const mentaBase = { 'frontTab': url }
            setMainResults(result, mentaBase, mentaAction)
            return;
        }
        openseaData = await transformOpenseaResponse(baseSlug);

        // Newer OpenSea profiles do not return twitter in API, only scrape
        if (!openseaData.twitter_username) {
            const temp = getTwitterUsername(twitterURLs);
            openseaData.twitter_username = temp.length > 0 ? temp[0] : null;
        }

        rootDomain = openseaData.external_url ? standarizeUrl(openseaData.external_url) : null;

    } else if (standarizeUrl(url) === 'opensea.io') {
        uniqueUrl = false;
        rateEdgeCase('openseaNotInCollection', edgecaseList, url);
        return;
    }

    // If front tab is a unique url scrape Twitter and OpenSea handles from it
    if (uniqueUrl) {

        baseWebsite = url;
        rootDomain = baseWebsite ? standarizeUrl(baseWebsite) : null;

        // SERVER FUNC
        // if we have  base root domain check server
        var result = await checkWhiteListFunction(rootDomain, "root_domain");
        if (result != "NOTHING") {
            mentaAction = "allowlist";
            console.log("checkWhiteListFunction pass ")
            const mentaBase = { 'frontTab': url }
            setMainResults(result, mentaBase, mentaAction)
            return;
        }

        openseaSlugs = getOpenseaSlug(openseaURLs);
        baseSlug = openseaSlugs.length > 0 ? openseaSlugs[0] : null;
        openseaData = await transformOpenseaResponse(baseSlug);

        twitterUsernames = getTwitterUsername(twitterURLs)
        baseTwitter = twitterUsernames.length > 0 ? twitterUsernames[0] : null;
        twitterData = await transformTwitterResponse(baseTwitter);

        websiteData = transformWebsiteScrape(baseWebsite, twitterUsernames, openseaSlugs);

    } else {
        // If front tab is Twitter profile then scrape the website link listed to get OpenSea slugs
        // If front tab is OpenSea profile then scrape the website link listed to get Twitter usernames

        console.log("Using profiles for unique URL")

        if (openseaData && openseaData.external_url) {
            baseWebsite = openseaData.external_url;
        } else if (twitterData && twitterData.expanded_url) {
            baseWebsite = twitterData.expanded_url;
        }

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

        if (twitterData === null) {
            baseTwitter = twitterUsernames ? twitterUsernames[0] : null;
            if (twitterData === null && openseaData.twitter_username)
                baseTwitter = openseaData.twitter_username;
            twitterData = await transformTwitterResponse(baseTwitter);
        }

        if (openseaData === null) {
            baseSlug = openseaSlugs ? openseaSlugs[0] : null;
            openseaData = await transformOpenseaResponse(baseSlug);
        }

    }

    const mentaObj = {
        'frontTab': url,
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
    // console.log(mentaObj);

    console.log("Call confidenceRating: ");
    const resultFinal = await confidenceRating(mentaObj, edgecaseList);
    setMainResults(resultFinal, mentaObj, mentaAction)

}