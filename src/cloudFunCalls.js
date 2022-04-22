import axios from "axios";

async function checkWhiteListFunction(dRoot, dMatch) {

    const checklistFuncUrl = "https://us-central1-menta-check.cloudfunctions.net/checkWhiteList";
    try {
        const res = await axios.post(checklistFuncUrl, { data: { root_domain: dRoot, match: dMatch } });

        if (res.data) {
            // console.log(res.data)  // drop console print before updating on Chrome Store
            return res.data;
        } else {
            throw new Error('Unsuccessful checklistFun request');
        }
    } catch (error) {
        console.log(error)
    }
}

async function addMentaObjFunction(mentaObj) {

    const addMentaFuncUrl = "https://us-central1-menta-check.cloudfunctions.net/addMetaObj";
    try {
        const res = await axios.post(addMentaFuncUrl, { data: { menta_obj: mentaObj } });

        if (res.data) {
            // console.log(res.data)  // drop console print before updating on Chrome Store
            return res.data;
        } else {
            throw new Error('Unsuccessful addMenta request');
        }
    } catch (error) {
        console.log(error)
    }
}

async function addLogFunction(info) {
    const addLogFuncUrl = "https://us-central1-menta-check.cloudfunctions.net/addEventLog";
    try {
        const res = await axios.post(addLogFuncUrl, { data: { dbinfo: info } });
        // console.log(res)  // drop console print before updating on Chrome Store
        
        if (res.data) {
            return res.data;
        } else {
            throw new Error('Unsuccessful addLog request');
        }
    } catch (error) {
        console.log(error)
    }
}

async function addFlagFunction(info) {
    const addFlagFuncUrl = "https://us-central1-menta-check.cloudfunctions.net/addFlag";
    try {
        const res = await axios.post(addFlagFuncUrl, { data: { dbinfo: info } });
        // console.log(res)  // drop console print before updating on Chrome Store
        
        if (res.data) {
            return res.data;
        } else {
            throw new Error('Unsuccessful addFlag request');
        }
    } catch (error) {
        console.log(error)
    }
}

async function addReportFunction(info) {
    const addReportFuncUrl = "https://us-central1-menta-check.cloudfunctions.net/addReport";
    try {
        const res = await axios.post(addReportFuncUrl, { data: { dbinfo: info } });
        // console.log(res)  // drop console print before updating on Chrome Store
        
        if (res.data) {
            return res.data;
        } else {
            throw new Error('Unsuccessful addReport request');
        }
    } catch (error) {
        console.log(error)
    }
}

export { checkWhiteListFunction, addMentaObjFunction, addLogFunction, addReportFunction, addFlagFunction }
