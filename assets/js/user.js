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
