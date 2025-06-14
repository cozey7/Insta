async function scrapeList(label) {
  return new Promise(async (resolve) => {
    try {
      localStorage.setItem("ig_scraping_status", `Starting to scrape ${label}...`);
      
      // Wait for all elements to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try different selector patterns that Instagram uses
      const selectors = [
        `a[href$="/${label}/"] span span`, // Original selector
        `a[href$="/${label}"] span`, // Simplified selector
        `section main div a[href$="/${label}"]`, // Full path selector
        `a[href*="/${label}"]`, // Partial match selector
        `text/${label}`, // Text content selector
      ];
      
      let button = null;
      for (const selector of selectors) {
        if (selector.startsWith('text/')) {
          // Use XPath for text content search
          const xpath = `//*[text()="${selector.split('/')[1]}"]`;
          const elements = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          if (elements.snapshotLength > 0) {
            button = elements.snapshotItem(0);
            break;
          }
        } else {
          // Use regular CSS selector
          button = document.querySelector(selector);
          if (button) break;
        }
      }

      if (!button) {
        // Try finding by numbers next to followers/following
        const elements = Array.from(document.querySelectorAll('span'));
        button = elements.find(el => {
          const next = el.nextElementSibling;
          return next && next.textContent.toLowerCase().includes(label.toLowerCase());
        });
      }

      if (!button) {
        console.error(`Could not find ${label} button`);
        localStorage.setItem("ig_scraping_status", `Error: Could not find ${label} button`);
        return resolve([]);
      }

      // Click the button
      button.click();

      // Wait for the modal to open
      const modalSelector = `div[role="dialog"]`;
      await waitFor(() => document.querySelector(modalSelector));
      
      // Get the scroll container - try multiple possible selectors
      let scrollContainer = null;
      const scrollSelectors = [
        `${modalSelector} div > div > div`,
        `${modalSelector} div[style*="overflow"]`,
        `${modalSelector} div[style*="auto"]`,
        `${modalSelector} ul`
      ];

      for (const selector of scrollSelectors) {
        scrollContainer = document.querySelector(selector);
        if (scrollContainer) break;
      }

      if (!scrollContainer) {
        console.error('Could not find scroll container');
        localStorage.setItem("ig_scraping_status", "Error: Could not find scroll container");
        return resolve([]);
      }

      let userSet = new Set();
      let lastHeight = 0;
      let unchangedCount = 0;
      let lastCount = 0;
      
      const checkInterval = setInterval(async () => {
        // Get all user items - try multiple selectors
        const userSelectors = [
          `${modalSelector} a[role="link"]`,
          `${modalSelector} span[title]`,
          `${modalSelector} div[style*="flex"] a`,
          `${modalSelector} ul li a`
        ];

        let userItems = [];
        for (const selector of userSelectors) {
          userItems = document.querySelectorAll(selector);
          if (userItems.length > 0) break;
        }
        
        // Extract usernames and add to set
        userItems.forEach(item => {
          const username = item.textContent?.trim();
          if (username) userSet.add(username);
        });

        // Update progress if we found new users
        if (userSet.size !== lastCount) {
          localStorage.setItem("ig_scraping_status", `Scraped ${userSet.size} ${label}...`);
          lastCount = userSet.size;
        }

        // Scroll to bottom
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        
        const currentHeight = scrollContainer.scrollHeight;
        
        // Check if we've reached the bottom
        if (currentHeight === lastHeight) {
          unchangedCount++;
          if (unchangedCount >= 3) {
            clearInterval(checkInterval);
            // Close the modal - try multiple close button selectors
            const closeSelectors = [
              `${modalSelector} button`,
              `${modalSelector} svg[aria-label*="Close"]`,
              `${modalSelector} button[type="button"]`
            ];
            
            let closeButton;
            for (const selector of closeSelectors) {
              closeButton = document.querySelector(selector);
              if (closeButton) break;
            }
            
            if (closeButton) closeButton.click();
            console.log(`Scraped ${userSet.size} ${label}`);
            localStorage.setItem("ig_scraping_status", `Completed scraping ${userSet.size} ${label}`);
            resolve(Array.from(userSet));
          }
        } else {
          unchangedCount = 0;
          lastHeight = currentHeight;
        }
      }, 1500);
    } catch (error) {
      console.error(`Error scraping ${label}:`, error);
      localStorage.setItem("ig_scraping_status", `Error: ${error.message}`);
      resolve([]);
    }
  });
}

function waitFor(checkFn, timeout = 10000, interval = 100) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (checkFn()) return resolve();
      if (Date.now() - start > timeout) return reject("Timeout");
      setTimeout(check, interval);
    };
    check();
  });
}

window.addEventListener("load", async () => {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (pathParts.length !== 1) return; // only run on profile pages

  console.log("IG Extension: scraping followers and following...");
  
  try {
    // Clear previous data
    localStorage.removeItem("ig_followers");
    localStorage.removeItem("ig_following");
    localStorage.setItem("ig_scraping_status", "Starting...");

    // Wait for the page to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 2000));

    const followers = await scrapeList("followers");
    if (followers.length > 0) {
      localStorage.setItem("ig_followers", JSON.stringify(followers));
      console.log(`Fetched ${followers.length} followers`);
    }

    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    const following = await scrapeList("following");
    if (following.length > 0) {
      localStorage.setItem("ig_following", JSON.stringify(following));
      console.log(`Fetched ${following.length} following`);
    }

    localStorage.setItem("ig_scraping_status", "Complete");
  } catch (error) {
    console.error("Error during scraping:", error);
    localStorage.setItem("ig_scraping_status", `Error: ${error.message}`);
  }
});
