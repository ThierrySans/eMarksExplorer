const TARGET_URL = "https://emarks.utoronto.ca/emarks/pages/marks/marks.xhtml";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "open-data",
      title: "eMarks Explorer Dashboard",
      contexts: ["action"]
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open-data") {
    chrome.tabs.create({ url: chrome.runtime.getURL("data.html") });
  }
});

// Keep track of whether the current tab is the target page so the popup can react quickly.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const isTarget = tab.url.startsWith(TARGET_URL);
    chrome.action.setBadgeText({ tabId, text: isTarget ? "✓" : "" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#0b6b4b" });
  }
});
