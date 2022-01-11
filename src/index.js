import { confidenceRating, getWebpageUrls } from './apiCalls.js';
import { transformTwitterResponse, transformOpenseaResponse, transformWebsiteScrape }
from './apiCalls.js';

(async function() {
    console.log("Clicked extension");
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: getAllURLCurTab
    }, (injectionResults) => {
        let openseaURLs = injectionResults[0].result[0];
        let twitterURLs = injectionResults[0].result[1];
        mainProcess(tab.url, openseaURLs, twitterURLs);
    });
})();


//-----------------------------------------------
// UI FUNCTIONS
//-----------------------------------------------
// Function to create results UI
// dataObj: result coming from api
// uniqueUrl: boolean if tab url is not opensea or twitter page

function setResults(dataObj) {

    let rate = dataObj.rating.rate;

    let twitterF = dataObj.rating.is_twitter_found;
    let openseaF = dataObj.rating.is_opensea_found;
    let twitterFOpensea = dataObj.is_twitter_found_in_opensea;

    let twitterV = dataObj.rating.is_twitter_verified;
    let openSeaV = dataObj.rating.is_opensea_safelist;

    let openSeaTwitterM = dataObj.rating.is_twitter_username_match_opensea_twitter;

    let twitterMWeb = dataObj.rating.is_twitter_link_same_website;
    let openSeaMWeb = dataObj.rating.is_opensea_link_same_website;

    let floorPrice = dataObj.openseaData.floor_price;

    var resultList = document.getElementById("resultList")
    resultList.innerHTML = '';
    resultList.appendChild(createListDiv("", ""));

    // setting img in logo:
    var logo = document.getElementById("logoImg")
    if (rate == 'A+') { logo.src = "/img/logo_aa.svg" }
    if (rate == 'A') { logo.src = "/img/logo_a.svg" }
    if (rate == 'B') { logo.src = "/img/logo_b.svg" }
    if (rate == 'C') { logo.src = "/img/logo_c.svg" }
    if (rate == 'D') { logo.src = "/img/logo_d.svg" }
    if (rate == 'F') { logo.src = "/img/logo_f.svg" }
    if (rate == 'NA') { logo.src = "/img/logo_q.svg" }

    // setting twitter data
    if (twitterV)
        resultList.appendChild(createListDiv("Twitter profile verified", "ver"));
    else if (twitterF)
        resultList.appendChild(createListDiv("Twitter profile found", "good"))
    else
        resultList.appendChild(createListDiv("Twitter profile missing", "na"))

    // settting openSea data
    if (openSeaV)
        resultList.appendChild(createListDiv("OpenSea profile verified", "ver"))
    else if (openseaF)
        resultList.appendChild(createListDiv("OpenSea profile found", "good"))
    else
        resultList.appendChild(createListDiv("OpenSea profile missing", "na"))

    // setting combined data with Open Sea
    if (openseaF && twitterF) {
        if (openSeaTwitterM)
            resultList.appendChild(createListDiv("OpenSea-Twitter match", "good"));
        else if (twitterFOpensea)
            resultList.appendChild(createListDiv("OpenSea-Twitter mismatch", "bad"));
    }

    // setting combined data with Twitter
    if (twitterMWeb)
        resultList.appendChild(createListDiv("Twitter-Website match", "good"));
    else if (twitterF)
        resultList.appendChild(createListDiv("Twitter-Website misatch", "bad"));

    // if in website url
    if (openSeaMWeb)
        resultList.appendChild(createListDiv("OpenSea-Website match", "good"));
    else if (openseaF)
        resultList.appendChild(createListDiv("OpenSea-Website misatch", "bad"));

    // setting twitter data
    if (!openseaF)
        resultList.appendChild(createListDiv("Can you mint here?", "question"));

    // setting floor price if found
    if (floorPrice)
        resultList.appendChild(createListDiv(`Floor price: ${floorPrice}`, "good"));
}

function createListDiv(info, iconStatus) {
    var content = document.createElement("li");
    content.className = "border--bottom info_rating-li";
    if (info != "") {
        var text = document.createElement("p");
        var span = document.createElement("span");
        var icon = "icon-good"
        if (iconStatus == "bad") { icon = "icon-bad"; }
        if (iconStatus == "ver") { icon = "icon-ver"; }
        if (iconStatus == "na") { icon = "icon-na"; }
        if (iconStatus == "question") { icon = "icon-question"; }
        span.className = "icon-span " + icon;
        content.appendChild(span);
        text.textContent = info;
        content.appendChild(text);
    }
    return content
}

//-----------------------------------------------
// SCRAPPING FUNCTIONS
//-----------------------------------------------

// Function to get all links from current tab
function getAllURLCurTab() {
    var openseaURLs = [];
    var twitterURLs = [];
    var urls = document.getElementsByTagName("a");

    console.log("Collecting URLs...");

    for (var i = 0; i < urls.length; i++) {

        const cur = urls[i].getAttribute('href');

        if (cur == null || cur === '/') continue;

        if (cur.indexOf("https://opensea.io/collection/") > -1) {
            openseaURLs.push(cur);
        } else if (cur.indexOf("https://www.twitter.com/") > -1 || cur.indexOf("https://twitter.com/") > -1) {
            twitterURLs.push(cur);
        }
    }

    console.log("OpenSea URLs:");
    console.log(openseaURLs);
    console.log("Twitter URLs:");
    console.log(twitterURLs);

    return [openseaURLs, twitterURLs]
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
            openseaSlugs.push(a[4])
        }
    }
    return openseaSlugs;
}

//-----------------------------------------------
// MAIN
//-----------------------------------------------

// Main function grabs slugs and runs API for restuls
async function mainProcess(url, openseaURLs, twitterURLs) {

    var uniqueUrl = true;
    var baseWebsite = null;
    var baseTwitter = null;
    var baseSlug = null;
    var websiteData = null;
    var twitterData = null;
    var openseaData = null;
    var openseaSlugs = null;
    var twitterUsernames = null;

    console.log("Collecting profile handles and calling APIs...");

    // If front tab is Twitter/OpenSea profile grab basewebsite from it
    if (isTwitterURL(url)) {

        uniqueUrl = false;
        baseTwitter = getTwitterUsername([url])[0];
        console.log(baseTwitter);
        twitterData = await transformTwitterResponse(baseTwitter);
        console.log(twitterData);
    } else if (isOpenseaURL(url)) {

        uniqueUrl = false;
        baseSlug = getOpenseaSlug([url])[0];
        openseaData = await transformOpenseaResponse(baseSlug);

    }

    // If front tab is a unique url scrape Twitter and OpenSea handles from it
    if (uniqueUrl) {

        baseWebsite = url;

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

        console.log("Using OpenSea and Twitter profile to scrape unique URL")

        if (openseaData && openseaData.external_url) {
            baseWebsite = openseaData.external_url;
        } else if (twitterData && twitterData.expanded_url) {
            baseWebsite = twitterData.expanded_url;
        }

        console.log("Scraping unique URL found: " + baseWebsite);

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
                twitterUsernames = getTwitterUsername(twitterURLsWeb); ///////

            } else {
                console.log('No Twitter or OpenSea links found');
            }
        }

        websiteData = transformWebsiteScrape(baseWebsite, twitterUsernames, openseaSlugs);


        if (twitterData === null) {
            baseTwitter = twitterUsernames ? twitterUsernames[0] : null;
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
        'websiteData': websiteData
    }

    console.log("Data : ");
    console.log('Base Website: ' + baseWebsite);
    console.log('Base Twitter: ' + baseTwitter);
    console.log('Base OpenSea: ' + baseSlug);
    console.log(mentaObj);

    console.log("Call confidenceRating: ");
    const result = await confidenceRating(mentaObj);

    console.log("Output:");
    console.log(result);

    setResults(result);
}