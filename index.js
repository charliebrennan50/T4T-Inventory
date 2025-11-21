// index.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // for JSON POSTs
app.use(express.static("public")); // optional if you have CSS/JS files

// Set EJS as the template engine
app.set("view engine", "ejs");

// GET route — serves the donation form
app.get("/", (req, res) => {
  res.render("index"); // renders index.ejs
});

app.get("/instructions", (req, res) => {
  res.render("instructions"); // renders index.ejs
});

app.get("/reports", (req, res) => {
  const dataFile = path.join(__dirname, "donations.json");

  // Read donations, or empty array if file doesn't exist
  const donations = fs.existsSync(dataFile)
    ? JSON.parse(fs.readFileSync(dataFile))
    : [];

  res.render("reports", { donations }); // pass to template
});

// POST route — handles form submission
app.post("/submit", (req, res) => {
  const newDonation = req.body;
  const dataFile = path.join(__dirname, "donations.json");

  // Read existing donations, or create empty array
  const donations = fs.existsSync(dataFile)
    ? JSON.parse(fs.readFileSync(dataFile))
    : [];

  // Add new donation
  donations.push(newDonation);

  // Save back to file
  fs.writeFileSync(dataFile, JSON.stringify(donations, null, 2));

  // Respond to client
  res.send("Donation received!");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
