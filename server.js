const express = require("express");
const cors = require("cors");

const scrapeLinkedIn =
  require("./scraper");

const app = express();

app.use(cors());

app.get("/scrape", async (req, res) => {

  try {

    const data =
      await scrapeLinkedIn();

    res.json(data);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Scraping failed",
    });

  }

});

app.listen(5000, () => {

  console.log(
    "Server running on port 5000"
  );

});