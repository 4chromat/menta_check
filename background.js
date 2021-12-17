// When the button is clicked, inject setPageBackgroundColor into current page
mentaCheck.addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: checkNftPage,
    });
  });
  
  // The body of this function will be executed as a content script inside the
  // current page
  function checkNftPage() {
    console.log("hello")
  }