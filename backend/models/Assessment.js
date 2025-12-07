// models/Assessment.js
import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema({
  createdBy: { type: String, required: true },
   creatorName: { type: String }, // Clerk userId
  title: { type: String },
  timer: { type: Number, default: 0 }, // duration in minutes
  questions: [
    {
      questionText: { type: String, required: true },
      type: { type: String, enum: ["mcq", "short"], default: "mcq" },
      options: [String], // only if type === mcq
      correctAnswer: { type: String },
      imageUrl: { type: String },
    },
  ],
  targetSupports: [String], // eg. ["visual", "autism"]
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Assessment", assessmentSchema);
