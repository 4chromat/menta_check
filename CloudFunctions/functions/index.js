
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp({
    //credential: admin.credential.cert(serviceAccount),
    credential: admin.credential.cert(`${__dirname}/serviceAccountKey.json`),
    databaseURL: "https://menta-check-default-rtdb.firebaseio.com/",
});


// Cloud Function for checking whitelist in DB 
exports.checkWhiteList = functions.https.onRequest(async (request, response) => {
    // console.log("checkWhiteList")
    let root_domain = request.body.data.root_domain
    let match = request.body.data.match

    //let { body: { root_domain, match } } = request;
    // console.log(root_domain)
    var mentaSnapshot = null;
    var database = admin.database();

    // first check if domain in allowlist:
    var allowLRef = await database.ref("allowlist").once('value');
    if (allowLRef.numChildren() > 0) {
        if (match == "root_domain") {
            mentaSnapshot = await database.ref('allowlist').orderByChild('root_domain').equalTo(root_domain).once('value');
        }
        if (match == "base_slug") {
            mentaSnapshot = await database.ref('allowlist').orderByChild('base_slug').equalTo(root_domain).once('value');
        }
        if (match == "base_twitter") {
            mentaSnapshot = await database.ref('allowlist').orderByChild('base_twitter').equalTo(root_domain).once('value');
        }
        if (mentaSnapshot != null && mentaSnapshot.val() != null) {
            mentaSnapshot.forEach(function (data) {
                var id = data.val().id;
                // console.log("Result allow " + id)
                var result = data.val().result.rating;
                response.json({ result: result });
            });
            return;
        }
    }
    // sencond check if domain in curated:
    // var curateRef = await database.ref("curated").once('value');
    // if (curateRef.numChildren() > 0) {
    //     if (match == "root_domain") {
    //         mentaSnapshot = await database.ref('curated').orderByChild('root_domain').equalTo(root_domain).once('value');
    //     }
    //     if (match == "base_slug") {
    //         mentaSnapshot = await database.ref('curated').orderByChild('base_slug').equalTo(root_domain).once('value');
    //     }
    //     if (match == "base_twitter") {
    //         mentaSnapshot = await database.ref('curated').orderByChild('base_twitter').equalTo(root_domain).once('value');
    //     }
    //     if (mentaSnapshot != null && mentaSnapshot.val() != null) {
    //         mentaSnapshot.forEach(function (data) {
    //             var id = data.val().id;
    //             // console.log("Result curated " + id)
    //             var result = data.val().result.rating;
    //             response.json({ result: result });
    //         });
    //     }
    // }
    
    // console.log("Result nothing ")

    // Send back a message that we've successfully written the message
    // res.json({result: `Message with ID: ${writeResult.id} added.`});
    // functions.logger.info("Hello logs!", {structuredData: true});
    response.send("NOTHING");
});

// Cloud function to add metaobj
exports.addMetaObj = functions.https.onRequest(async (request, response) => {
    // console.log("addMetaObj")
    //let metaobj = request.body.data.metaobj
    let mentaObj = request.body.data.menta_obj

    let time = Date.now()
    var database = admin.database();

    try {
        // first check if domain in allowlist:
        var mentaobjRef = await database.ref("mentalog").once('value');
        const count = mentaobjRef.numChildren() ? mentaobjRef.numChildren() : 0;
        const info = {
            id: count,
            timestamp: time,
            front_tab: mentaObj.frontTab,
            root_domain: mentaObj.rootDomain,
            base_website: mentaObj.baseWebsite,
            base_slug: mentaObj.baseSlug,
            base_twitter: mentaObj.baseTwitter,
            rate: mentaObj.rate,
            result: mentaObj.result
        }

        const metaAddRef = database.ref("mentalog/" + count)
        metaAddRef.update(info);
        // console.log("done adding mentalog")

        // if rate > B ADD allow list:
        if ((mentaObj.rate == 'B' || mentaObj.rate == "A" || mentaObj.rate == "A+") &&
            (mentaObj.baseWebsite && mentaObj.baseTwitter && mentaObj.baseSlug)) {
            // Adding check for baseX since verified Twitter and OpenSea in page are default 'A'
            // even with other data missing

            var allowRef = await database.ref("allowlist").once('value');
            const countAllow = allowRef.numChildren() ? allowRef.numChildren() : 0;
            const info = {
                id: countAllow,
                timestamp: time,
                front_tab: mentaObj.frontTab,
                root_domain: mentaObj.rootDomain,
                base_slug: mentaObj.baseSlug,
                base_twitter: mentaObj.baseTwitter,
                rate: mentaObj.rate,
                result: mentaObj.result
            }
            const allowAddRef = database.ref("allowlist/" + countAllow)
            allowAddRef.update(info);
            // console.log("done adding allowlist")
        }
        response.send("Done!");
    }
    catch {
        response.send("Error adding metaObj");
    }
});

// Cloud function to log user events 
exports.addEventLog = functions.https.onRequest(async (request, response) => {
    // console.log("addEventLog")
    let dbinfo = request.body.data.dbinfo

    let time = Date.now()
    var database = admin.database();

    try {
        // first check if domain in allowlist:
        var logRef = await database.ref("eventlog").once('value');
        const count = logRef.numChildren() ? logRef.numChildren() : 0;
        const info = {
            id: count,
            timestamp: time,
            front_tab: dbinfo.front_tab,
            action: dbinfo.action,
            rate: dbinfo.rate
        }
        const logAddRef = database.ref("eventlog/" + count)
        logAddRef.update(info);
        // console.log("done adding eventlog")

        response.send("Done!");
    }
    catch {
        response.send("Error adding eventlog");
    }
});

// Cloud function to log user reports
exports.addReport = functions.https.onRequest(async (request, response) => {
    // console.log("addReport")
    let dbinfo = request.body.data.dbinfo

    let time = Date.now()
    var database = admin.database();

    try {
        // first check if domain in allowlist:
        var logRef = await database.ref("reports").once('value');
        const count = logRef.numChildren() ? logRef.numChildren() : 0;
        const info = {
            id: count,
            timestamp: time,
            front_tab: dbinfo.front_tab,
            description: dbinfo.description,
            dataObj: dbinfo.dataObj, 
            mentaAction: dbinfo.mentaAction
        }
        const logAddRef = database.ref("reports/" + count)
        logAddRef.update(info);

        response.send("Done!");
    }
    catch {
        response.send("Error adding report");
    }
});
