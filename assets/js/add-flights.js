const token = localStorage.getItem("jwtToken");
if (!token) {
  window.location.href = "/login";
}

const planeSelect = document.getElementById("plane");
const manualPlaneFields = document.getElementById("manualPlaneFields");
const manualCategory = document.getElementById("manualCategory");
const engineTimeFields = document.getElementById("engineTimeFields");
const airTimeFields = document.getElementById("airTimeFields");
const addFlightsForm = document.getElementById("addFlightsForm");

async function loadPlanes() {
  try {
    const response = await fetch("https://n8n.e57.dk/webhook/pilot-dashboard/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) throw new Error("Failed to fetch user planes");

    const [data] = await response.json();
    if (!data.success) throw new Error(data.message || "Failed to load planes.");

    if (Array.isArray(data.planes)) {
      data.planes
        .filter((p) => p.status !== "deleted")
        .forEach((plane) => {
          const option = document.createElement("option");
          option.value = plane._id;
          option.textContent = plane.displayName;
          option.dataset.registration = plane.registration;
          option.dataset.type = plane.type;
          option.dataset.category = plane.category;
          planeSelect.appendChild(option);
        });
    }
  } catch (err) {
    console.error("Error loading planes:", err);
    alert("Failed to load your planes. Try again later.");
  }
}

loadPlanes();

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

manualCategory?.addEventListener("change", () => {
  handleCategoryChange(manualCategory.value);
});

function handleCategoryChange(category) {
  const engineCategories = ["Aeroplane", "Glider (SSG)", "Glider (SLG)"];
  const airCategories = [
    "Glider (no engine)",
    "Glider (SSG)",
    "Glider (SLG)",
    "Balloon",
  ];

  if (!category) {
    engineTimeFields.style.display = "none";
    airTimeFields.style.display = "none";
    return;
  }

  engineTimeFields.style.display = engineCategories.includes(category)
    ? "block"
    : "none";
  airTimeFields.style.display = airCategories.includes(category)
    ? "block"
    : "none";
}

addFlightsForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const isManual = planeSelect.value === "manual";
  let planeData = {};

  if (isManual) {
    planeData.displayName = addFlightsForm.elements["manualDisplayName"].value.trim();
    planeData.registration = addFlightsForm.elements["manualRegistration"].value
      .trim()
      .toUpperCase();
    planeData.type = addFlightsForm.elements["manualType"].value.trim();
    planeData.category = manualCategory.value;

    if (!planeData.displayName || !planeData.registration || !planeData.type || !planeData.category) {
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

  const date = addFlightsForm.elements["flightDate"].value;
  const numFlights = parseInt(addFlightsForm.elements["numFlights"].value, 10);
  const totalEngineTimeMinutes = addFlightsForm.elements["totalEngineTimeMinutes"]?.value
    ? parseInt(addFlightsForm.elements["totalEngineTimeMinutes"].value, 10)
    : null;
  const totalAirTimeMinutes = addFlightsForm.elements["totalAirTimeMinutes"]?.value
    ? parseInt(addFlightsForm.elements["totalAirTimeMinutes"].value, 10)
    : null;

  if (!date || !numFlights || numFlights <= 0) {
    alert("Please fill out all required fields.");
    return;
  }

  const batchData = {
    token,
    manualPlane: isManual,
    date,
    numberFlights: numFlights,
    totalEngineTimeMinutes,
    totalAirTimeMinutes,
  };

  if (isManual) {
    batchData.displayName = planeData.displayName;
    batchData.registration = planeData.registration;
    batchData.type = planeData.type;
    batchData.category = planeData.category;
  } else {
    batchData.plane_id = planeData.planeId;
  }

  try {
    const response = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/add-flights",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchData),
      }
    );

    if (!response.ok) throw new Error("Server returned an error");

    window.location.href = "/logbook";
  } catch (err) {
    console.error(err);
    alert("Failed to add flights. Please try again later.");
  }
});
