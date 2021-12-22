
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
 function setResults(dataObj) {
  
   let twitterV = dataObj.rating.is_twitter_verified
   let twitterM = dataObj.rating.is_twitter_link_same_website
 
   let openSeaV = true
   let openMdataObj = dataObj.rating.is_opensea_link_same_website
 
   var resultList = document.getElementById("resultList")
   resultList.innerHTML = '';
   resultList.appendChild( createListDiv("", ""));
 
   // settting openSea data
   if (openSeaV)
     resultList.appendChild( createListDiv("OpenSea Verified", "ver"));
   if(openMdataObj)
     resultList.appendChild( createListDiv("OpenSea Match", "good"));
   else 
     resultList.appendChild( createListDiv("OpenSea Match", "bad"));
 
   // setting twitter data
   if(twitterV)
     resultList.appendChild( createListDiv("Twitter Verified", "ver"));
   if(twitterM)
     resultList.appendChild( createListDiv("Twitter Match", "good"));
   else 
     resultList.appendChild( createListDiv("Twitter Match", "bad"));
   
 }
 
 
 function createListDiv(info, iconStatus) {
   var content = document.createElement("li");
   content.className = "border--bottom info_rating-li";
   if(info != "") {
     var text = document.createElement("p");
     var span = document.createElement("span");
     var icon = "icon-good"
     if(iconStatus == "bad") { icon = "icon-bad"; }
     if(iconStatus == "ver") { icon = "icon-ver"; }
     span.className = "icon-span "+ icon;
     content.appendChild(span);
     text.textContent = info;
 
     content.appendChild(text);
   }
  
   return content
 }
 
 //-----------------------------------------------
 function getAllURL() {
   var opensea =[];
   var twitter = [];
   var urls = document.getElementsByTagName("a");
 
     for (var i=0; i< urls.length; i++) {
       var cur = urls[i].getAttribute('href');
       console.log(cur)
       if (cur.indexOf("https://opensea.io/collection/") > -1) {
         opensea.push(cur);
       }
       if (cur.indexOf("https://www.twitter.com") > -1 || cur.indexOf("https://twitter.com") > -1) {
         twitter.push(cur);
       }
     }
     // console.log(opensea)
     // console.log(twitter)
     return [opensea, twitter]
 }
 
 // main function grabs slugs and runs API for restuls
 async function mainProcess(url, openseaURLs, twitterURLs) {
   
  const baseWebsite = url
   var openseaSlugs = []
   var twitterUsernames = []
  
   // To do: Return list of usernames and slugs as there may be more than one
   // making sure the url for slug is a valid opensea link
   if (url.indexOf("https://opensea.io/collection/") > -1) {
     // before adding make sure not duplicate
     if(!isDuplicate(openseaURLs, baseWebsite))
       openseaURLs.push(baseWebsite)
   }
   
   // getting slug
   for(var urls in openseaURLs) {
       // To do: split each url result and save in array 
       var a = openseaURLs[urls].split("/");
       if(!isDuplicate(openseaSlugs, a[4]))
            openseaSlugs.push(a[4])
   }
   for(var urls in twitterURLs) {
     // To do: split each url result and save in array 
     var a = twitterURLs[urls].split("/");
     if(!isDuplicate(twitterUsernames, a[ a.length-1]))
        twitterUsernames.push(a[ a.length-1])
   }
//    console.log("openseaSlugs:")
//    console.log(openseaSlugs)
//    console.log("twitterUsernames")
//    console.log(twitterUsernames)
   // TODO:
   // api calls with slugs
   const mentaObj = {
     baseWebsite: baseWebsite,
     twitterUsernameArray: twitterUsernames,
     openseaSlugArray: openseaSlugs,
     baseTwitterUsername: twitterUsernames[0],
     baseOpenseaSlug: openseaSlugs[0]
   };
   const result = await confidenceRating(mentaObj);
   console.log(result)
   // analyce API data for resuls
  //var tmpObj = tempObj();
 
   setResults(result)
 
 }
 
 function isDuplicate(array, tmp) {
   for(var index in array) {
     if(array[index] === tmp){
       return true
     }
   }
   return false
 }
 
 function isValidURL(string) {
   var res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
   return (res !== null)
 };