
import { confidenceRating } from './apiCalls.js';

window.addEventListener("DOMContentLoaded", () => {
  var button = document.getElementById("mentaCheck")
  //var bg = chrome.extension.getBackgroundPage();
  button.addEventListener("click", async () => {
    console.log("clicked")
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getAllURL
    }, (injectionResults) => {
      //console.log( injectionResults[0].result)
      let openseaURL = injectionResults[0].result[0]
      let twitterURL = injectionResults[0].result[1]
      mainProcess(tab.url, openseaURL, twitterURL)
    });
  })
})


//-----------------------------------------------
// UI FUNCTIONS
//-----------------------------------------------
// Function to create results UI
// dataObj: result coming from api
// uniqueUrl: boolean if tab url is not opensea or twitter page

function setResults(dataObj, uniqueUrl) {

  let twitterV = dataObj.rating.is_twitter_verified
  let openSeaV = dataObj.rating.is_opensea_safelist

  let openSeaTwitterM = dataObj.rating.is_twitter_username_match_opensea_twitter

  let twitterMWeb = dataObj.rating.is_twitter_link_same_website
  let openSeaMWeb = dataObj.rating.is_opensea_link_same_website

  var resultList = document.getElementById("resultList")
  resultList.innerHTML = '';
  resultList.appendChild(createListDiv("", ""));

  // settting openSea data
  if (openSeaV)
    resultList.appendChild(createListDiv("OpenSea Verified", "ver"))
  else
    resultList.appendChild(createListDiv("OpenSea Verified", "na"))

  // setting twitter data
  if (twitterV)
    resultList.appendChild(createListDiv("Twitter Verified", "ver"));
  else
    resultList.appendChild(createListDiv("Twitter Verified", "na"))

  // setting combined data
  if (openSeaTwitterM)
    resultList.appendChild(createListDiv("OpenSea Match Twitter", "good"));
  else
    resultList.appendChild(createListDiv("OpenSea Match Twitter", "bad"));

  // if in website url
  if (uniqueUrl) {
    if (openSeaMWeb)
      resultList.appendChild(createListDiv("OpenSea Match Website", "good"));
    else
      resultList.appendChild(createListDiv("OpenSea Match Website", "bad"));

  }
  if (uniqueUrl) {
    if (twitterMWeb)
      resultList.appendChild(createListDiv("Twitter Match Website", "good"));
    else
      resultList.appendChild(createListDiv("Twitter Match Website", "bad"));
  }

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


function getAllURL() {
  var opensea = [];
  var twitter = [];
  var urls = document.getElementsByTagName("a");

  console.log("Collecting URLs...");

  for (var i = 0; i < urls.length; i++) {
    const cur = urls[i].getAttribute('href');
    //  console.log(cur);
    if (cur.indexOf("https://opensea.io/collection/") > -1) {
      opensea.push(cur);
    }
    if (cur.indexOf("https://www.twitter.com") > -1 || cur.indexOf("https://twitter.com") > -1) {
      twitter.push(cur);
    }
  }

  console.log("OpenSea URLs suffixes:");
  console.log(opensea);
  console.log("Twitter URLs suffixes:");
  console.log(twitter);

  return [opensea, twitter]
}

// Main function grabs slugs and runs API for restuls
async function mainProcess(url, openseaURLs, twitterURLs) {

  const baseWebsite = url
  var openseaSlugs = []
  var twitterUsernames = []
  var uniqueUrl = true

  console.log("Collecting slugs and usernames to call APIs...");

  // Check if front tab is a profile page in OpenSea, if so toggle uniqueUrl
  if (baseWebsite.indexOf("https://opensea.io/collection/") > -1) {
    uniqueUrl = false
    // before adding make sure not duplicate
    if (!isDuplicate(openseaURLs, baseWebsite))
      openseaURLs.push(baseWebsite)
  }
  
  // Check if front tab is a profile page in Twitter, if so toggle uniqueUrl
  if (baseWebsite.indexOf("https://www.twitter.com") > -1 || baseWebsite.indexOf("https://twitter.com") > -1) {
    uniqueUrl = false
    if (!isDuplicate(twitterURLs, baseWebsite))
      twitterURLs.push(baseWebsite)
  }

  // Parse all OpenSea slugs from OpenSea URLs found on front tab
  for (var urls in openseaURLs) {
    var a = openseaURLs[urls].split("/");
    if (!isDuplicate(openseaSlugs, a[4]))
      openseaSlugs.push(a[4])
  }

  // Parse all Twitter slugs from Twitter URLs found on front tab
  for (var urls in twitterURLs) { 
    var a = twitterURLs[urls].split("/");
    if (!isDuplicate(twitterUsernames, a[a.length - 1]))
      twitterUsernames.push(a[a.length - 1])
  }

  const mentaObj = {
    baseWebsite: baseWebsite,
    twitterUsernameArray: twitterUsernames,
    openseaSlugArray: openseaSlugs,
    baseTwitterUsername: twitterUsernames[0],
    baseOpenseaSlug: openseaSlugs[0]
  };

  // api calls with usernames and slugs
  const result = await confidenceRating(mentaObj);

  console.log(result)

  //var tmpObj = tempObj();
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