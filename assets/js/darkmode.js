// Immediately apply dark mode on body if saved
if (localStorage.getItem("darkMode") === "enabled") {
  document.body.classList.add("dark-mode");
}

// Try to set up the dark mode toggle
function setupDarkModeButton() {
  const darkToggle = document.getElementById("toggleDarkMode");

  if (darkToggle) {
    const isDark = document.body.classList.contains("dark-mode");
    darkToggle.textContent = isDark ? "☀️" : "🌙";

    darkToggle.addEventListener("click", () => {
      document.body.classList.add("transition"); // ✅ Add transition class here

      document.body.classList.toggle("dark-mode");
      const darkNow = document.body.classList.contains("dark-mode");
      darkToggle.textContent = darkNow ? "☀️" : "🌙";
      localStorage.setItem("darkMode", darkNow ? "enabled" : "disabled");
    });

    clearInterval(intervalId); // ✅ Stop checking once we found the button
  }
}

// Check every 100ms until the button exists
const intervalId = setInterval(setupDarkModeButton, 100);
