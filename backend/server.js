// server.js

import dotenv from "dotenv";
dotenv.config();
import path from "path";
import multer from "multer";

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";




import { SerialPort } from "serialport";
import axios from "axios";



import User from "./models/User.js";
import Assessment from "./models/Assessment.js";
import Score from "./models/Score.js"; 

const app = express();
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

// ======================== MIDDLEWARE =========================

app.use(cors({
  origin: "http://localhost:5173",  
  credentials: true,
}));

app.use(express.json());
app.use(bodyParser.json());
app.use(ClerkExpressWithAuth());

// ======================= MONGODB CONNECTION ==================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));

// ─── MULTER & STATIC SETUP ───────────────────────────────────────────────────────


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads/"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// 2️⃣ Serve the uploads folder at the `/uploads` URL prefix:
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads/"))
);

// 3️⃣ Expose a POST /upload endpoint that your React can call:
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  // return the public URL to the newly‐saved file:
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});


// ====================== ROUTES ===============================

app.post("/create-user", async (req, res) => {
  try {
    const { 
      userId, 
      firstName, 
      lastName, 
      email,
      profileImageUrl 
    } = req.body;

    const fullName = `${firstName || ""} ${lastName || ""}`.trim();

    const user = await User.findOneAndUpdate(
      { userId },
      { 
        firstName,
        lastName,
        fullName,
        email,
        profilePicture: profileImageUrl 
      },
      { new: true, upsert: true }
    );

    res.status(200).json(user);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/get-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/onboarding", async (req, res) => {
  try {
    const { userId, role, supports, language, isOnboarded } = req.body; // ✅ added language
    if (!userId || !role) {
      return res.status(400).json({ error: "User ID and role are required" });
    }
    const updatedUser = await User.findOneAndUpdate(
      { userId },
      {
        $set: {
          role,
          supports,
          language, // ✅ save language
          isOnboarded,
        },
      },
      { new: true, upsert: true }
    );
    res.status(200).json({ message: "Onboarding complete", user: updatedUser });
  } catch (err) {
    console.error("❌ Error saving onboarding info:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.post("/set-motor-preference", async (req, res) => {
  try {
    const { userId, preference } = req.body;
    if (!userId || !preference) {
      return res.status(400).json({ error: "Missing userId or preference" });
    }
    const updated = await User.findOneAndUpdate(
      { userId },
      { $set: { motorPreference: preference } },
      { new: true }
    );
    res.status(200).json({ success: true, updated });
  } catch (error) {
    console.error("❌ Error setting motor preference:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/submit-score", async (req, res) => {
  try {
    const { userId, name, supports, score, total, startedAt } = req.body; // ✅ ADD startedAt

    if (!userId || score === undefined || total === undefined) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const saved = await new Score({
      userId,
      name,
      supports,
      score,
      total,
      startedAt, // ✅ SAVE IT
    }).save();

    res.status(201).json({ message: "Score submitted", scoreId: saved._id });
  } catch (err) {
    console.error("❌ Error submitting score:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ✅ NEW: Fetch all submitted scores (Educator dashboard)
app.get("/scores/all", async (req, res) => {
  try {
    const allScores = await Score.find();
    res.status(200).json(allScores);
  } catch (err) {
    console.error("❌ Error fetching scores:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/assessments/create", async (req, res) => {
  try {
    const { createdBy,creatorName, title, timer, questions, targetSupports } = req.body;

    const newAssessment = new Assessment({
      createdBy,
      creatorName,
      title,
      timer,
      questions,
      targetSupports,
    });

    const saved = await newAssessment.save();
    res.status(201).json({ message: "Assessment created", assessmentId: saved._id });
  } catch (err) {
    console.error("❌ Error creating assessment:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/assessments/all", async (req, res) => {
  try {
    const allAssessments = await Assessment.find();
    res.status(200).json(allAssessments);
  } catch (err) {
    console.error("❌ Error fetching assessments:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/assessments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const oneAssessment = await Assessment.findById(id);
    if (!oneAssessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    res.status(200).json(oneAssessment);
  } catch (err) {
    console.error("❌ Error fetching assessment by ID:", err);
    res.status(500).json({ error: "Server error" });
  }
});




app.post("/api/simplify-question", async (req, res) => {
  const { questionText } = req.body;
  if (!questionText) {
    return res.status(400).json({ error: "Question text is required" });
  }

  try {
    const response = await axios.post(
      "https://api.cohere.ai/v1/chat",
      {
        model: "command-r-plus-08-2024",
        message: `Simplify this question using easy language and dont give the answer just give the hint! Give it in small bullets\n\n${questionText}`,
        temperature: 0.3,
        chat_history: [],
      },
      {
        headers: {
          Authorization: "Bearer 9QIGmrV4SPvEYqHfWAkmDrJYU0q4fGJnE9ope7XA",
          "Content-Type": "application/json",
        },
      }
    );

    const simplified = response.data.text || "⚠️ Could not simplify.";
    res.json({ simplified });
  } catch (error) {
    console.error("❌ Cohere API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to simplify the question using Cohere." });
  }
});
// ✅ Add this new PATCH route to your server.js
app.patch("/update-supports", async (req, res) => {
  try {
    const { userId, supports, motorPreference } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const update = {};
    if (supports) update.supports = supports;
    if (motorPreference !== undefined) update.motorPreference = motorPreference;

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ message: "Support settings updated", user: updatedUser });
  } catch (err) {
    console.error("❌ Error updating user supports:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// GET all students for educator dashboard
// GET all students for educator dashboard
app.get("/students/all", async (req, res) => {
  try {
    const students = await User
      .find(
        { role: "student" },
        "userId firstName lastName fullName email supports motorPreference"
      )
      .lean();

    res.status(200).json(students);
  } catch (err) {
    console.error("❌ Error fetching students:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});




const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
