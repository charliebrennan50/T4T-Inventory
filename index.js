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
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL || 'postgres://postgres:Meaghan1@localhost:5432/t4t_donations'
// });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }  // required on Render
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

// GET reports
app.get("/reports", async (req, res) => {
  try {
    // Get all donations from the database, newest first
    const result = await pool.query("SELECT * FROM donations ORDER BY created_at DESC");

    // Map database fields to template keys (so EJS loop works)
    const donations = result.rows.map(d => ({
      donor: d.donor,
      B02Count: d.boy_02,
      G02Count: d.girl_02,
      B35Count: d.boy_35,
      G35Count: d.girl_35,
      B68Count: d.boy_68,
      G68Count: d.girl_68,
      B911Count: d.boy_911,
      G911Count: d.girl_911,
      B1214Count: d.boy_1214,
      G1214Count: d.girl_1214,
      BookCount: d.book,
      StuffieCount: d.stuffie,
      BikeCount: d.bike,
      inventory_by: d.inventory_by,
      comments: d.comments
    }));

    res.render("reports", { donations });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading donations");
  }
});

// app.get("/reports", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM donations");
//     const donations = result.rows; // rows from Postgres

//     res.render("reports", { donations });
//   } catch (err) {
//     console.error("Error querying donations:", err);  // <--- log full error
//     res.send("Error loading donations. Check server logs.");
//   }
// });

// POST donation
app.post("/submit", async (req, res) => {
  const newDonation = req.body;
  console.log("Received donation:", newDonation);  // <--- log incoming data

  try {
const query = `
  INSERT INTO donations 
  (donor, date, boy02, girl02, boy35, girl35, boy68, girl68,
   boy911, girl911, boy1214, girl1214, book, stuffie, bike)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
  RETURNING *;
`;

    const values = [
      newDonation.donor,
      newDonation.date,
      newDonation.Boy02,
      newDonation.Girl02,
      newDonation.Boy35,
      newDonation.Girl35,
      newDonation.Boy68,
      newDonation.Girl68,
      newDonation.Boy911,
      newDonation.Girl911,
      newDonation.Boy1214,
      newDonation.Girl1214,
      newDonation.Book,
      newDonation.Stuffie,
      newDonation.Bike
    ];

    const result = await pool.query(query, values);
    console.log("Inserted donation:", result.rows[0]);  // <--- see what actually went into DB

    res.send("Donation received!");
  } catch (err) {
    console.error("Error inserting donation:", err);
    res.status(500).send("Error saving donation. Check server logs.");
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));