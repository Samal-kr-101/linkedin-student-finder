const puppeteer = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const fs = require("fs");

const createCsvWriter =
  require("csv-writer").createObjectCsvWriter;

const sleep = (ms) =>
  new Promise(resolve => setTimeout(resolve, ms));

// =========================
// LAUNCH CHROMIUM
// =========================
async function launchBrowser() {

  console.log("🚀 Launching Chromium safely...");

  const browser = await puppeteer.launch({

    args: [

      ...chromium.args,

      "--no-sandbox",

      "--disable-setuid-sandbox",

      "--disable-dev-shm-usage",

      "--disable-gpu",

      "--single-process",

      "--no-zygote",

    ],

    defaultViewport:
      chromium.defaultViewport,

    executablePath:
      await chromium.executablePath(),

    headless: chromium.headless,

    timeout: 120000,

  });

  console.log("✅ Chromium started");

  return browser;
}

async function scrapeLinkedIn() {

  // =========================
  // START BROWSER
  // =========================
  const browser =
    await launchBrowser();

  const page =
    await browser.newPage();

  // =========================
  // BLOCK HEAVY FILES
  // =========================
  await page.setRequestInterception(true);

  page.on("request", (req) => {

    const blocked = [
      "image",
      "font",
      "stylesheet",
      "media"
    ];

    if (
      blocked.includes(
        req.resourceType()
      )
    ) {
      req.abort();
    } else {
      req.continue();
    }

  });

  // =========================
  // USER AGENT
  // =========================
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
  );

  // =========================
  // LOAD COOKIES
  // =========================
  console.log("🍪 Loading cookies...");

  if (
    fs.existsSync("cookies.json")
  ) {

    const cookies = JSON.parse(
      fs.readFileSync(
        "cookies.json"
      )
    );

    await page.setCookie(
      ...cookies
    );

    console.log(
      "✅ Cookies loaded"
    );

  } else {

    console.log(
      "❌ cookies.json not found"
    );

  }

  // =========================
  // OPEN LINKEDIN
  // =========================
  console.log("📡 Opening LinkedIn...");

  await page.goto(
    "https://www.linkedin.com",
    {
      waitUntil:
        "domcontentloaded",
      timeout: 60000,
    }
  );

  console.log(
    "🔎 Current URL:",
    page.url()
  );

  // =========================
  // SEARCH QUERY
  // =========================
  const keyword =
    "2025 software engineer student";

  const searchUrl =
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}`;

  console.log(
    "🔎 Opening search page..."
  );

  await page.goto(searchUrl, {
    waitUntil:
      "domcontentloaded",
    timeout: 60000,
  });

  console.log(
    "📍 Search URL:",
    page.url()
  );

  // =========================
  // LOGIN CHECK
  // =========================
  if (
    page.url().includes("login")
  ) {

    console.log(
      "❌ LinkedIn login required"
    );

    await browser.close();

    return [];

  }

  // =========================
  // WAIT
  // =========================
  await sleep(8000);

  // =========================
  // SCROLL
  // =========================
  console.log("⬇ Scrolling...");

  await page.evaluate(() => {
    window.scrollTo(
      0,
      document.body.scrollHeight
    );
  });

  await sleep(4000);

  // =========================
  // EXTRACT PROFILES
  // =========================
  console.log(
    "🧲 Extracting profiles..."
  );

  const profiles =
    await page.evaluate(() => {

      const anchors =
        Array.from(
          document.querySelectorAll("a")
        );

      const keywords = [
        "2025",
        "student",
        "graduate",
        "final year",
        "software engineer",
        "b.tech"
      ];

      const seen = new Set();

      const results = [];

      for (const a of anchors) {

        const href =
          a.href || "";

        const text =
          (
            a.innerText || ""
          ).trim();

        if (
          !href.includes("/in/")
        ) continue;

        const match =
          keywords.some(k =>
            text
              .toLowerCase()
              .includes(
                k.toLowerCase()
              )
          );

        if (!match) continue;

        if (seen.has(href))
          continue;

        seen.add(href);

        results.push({

          name:
            text
              .split("\n")[0]
              .trim(),

          profileUrl: href,

        });

      }

      return results;

    });

  console.log(
    `✅ Found ${profiles.length} profiles`
  );

  console.log(
    profiles.slice(0, 5)
  );

  const finalResults = [];

  // =========================
  // SCRAPE PROFILES
  // =========================
  for (
    const profile of
    profiles.slice(0, 10)
  ) {

    try {

      console.log(
        `➡ Scraping: ${profile.name}`
      );

      await page.goto(
        profile.profileUrl,
        {
          waitUntil:
            "domcontentloaded",
          timeout: 60000,
        }
      );

      await sleep(
        2000 +
        Math.random() * 2000
      );

      // =========================
      // CONTACT INFO
      // =========================
      const clicked =
        await page.evaluate(() => {

          const els =
            Array.from(
              document.querySelectorAll(
                "a, button"
              )
            );

          const btn =
            els.find(el =>
              el.innerText?.includes(
                "Contact info"
              )
            );

          if (btn) {

            btn.click();

            return true;

          }

          return false;

        });

      if (clicked) {

        console.log(
          "📞 Contact info opened"
        );

        await sleep(2000);

      }

      // =========================
      // EXTRACT CONTACTS
      // =========================
      const contactData =
        await page.evaluate(() => {

          const text =
            document.body.innerText;

          const email =
            text.match(
              /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
            );

          const phone =
            text.match(
              /(\+91[\s-]?)?[6-9]\d{9}/g
            );

          return {

            email:
              email
                ? email[0]
                : "Not Available",

            phone:
              phone
                ? phone[0]
                : "Not Available",

          };

        });

      finalResults.push({

        name:
          profile.name,

        profileUrl:
          profile.profileUrl,

        email:
          contactData.email,

        phone:
          contactData.phone,

      });

      console.log(
        "📊 Result:",
        contactData
      );

      await sleep(2000);

    } catch (err) {

      console.log(
        `❌ Failed: ${profile.name}`,
        err.message
      );

    }

  }

  // =========================
  // SAVE CSV
  // =========================
  const csvWriter =
    createCsvWriter({

      path:
        "linkedin_contacts.csv",

      header: [

        {
          id: "name",
          title: "NAME"
        },

        {
          id: "profileUrl",
          title:
            "PROFILE_URL"
        },

        {
          id: "email",
          title: "EMAIL"
        },

        {
          id: "phone",
          title: "PHONE"
        },

      ],

    });

  await csvWriter.writeRecords(
    finalResults
  );

  console.log(
    "🎉 CSV saved successfully"
  );

  await browser.close();

  return finalResults;
}

module.exports =
  scrapeLinkedIn;