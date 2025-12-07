// routes/onboarding.js
import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { userId, companyName, industry, skuCount, country, useSimulation, isOnboarded } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      {
        $set: {
          companyName,
          industry,
          skuCount,
          country,
          useSimulation,
          isOnboarded,
        },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Onboarding complete", user: updatedUser });
  } catch (err) {
    console.error("Error saving onboarding info:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
