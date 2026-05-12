const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });

  const page = await browser.newPage();

  await page.goto(
    "https://www.linkedin.com/login",
    {
      waitUntil: "networkidle2"
    }
  );

  console.log(
    "✅ Login manually in browser"
  );

  console.log(
    "👉 After login press ENTER here in terminal"
  );

  process.stdin.once(
    "data",
    async () => {

      const cookies =
        await page.cookies();

      fs.writeFileSync(
        "cookies.json",
        JSON.stringify(
          cookies,
          null,
          2
        )
      );

      console.log(
        "🎉 cookies.json saved successfully"
      );

      await browser.close();

      process.exit();

    }
  );

})();
