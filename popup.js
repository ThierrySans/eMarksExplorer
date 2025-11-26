const TARGET_URL = "https://emarks.utoronto.ca/emarks/pages/marks/marks.xhtml";

function updateStatus(text, isError = false) {
  const status = document.getElementById("status");
  status.textContent = text;
  status.style.color = isError ? "#f87171" : "#cbd5e1";
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

document.addEventListener("DOMContentLoaded", async () => {
  const button = document.getElementById("analyzeBtn");
  const dashboardLink = document.getElementById("openDashboard");
  const progress = document.getElementById("progress");

  function setLoading(isLoading) {
    if (!progress) return;
    progress.hidden = !isLoading;
  }

  async function refreshState() {
    const tab = await getActiveTab();
    const isTarget = tab?.url?.startsWith(TARGET_URL);
    button.disabled = false;
    button.textContent = isTarget ? "Extract eMarks Records" : "Open eMarks Page";
    updateStatus(
      isTarget
        ? "Ready to extract eMarks data"
        : "Click to open the eMarks page"
    );
    return { tab, isTarget };
  }

  let state = await refreshState();

  dashboardLink?.addEventListener("click", async (event) => {
    event.preventDefault();
    const url = chrome.runtime.getURL("data.html");
    await chrome.tabs.create({ url });
  });

  button.addEventListener("click", async () => {
    state = await refreshState();
    const { tab, isTarget } = state;

    if (!isTarget) {
      updateStatus("Opening eMarks page...");
      setLoading(false);
      await chrome.tabs.create({ url: TARGET_URL });
      return;
    }

    button.disabled = true;
    updateStatus("Collecting eMarks data...");
    setLoading(true);

    try {
      await chrome.tabs.sendMessage(tab.id, { type: "analyzePage" });
      updateStatus("Done");
    } catch (error) {
      // The content script may not be loaded (wrong page or permissions).
      updateStatus("Could not read the page. Are you on the right tab?", true);
      console.error(error);
    } finally {
      button.disabled = false;
      setLoading(false);
    }
  });
});
