const token = localStorage.getItem("jwtToken");
if (!token) {
  window.location.href = "/login";
}

let cachedPlanes = {};
let flights = [];
let currentPage = 0;
let totalPages = 0;
const flightsPerPage = 10;
let flightNumberBias = 0; // offset added to all displayed flight numbers
let selectedFlightId = null;

async function loadLogbook() {
  try {
    const profileResponse = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/me",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );
    if (!profileResponse.ok) throw new Error("Failed to fetch user info");

    const [profileData] = await profileResponse.json();
    if (!profileData.success)
      throw new Error(profileData.message || "Failed to load user profile.");

    if (Array.isArray(profileData.planes)) {
      profileData.planes.forEach((plane) => {
        cachedPlanes[plane._id] = plane;
      });
    }

    const flightsResponse = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/my-flights",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );
    if (!flightsResponse.ok) throw new Error("Failed to fetch flights");

    const [flightsData] = await flightsResponse.json();
    if (!flightsData.success)
      throw new Error(flightsData.message || "Failed to load flights.");

    flights = Array.isArray(flightsData.flights)
      ? flightsData.flights.filter(
          (f) => f && Object.keys(f).length > 0
        )
      : [];
    flights.sort((a, b) => new Date(getEntryDate(a)) - new Date(getEntryDate(b)));

    let counter = 1 + flightNumberBias;
    flights.forEach((f) => {
      f.flightNumber = counter;
      const increment = f.logType === "batch" ? f.numberFlights || 1 : 1;
      counter += increment;
    });

    totalPages = Math.ceil(flights.length / flightsPerPage);
    if (flights.length > 0) {
      document.getElementById("pager").style.display = "block";
      currentPage = totalPages - 1;
      renderPage();
    } else {
      document.getElementById("pager").style.display = "none";
      document.getElementById("flightTableBody").innerHTML =
        "<tr><td colspan='7'>No flights added yet.</td></tr>";
    }
  } catch (err) {
    console.error("Error loading logbook:", err);
    document.getElementById("flightTableBody").innerHTML =
      "<tr><td colspan='7'>Could not load flights.</td></tr>";
  }
}

function renderPage() {
  const flightTableBody = document.getElementById("flightTableBody");
  flightTableBody.innerHTML = "";

  const indicator = document.getElementById("pageIndicator");
  if (indicator) {
    const displayPage = totalPages > 0 ? currentPage + 1 : 0;
    indicator.textContent = `${displayPage}/${totalPages}`;
  }

  const start = currentPage * flightsPerPage;
  const end = start + flightsPerPage;
  const pageFlights = flights.slice(start, end);

  pageFlights.forEach((flight) => {
    const row = document.createElement("tr");

    const entryDate = getEntryDate(flight);
    const takeoffDateFormatted = entryDate ? formatDateOnly(entryDate) : "-";
    const duration =
      flight.logType === "batch"
        ? computeDuration(null, null, flight.airTimeMinutes)
        : computeDuration(flight.takeoffTime, flight.landingTime);

    let planeName = "Unknown Plane";
    if (flight.manualPlane) {
      planeName = `${flight.displayName} (${flight.registration})`;
    } else if (flight.plane_id && cachedPlanes[flight.plane_id]) {
      const plane = cachedPlanes[flight.plane_id];
      planeName = `${plane.displayName} (${plane.registration})`;
    } else if (flight.plane_id) {
      planeName = `Plane ID: ${flight.plane_id.substring(0, 6)}...`;
    }

    const startNum = flight.flightNumber;
    const endNum =
      flight.logType === "batch" && flight.numberFlights > 1
        ? startNum + flight.numberFlights - 1
        : startNum;
    const numberDisplay = endNum !== startNum ? `${startNum}-${endNum}` : startNum;

    row.innerHTML = `
      <td>${numberDisplay}</td>
      <td>${takeoffDateFormatted}</td>
      <td>${planeName}</td>
      <td>${flight.startLocation || "-"}</td>
      <td>${flight.endLocation || "-"}</td>
      <td>${duration}</td>
      <td>${flight.notes ? escapeHtml(flight.notes) : "-"}</td>
    `;

    row.addEventListener("click", () => showFlightDetails(flight));

    flightTableBody.appendChild(row);
  });

  for (let i = pageFlights.length; i < flightsPerPage; i++) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = "<td colspan='7'>&nbsp;</td>";
    flightTableBody.appendChild(emptyRow);
  }
}

// Pager controls
document.getElementById("prevPage")?.addEventListener("click", () => {
  if (currentPage > 0) {
    currentPage--;
    renderPage();
  }
});

document.getElementById("nextPage")?.addEventListener("click", () => {
  if ((currentPage + 1) * flightsPerPage < flights.length) {
    currentPage++;
    renderPage();
  }
});

function formatDate(datetimeStr) {
  const options = { dateStyle: "medium", timeStyle: "short" };
  return new Date(datetimeStr).toLocaleString(undefined, options);
}

function formatDateOnly(datetimeStr) {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(datetimeStr).toLocaleDateString(undefined, options);
}

function computeDuration(start, end, minutes) {
  if (minutes != null) return formatMinutes(minutes);

  const startTime = new Date(start);
  const endTime = new Date(end);
  const diffMs = endTime - startTime;
  if (diffMs <= 0) return "-";

  const totalMinutes = Math.floor(diffMs / 60000);
  return formatMinutes(totalMinutes);
}

function formatMinutes(min) {
  const hours = Math.floor(min / 60);
  const remainingMinutes = min % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function escapeHtml(unsafe) {
  return unsafe.replace(/[&<>"']/g, (match) => {
    const escape = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return escape[match];
  });
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

function showFlightDetails(flight) {
  const detailBox = document.getElementById("flightDetail");
  const detailContent = document.getElementById("flightDetailContent");
  selectedFlightId = flight._id;

  let planeName = "Unknown Plane";
  if (flight.manualPlane) {
    planeName = `${flight.displayName} (${flight.registration})`;
  } else if (flight.plane_id && cachedPlanes[flight.plane_id]) {
    const plane = cachedPlanes[flight.plane_id];
    planeName = `${plane.displayName} (${plane.registration})`;
  }

  const entryDate = getEntryDate(flight);

  const takeoffFormatted = flight.takeoffTime ? formatDate(flight.takeoffTime) : "-";
  const landingFormatted = flight.landingTime ? formatDate(flight.landingTime) : "-";
  const duration =
    flight.logType === "batch"
      ? computeDuration(null, null, flight.airTimeMinutes)
      : computeDuration(flight.takeoffTime, flight.landingTime);

  const startNum = flight.flightNumber;
  const endNum =
    flight.logType === "batch" && flight.numberFlights > 1
      ? startNum + flight.numberFlights - 1
      : startNum;
  const numberDisplay = endNum !== startNum ? `${startNum}-${endNum}` : startNum;

  if (flight.logType === "batch") {
    const dateFormatted = entryDate ? formatDateOnly(entryDate) : "-";
    detailContent.innerHTML = `
      <section class="detail-section">
        <h4>General</h4>
        <p><strong>Flights #:</strong> ${numberDisplay}</p>
        <p><strong>Plane:</strong> ${planeName}</p>
        <p><strong>Category:</strong> ${flight.category || "-"}</p>
      </section>

      <section class="detail-section">
        <h4>Date</h4>
        <p><strong>Date:</strong> ${dateFormatted}</p>
      </section>

      <section class="detail-section">
        <h4>Route</h4>
        <p><strong>From:</strong> ${flight.startLocation || "-"}</p>
        <p><strong>To:</strong> ${flight.endLocation || "-"}</p>
      </section>

      <section class="detail-section">
        <h4>Extra</h4>
        <p><strong>Total Flights:</strong> ${flight.numberFlights}</p>
        <p><strong>Air Time:</strong> ${duration}</p>
        <p><strong>Engine Time:</strong> ${
          flight.engineTimeMinutes != null ? flight.engineTimeMinutes + " min" : "-"
        }</p>
        <p><strong>Notes:</strong> ${
          flight.notes ? escapeHtml(flight.notes) : "-"
        }</p>
      </section>
    `;
  } else {
    detailContent.innerHTML = `
      <section class="detail-section">
        <h4>General</h4>
        <p><strong>Flight #:</strong> ${numberDisplay}</p>
        <p><strong>Plane:</strong> ${planeName}</p>
        <p><strong>Category:</strong> ${flight.category || "-"}</p>
        <p><strong>Launch Type:</strong> ${flight.launchType || "-"}</p>
      </section>

      <section class="detail-section">
        <h4>Start</h4>
        <p><strong>Start Location:</strong> ${flight.startLocation}</p>
        <p><strong>Takeoff:</strong> ${takeoffFormatted}</p>
      </section>

      <section class="detail-section">
        <h4>End</h4>
        <p><strong>End Location:</strong> ${flight.endLocation}</p>
        <p><strong>Landing:</strong> ${landingFormatted}</p>
      </section>

      <section class="detail-section">
        <h4>Extra</h4>
        <p><strong>Duration:</strong> ${duration}</p>
        <p><strong>Engine Time:</strong> ${
          flight.engineTimeMinutes != null ? flight.engineTimeMinutes + " min" : "-"
        }</p>
        <p><strong>Cross-country Distance:</strong> ${
          flight.crossCountryDistanceKm != null
            ? flight.crossCountryDistanceKm + " km"
            : "-"
        }</p>
        <p><strong>Notes:</strong> ${
          flight.notes ? escapeHtml(flight.notes) : "-"
        }</p>
      </section>
    `;
  }

  detailBox.style.display = "block";
}

document.getElementById("closeDetailBtn")?.addEventListener("click", () => {
  document.getElementById("flightDetail").style.display = "none";
  selectedFlightId = null;
});

document.getElementById("deleteEntryBtn")?.addEventListener("click", async () => {
  if (!selectedFlightId) return;
  const confirmed = confirm(
    "Are you sure you want to permanently delete this entry? This will affect your statistics."
  );
  if (!confirmed) return;
  try {
    const res = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/delete-flight",
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, entry_id: selectedFlightId }),
      }
    );

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const text = await res.text();
    if (text) {
      const result = JSON.parse(text);
      if (!result.success) throw new Error(result.message || "Delete failed");
    }

    document.getElementById("flightDetail").style.display = "none";
    selectedFlightId = null;
    await loadLogbook();
  } catch (err) {
    console.error(err);
    alert("Failed to delete entry: " + err.message);
  }
});

loadLogbook();
