const puppeteer = require("puppeteer-core");
const createCsvWriter =
  require("csv-writer").createObjectCsvWriter;

const sleep = (ms) =>
  new Promise(resolve => setTimeout(resolve, ms));

async function scrapeLinkedIn() {

  console.log("🚀 Launching Chromium...");

  const browser = await puppeteer.launch({
  headless: "new",
  executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome-stable",
  userDataDir: "./linkedin-session",
  defaultViewport: null,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu"
  ]
});

  const page = await browser.newPage();

  // =========================
  // 🔥 DEBUG 1: BASIC CHECKS
  // =========================
  console.log("📡 Opening LinkedIn...");

  await page.goto("https://www.linkedin.com", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  console.log("🔎 Current URL:", page.url());

  await page.screenshot({
    path: "debug-home.png",
    fullPage: true
  });

  // =========================
  // 🔍 SEARCH QUERY (IMPROVED)
  // =========================
  const keyword =
    "final year student OR 2025 graduate OR BTech final year OR software intern";

  const searchUrl =
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}`;

  console.log("🔎 Opening search page...");

  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  console.log("📍 Search URL:", page.url());

  await page.screenshot({
    path: "debug-search.png",
    fullPage: true
  });

  await sleep(8000);

  // =========================
  // 🔥 DEBUG 2: PAGE STATE
  // =========================
  const pageText = await page.evaluate(() =>
    document.body.innerText
  );

  console.log("📄 PAGE SNAPSHOT (first 500 chars):");
  console.log(pageText.slice(0, 500));

  if (page.url().includes("login")) {
    console.log("❌ YOU ARE NOT LOGGED IN TO LINKEDIN");
    await browser.close();
    return [];
  }

  // =========================
  // 🔥 EXTRA SCROLLING (important)
  // =========================
  console.log("⬇ Scrolling page...");

  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  await sleep(5000);

  // =========================
  // 🔥 PROFILE EXTRACTION (SAFE)
  // =========================
  console.log("🧲 Extracting profiles...");

  const profiles = await page.evaluate(() => {

    const keywords = [
  "2025",
  "software engineer",
  "student",
  "final year",
  "graduate",
  "b.tech"
];

    const match = (text) =>
      keywords.some(k =>
        text.toLowerCase().includes(k.toLowerCase())
      );

    const anchors = Array.from(
      document.querySelectorAll("a")
    );

    const seen = new Set();
    const results = [];

    for (const a of anchors) {

      const href = a.href || "";
      const text = (a.innerText || "").trim();

      if (!href.includes("/in/")) continue;
      if (!text || !match(text)) continue;

      if (seen.has(href)) continue;

      seen.add(href);

      results.push({
        name: text.split("\n")[0],
        profileUrl: href
      });
    }

    return results;
  });

  console.log(`✅ Found profiles: ${profiles.length}`);

  // =========================
  // 🔥 DEBUG OUTPUT
  // =========================
  console.log("📦 SAMPLE DATA:");
  console.log(profiles.slice(0, 5));

  const finalResults = [];

  // =========================
  // PROFILE SCRAPING
  // =========================
  for (const profile of profiles.slice(0, 10)) {

    try {

      console.log(`➡ Scraping: ${profile.name}`);

      const profilePage = await browser.newPage();

      await profilePage.goto(profile.profileUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

    //   await sleep(5000);
    await new Promise(r => setTimeout(r, 1500));

      // Contact info click
      const clicked = await profilePage.evaluate(() => {

        const els = Array.from(
          document.querySelectorAll("a, button")
        );

        const btn = els.find(el =>
          el.innerText?.includes("Contact info")
        );

        if (btn) {
          btn.click();
          return true;
        }

        return false;
      });

      if (clicked) {
        console.log("📞 Contact info opened");
        // await sleep(3000);
        await new Promise(r => setTimeout(r, 1500));
      }

      const contactData = await profilePage.evaluate(() => {

        const text = document.body.innerText;

        const email = text.match(
          /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
        );

        const phone = text.match(
          /(\+91[\s-]?)?[6-9]\d{9}/g
        );

        return {
          email: email ? email[0] : "Not Available",
          phone: phone ? phone[0] : "Not Available",
        };
      });

      finalResults.push({
        name: profile.name,
        profileUrl: profile.profileUrl,
        email: contactData.email,
        phone: contactData.phone,
      });

      console.log("📊 Result:", contactData);

      await profilePage.close();

      await sleep(3000);

    } catch (err) {
      console.log(`❌ Failed: ${profile.name}`, err.message);
    }
  }

  // =========================
  // SAVE CSV
  // =========================
  const csvWriter = createCsvWriter({
    path: "linkedin_contacts.csv",
    header: [
      { id: "name", title: "NAME" },
      { id: "profileUrl", title: "PROFILE_URL" },
      { id: "email", title: "EMAIL" },
      { id: "phone", title: "PHONE" },
    ],
  });

  await csvWriter.writeRecords(finalResults);

  console.log("🎉 CSV saved successfully");

  await browser.close();

  return finalResults;
}

module.exports = scrapeLinkedIn;