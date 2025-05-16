const GITHUB_API =
  "https://api.github.com/repos/LukeHartell/pilot-dashboard/commits/main";

fetch(GITHUB_API)
  .then((r) => r.json())
  .then((data) => {
    const dateObj = new Date(data.commit.author.date);
    // Date in local time
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString();
    // For 'Last updated'
    document.getElementById("lastUpdated").textContent = `${dateStr}`;
    // For commit info
    document.getElementById("commitSha").textContent = data.sha.slice(0, 7);
    document.getElementById(
      "commitDate"
    ).textContent = `${dateStr}, ${timeStr}`;
  })
  .catch(() => {
    document.getElementById("commitInfo").textContent =
      "Latest commit: unavailable";
    document.getElementById("lastUpdated").textContent = "unknown";
  });
