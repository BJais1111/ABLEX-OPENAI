import mongoose from "mongoose";

const ScoreSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String },
  supports: [String],
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now },
  startedAt: { type: Date }, // ✅ NEW
});


export default mongoose.model("Score", ScoreSchema);