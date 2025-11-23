const express = require("express");
const { Pool } = require("pg");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Set EJS
app.set("view engine", "ejs");

// // Configure Postgres pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:Meaghan1@localhost:5432/t4t_donations',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function createTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS donations (
      id SERIAL PRIMARY KEY,
      donor TEXT,
      date DATE,
      Boy02 INT DEFAULT 0,
      Girl02 INT DEFAULT 0,
      Boy35 INT DEFAULT 0,
      Girl35 INT DEFAULT 0,
      Boy68 INT DEFAULT 0,
      Girl68 INT DEFAULT 0,
      Boy911 INT DEFAULT 0,
      Girl911 INT DEFAULT 0,
      Boy1214 INT DEFAULT 0,
      Girl1214 INT DEFAULT 0,
      Book INT DEFAULT 0,
      Stuffie INT DEFAULT 0,
      Bike INT DEFAULT 0,
      inventory_person TEXT,
      comments TEXT
    );
  `;
  await pool.query(sql);
}

// Call it once at startup
createTable().catch(err => console.error('Error creating table:', err));

// ------------------ ROUTES ------------------ //

// GET home page
app.get("/", (req, res) => {
  res.render("index");
});

// GET instructions
app.get("/instructions", (req, res) => {
  res.render("instructions");
});


app.get("/reports", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM donations");
    const donations = result.rows; // rows from Postgres

    res.render("reports", { donations });
  } catch (err) {
    console.error("Error querying donations:", err);  // <--- log full error
    res.send("Error loading donations. Check server logs.");
  }
});


app.post("/submit", async (req, res) => {
  const newDonation = req.body;

  // Map front-end fields to database columns
  const values = [
    newDonation.donor,
    newDonation.date,
    newDonation.boy02,
    newDonation.girl02,
    newDonation.boy35,
    newDonation.girl35,
    newDonation.boy68,
    newDonation.girl68,
    newDonation.boy911,
    newDonation.girl911,
    newDonation.boy1214,
    newDonation.girl1214,
    newDonation.book,
    newDonation.stuffie,
    newDonation.bike
  ];

  const insertQuery = `
    INSERT INTO donations
      (donor, date, boy02, girl02, boy35, girl35, boy68, girl68,
       boy911, girl911, boy1214, girl1214, book, stuffie, bike)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING *;
  `;

  try {
    const result = await pool.query(insertQuery, values);
    console.log("Inserted Donation:", result.rows[0]);
    res.send("Donation received!");
  } catch (err) {
    console.error("Error inserting donation:", err);
    res.status(500).send("Error inserting donation");
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));