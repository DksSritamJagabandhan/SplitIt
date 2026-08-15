const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email.trim().toLowerCase()]
    );
    if (existing.length) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name,email,password) VALUES (?,?,?)",
      [name.trim(), email.trim().toLowerCase(), hash]
    );

    res.status(201).json({ message: "User registered successfully", userId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query(
      "SELECT id,name,email,password FROM users WHERE email = ?",
      [(email || "").trim().toLowerCase()]
    );

    if (!users.length) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];
    const match = await bcrypt.compare(password || "", user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
