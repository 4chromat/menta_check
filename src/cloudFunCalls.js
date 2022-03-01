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

        if (res.data) {
            // console.log(res.data)  // drop console print before updating on Chrome Store
            return res.data;
        } else {
            throw new Error('Unsuccessful addLog request');
        }
    } catch (error) {
        console.log(error)
    }
}
export { checkWhiteListFunction, addMentaObjFunction, addLogFunction }
