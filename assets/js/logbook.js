const token = localStorage.getItem("jwtToken");
if (!token) {
  window.location.href = "/login";
}

let cachedPlanes = {};
let flights = [];
let currentPage = 0;
const flightsPerPage = 10;

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

    flights = flightsData.flights || [];
    flights.sort((a, b) => new Date(a.takeoffTime) - new Date(b.takeoffTime));

    if (flights.length > 0) {
      document.getElementById("pager").style.display = "block";
    }

    renderPage();
  } catch (err) {
    console.error("Error loading logbook:", err);
    document.getElementById("flightTableBody").innerHTML =
      "<tr><td colspan='7'>Could not load flights.</td></tr>";
  }
}

function renderPage() {
  const flightTableBody = document.getElementById("flightTableBody");
  flightTableBody.innerHTML = "";

  const start = currentPage * flightsPerPage;
  const end = start + flightsPerPage;
  const pageFlights = flights.slice(start, end);

  pageFlights.forEach((flight, index) => {
    const row = document.createElement("tr");

    const takeoffDateFormatted = formatDateOnly(flight.takeoffTime);
    const duration = computeDuration(flight.takeoffTime, flight.landingTime);

    let planeName = "Unknown Plane";
    if (flight.manualPlane) {
      planeName = `${flight.displayName} (${flight.registration})`;
    } else if (flight.plane_id && cachedPlanes[flight.plane_id]) {
      const plane = cachedPlanes[flight.plane_id];
      planeName = `${plane.displayName} (${plane.registration})`;
    } else if (flight.plane_id) {
      planeName = `Plane ID: ${flight.plane_id.substring(0, 6)}...`;
    }

    row.innerHTML = `
      <td>${start + index + 1}</td>
      <td>${takeoffDateFormatted}</td>
      <td>${planeName}</td>
      <td>${flight.startLocation}</td>
      <td>${flight.endLocation}</td>
      <td>${duration}</td>
      <td>${flight.notes ? escapeHtml(flight.notes) : "-"}</td>
    `;

    row.addEventListener("click", () =>
      showFlightDetails(flight, start + index + 1)
    );

    flightTableBody.appendChild(row);
  });
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

function computeDuration(start, end) {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const diffMs = endTime - startTime;
  if (diffMs <= 0) return "-";

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

function escapeHtml(unsafe) {
  return unsafe.replace(/[&<"']/g, (match) => {
    const escape = { "&": "&amp;", "<": "&lt;", '"': "&quot;", "'": "&#039;" };
    return escape[match];
  });
}

function showFlightDetails(flight, flightNumber) {
  const detailBox = document.getElementById("flightDetail");
  const detailContent = document.getElementById("flightDetailContent");

  let planeName = "Unknown Plane";
  if (flight.manualPlane) {
    planeName = `${flight.displayName} (${flight.registration})`;
  } else if (flight.plane_id && cachedPlanes[flight.plane_id]) {
    const plane = cachedPlanes[flight.plane_id];
    planeName = `${plane.displayName} (${plane.registration})`;
  }

  const takeoffFormatted = formatDate(flight.takeoffTime);
  const landingFormatted = formatDate(flight.landingTime);
  const duration = computeDuration(flight.takeoffTime, flight.landingTime);

  detailContent.innerHTML = `
    <section class="detail-section">
      <h4>General</h4>
      <p><strong>Flight #:</strong> ${flightNumber}</p>
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
        flight.engineTimeMinutes != null
          ? flight.engineTimeMinutes + " min"
          : "-"
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

  detailBox.style.display = "block";
}

document.getElementById("closeDetailBtn")?.addEventListener("click", () => {
  document.getElementById("flightDetail").style.display = "none";
});

loadLogbook();
