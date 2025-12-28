const express = require("express");
const { Pool } = require("pg");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// EJS
app.set("view engine", "ejs");

// Postgres
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:Meaghan1@localhost:5432/t4t_donations",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Create table on startup
async function createTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS donations (
      id SERIAL PRIMARY KEY,
      donor TEXT,
      date DATE,
      boy02 INT DEFAULT 0,
      girl02 INT DEFAULT 0,
      boy35 INT DEFAULT 0,
      girl35 INT DEFAULT 0,
      boy68 INT DEFAULT 0,
      girl68 INT DEFAULT 0,
      boy911 INT DEFAULT 0,
      girl911 INT DEFAULT 0,
      boy1214 INT DEFAULT 0,
      girl1214 INT DEFAULT 0,
      book INT DEFAULT 0,
      stuffie INT DEFAULT 0,
      bike INT DEFAULT 0,
      stocking INT DEFAULT 0,
      inventory_person TEXT,
      comments TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await pool.query(sql);
}
// Only needed first time. Don't want it overwriting database.
// createTable().catch(err => console.error('Error creating table:', err));

// ------------------ ROUTES ------------------

app.get("/", (req, res) => {
  res.render("index", {
    success: !!req.query.success,
    error: !!req.query.error,
  });
});

app.get("/instructions", (req, res) => res.render("instructions"));

// server.js
app.get("/reports", (req, res) => {
  res.render("reports"); // Express looks in the views/ folder for reports.ejs
});

// Donor autocomplete endpoint
app.get("/donor-search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json([]);
  try {
    const result = await pool.query(
      `SELECT DISTINCT donor FROM donations WHERE donor ILIKE $1 ORDER BY donor LIMIT 10`,
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// Submit donation
app.post("/submit", async (req, res) => {
  const d = req.body;
  const values = [
    d.donor?.trim() || null,
    d.date || null,
    parseInt(d.boy02) || 0,
    parseInt(d.girl02) || 0,
    parseInt(d.boy35) || 0,
    parseInt(d.girl35) || 0,
    parseInt(d.boy68) || 0,
    parseInt(d.girl68) || 0,
    parseInt(d.boy911) || 0,
    parseInt(d.girl911) || 0,
    parseInt(d.boy1214) || 0,
    parseInt(d.girl1214) || 0,
    parseInt(d.book) || 0,
    parseInt(d.stuffie) || 0,
    parseInt(d.bike) || 0,
    parseInt(d.stocking) || 0,
    d.inventory_person?.trim() || null,
    d.comments?.trim() || null,
  ];

  const sql = `
    INSERT INTO donations 
    (donor, date, boy02, girl02, boy35, girl35, boy68, girl68,
     boy911, girl911, boy1214, girl1214, book, stuffie, bike, stocking,
     inventory_person, comments)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING id`;

  try {
    await pool.query(sql, values);
    res.redirect("/?success=1");
  } catch (err) {
    console.error("Insert error:", err);
    res.redirect("/?error=1");
  }
});

// Reports page
app.get("/table", async (req, res) => {
  try {
    const validSorts = {
      donor: "LOWER(donor) ASC",
      date: "date DESC, id DESC",
    };
    const sort = validSorts[req.query.sort] || validSorts.date;
    const result = await pool.query(`SELECT * FROM donations ORDER BY ${sort}`);
    const donations = result.rows;

    const totals = {
      boy02: 0,
      girl02: 0,
      boy35: 0,
      girl35: 0,
      boy68: 0,
      girl68: 0,
      boy911: 0,
      girl911: 0,
      boy1214: 0,
      girl1214: 0,
      book: 0,
      stuffie: 0,
      bike: 0,
      stocking: 0,
    };

    donations.forEach((d) => {
      for (const key in totals) totals[key] += parseInt(d[key] || 0);
    });
    totals.grand = Object.values(totals).reduce((a, b) => a + b, 0);

    res.render("table", {
      donations,
      totals,
      currentSort: req.query.sort || "date",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading reports");
  }
});

app.get("/api/reports/totals-by-date", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        date,

        SUM(boy02 + girl02)     AS age_0_2,
        SUM(boy35 + girl35)     AS age_3_5,
        SUM(boy68 + girl68)     AS age_6_8,
        SUM(boy911 + girl911)   AS age_9_11,
        SUM(boy1214 + girl1214) AS age_12_14,

        SUM(book)     AS books,
        SUM(stuffie)  AS stuffies,
        SUM(bike)     AS bikes,
        SUM(stocking) AS stockings,

        SUM(
          boy02 + girl02 +
          boy35 + girl35 +
          boy68 + girl68 +
          boy911 + girl911 +
          boy1214 + girl1214 +
          book + stuffie + bike + stocking
        ) AS total_items

      FROM donations
      GROUP BY date
      ORDER BY date;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Totals by date error:", err);
    res.status(500).json({ error: "Failed to load report" });
  }
});

app.get("/api/reports/totals-by-donor", async (req, res) => {
  try {
    const result = await pool.query(`
SELECT
  donor,
  COUNT(*) AS num_donations,
  SUM(boy02 + girl02 + boy35 + girl35 + boy68 + girl68 + boy911 + girl911 + boy1214 + girl1214 + bike + stuffie) AS total_toys,
  SUM(book) AS total_books,
  SUM(stocking) AS total_stocking
FROM donations
GROUP BY donor
ORDER BY num_donations DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Totals by donor error:", err);
    res.status(500).json({ error: "Failed to load report" });
  }
});

app.get("/api/reports/totals-by-event", async (req, res) => {
  try {
    const result = await pool.query(`
SELECT
  donor,
  COUNT(*) AS num_donations,
  SUM(boy02 + girl02 + boy35 + girl35 + boy68 + girl68 + boy911 + girl911 + boy1214 + girl1214 + bike + stuffie) AS total_toys,
  SUM(book) AS total_books,
  SUM(stocking) AS total_stocking
FROM donations
WHERE donor ILIKE '%event%'
GROUP BY donor
ORDER BY num_donations DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Totals by donor error:", err);
    res.status(500).json({ error: "Failed to load report" });
  }
});

// CSV Export
app.get("/table.csv", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM donations ORDER BY date DESC, id DESC"
  );
  let csv =
    "Donor,Date,Boy 0-2,Girl 0-2,Boy 3-5,Girl 3-5,Boy 6-8,Girl 6-8,Boy 9-11,Girl 9-11,Boy 12-14,Girl 12-14,Book,Stuffie,Bike,Stocking,Inventory Person,Comments\n";
  rows.forEach((d) => {
    csv += `"${(d.donor || "").replace(/"/g, '""')}","${d.date}",${
      d.boy02 || 0
    },${d.girl02 || 0},${d.boy35 || 0},${d.girl35 || 0},${d.boy68 || 0},${
      d.girl68 || 0
    },${d.boy911 || 0},${d.girl911 || 0},${d.boy1214 || 0},${d.girl1214 || 0},${
      d.book || 0
    },${d.stuffie || 0},${d.bike || 0},${d.stocking || 0},"${(
      d.inventory_person || ""
    ).replace(/"/g, '""')}","${(d.comments || "").replace(/"/g, '""')}"\n`;
  });
  res.header("Content-Type", "text/csv");
  res.attachment("toys-for-tots-donations.csv");
  res.send(csv);
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
