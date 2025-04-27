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

    if (!response.ok) {
      throw new Error("Server returned an error");
    }

    // alert("Plane added successfully! Redirecting to profile...");
    window.location.href = "/user";
  } catch (err) {
    console.error(err);
    alert("Failed to add plane. Please try again later.");
  }
});
