// const puppeteer = require("puppeteer");

// const createCsvWriter =
//   require("csv-writer").createObjectCsvWriter;

// async function scrapeLinkedIn() {

//   console.log("Connecting to Chromium...");

//   // Connect to existing Chromium browser
//   const browser = await puppeteer.connect({
//     browserURL: "http://127.0.0.1:9222",
//     defaultViewport: null,
//   });

//   // Get tabs
//   const pages = await browser.pages();

//   // Use first tab
//   const page = pages[0];

//   console.log("Connected successfully");

//   // LinkedIn search URL
//   const searchUrl =
//     "https://www.linkedin.com/search/results/people/?keywords=2025%20software%20engineer%20student";

//   console.log("Opening search page...");

//   // Open search page
//   await page.goto(searchUrl, {
//     waitUntil: "domcontentloaded",
//     timeout: 0,
//   });

//   console.log("Search page opened");

//   // Wait for profiles
//   await new Promise(resolve => setTimeout(resolve, 15000));

//   // Scroll page
//   console.log("Scrolling page...");

//   await page.evaluate(() => {
//     window.scrollTo(0, document.body.scrollHeight);
//   });

//   // Wait again
//   await new Promise(resolve => setTimeout(resolve, 5000));

//   console.log("Extracting profiles...");

//   // Wait for profile links
//   await page.waitForSelector("a[href*='/in/']", {
//     timeout: 30000,
//   });

//   console.log("Profiles detected");

//   // Extract profiles
//   const profiles = await page.$$eval(
//     "a[href*='/in/']",
//     (links) => {

//       const uniqueProfiles = [];

//       const seen = new Set();

//       links.forEach((link) => {

//         let name = link.innerText?.trim() || "";

//         const profileUrl = link.href || "";

//         // Clean name
//         name = name.split("\n")[0].trim();

//         // Ignore invalid profiles
//         if (
//           !name ||
//           name.length < 3 ||
//           seen.has(profileUrl)
//         ) {
//           return;
//         }

//         // Save unique profile
//         seen.add(profileUrl);

//         uniqueProfiles.push({
//           name,
//           profileUrl,
//         });

//       });

//       return uniqueProfiles;

//     }
//   );

//   console.log("Profiles found:", profiles.length);

//   console.log(profiles);

//   // Save CSV
//   const csvWriter = createCsvWriter({
//     path: "linkedin_profiles.csv",
//     header: [
//       { id: "name", title: "NAME" },
//       { id: "profileUrl", title: "PROFILE_URL" },
//     ],
//   });

//   await csvWriter.writeRecords(profiles);

//   console.log("CSV file saved");

//   // Disconnect browser
//   await browser.disconnect();

//   return profiles;

// }

// module.exports = scrapeLinkedIn;



const puppeteer = require("puppeteer");
const createCsvWriter =
  require("csv-writer").createObjectCsvWriter;

async function scrapeLinkedIn() {

  console.log("Connecting to Chromium...");

  // Connect to existing Chromium session
  const browser = await puppeteer.connect({
    browserURL: "http://127.0.0.1:9222",
    defaultViewport: null,
    timeout: 60000,
  });

  // Get browser pages
  const pages = await browser.pages();

  // Use first tab
  const page = pages[0];

  console.log("Connected successfully");

  // Search keyword
  const keyword = "2025 software engineer student";

  // LinkedIn search URL
  const searchUrl =
    `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keyword)}`;

  console.log("Opening LinkedIn search page...");

  // Open LinkedIn search
  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: 0,
  });

  // Wait for results
  await new Promise(resolve =>
    setTimeout(resolve, 10000)
  );

  // Scroll page
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  // Wait again
  await new Promise(resolve =>
    setTimeout(resolve, 5000)
  );

  console.log("Collecting profile links...");

  // Wait for profile links
  await page.waitForSelector("a[href*='/in/']", {
    timeout: 30000,
  });

  // Extract unique profiles
  const profiles = await page.$$eval(
    "a[href*='/in/']",
    (links) => {

      const data = [];
      const seen = new Set();

      links.forEach((link) => {

        let name =
          link.innerText?.trim() || "";

        const profileUrl =
          link.href || "";

        // Clean name
        name =
          name.split("\n")[0].trim();

        // Ignore duplicates
        if (
          !name ||
          seen.has(profileUrl)
        ) {
          return;
        }

        seen.add(profileUrl);

        data.push({
          name,
          profileUrl,
        });

      });

      return data;

    }
  );

  console.log(
    `Found ${profiles.length} profiles`
  );

  // Final results
  const finalResults = [];

  // Open each profile
  for (const profile of profiles.slice(0, 10)) {

    try {

      console.log(
        `Opening profile: ${profile.name}`
      );

      // Open profile page
      await page.goto(profile.profileUrl, {
        waitUntil: "domcontentloaded",
        timeout: 0,
      });

      // Wait
      await new Promise(resolve =>
        setTimeout(resolve, 5000)
      );

      // Click Contact Info button
      const buttons = await page.$$("a");

      for (const button of buttons) {

        const text =
          await page.evaluate(
            el => el.innerText,
            button
          );

        if (
          text &&
          text.includes("Contact info")
        ) {

          await button.click();

          console.log(
            "Contact info opened"
          );

          break;
        }

      }

      // Wait for popup
      await new Promise(resolve =>
        setTimeout(resolve, 3000)
      );

      // Extract contact details
      const contactData =
        await page.evaluate(() => {

          const text =
            document.body.innerText;

          // Email regex
          const emailMatch =
            text.match(
              /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
            );

          // Phone regex
          const phoneMatch =
            text.match(
              /(\+91[\s-]?)?[6-9]\d{9}/g
            );

          return {
            email:
              emailMatch
                ? emailMatch[0]
                : "Not Available",

            phone:
              phoneMatch
                ? phoneMatch[0]
                : "Not Available",
          };

        });

      // Save final data
      finalResults.push({

        name: profile.name,

        profileUrl:
          profile.profileUrl,

        email:
          contactData.email,

        phone:
          contactData.phone,

      });

      console.log({
        name: profile.name,
        email: contactData.email,
        phone: contactData.phone,
      });

      // Delay between profiles
      await new Promise(resolve =>
        setTimeout(resolve, 5000)
      );

    } catch (error) {

      console.log(
        `Error scraping ${profile.name}`
      );

    }

  }

  // Save CSV
  const csvWriter = createCsvWriter({

    path: "linkedin_contacts.csv",

    header: [

      {
        id: "name",
        title: "NAME"
      },

      {
        id: "profileUrl",
        title: "PROFILE_URL"
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
    "CSV file saved successfully"
  );

  return finalResults;

}

module.exports = scrapeLinkedIn;