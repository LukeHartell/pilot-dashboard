// Redirect to login if no token
const token = localStorage.getItem("jwtToken");
if (!token) {
  window.location.href = "/login";
}

// Store flights for later calculations
let userFlights = [];

// Fetch and display user data
async function loadUserInfo() {
  try {
    const response = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/me",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );

    if (!response.ok) throw new Error("Failed to fetch user info");

    const [data] = await response.json(); // Array with one object

    if (!data.success) {
      throw new Error(data.message || "Failed to load user.");
    }

    // Fill basic user info
    document.getElementById(
      "userName"
    ).textContent = `${data.name} ${data.surname}`;
    document.getElementById("userEmail").textContent = data.email;
    const firstName = data.name || "";
    const header = document.getElementById("userInfoHeader");
    if (header) header.textContent = `👤 ${firstName}`;
  } catch (err) {
    console.error("Error fetching user info:", err);
    document.getElementById("userName").textContent = "Guest";
    document.getElementById("userEmail").textContent = "Unknown";
  }
}

loadUserInfo();

// Load "Fit for flying?" data
async function loadFitnessInfo() {
  try {
    const response = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/my-flights",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );

    if (!response.ok) throw new Error("Failed to fetch flights");

    const [data] = await response.json();
    if (!data.success)
      throw new Error(data.message || "Failed to load flights.");

    const flights = Array.isArray(data.flights) ? data.flights : [];
    userFlights = flights;
    updateStats();
    if (flights.length === 0) {
      document.getElementById("fitMessage").textContent =
        "No flights logged yet.";
      return;
    }

    flights.sort(
      (a, b) => new Date(getEntryDate(b)) - new Date(getEntryDate(a))
    );

    const now = new Date();
    const lastFlightDate = new Date(getEntryDate(flights[0]));
    const daysSince = Math.floor((now - lastFlightDate) / (1000 * 60 * 60 * 24));
    const monthsSince = Math.floor(daysSince / 30);

    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    let flights12 = 0;
    let minutes12 = 0;
    flights.forEach((f) => {
      const entryDate = new Date(getEntryDate(f));
      if (entryDate >= yearAgo) {
        flights12 += getFlightCount(f);
        minutes12 += getFlightMinutes(f);
      }
    });

    const hours12 = minutes12 / 60;

    // ----- Fitness Score Calculations -----
    const flightsScore = Math.min(flights12 / 50, 1.0);
    const hoursScore = Math.min(hours12 / 100, 1.0);
    const experienceScore = (flightsScore + hoursScore) / 2;

    const baseK = 0.05;
    const adjustedK = baseK / (0.5 + 0.5 * experienceScore);
    const rawRecency = Math.exp(-adjustedK * daysSince);
    const recencyScore = rawRecency * (0.5 + 0.5 * experienceScore);
    const fitnessScore = 0.5 * recencyScore + 0.5 * experienceScore;

    document.getElementById("fitnessScore").textContent = `${Math.round(
      fitnessScore * 100
    )}`;
    document.getElementById("experienceScore").textContent = `E:${Math.round(
      experienceScore * 100
    )}`;
    document.getElementById("recencyScore").textContent = `R:${Math.round(
      recencyScore * 100
    )}`;

    const agoText = `${daysSince} day${daysSince !== 1 ? "s" : ""}`;
    setStatus("lastFlightAgo", agoText, severityFromMonths(monthsSince));

    setStatus("flights12m", flights12, severityFromFlights(flights12));
    setStatus(
      "airtime12m",
      formatMinutes(minutes12),
      severityFromHours(hours12)
    );

    const severity = Math.max(
      severityFromMonths(monthsSince),
      severityFromFlights(flights12),
      severityFromHours(hours12)
    );
    const msg =
      severity === 2
        ? "Your activity is low. Consider refresher training before flying."
        : severity === 1
        ? "You're somewhat active but more practice is recommended."
        : "You appear up to date and fit to fly.";
    document.getElementById("fitMessage").textContent = msg;
  } catch (err) {
    console.error("Error loading fitness info:", err);
    document.getElementById("fitMessage").textContent =
      "Could not load fitness info.";
  }
}

function getEntryDate(flight) {
  return (
    flight.takeoffTime ||
    flight.date ||
    flight.landingTime ||
    flight.createdAt ||
    0
  );
}

function getFlightCount(flight) {
  const count = parseInt(flight.numberFlights, 10);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

function getFlightMinutes(flight) {
  if (flight.airTimeMinutes != null) return flight.airTimeMinutes;
  if (flight.takeoffTime && flight.landingTime) {
    const start = new Date(flight.takeoffTime);
    const end = new Date(flight.landingTime);
    const diff = end - start;
    return diff > 0 ? Math.floor(diff / 60000) : 0;
  }
  return 0;
}

function formatDateOnly(datetimeStr) {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(datetimeStr).toLocaleDateString(undefined, options);
}

function formatMinutes(min) {
  const hours = Math.floor(min / 60);
  const remainingMinutes = min % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function severityFromMonths(m) {
  return m >= 3 ? 2 : m >= 1 ? 1 : 0;
}

function severityFromFlights(f) {
  return f <= 10 ? 2 : f <= 20 ? 1 : 0;
}

function severityFromHours(h) {
  return h < 15 ? 2 : h < 27 ? 1 : 0;
}

function setStatus(id, value, severity) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  el.classList.remove("status-red", "status-yellow", "status-green");
  el.classList.add(
    severity === 2
      ? "status-red"
      : severity === 1
      ? "status-yellow"
      : "status-green"
  );
}

function computeScoreAtDate(flights, date) {
  let lastFlight = null;
  let flights12 = 0;
  let minutes12 = 0;
  const yearAgo = new Date(date);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  flights.forEach((f) => {
    const entry = new Date(getEntryDate(f));
    if (entry <= date) {
      if (!lastFlight || entry > lastFlight) lastFlight = entry;
      if (entry >= yearAgo) {
        flights12 += getFlightCount(f);
        minutes12 += getFlightMinutes(f);
      }
    }
  });

  const daysSince = lastFlight
    ? Math.floor((date - lastFlight) / (1000 * 60 * 60 * 24))
    : Infinity;
  const hours12 = minutes12 / 60;
  const flightsScore = Math.min(flights12 / 50, 1.0);
  const hoursScore = Math.min(hours12 / 100, 1.0);
  const experienceScore = (flightsScore + hoursScore) / 2;
  const baseK = 0.05;
  const adjustedK = baseK / (0.5 + 0.5 * experienceScore);
  const rawRecency = Math.exp(-adjustedK * (isFinite(daysSince) ? daysSince : 0));
  const recencyScore = rawRecency * (0.5 + 0.5 * experienceScore);
  const fitnessScore = 0.5 * recencyScore + 0.5 * experienceScore;
  return { date, fitnessScore, experienceScore, recencyScore };
}

function computeFitnessHistory(flights, startDate, endDate = new Date()) {
  const history = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    history.push(computeScoreAtDate(flights, new Date(d)));
  }
  return history;
}

function historyForRange(flights, range) {
  const today = new Date();
  let start;
  switch (range) {
    case "all": {
      const first = flights.reduce((min, f) => {
        const d = new Date(getEntryDate(f));
        return !min || d < min ? d : min;
      }, null);
      start = first ? new Date(first) : today;
      break;
    }
    case "ytd":
      start = new Date(today.getFullYear(), 0, 1);
      break;
    case "3m":
      start = new Date(today);
      start.setMonth(start.getMonth() - 3);
      break;
    case "1m":
      start = new Date(today);
      start.setMonth(start.getMonth() - 1);
      break;
    case "12m":
    default:
      start = new Date(today);
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  start.setHours(0, 0, 0, 0);
  return computeFitnessHistory(flights, start, today);
}

function smoothHistory(history, windowSize = 60) {
  const result = [];
  for (let i = 0; i < history.length; i++) {
    let sumF = 0;
    let sumE = 0;
    let sumR = 0;
    let count = 0;
    for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
      sumF += history[j].fitnessScore;
      sumE += history[j].experienceScore;
      sumR += history[j].recencyScore;
      count++;
    }
    result.push({
      date: history[i].date,
      fitnessScore: sumF / count,
      experienceScore: sumE / count,
      recencyScore: sumR / count,
    });
  }
  return result;
}

function planeLabel(flight) {
  if (flight.displayName) return flight.displayName;
  if (flight.registration) return flight.registration;
  if (flight.plane_id) return flight.plane_id.substring(0, 6);
  return "Unknown";
}

function updateStats() {
  const details = document.getElementById("statsDetails");
  if (!details) return;
  if (!userFlights.length) {
    details.innerHTML = "<p>No flights logged yet.</p>";
    return;
  }

  const totalFlights = userFlights.reduce(
    (sum, f) => sum + getFlightCount(f),
    0
  );
  const totalMinutes = userFlights.reduce(
    (sum, f) => sum + getFlightMinutes(f),
    0
  );

  const planeCounts = {};
  const planeMinutes = {};
  const baseCounts = {};
  let longest = 0;
  userFlights.forEach((f) => {
    const count = getFlightCount(f);
    const minutes = getFlightMinutes(f);
    const plane = planeLabel(f);
    if (plane) {
      planeCounts[plane] = (planeCounts[plane] || 0) + count;
      planeMinutes[plane] = (planeMinutes[plane] || 0) + minutes;
    }
    const base = (f.startLocation || "").toUpperCase();
    if (base) baseCounts[base] = (baseCounts[base] || 0) + count;
    if (minutes > longest) longest = minutes;
  });

  const favPlaneFlights =
    Object.entries(planeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  const favPlaneTime =
    Object.entries(planeMinutes).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  const favBase =
    Object.entries(baseCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  const formatDur = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;

  document.getElementById("statTotalFlights").textContent = totalFlights;
  document.getElementById("statTotalMinutes").textContent = formatDur(totalMinutes);
  document.getElementById("statFavPlaneFlights").textContent = favPlaneFlights;
  document.getElementById("statFavPlaneTime").textContent = favPlaneTime;
  document.getElementById("statFavBase").textContent = favBase;
  document.getElementById("statLongest").textContent = formatDur(longest);
}

loadFitnessInfo();

// Edit profile button
document.getElementById("editProfileButton")?.addEventListener("click", () => {
  window.location.href = "/edit-user";
});

// Fullscreen widget modal
const modal = document.getElementById("widgetModal");
const modalContent = document.getElementById("modalContent");

const scoreHelpText = `# Pilot Fitness Score System

This scoring system helps pilots understand their flight fitness by looking at three key metrics:

1. **Fitness Score** – Overall flying fitness (0.0 to 1.0).
2. **Experience Score** – Measures the pilot’s total activity over the past 12 months.
3. **Recency Score** – Measures how recently the pilot last flew, with an adjustment for experience.

---

## 1️ Fitness Score

**What is it?**

* The main score showing the pilot’s overall flight fitness.

**Formula:**

Fitness Score = (Weight_Recency * Recency Score)
              + (Weight_Experience * Experience Score)

**Default Weights:**

* Weight_Recency = 0.5
* Weight_Experience = 0.5

---

## 2️ Experience Score

**What is it?**

* Measures overall flying activity over the last 12 months.
* Higher = more experienced pilot.

**Formula:**

Flights Score = min(Flights in 12m / 50, 1.0)
Hours Score = min(Hours in 12m / 100, 1.0)
Experience Score = (Flights Score + Hours Score) / 2

**Notes:**

* 50 flights/year = very active.
* 100 hours/year = very experienced.

---

## 3️ Recency Score

**What is it?**

* Measures how recently the pilot last flew.
* Adjusts for experience — high-experience pilots decay slower.

**Steps:**

### 1. Calculate the **Adjusted Decay Rate (k):**

Adjusted k = Base k / (0.5 + 0.5 * Experience Score)

* Base k (default) = 0.05
* Higher experience → lower decay rate.

### 2. Calculate the **Raw Recency Score:**

Raw Recency Score = exp(-Adjusted k * Days Since Last Flight)

* Days Since Last Flight = number of days since the pilot’s last flight.

### 3. Scale the **Raw Recency Score** by experience to get the final Recency Score:

Recency Score = Raw Recency Score * (0.5 + 0.5 * Experience Score)

* This prevents low-experience pilots from getting a perfect score from just one flight.

---

## Putting It All Together

**Example:**

* Days Since Last Flight: 30
* Flights in 12m: 10
* Hours in 12m: 20

### Experience Score:

* Flights Score = min(10/50, 1.0) = 0.2
* Hours Score = min(20/100, 1.0) = 0.2
* Experience Score = (0.2 + 0.2) / 2 = 0.2

### Adjusted k:

* Adjusted k = 0.05 / (0.5 + 0.5 * 0.2) ≈ 0.083

### Raw Recency Score:

* Raw Recency Score = exp(-0.083 * 30) ≈ 0.082

### Final Recency Score:

* Recency Score = 0.082 * (0.5 + 0.5 * 0.2) ≈ 0.049

### Fitness Score:

* Fitness Score = 0.5 * 0.049 + 0.5 * 0.2 = 0.1245

---

## Summary

| Score         | Purpose                          |
| ------------- | -------------------------------- |
| Fitness Score | Overall flying fitness.          |
| Experience    | Shows total flying in 12 months. |
| Recency       | Shows how fresh the pilot is.    |

This makes it super easy for pilots to **self-evaluate** and for instructors to **guide** them.`;

const scoreHelpHTML = `<h3>Fitness Scores Explained</h3>
<p><em>Quick overview:</em></p>
<ul>
  <li><strong>Fitness (F)</strong> – overall score, averaging E and R.</li>
  <li><strong>Experience (E)</strong> – flights and hours logged in the last year.</li>
  <li><strong>Recency (R)</strong> – decays with days since last flight; drops slower if you have more experience.</li>
</ul>
<p>Scores range from 0–100. Higher values mean you're more current. Use the Fitness score to judge if more practice is needed.</p>
${simpleMarkdown(scoreHelpText.replace(/```/g, ""))}`;

document.querySelectorAll(".fullscreen-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const widget = e.target.closest(".widget");
    modalContent.innerHTML = widget.innerHTML;
    modalContent.querySelector(".fullscreen-btn")?.remove();
    modalContent.querySelector(".help-btn")?.remove();
    modal.style.display = "flex";

    if (widget.id === "fitWidget" && userFlights.length) {
      const select = document.createElement("select");
      select.id = "historyRangeSelect";
      select.innerHTML = `
        <option value="12m" selected>Last 12 months</option>
        <option value="all">All time</option>
        <option value="ytd">Year to date</option>
        <option value="3m">Last 3 months</option>
        <option value="1m">Last 1 month</option>`;
      modalContent.appendChild(select);
      const renderChart = () => {
        const loading = document.createElement("p");
        loading.textContent = "Calculating...";
        modalContent.appendChild(loading);
        const history = historyForRange(userFlights, select?.value || "12m");
        const trend = smoothHistory(history);
        loading.remove();
        modalContent.querySelector("#fitnessHistoryChart")?.remove();
        const canvas = document.createElement("canvas");
        canvas.id = "fitnessHistoryChart";
        modalContent.appendChild(canvas);

        const labels = history.map((h) => formatDateOnly(h.date));
        const clamp = (v) => Math.min(Math.max(Math.round(v * 100), 0), 100);

        const fData = history.map((h) => clamp(h.fitnessScore));
        const fTrend = trend.map((h) => clamp(h.fitnessScore));
        const eData = history.map((h) => clamp(h.experienceScore));
        const eTrend = trend.map((h) => clamp(h.experienceScore));
        const rData = history.map((h) => clamp(h.recencyScore));
        const rTrend = trend.map((h) => clamp(h.recencyScore));

        new Chart(canvas.getContext("2d"), {
          type: "line",
          data: {
            labels,
            datasets: [
              {
                label: "Fitness Score",
                data: fData,

                borderColor: "#4b89ff",
                backgroundColor: "#4b89ff33",
                fill: false,
                tension: 0,
                pointRadius: 0,
              },
              {
                label: "Fitness 60d Avg",
                data: fTrend,
                borderColor: "#4b89ff",
                backgroundColor: "#4b89ff55",
                fill: false,
                tension: 0.3,
                pointRadius: 0,
                borderDash: [5, 3],
              },
              {
                label: "Experience Score",
                data: eData,
                borderColor: "#37c871",
                backgroundColor: "#37c87133",
                fill: false,
                tension: 0,
                pointRadius: 0,
              },
              {
                label: "Experience 60d Avg",
                data: eTrend,
                borderColor: "#37c871",
                backgroundColor: "#37c87155",
                fill: false,
                tension: 0.3,
                pointRadius: 0,
                borderDash: [5, 3],
              },
              {
                label: "Recency Score",
                data: rData,
                borderColor: "#f98037",
                backgroundColor: "#f9803733",
                fill: false,
                tension: 0,
                pointRadius: 0,
              },
              {
                label: "Recency 60d Avg",
                data: rTrend,
                borderColor: "#f98037",
                backgroundColor: "#f9803755",
                fill: false,
                tension: 0.3,
                pointRadius: 0,
                borderDash: [5, 3],
              },
            ],
          },
          options: {
            responsive: true,
            scales: { y: { min: 0, max: 100 } },
          },
        });
      };
      renderChart();
      select?.addEventListener("change", renderChart);
    }
  });
});

// Close modal handlers
document.getElementById("closeModalBtn").addEventListener("click", () => {
  modal.style.display = "none";
});

modal.addEventListener("click", (e) => {
  if (e.target.id === "widgetModal") {
    modal.style.display = "none";
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    modal.style.display = "none";
  }
});

// Score help toggle
document.getElementById("scoreHelpBtn")?.addEventListener("click", () => {
  modalContent.innerHTML = scoreHelpHTML;
  modal.style.display = "flex";
});

// Logout
document.getElementById("logoutButton")?.addEventListener("click", () => {
  localStorage.removeItem("jwtToken");
  window.location.href = "/login";
});
