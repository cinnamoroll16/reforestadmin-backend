import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { db } from "./src/firebase.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Registration Route
app.post("/api/register", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email required" });
    }

    const docRef = await db.collection("users").add({
      name,
      email,
      createdAt: new Date(),
    });

    res.status(201).json({ id: docRef.id, message: "User saved!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
