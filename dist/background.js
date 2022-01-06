chrome.action.onClicked.addListener(tab => {

    chrome.tabs.executeScript(null, {file: "main.js"});
 });