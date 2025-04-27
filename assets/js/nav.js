const navItems = document.querySelectorAll("#navbar li");
const pages = document.querySelectorAll(".page");
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");

// Page switching
navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navItems.forEach((i) => i.classList.remove("active"));
    pages.forEach((p) => p.classList.remove("active"));

    item.classList.add("active");
    document.getElementById(item.dataset.page).classList.add("active");

    // Close mobile menu
    mainNav.classList.remove("show");
  });
});

// Mobile nav toggle
navToggle?.addEventListener("click", () => {
  mainNav.classList.toggle("show");
});

// Default selection
navItems[0]?.classList.add("active");
