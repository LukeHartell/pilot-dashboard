const token = localStorage.getItem("jwtToken");
if (!token) {
  window.location.href = "/login";
}

// Elements
const planeSelect = document.getElementById("plane");
const manualPlaneFields = document.getElementById("manualPlaneFields");
const addFlightForm = document.getElementById("addFlightForm");
const manualCategory = document.getElementById("manualCategory");

const launchTypeFields = document.getElementById("launchTypeFields");
const engineTimeFields = document.getElementById("engineTimeFields");

// Load planes into dropdown
async function loadPlanes() {
  try {
    const response = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/me",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );

    if (!response.ok) throw new Error("Failed to fetch user planes");

    const [data] = await response.json();

    if (!data.success)
      throw new Error(data.message || "Failed to load planes.");

    if (Array.isArray(data.planes)) {
      data.planes
        .filter((p) => p.status !== "deleted")
        .forEach((plane) => {
        const option = document.createElement("option");
        option.value = plane._id;
        option.textContent = plane.displayName;
        option.dataset.registration = plane.registration;
        option.dataset.type = plane.type;
        option.dataset.category = plane.category; // <-- store category for logic!
        planeSelect.appendChild(option);
      });
    }
  } catch (err) {
    console.error("Error loading planes:", err);
    alert("Failed to load your planes. Try again later.");
  }
}

loadPlanes();

// Show/hide manual fields + react to selected plane
planeSelect?.addEventListener("change", () => {
  const isManual = planeSelect.value === "manual";

  manualPlaneFields.style.display = isManual ? "block" : "none";

  document.getElementById("manualDisplayName").required = isManual;
  document.getElementById("manualRegistration").required = isManual;
  document.getElementById("manualType").required = isManual;
  manualCategory.required = isManual;

  if (isManual) {
    handleCategoryChange(manualCategory.value);
  } else {
    const selectedOption = planeSelect.options[planeSelect.selectedIndex];
    const category = selectedOption?.dataset.category;
    handleCategoryChange(category);
  }
});

// Also react when manual category changes
manualCategory?.addEventListener("change", () => {
  handleCategoryChange(manualCategory.value);
});

// Decide based on category which fields to show
function handleCategoryChange(category) {
  if (!category) {
    launchTypeFields.style.display = "none";
    engineTimeFields.style.display = "none";
    return;
  }

  if (category.includes("Glider")) {
    launchTypeFields.style.display = "block";

    if (category === "Glider (SSG)" || category === "Glider (SLG)") {
      engineTimeFields.style.display = "block";
    } else {
      engineTimeFields.style.display = "none";
    }
  } else {
    // Everything else (Aeroplane, Helicopter, Balloon)
    launchTypeFields.style.display = "none";

    if (category === "Helicopter") {
      engineTimeFields.style.display = "block";
    } else {
      engineTimeFields.style.display = "none";
    }
  }
}

// Handle form submission
addFlightForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const isManual = planeSelect.value === "manual";

  let planeData = {};

  if (isManual) {
    planeData.displayName =
      addFlightForm.elements["manualDisplayName"].value.trim();
    planeData.registration = addFlightForm.elements["manualRegistration"].value
      .trim()
      .toUpperCase();
    planeData.type = addFlightForm.elements["manualType"].value.trim();
    planeData.category = manualCategory.value;

    if (
      !planeData.displayName ||
      !planeData.registration ||
      !planeData.type ||
      !planeData.category
    ) {
      alert("Please fill out all manual plane fields.");
      return;
    }
  } else {
    const selectedOption = planeSelect.options[planeSelect.selectedIndex];
    planeData.planeId = planeSelect.value;
    planeData.displayName = selectedOption.textContent;
    planeData.registration = selectedOption.dataset.registration;
    planeData.type = selectedOption.dataset.type;
    planeData.category = selectedOption.dataset.category;
  }

  const startLocation = addFlightForm.elements["startLocation"].value
    .trim()
    .toUpperCase();
  const endLocation = addFlightForm.elements["endLocation"].value
    .trim()
    .toUpperCase();
  const takeoffTime = addFlightForm.elements["takeoffTime"].value;
  const landingTime = addFlightForm.elements["landingTime"].value;
  const notes = addFlightForm.elements["notes"].value.trim();

  const launchType = addFlightForm.elements["launchType"]?.value || null;
  const engineTimeMinutes = addFlightForm.elements["engineTimeMinutes"]?.value
    ? parseInt(addFlightForm.elements["engineTimeMinutes"].value, 10)
    : null;
  const crossCountryDistanceKm = addFlightForm.elements[
    "crossCountryDistanceKm"
  ]?.value
    ? parseInt(addFlightForm.elements["crossCountryDistanceKm"].value, 10)
    : null;

  if (!startLocation || !endLocation || !takeoffTime || !landingTime) {
    alert("Please fill out all required fields.");
    return;
  }

  // Build final flight data. Include locations in the payload so the
  // backend can store them along with the rest of the entry.
  let flightData = {
    token,
    manualPlane: isManual,
    startLocation,
    endLocation,
    takeoffTime,
    landingTime,
    notes: notes || null,
    crossCountryDistanceKm,
    launchType,
    engineTimeMinutes,
  };

  if (isManual) {
    flightData.displayName = planeData.displayName;
    flightData.registration = planeData.registration;
    flightData.type = planeData.type;
    flightData.category = planeData.category;
  } else {
    flightData.plane_id = planeData.planeId;
  }

  try {
    const response = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/add-flight",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flightData),
      }
    );

    if (!response.ok) throw new Error("Server returned an error");

    // alert("Flight added successfully! Redirecting to logbook...");
    window.location.href = "/logbook";
  } catch (err) {
    console.error(err);
    alert("Failed to add flight. Please try again later.");
  }
});
