// Apply dark mode IMMEDIATELY
if (localStorage.getItem("darkMode") === "enabled") {
  document.body.classList.add("dark-mode");
}

document.addEventListener("DOMContentLoaded", function () {
  // Determine correct icon BEFORE injecting header
  const initialIcon =
    localStorage.getItem("darkMode") === "enabled" ? "☀️" : "🌙";

  const headerHTML = `
      <header>
        <div class="header-left">
          <h1>Pilot Dashboard (Beta)</h1>
        </div>
        <button id="navToggle" class="hamburger">☰</button>
        <nav id="mainNav">
          <ul id="navbar">
            <li data-page="preflight">Preflight</li>
            <li data-page="flight">Flight</li>
            <li data-page="logbook">Logbook</li>
            <li id="userNavItem" data-page="user">
              <a id="userMenuLink" href="/login">Login</a>
            </li>
          </ul>
          <button id="toggleDarkMode">${initialIcon}</button>
        </nav>
      </header>
    `;

  const wrapper = document.querySelector(".scaling-wrapper");
  if (wrapper) {
    wrapper.insertAdjacentHTML("afterbegin", headerHTML);

    // Hamburger menu toggle
    const navToggle = document.getElementById("navToggle");
    const mainNav = document.getElementById("mainNav");

    if (navToggle && mainNav) {
      navToggle.addEventListener("click", () => {
        mainNav.classList.toggle("show");
      });
    }

    // Navigation link clicks
    const navbarItems = document.querySelectorAll("#navbar li[data-page]");
    navbarItems.forEach((item) => {
      item.addEventListener("click", () => {
        const page = item.getAttribute("data-page");
        if (page) {
          window.location.href = "/" + page;
        }
      });
    });
  }
});
