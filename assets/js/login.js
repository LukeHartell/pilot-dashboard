document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  try {
    const response = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/log-in",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      // Login success!

      // Save JWT token to localStorage
      localStorage.setItem("jwtToken", data.token);

      //   alert("Login successful!");
      window.location.href = "/index"; // Go to main dashboard
    } else {
      // Login failed
      alert(data.message || "Login failed. Please try again.");
    }
  } catch (err) {
    console.error(err);
    alert("Login error. Please try again later.");
  }
});
