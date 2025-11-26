
const MAIN_PAGE = "https://emarks.utoronto.ca/emarks/pages/marks/marks.xhtml";
const parser = new DOMParser();

function parseViewState(doc) {
  return (
    doc.querySelector("#javax\\.faces\\.ViewState")?.value ||
    doc.querySelector('input[name="javax.faces.ViewState"]')?.value ||
    null
  );
}

async function extracteMarksData(pageContent) {
  const doc = parser.parseFromString(pageContent, "text/html");

  const ids = Array.from(doc.querySelectorAll('input[value="Amend"]')).map((el) =>
    el.getAttribute("id")
  ).filter(Boolean);

  const urls = [];

  async function fetchFreshViewState() {
    const response = await fetch(MAIN_PAGE, { credentials: "include" });
    const html = await response.text();
    const parsed = parser.parseFromString(html, "text/html");
    return parseViewState(parsed);
  }

  for (const id of ids) {
    const viewState = await fetchFreshViewState();
    if (!viewState) {
      console.warn("Could not find ViewState; skipping id", id);
      continue;
    }

    const payload = new URLSearchParams({
      AJAXREQUEST: "_viewRoot",
      selectFilteredCourse: "selectFilteredCourse",
      "javax.faces.ViewState": viewState
    });
    payload.append(id, id);

    const response = await fetch(MAIN_PAGE, {
      method: "POST",
      credentials: "include",
      redirect: "manual",
      headers: {
        accept: "application/xhtml+xml, text/html",
        "content-type": "application/x-www-form-urlencoded"
      },
      body: payload.toString()
    });

    const locationHeader = response.headers.get("location");
    if (locationHeader) {
      urls.push(new URL(locationHeader, MAIN_PAGE).toString());
    }
  }

  return urls;
}

function parseCourseMeta(doc) {
  const headerText = doc.querySelector(".section_header > span")?.textContent?.trim() || "";
  const parts = headerText.split(/\s+/);
  const course = (parts[0] || "").slice(0, Math.max((parts[0] || "").length - 2, 0));
  const year = (parts[1] || "").slice(0, 4);
  const sessionCode = (parts[1] || "").slice(4, 5);
  const sessionMap = { "1": "winter", "5": "summer", "9": "fall" };
  const session = sessionMap[sessionCode] || "";
  return { course, year, session };
}

async function extractCourseData(url) {
  const response = await fetch(url, { credentials: "include" });
  const html = await response.text();
  const doc = parser.parseFromString(html, "text/html");

  const meta = parseCourseMeta(doc);
  const table = doc.querySelector("#enterMarksForm\\:amendmentList");

  const rows = [];
  if (table) {
    const trList = Array.from(table.querySelectorAll("tr"));
    trList.slice(1).forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (!cells.length) return;
      const rowData = { ...meta };
      rowData.id = cells[1]?.textContent.trim() || "";
      rowData.lastname = cells[2]?.textContent.trim() || "";
      rowData.firstname = cells[3]?.textContent.trim() || "";
      rowData.score = cells[4]?.textContent.trim() || "";
      rows.push(rowData);
    });
  }

  return rows;
}

function augmentRecords(data) {
  const courses = {};
  const sessions = {};

  const courseAverages = {};
  const sessionAverages = {};

  const average = (array) => array.reduce((a, b) => a + b, 0) / array.length;

  function rank(scores, score) {
    const sorted = [...scores].sort((a, b) => b - a);
    return sorted.indexOf(score) + 1;
  }

  data.forEach((record) => {
    if (record.score !== "" && !Number.isNaN(Number(record.score))) {
      const score = parseInt(record.score, 10);
      record.score = score;
      const sKey = `${record.course}${record.year}${record.session}`;
      if (!(record.course in courses)) courses[record.course] = [score];
      else courses[record.course].push(score);
      if (!(sKey in sessions)) sessions[sKey] = [score];
      else sessions[sKey].push(score);
    }
  });

  Object.keys(courses).forEach((course) => {
    courseAverages[course] = average(courses[course]);
  });

  Object.keys(sessions).forEach((session) => {
    sessionAverages[session] = average(sessions[session]);
  });

  data.forEach((record) => {
    if (record.score !== "" && !Number.isNaN(Number(record.score))) {
      const score = parseInt(record.score, 10);
      const sessionKey = `${record.course}${record.year}${record.session}`;
      record.saverage = parseFloat(sessionAverages[sessionKey]).toFixed(2);
      record.srank = `${rank(sessions[sessionKey], score)} | ${sessions[sessionKey].length}`;
      record.caverage = parseFloat(courseAverages[record.course]).toFixed(2);
      record.crank = `${rank(courses[record.course], score)} | ${courses[record.course].length}`;
    } 
  });

  return data;
}

async function saveRecordsToStorage(records) {
  // Wipe previous data, then store the fresh records.
  await chrome.storage.local.clear();
  await chrome.storage.local.set({ emarksRecords: records, emarksUpdatedAt: Date.now() });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "analyzePage") {
    (async () => {
      const html = document.documentElement.outerHTML;
      const urls = await extracteMarksData(html);
      const allCourseData = [];
      for (const url of urls) {
        const rows = await extractCourseData(url);
        allCourseData.push(...rows);
      }
      const augmented = augmentRecords(allCourseData);
      await saveRecordsToStorage(augmented);
      sendResponse({ ok: true, urls, courses: augmented });
    })().catch((error) => {
      console.error("Failed to extract URLs", error);
      sendResponse({ ok: false, error: error.message });
    });
    return true; // Keep the message channel open for async response.
  }
});
