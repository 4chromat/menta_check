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
       // console.log(injectionResults[0])
        let openseaURL = injectionResults[0].result[0]
        let twitterURL = injectionResults[0].result[1]
        mainProcess(tab.url, openseaURL, twitterURL)
                
    });
    
    })
})
  

//-----------------------------------------------
// UI FUNCTIONS
//-----------------------------------------------
function setResults() {
 
  var resultList = document.getElementById("resultList")
  resultList.innerHTML = '';
  resultList.appendChild( createListDiv("", ""));
  resultList.appendChild( createListDiv("OpenSea Verified", "good"));
  resultList.appendChild( createListDiv("Twitter Verified", "good"));
}


function createListDiv(info, iconStatus) {
  var content = document.createElement("li");
  content.className = "border--bottom info_rating-li";
  if(info != "") {
    var text = document.createElement("p");
    var span = document.createElement("span");
    var icon = "icon-good"
    if(iconStatus != "good") { icon = "icon-bad"; }
    span.className = "icon-span "+ icon;
    content.appendChild(span);
    text.textContent = info;

    content.appendChild(text);
  }
 
  return content
}
//-----------------------------------------------
function getAllURL() {
  var opensea = "";
  var twitter = "";
  var urls = document.getElementsByTagName("a");

    for (var i=0; i< urls.length; i++) {
      var cur = urls[i].getAttribute('href');
      //console.log(cur)
      if (cur.indexOf("https://opensea.io/collection/") > -1) {
        opensea = cur;
      }
      if (cur.indexOf("https://www.twitter.com") > -1 || cur.indexOf("https://twitter.com") > -1) {
        twitter = cur;
      }
    }

    //console.log(opensea)
    //console.log(twitter)
    return [opensea, twitter]
}


// main function grabs slugs and runs API for restuls
function mainProcess(url, openseaURL, twitterURL) {
  console.log(openseaURL + " " + twitterURL )
  var openseaSlug = ""
  var twitterUsername = ""

  // To do: Return list of usernames and slugs as there may be more than one
  // making sure the url for slug is a valid opensea link
  if (url.indexOf("https://opensea.io/collection/") > -1) {
    openseaURL = url
  }
  console.log(openseaURL + " " +  twitterURL)
  // getting slug
  if (openseaURL != "") {
      // To do: split each url result and save in array 
      var a = openseaURL.split("/");
      openseaSlugArray = a[4]
  }
  if (twitterURL != "") {
    // To do: split each url result and save in array 
    var a = twitterURL.split("/");
    twitterUsernameArray = a[1]
  }

  // TODO:
  // api calls with slugs

  // analyce API data for resuls
  setResults()

}


function isValidURL(string) {
  var res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
  return (res !== null)
};