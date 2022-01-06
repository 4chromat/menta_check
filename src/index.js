
import { collectApiData, confidenceRating, getWebpageUrls } from './apiCalls.js';

//window.addEventListener("DOMContentLoaded", () => {
(async function(){
   // var button = document.getElementById("mentaCheck")
    //var bg = chrome.extension.getBackgroundPage();
   // button.addEventListener("click", async () => {
        console.log("Clicked 'Menta Check'")
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: getAllURLCurTab
            }, (injectionResults) => {
            //console.log( injectionResults[0].result)
            let openseaURL = injectionResults[0].result[0]
            let twitterURL = injectionResults[0].result[1]
            mainProcess(tab.url, openseaURL, twitterURL)
        });
   // })
    //})
})();

//-----------------------------------------------
// UI FUNCTIONS
//-----------------------------------------------
// Function to create results UI
// dataObj: result coming from api
// uniqueUrl: boolean if tab url is not opensea or twitter page

function setResults(dataObj, uniqueUrl) {

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


  // setting page rating
  resultList.appendChild(createListDiv(`Rate: ${rate}`, "good"));

  // setting twitter data
  if (twitterV)
    resultList.appendChild(createListDiv("Twitter Verified", "ver"));
  else if (twitterF)
    resultList.appendChild(createListDiv("Twitter Found", "good"))
  else
    resultList.appendChild(createListDiv("Twitter Missing", "na"))

  // settting openSea data
  if (openSeaV)
    resultList.appendChild(createListDiv("OpenSea Verified", "ver"))
  else if (openseaF)
    resultList.appendChild(createListDiv("OpenSea Found", "good"))
  else
    resultList.appendChild(createListDiv("OpenSea Missing", "na"))

  // setting combined data with Open Sea
  if (openseaF && twitterF) {
    if (openSeaTwitterM)
      resultList.appendChild(createListDiv("OpenSea-Twitter Match", "good"));
    else if (twitterFOpensea)
      resultList.appendChild(createListDiv("OpenSea-Twitter Mismatch", "bad"));
  }

  // setting combined data with Twitter

    if (twitterMWeb)
        resultList.appendChild(createListDiv("Twitter-Website Match", "good"));
    else if (twitterF)
      resultList.appendChild(createListDiv("Twitter-Website Misatch", "bad"));

  // if in website url
    if (openSeaMWeb)
      resultList.appendChild(createListDiv("OpenSea-Website Match", "good"));
    else if (openseaF)
      resultList.appendChild(createListDiv("OpenSea-Website Misatch", "bad"));

  // setting twitter data
  if (!twitterF && !openseaF)
    resultList.appendChild(createListDiv("Can you mint here?", "na"));

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
    span.className = "icon-span " + icon;
    content.appendChild(span);
    text.textContent = info;

    content.appendChild(text);
  }

  return content
}

//-----------------------------------------------
// Function to get all links from current tab
function getAllURLCurTab() {
  var opensea = [];
  var twitter = [];
  var urls = document.getElementsByTagName("a");

  console.log("Collecting URLs...");

  for (var i = 0; i < urls.length; i++) {
    const cur = urls[i].getAttribute('href');
    if (cur == null || cur === '/') continue;
    if (cur.indexOf("https://opensea.io/collection/") > -1) {
      opensea.push(cur);
    }
    if (cur.indexOf("https://www.twitter.com") > -1 || cur.indexOf("https://twitter.com") > -1) {
      twitter.push(cur);
    }
  }

  console.log("OpenSea URLs:");
  console.log(opensea);
  console.log("Twitter URLs:");
  console.log(twitter);

  return [opensea, twitter]
}

function getTwitterUrl(url, twitterURLs, uniqueUrl) {
    // Check if front tab is a profile page in Twitter, if so toggle uniqueUrl
    if (url.indexOf("https://www.twitter.com") > -1 || url.indexOf("https://twitter.com") > -1) {
       
        if (!isDuplicate(twitterURLs, url)) {
            twitterURLs.push(url);
        }
        uniqueUrl = false
    }
    return twitterURLs, uniqueUrl;
}

function getOpenSeaUrl(url, openseaURLs, uniqueUrl) {
    // Check if front tab is a profile page in OpenSea, if so toggle uniqueUrl
    if (url.indexOf("https://opensea.io/collection/") > -1) {
       
         // before adding make sure not duplicate
        if (!isDuplicate(openseaURLs, url)) {
            openseaURLs.push(url);
        }
        uniqueUrl = false
    }
    return openseaURLs, uniqueUrl;
}

function getTwitterUsername(twitterURLs) {
   // console.log("getTwitterUsername");
    var twitterUsernames = []
    // Parse all Twitter slugs from Twitter URLs found on front tab
    for (var urls in twitterURLs) {
        if(twitterURLs[urls]!== null || twitterURLs[urls]!= undefined) {
            //console.log(twitterURLs[urls])
            var a = twitterURLs[urls].split("/");
            if (!isDuplicate(twitterUsernames, a[a.length - 1]))
                twitterUsernames.push(a[a.length - 1])
        }
    }
    return twitterUsernames;
}

function getOpenSeaSlug(openseaURLs) {
    //console.log("getOpenSeaSlug");
    var openseaSlugs = []
    for (var urls in openseaURLs) {
       
        if(openseaURLs[urls]!== null || openseaURLs[urls]!= undefined) {
            //console.log(openseaURLs[urls])
            var a = openseaURLs[urls].split("/");
            if (!isDuplicate(openseaSlugs, a[4]))
            openseaSlugs.push(a[4])
        }
    }
    return openseaSlugs;
}

//------------------------------------------------------
// Main function grabs slugs and runs API for restuls
async function mainProcess(url, openseaURLs, twitterURLs) {

  const baseWebsite = url
  var uniqueUrl = true
  var checkBase = false

  console.log("Collecting slugs and usernames to call APIs...");
  openseaURLs, uniqueUrl = getOpenSeaUrl(baseWebsite, openseaURLs, uniqueUrl);
  // IF current tab is twitter or opensea, make sure first ULR is that!
  if(!uniqueUrl && openseaURLs.length > 1) {
    let tmp = openseaURLs[0];
    let tmp1 = openseaURLs[openseaURLs.length -1];
    openseaURLs[0] = tmp1;
    openseaURLs[openseaURLs.length -1] = tmp;
    checkBase = true
  }
  twitterURLs, uniqueUrl = getTwitterUrl(baseWebsite, twitterURLs, uniqueUrl);
  // IF current tab is twitter or opensea, make sure first ULR is that!
  if(!checkBase && !uniqueUrl && twitterURLs.length > 1) {
    let tmp = twitterURLs[0];
    let tmp1 = twitterURLs[twitterURLs.length -1];
    twitterURLs[0] = tmp1;
    twitterURLs[twitterURLs.length -1] = tmp;
  }

  var openseaSlugs = getOpenSeaSlug(openseaURLs)
  var twitterUsernames = getTwitterUsername(twitterURLs)
  let baseSlug = openseaSlugs.length >0 ?openseaSlugs[0] :null;
  let baseTwitter = twitterUsernames.length >0 ?twitterUsernames[0] :null;

  var mentaObj = {
    baseWebsite: baseWebsite,
    twitterUsernameArray: twitterUsernames,
    openseaSlugArray: openseaSlugs,
    baseTwitterUsername: baseTwitter,
    baseOpenseaSlug: baseSlug
  };

  // api calls with usernames and slugs
  console.log("Collecting and transforming data...")
  const data = await collectApiData(mentaObj);
  console.log(data);
  
  // if its not uniqueURL then we need to parse website to check if links match
  if(!uniqueUrl) {
    console.log("Scrape website for data in unique URL")
    var extendedUrl = null;
    if(data.openseaData.status !== 'failed' && data.openseaData.external_url !== "") {
        extendedUrl = data.openseaData.external_url
    } else if(data.twitterData.status !== 'failed' && data.twitterData.expanded_url !== "") {
        extendedUrl = data.twitterData.expanded_url
    }
    console.log("Scrape website for data in unique URL " + extendedUrl)
    // if user is not on a website , do scraping on result url to check compatability 
    if(extendedUrl != "") {
        var links = await getWebpageUrls(extendedUrl);
       
        if(links.length > 0) {
            // only get twitter and openSea links
            var openseaURLs_web = []
            var twitterURLs_web = []
            var uniqueURL_web = true
            for (var urls in links) {
                uniqueURL_web = true
                openseaURLs_web, uniqueURL_web = getOpenSeaUrl(links[urls], openseaURLs_web, uniqueURL_web);
                // if uniqueUrl still true, means is not openSea link , check if twitter
                if(uniqueURL_web)
                    twitterURLs_web, uniqueURL_web = getTwitterUrl(links[urls], twitterURLs_web, uniqueURL_web);
            }
            var openseaSlugs_web = getOpenSeaSlug(openseaURLs_web)
            var twitterUsernames_web = getTwitterUsername(twitterURLs_web)

            // console.log("openseaSlugs_web")
            // console.log(openseaSlugs_web)
            // console.log("twitterUsernames_web")
            // console.log(twitterUsernames_web)

            mentaObj = {
                baseWebsite: extendedUrl,
                twitterUsernameArray: twitterUsernames,
                openseaSlugArray: openseaSlugs,
                baseTwitterUsername: twitterUsernames_web[0],
                baseOpenseaSlug: openseaSlugs_web[0]
              };
        }
    }
  }
  console.log("Call confidenceRating: ");
  console.log(mentaObj)
  const result = await confidenceRating(mentaObj, data);
  console.log("Output:");
  console.log(result)

  setResults(result, uniqueUrl)
}

function isDuplicate(array, tmp) {
  for (var index in array) {
    if (array[index] === tmp) {
      return true
    }
  }
  return false
}

// Commenting out since it aint used yet
//  function isValidURL(string) {
//    var res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
//    return (res !== null)
//  };