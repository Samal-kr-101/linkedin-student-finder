const express = require("express");
const cors = require("cors");

const scrapeLinkedIn = require("./scraper");

const app = express();

app.use(cors());

// ✅ HOME ROUTE → redirect to /scrape
app.get("/", (req, res) => {
  res.redirect("/scrape");
});

// ✅ SCRAPE ROUTE
app.get("/scrape", async (req, res) => {
  try {
    const data = await scrapeLinkedIn();
    res.json(data);
  } catch (error) {
    console.log("❌ SCRAPING ERROR:", error); // VERY IMPORTANT

    res.status(500).json({
      message: "Scraping failed",
      error: error.message, // show real reason
    });
  }
});

// ⚠️ IMPORTANT for Render / hosting
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});