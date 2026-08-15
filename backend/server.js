require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");

const authRoutes = require("./routes/auth");
const apiRoutes = require("./routes/api");

const app = express();

app.use(cors({
  origin: "https://splitit-48cq.onrender.com/"
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "CampusSplit Backend is Running"
  });
});

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS result");

    res.json({
      message: "MySQL connected successfully!",
      data: rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "MySQL connection failed"
    });
  }
});

// Authentication routes
app.use("/api/auth", authRoutes);

// CampusSplit routes
app.use("/api", apiRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
