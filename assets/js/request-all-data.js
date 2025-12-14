// Redirect to login if no token
if (!getAccessToken()) {
  redirectToLogin();
}

const requestBtn = document.getElementById("requestDataButton");
requestBtn?.addEventListener("click", async () => {
  requestBtn.disabled = true;
  try {
    const resp = await authFetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/request-all-data",
      {
        method: "POST",
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
