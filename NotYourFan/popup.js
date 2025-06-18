document.getElementById("run").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes("instagram.com")) {
    document.getElementById("status").textContent = "Please navigate to Instagram first";
    return;
  }

  // Start progress monitoring
  const progressBar = document.getElementById("progressBar");
  progressBar.style.display = "block";
  progressBar.querySelector(".fill").style.width = "0%";

  // Clear previous interval if exists
  if (checkStatusInterval) {
    clearInterval(checkStatusInterval);
  }

  // Check scraping status every second
  checkStatusInterval = setInterval(async () => {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => localStorage.getItem("ig_scraping_status")
    });

    if (result) {
      updateUI(result);

      if (result === "Complete" || result.startsWith("Error:")) {
        clearInterval(checkStatusInterval);
        showResults(tab.id);
      }
    }
  }, 1000);

  // Trigger the scraping
  await chrome.tabs.sendMessage(tab.id, { action: "startScraping" });
});

let checkStatusInterval;

function updateUI(status) {
  const statusElem = document.getElementById("status");
  const progressBar = document.getElementById("progressBar");
  const runButton = document.getElementById("run");
  const results = document.getElementById("results");

  statusElem.textContent = status;

  if (status.startsWith("Error:")) {
    progressBar.style.display = "none";
    runButton.disabled = false;
    results.classList.add("hidden");
    return;
  }

  if (status === "Complete") {
    progressBar.style.display = "none";
    runButton.disabled = false;
    return;
  }

  // Show progress bar for active scraping
  if (status.includes("Scraped") || status.includes("Starting")) {
    progressBar.style.display = "block";
    runButton.disabled = true;
    results.classList.add("hidden");

    // Animate progress bar
    const fill = progressBar.querySelector(".fill");
    if (status.includes("following")) {
      fill.style.width = "75%";
    } else if (status.includes("followers")) {
      fill.style.width = "25%";
    }
  }
}

async function showResults(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const followers = JSON.parse(localStorage.getItem("ig_followers") || "[]");
      const following = JSON.parse(localStorage.getItem("ig_following") || "[]");

      const notFollowingBack = following.filter(x => !followers.includes(x));
      const youDontFollowBack = followers.filter(x => !following.includes(x));

      return {
        notFollowingBack,
        youDontFollowBack,
        totalFollowers: followers.length,
        totalFollowing: following.length
      };
    }
  });

  const resDiv = document.getElementById("results");
  resDiv.classList.remove("hidden");

  if (!result || (!result.totalFollowers && !result.totalFollowing)) {
    document.getElementById("status").textContent = "No data available. Try running the scraper again.";
    return;
  }

  resDiv.innerHTML = `
    <p><strong>Summary:</strong></p>
    <p>Total Followers: ${result.totalFollowers}</p>
    <p>Total Following: ${result.totalFollowing}</p>
    <p><strong>Not Following You Back (${result.notFollowingBack.length}):</strong></p>
    <ul>${result.notFollowingBack.map(x => `<li>${x}</li>`).join("")}</ul>
    <p><strong>You Don't Follow Back (${result.youDontFollowBack.length}):</strong></p>
    <ul>${result.youDontFollowBack.map(x => `<li>${x}</li>`).join("")}</ul>
  `;
}
