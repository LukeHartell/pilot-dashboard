const addPlaneForm = document.getElementById("addPlaneForm");

addPlaneForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const displayName = addPlaneForm.elements["displayName"].value.trim();
  const registration = addPlaneForm.elements["registration"].value
    .trim()
    .toUpperCase();
  const type = addPlaneForm.elements["type"].value.trim();
  const competitionNumber =
    addPlaneForm.elements["competitionNumber"].value.trim();
  const category = addPlaneForm.elements["category"].value;
  const seats = parseInt(addPlaneForm.elements["seats"].value.trim(), 10);
  const note = addPlaneForm.elements["note"].value.trim();

  // Basic validation
  if (!displayName || !registration || !type || !category || !seats) {
    alert("Please fill out all required fields.");
    return;
  }

  try {
    const token = localStorage.getItem("jwtToken");
    if (!token) {
      alert("You must be logged in to add a plane.");
      window.location.href = "/login";
      return;
    }

    // Load existing planes to prevent duplicates (ignore deleted)
    const meRes = await fetch("https://n8n.e57.dk/webhook/pilot-dashboard/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (meRes.ok) {
      const [meData] = await meRes.json();
      const existing = Array.isArray(meData.planes) ? meData.planes : [];
      const dupe = existing
        .filter((p) => p.status !== "deleted")
        .some(
          (p) => (p.registration || "").toUpperCase() === registration
        );
      if (dupe) {
        alert("You already have a plane with that registration.");
        return;
      }
    }

    const response = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/add-plane",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          displayName,
          registration,
          type,
          competitionNumber: competitionNumber || null, // Optional field
          category,
          seats,
          note: note || null, // Optional field
        }),
      }
    );

    const text = await response.text();
    const result = text ? JSON.parse(text) : {};

    if (!response.ok || result.success === false) {
      const message = result.message || "Failed to add plane.";
      alert(message);
      return;
    }

    window.location.href = "/planes";
  } catch (err) {
    console.error(err);
    alert("Failed to add plane. Please try again later.");
  }
});
