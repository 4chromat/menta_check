// admin_queries is for quick testing of Firebase functions only.  
// For production code use /functions.

var axios = require('axios');

const admin = require("firebase-admin");
var serviceAccount = require("../functions/serviceAccountKey.json");


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    //credential: admin.credential.cert(`${__dirname}/serviceAccount.json`),
    databaseURL: 'https://menta-check-default-rtdb.firebaseio.com/',
});

var database = admin.database();


//Function URL (addMetaObj(us-central1)): https://us-central1-menta-check.cloudfunctions.net/addMetaObj
//Function URL (addEventLog(us-central1)): https://us-central1-menta-check.cloudfunctions.net/addEventLog

async function checkWhiteListFunction() {
     
    const checklistFuncUrl = "https://us-central1-menta-check.cloudfunctions.net/checkWhiteList";
    try {
        const res = await axios.post(checklistFuncUrl, { data: { root_domain: "crypto_coven", match:"base_twitter" } });
        
        if (res.data) {
            console.log(res.data)
            return res.data;
        } else {
            throw new Error('Unsuccessful checklistFun request');
        }
    } catch (error) {
        console.log(error)
    }
}

async function checkWhitelist(root_domain, match) {
   
    var allowLRef = await database.ref("allowlist").once('value');
    var mentaSnapshot = null
    console.log(allowLRef.numChildren())
    
    if(allowLRef.numChildren() > 0) {
        if(match == "root_domain") {
                mentaSnapshot = await database.ref('allowlist').orderByChild('root_domain').equalTo(root_domain).once('value');
        }
        if(match == "base_slug"){
                mentaSnapshot = await database.ref('allowlist').orderByChild('base_slug').equalTo(root_domain).once('value');
        }
        if(match == "base_twitter"){
                mentaSnapshot = await database.ref('allowlist').orderByChild('base_twitter').equalTo(root_domain).once('value');
        }
        if(mentaSnapshot.val()) {
            const result = mentaSnapshot.val()
            const ix = Object.keys(result)[0]
            const temp = result[ix]
            console.log("Result allowlist.")
            console.log(temp)
            // console.log("Twitter")
            // console.log(temp['result']['twitterData'])
            // console.log("OpenSea")
            // console.log(temp['result']['openseaData'])
            // console.log("Website")
            // console.log(temp['result']['websiteData'])
            // console.log("Rating:")
            // console.log(temp['result']['rating'])
            return;
        }
    }
  
    var curateRef = await database.ref("curated").once('value');
    if(curateRef.numChildren() > 0) {
        if(match == "root_domain") {
                mentaSnapshot = await database.ref('curated').orderByChild('root_domain').equalTo(root_domain).once('value');
        }
        if(match == "base_slug"){
                mentaSnapshot = await database.ref('curated').orderByChild('base_slug').equalTo(root_domain).once('value');
        }
        if(match == "base_twitter"){
                mentaSnapshot = await database.ref('curated').orderByChild('base_twitter').equalTo(root_domain).once('value');
        }
        if(mentaSnapshot.val()) {
            const result = mentaSnapshot.val()
            console.log("Result curated.")
            console.log(result)
            return;
        }
    }
   console.log("Result nothing." )
}

async function addCurated(rDomain, bSlug, bTwitter, rRate) {
   
    var triviaRef = await database.ref("curated").once('value');
    
    let time = Date.now()
    const count = triviaRef.numChildren()? triviaRef.numChildren(): 0;
   
    const info =  {
        id:count,
        timestamp:time,
        root_domain:rDomain,
        base_slug:bSlug,
        base_twitter:bTwitter,
        rate:rRate
    }
    const curatedRef = database.ref("curated/"+count)
    curatedRef.update(info);
    console.log("done adding")
}

// Check Firebase connection + checkWhiteList function 
// checkWhiteListFunction()

// Look for elements in allowlist
// checkWhitelist("crypto_coven", "base_twitter")
checkWhitelist("azuki", "base_slug")  
// Azuki and other newer OpenSea profiles have a different twitter link. To Do: Update from API docs.

// Add elements to curatedlist
//addCurated("www.cryptocoven.xyz","cryptocoven","crypto_coven1","B")