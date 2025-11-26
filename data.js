const navItems = document.querySelectorAll(".nav-item");
const panels = document.querySelectorAll(".panel");

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    if (item.dataset.action === "export") {
      exportRecordsAsCSV();
      return;
    }

    const target = item.dataset.target;
    navItems.forEach((btn) => {
      if (btn.dataset.target) {
        btn.classList.toggle("active", btn === item);
      }
    });
    panels.forEach((panel) => panel.classList.toggle("active", panel.id === target));
  });
});

const columns = [
  "course",
  "year",
  "session",
  "id",
  "firstname",
  "lastname",
  "score",
  "saverage",
  "srank",
  "caverage",
  "crank",  
];

let studentRecords = [];
let courseSelector;
let statElements = {};

function renderStudents(rows) {
  const tbody = document.querySelector("#students-table tbody");
  tbody.innerHTML = "";

  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = columns.length;
    td.textContent = "No records found. Run extraction from the popup first.";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach((key) => {
      const td = document.createElement("td");
      const value = row[key];
      td.textContent = typeof value === "boolean" ? (value ? "yes" : "no") : value ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function renderCoursesTable(course) {
  const tbody = document.querySelector("#courses-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  updateCourseSummary(course);

  if (!course) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "Select a course to view session stats.";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const summaries = buildCourseSummaries(course);

  if (!summaries.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.textContent = "No records found for this course. Run extraction from the popup first.";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  summaries.forEach((summary) => {
    const tr = document.createElement("tr");
    ["year", "session", "students", "average"].forEach((key) => {
      const td = document.createElement("td");
      td.textContent = summary[key] ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

async function loadAndRender() {
  const { emarksRecords = [], emarksUpdatedAt = null } = await chrome.storage.local.get([
    "emarksRecords",
    "emarksUpdatedAt"
  ]);
  updateLastUpdated(emarksUpdatedAt);
  studentRecords = emarksRecords;
  populateFilters(studentRecords);
  populateCourseSelector(studentRecords);
  renderCoursesTable(courseSelector?.value || "");
  renderStats(studentRecords);
  applyFilters();
}

function updateLastUpdated(timestamp) {
  const el = document.getElementById("last-updated");
  if (!el) return;
  if (!timestamp) {
    el.textContent = "Updated: --";
    return;
  }
  const date = new Date(timestamp);
  el.textContent = `Updated: ${date.toLocaleString()}`;
}

function populateFilters(rows) {
  const courseSelect = document.getElementById("filter-course");
  const yearSelect = document.getElementById("filter-year");
  const sessionSelect = document.getElementById("filter-session");
  if (!courseSelect || !yearSelect || !sessionSelect) return;

  const courses = Array.from(new Set(rows.map((r) => r.course).filter(Boolean))).sort();
  const years = Array.from(new Set(rows.map((r) => r.year).filter(Boolean))).sort();
  const sessions = Array.from(new Set(rows.map((r) => r.session).filter(Boolean))).sort();

  setOptions(courseSelect, courses);
  setOptions(yearSelect, years);
  setOptions(sessionSelect, sessions);

  const selects = [courseSelect, yearSelect, sessionSelect];
  selects.forEach((select) => {
    select.removeEventListener("change", applyFilters);
    select.addEventListener("change", applyFilters);
  });

  const inputs = [
    document.getElementById("filter-id"),
    document.getElementById("filter-firstname"),
    document.getElementById("filter-lastname"),
  ];
  inputs.forEach((input) => {
    if (!input) return;
    input.removeEventListener("input", applyFilters);
    input.addEventListener("input", applyFilters);
  });
}

function setOptions(selectEl, values) {
  const previous = selectEl.value;
  selectEl.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All";
  selectEl.appendChild(allOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });

  selectEl.value = values.includes(previous) ? previous : "";
}

function applyFilters() {
  const course = document.getElementById("filter-course")?.value || "";
  const year = document.getElementById("filter-year")?.value || "";
  const session = document.getElementById("filter-session")?.value || "";
  const idTerm = (document.getElementById("filter-id")?.value || "").toLowerCase();
  const firstnameTerm = (document.getElementById("filter-firstname")?.value || "").toLowerCase();
  const lastnameTerm = (document.getElementById("filter-lastname")?.value || "").toLowerCase();

  const contains = (value, term) => {
    if (!term) return true;
    return String(value ?? "").toLowerCase().includes(term);
  };

  const filtered = studentRecords.filter((row) => {
    if (course && row.course !== course) return false;
    if (year && row.year !== year) return false;
    if (session && row.session !== session) return false;
    if (!contains(row.id, idTerm)) return false;
    if (!contains(row.firstname, firstnameTerm)) return false;
    if (!contains(row.lastname, lastnameTerm)) return false;
    return true;
  });

  renderStudents(filtered);
}

function populateCourseSelector(rows) {
  courseSelector = document.getElementById("course-selector");
  if (!courseSelector) return;

  const courses = Array.from(new Set(rows.map((r) => r.course).filter(Boolean))).sort();
  const previous = courseSelector.value;
  courseSelector.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a course";
  courseSelector.appendChild(placeholder);

  courses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course;
    option.textContent = course;
    courseSelector.appendChild(option);
  });

  courseSelector.value = courses.includes(previous) ? previous : "";
  courseSelector.removeEventListener("change", handleCourseChange);
  courseSelector.addEventListener("change", handleCourseChange);
}

function handleCourseChange() {
  renderCoursesTable(courseSelector.value);
}

function buildCourseSummaries(course) {
  const grouped = new Map();
  studentRecords
    .filter((row) => row.course === course)
    .forEach((row) => {
      if (!row.year || !row.session) return;
      const key = `${row.year}-${row.session}`;
      if (!grouped.has(key)) {
        grouped.set(key, { year: row.year, session: row.session, students: 0, scores: [] });
      }
      const entry = grouped.get(key);
      entry.students += 1;
      const numericScore = Number(row.score);
      if (!Number.isNaN(numericScore)) {
        entry.scores.push(numericScore);
      }
    });

  const summaries = Array.from(grouped.values()).map((entry) => {
    const average =
      entry.scores.length > 0
        ? (entry.scores.reduce((total, score) => total + score, 0) / entry.scores.length).toFixed(2)
        : "--";
    return {
      year: entry.year,
      session: entry.session,
      students: entry.students,
      average
    };
  });

  summaries.sort((a, b) => {
    if (a.year === b.year) return a.session.localeCompare(b.session);
    return b.year.localeCompare(a.year);
  });

  return summaries;
}

function updateCourseSummary(course) {
  const nameEl = document.getElementById("course-summary-name");
  const avgEl = document.getElementById("course-summary-average");
  if (!nameEl || !avgEl) return;

  if (!course) {
    nameEl.textContent = "Select a course";
    avgEl.textContent = "--";
    return;
  }

  nameEl.textContent = course;
  const average = computeCourseAverage(course);
  avgEl.textContent = Number.isFinite(average) ? average.toFixed(2) : "--";
}

function computeCourseAverage(course) {
  const scores = studentRecords
    .filter((row) => row.course === course)
    .map((row) => Number(row.score))
    .filter((score) => !Number.isNaN(score));

  if (!scores.length) return null;
  const total = scores.reduce((sum, score) => sum + score, 0);
  return total / scores.length;
}

function renderStats(rows) {
  statElements = {
    totalRecords: document.getElementById("stat-total-records"),
    uniqueStudents: document.getElementById("stat-unique-students"),
    sessions: document.getElementById("stat-sessions"),
    courses: document.getElementById("stat-courses")
  };

  const totalRecords = rows.length;
  const uniqueStudents = new Set(rows.map((r) => r.id).filter(Boolean)).size;
  const sessions = new Set(
    rows
      .filter((r) => r.course && r.year && r.session)
      .map((r) => `${r.course}-${r.year}-${r.session}`)
  ).size;
  const courses = new Set(rows.map((r) => r.course).filter(Boolean)).size;

  updateStat("totalRecords", totalRecords);
  updateStat("uniqueStudents", uniqueStudents);
  updateStat("sessions", sessions);
  updateStat("courses", courses);
}

function updateStat(key, value) {
  const el = statElements[key];
  if (!el) return;
  el.textContent = value || "0";
}

function exportRecordsAsCSV() {
  if (!studentRecords.length) {
    alert("No records found. Run extraction from the popup first.");
    return;
  }

  const header = columns;
  const escapeField = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[" ,\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = studentRecords.map((row) => header.map((key) => escapeField(row[key])));
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `emarks-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", loadAndRender);
