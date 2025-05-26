// Redirect to login if no token
const token = localStorage.getItem("jwtToken");
if (!token) {
  window.location.href = "/login";
}

const requestBtn = document.getElementById("requestDataButton");
requestBtn?.addEventListener("click", async () => {
  if (!token) return;
  requestBtn.disabled = true;
  try {
    const resp = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/request-all-data",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );

    const data = await resp.json();
    if (resp.ok && data.success) {
      alert("Your report is being generated and will be emailed to you shortly.");
    } else {
      alert(data.message || "Failed to request your data. Please try again later.");
    }
  } catch (err) {
    console.error(err);
    alert("An error occurred. Please try again later.");
  } finally {
    requestBtn.disabled = false;
  }
});
