import { addMentaObjFunction, addLogFunction, addReportFunction } from './cloudFunCalls'
import { addFlagFunction } from './cloudFunCalls'

//-----------------------------------------------
// UI FUNCTIONS
//-----------------------------------------------
// Function to create results UI
// dataObj: rating flags coming from confidenceRating
// mentaAction: string to trace where the result is stored in Firebase

function setResults(dataObj, mentaAction) {

    // drop console print before updating on Chrome Store
    // console.log('dataObj in setResults is:', dataObj)

    var resultList = document.getElementById("resultList")
    resultList.innerHTML = '';
    resultList.appendChild(createListDiv("", "", ""));

    // setting img in logo according to rate
    let rate = dataObj.rate;
    var logo = setLogo(rate);

    let websiteF = dataObj.is_website_found;
    let twitterF = dataObj.is_twitter_found;
    let openseaF = dataObj.is_opensea_found;
    let twitterFOpensea = dataObj.is_twitter_found_in_opensea;

    let twitterV = dataObj.is_twitter_verified;
    let openSeaV = dataObj.is_opensea_safelist;

    let openSeaTwitterM = dataObj.is_twitter_username_match_opensea_twitter;

    let twitterMWeb = dataObj.is_twitter_link_same_website && (dataObj.is_twitter_username_in_website !== false);
    let openSeaMWeb = dataObj.is_opensea_link_same_website && (dataObj.is_slug_in_website !== false);

    // Flag when Twitter link maps to Discord, linktree, ...
    let twitterLinksOther = dataObj.is_twitter_link_discord || dataObj.is_twitter_link_linktree;

    let frontTab = dataObj.frontTab;
    let linkW = dataObj.baseWebsite;
    let linkT = "https://www.twitter.com/" + dataObj.baseTwitter;
    let linkO = "https://opensea.io/collection/" + dataObj.baseSlug;
    let linkD = dataObj.discordUrl;


    // Check for known edge cases. TO do: move to confidenceRating()
    if ('edgecaseList' in dataObj && dataObj.edgecaseList.length > 0) {

        var mssg = "";
        // console.log('Edgecase dataObj:', dataObj)
        if (dataObj.edgecaseList.includes('openseaNotInCollection')) {
            logo.src = "/img/logo_q.svg"
            mssg = "During Beta, Menta only scores 'collection' and 'asset' pages in OpenSea."

        } else if (dataObj.edgecaseList.includes('twitterNotInProfile')) {
            logo.src = "/img/logo_q.svg"
            mssg = "This ain't a Twitter profile page?"

        } else if (dataObj.edgecaseList.includes('fakeList')) {
            logo.src = "/img/logo_f.svg"
            resultList.appendChild(createListDiv("We know this site is Fake!", "warning"))
            mssg = "You might be looking for:";

        } else if (!openseaF && dataObj.edgecaseList.includes('solanaLinkFound')) {
            // To do: log this as edgecase, rn it goes to mentalog rate C
            logo.src = "/img/logo_q.svg"
            mssg = "During Beta, Menta only supports Solana collections in OpenSea."

        } else if (dataObj.edgecaseList.includes('checkMentaSite')) {
            logo.src = "/img/logo_aa.svg"
            mssg = "Contact us at hello@checkmenta.com for suggestions and feature requests!"
        }

        if (dataObj.redirect_url) {
            resultList.appendChild(createListDiv(mssg, "", ""));  
            resultList.appendChild(createListDiv(dataObj.redirect_text, "good", dataObj.redirect_url)); 
            resultList.appendChild(createButton(frontTab, dataObj, "report"));
        }  else if (mssg !== "") {
            resultList.appendChild(createListDiv(mssg, "", ""));          
        }

        if (mssg !== "") {
            return;        
        }
    }

    // setting website data
    if (websiteF)
        resultList.appendChild(createListDiv("Website found", "good", linkW))
    else
        resultList.appendChild(createListDiv("Website missing", "na", ""))

    // setting twitter data
    if (twitterV)
        resultList.appendChild(createListDiv("Twitter profile verified", "ver", linkT));
    else if (twitterF)
        resultList.appendChild(createListDiv("Twitter profile found", "good", linkT))
    else
        resultList.appendChild(createListDiv("Twitter profile missing", "na", ""))

    // settting openSea data
    if (openSeaV)
        resultList.appendChild(createListDiv("OpenSea profile verified", "ver", linkO))
    else if (openseaF)
        resultList.appendChild(createListDiv("OpenSea profile found", "good", linkO))
    else
        resultList.appendChild(createListDiv("OpenSea profile missing", "na", ""))

    // Setting other profiles found
    if (linkD)
        resultList.appendChild(createListDiv("Discord found", "good", linkD))

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
    else if (twitterF && websiteF && !twitterLinksOther)
        resultList.appendChild(createListDiv("Twitter-Website misatch", "bad"));

    // if in website url
    if (openSeaMWeb)
        resultList.appendChild(createListDiv("OpenSea-Website match", "good"));
    else if (openseaF && websiteF)
        resultList.appendChild(createListDiv("OpenSea-Website misatch", "bad"));

    // setting twitter data
    if (!openseaF)
        resultList.appendChild(createListDiv("Can you mint here?", "question"));

    // // drop console print before updating on Chrome Store
    // console.log('dataObj is:', dataObj)

    // setting collection metadata if found
    if (dataObj.floorPrice) {
        var temp = dataObj.floorPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })
        resultList.appendChild(createListDiv(`Floor price: ${temp}`, "opensea"));
    }
    if (dataObj.totalVolume) {
        var temp = dataObj.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })
        resultList.appendChild(createListDiv(`Total volume: ${temp}`, "opensea"));
    }
    if (dataObj.followersCount) {
        var temp = dataObj.followersCount.toLocaleString(undefined, { maximumFractionDigits: 0 })
        resultList.appendChild(createListDiv(`Followers count: ${temp}`, "twitter"));
    }

    if (dataObj.flagCounter > 0) {
        var temp = dataObj.flagCounter.toLocaleString(undefined, { maximumFractionDigits: 0 })
        resultList.appendChild(createListDiv(`Site flagged ${temp} times`, "warning"));
    }

    resultList.appendChild(createButton(frontTab, dataObj, "flag"));
    resultList.appendChild(createButton(frontTab, dataObj, "report"));

    return;
}


function createButton(frontTab, dataObj, buttonAction) {
    
    let button = document.createElement("button");
    
    const bInfo = {
        front_tab: frontTab,
        description: null,
        dataObj: dataObj,
        mentaAction: buttonAction
    }

    if (buttonAction == "report") {
        bInfo["fixed"] = false;
        button.innerHTML = "Report a problem";
        button.title = "We will double check the results for this page.  " +
                       "You can leave us additional comments at hello@checkmenta.com."
        button.addEventListener('click', () => {
            addReportFunction(bInfo)
            button.innerHTML = "Thank you!";
        })
    } else if (buttonAction == "flag") {
        bInfo["fake"] = false;
        button.innerHTML = "This site looks fake";
        button.title = "We will rate this as 'Fake' after review.  " +
                       "Leave us additional comments at hello@checkmenta.com."
        button.addEventListener('click', () => {
            addFlagFunction(bInfo)
            button.innerHTML = "Thank you!";
        })
    }

    return button;
}

function setLogo(rate) {
    var loading = document.getElementById("logoLoad")
    loading.src = ""
    var logo = document.getElementById("logoImg")
    if (rate == 'A+') { logo.src = "/img/logo_aa.svg" }
    if (rate == 'A') { logo.src = "/img/logo_a.svg" }
    if (rate == 'B') { logo.src = "/img/logo_b.svg" }
    if (rate == 'C') { logo.src = "/img/logo_c.svg" }
    if (rate == 'D') { logo.src = "/img/logo_d.svg" }
    if (rate == 'F') { logo.src = "/img/logo_f.svg" }
    if (rate == 'NA') { logo.src = "/img/logo_q.svg" }
    if (rate == 'EC') { logo.src = "/img/logo_q.svg" }
    return logo;
}

function createListDiv(info, iconStatus, link) {
    var content = document.createElement("li");
    content.className = "border--bottom info_rating-li";
    if (info != "") {

        var span = document.createElement("span");

        if (iconStatus != "") {
            var icon = "icon-good"
            if (iconStatus == "bad") { icon = "icon-bad"; }
            if (iconStatus == "ver") { icon = "icon-ver"; }
            if (iconStatus == "na") { icon = "icon-na"; }
            if (iconStatus == "warning") { icon = "icon-warning"; }
            if (iconStatus == "question") { icon = "icon-question"; }
            if (iconStatus == "opensea") { icon = "icon-opensea"; }
            if (iconStatus == "twitter") { icon = "icon-twitter"; }
            span.className = "icon-span " + icon;
            content.appendChild(span);
        }

        if (link) {
            var a = document.createElement('a');
            var linkText = document.createTextNode(info);
            a.appendChild(linkText);
            a.title = link;
            a.href = link;
            a.setAttribute('target', '_blank');
            content.appendChild(a);
        } else {
            var text = document.createElement("p");
            text.textContent = info;
            content.appendChild(text);
        }
    }
    return content
}

function setMainResults(result, mentaObj, mentaAction) {
    // console.log("setMainResults: " + mentaAction);
    var rate = null;
    var frontTab = null;

    if (mentaAction == "mentalog") {

        setResults(result.rating, mentaAction);
        rate = mentaObj.rating.rate;
        frontTab = mentaObj.frontTab;

        // mentaBase is what is logged in firebase
        const mentaBase = {
            'frontTab': frontTab,
            'baseTwitter': mentaObj.baseTwitter,
            'baseSlug': mentaObj.baseSlug,
            'baseWebsite': mentaObj.baseWebsite,
            'rootDomain': mentaObj.rootDomain,
            'rate': rate,
            'result': result
        }

        addMentaObjFunction(mentaBase)

    } else if (mentaAction == "allowlist") {

        // console.log(result);  // drop console print before updating on Chrome Store
        setResults(result.rating, mentaAction)
        rate = result.rating.rate;
        frontTab = mentaObj.frontTab;

    } else if (mentaAction == "edgecase") {
        // console.log(result);  // drop console print before updating on Chrome Store
        setResults(result.result, mentaAction)
        rate = result.result.rate;
        frontTab = mentaObj.frontTab;
    }

    const bInfo = {
        front_tab: frontTab,
        action: mentaAction,
        rate: rate
    }

    // console.log("bInfo: ", mentaObj)  // drop console print before updating on Chrome Store

    addLogFunction(bInfo)
}

export { setMainResults, setResults };