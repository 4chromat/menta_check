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
            twitterUsernames.push(a[3].toLowerCase())
        }
    }
    return twitterUsernames;
}

function getOpenseaSlug(openseaURLs) {
    // OpenSea slugs are case sensitive
    var openseaSlugs = []
    for (var urls in openseaURLs) {
        if (openseaURLs[urls]) {
            var a = openseaURLs[urls].split("/");
            openseaSlugs.push(a[4].split("?")[0]())
        }
    }
    return openseaSlugs;
}

export { getAllURLCurTab, getTwitterUsername, getOpenseaSlug }
export { isTwitterURL, isOpenseaURL }