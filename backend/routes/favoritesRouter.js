import express from "express";
import { pool } from "../helper/db.js";

const router = express.Router();

// Lisää suosikki
router.post("/", async (req, res) => {
  try {
    const { userId, movieId } = req.body;
    await pool.query(
      "INSERT INTO favorites (user_id, movie_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [userId, movieId]
    );
    res.json({ message: "Favorite added!" });
  } catch (err) {
    console.error("Error inserting favorite:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Hae käyttäjän suosikit
router.get("/:userId", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT movie_id FROM favorites WHERE user_id = $1",
      [req.params.userId]
    );
    // palautetaan aina lista
    res.json(result.rows || []);
  } catch (err) {
    console.error("Error fetching favorites:", err);
    res.json([]); // palautetaan tyhjä lista virhetilanteessa
  }
});

// Poista suosikki
router.delete("/:userId/:movieId", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM favorites WHERE user_id = $1 AND movie_id = $2",
      [req.params.userId, req.params.movieId]
    );
    res.json({ message: "Favorite removed!" });
  } catch (err) {
    console.error("Error deleting favorite:", err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;

