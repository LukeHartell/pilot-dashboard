// Redirect to login if no token
const token = localStorage.getItem("jwtToken");
if (!token) {
  window.location.href = "/login";
}

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
    if (!data.success) throw new Error(data.message || "Failed to load flights.");

    const flights = Array.isArray(data.flights) ? data.flights : [];
    if (flights.length === 0) {
      document.getElementById("fitMessage").textContent =
        "No flights logged yet.";
      return;
    }

    flights.sort((a, b) => new Date(getEntryDate(b)) - new Date(getEntryDate(a)));

    const now = new Date();
    const lastFlightDate = new Date(getEntryDate(flights[0]));
    const diffMonths = (now - lastFlightDate) / (1000 * 60 * 60 * 24 * 30);
    const monthsSince = Math.floor(diffMonths);

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

    const daysSince = Math.floor((now - lastFlightDate) / (1000 * 60 * 60 * 24));
    const baseK = 0.05;
    const adjustedK = baseK / (0.5 + 0.5 * experienceScore);
    const rawRecency = Math.exp(-adjustedK * daysSince);
    const recencyScore = rawRecency * (0.5 + 0.5 * experienceScore);
    const fitnessScore = 0.5 * recencyScore + 0.5 * experienceScore;

    document.getElementById("fitnessScore").textContent =
      `Fitness Score: ${fitnessScore.toFixed(3)}`;
    document.getElementById("experienceScore").textContent =
      `Experience: ${experienceScore.toFixed(3)}`;
    document.getElementById("recencyScore").textContent =
      `Recency: ${recencyScore.toFixed(3)}`;

    setStatus(
      "lastFlightDate",
      formatDateOnly(lastFlightDate),
      severityFromMonths(monthsSince)
    );
    document.getElementById("lastFlightAgo").textContent =
      monthsSince >= 1
        ? `${monthsSince} month${monthsSince > 1 ? "s" : ""}`
        : "<1 month";

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
    severity === 2 ? "status-red" : severity === 1 ? "status-yellow" : "status-green"
  );
}

loadFitnessInfo();

// Edit profile button
document.getElementById("editProfileButton")?.addEventListener("click", () => {
  window.location.href = "/edit-user";
});

// Fullscreen widget modal
const modal = document.getElementById("widgetModal");
const modalContent = document.getElementById("modalContent");

document.querySelectorAll(".fullscreen-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const widget = e.target.closest(".widget");
    modalContent.innerHTML = widget.innerHTML;
    modalContent.querySelector(".fullscreen-btn")?.remove();
    modal.style.display = "flex";
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

// Logout
document.getElementById("logoutButton")?.addEventListener("click", () => {
  localStorage.removeItem("jwtToken");
  window.location.href = "/login";
});
