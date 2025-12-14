const loginForm = document.getElementById("loginForm");
const loginSpinner = document.getElementById("loginLoading");
const loginButton = loginForm?.querySelector("button[type='submit']");
const defaultLoginText = loginButton?.textContent?.trim() || "Log In";

const setLoginLoading = (isLoading) => {
  loginSpinner?.classList.toggle("active", isLoading);

  if (loginButton) {
    loginButton.disabled = isLoading;
    loginButton.textContent = isLoading ? "Logging in..." : defaultLoginText;
  }
};

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  setLoginLoading(true);

  try {
    const response = await fetch(
      "https://n8n.e57.dk/webhook/pilot-dashboard/v2/log-in",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.success && data.token) {
      // Login success!

      // Save JWT token to localStorage
      setAccessToken(data.token);

      //   alert("Login successful!");
      window.location.href = "/index"; // Go to main dashboard
    } else {
      // Login failed
      alert(data.message || "Login failed. Please try again.");
    }
  } catch (err) {
    console.error(err);
    alert("Login error. Please try again later.");
  } finally {
    setLoginLoading(false);
  }
});
