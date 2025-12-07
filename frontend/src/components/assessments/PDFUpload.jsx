// src/components/assessments/PDFUpload.jsx
import React, { useState } from "react";
import Tesseract from "tesseract.js";
import axios from "axios";

export default function PDFUpload({ onGenerateQuestions }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError("");
  };

  const extractTextAndGenerate = async () => {
    if (!selectedFile) return;
    setGenerating(true);
    setError("");

    try {
      const imageData = await selectedFile.arrayBuffer();
      const blob = new Blob([imageData], { type: selectedFile.type });

      const { data: { text } } = await Tesseract.recognize(blob, "eng", {
        logger: (m) => console.log(m),
      });

      const geminiRes = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyCZC6Pe8GEGCGYkhOwTwIVSLB87ceWW5Vs",
        {
          contents: [
            {
              parts: [
                {
                  text: `Generate 5 multiple choice questions from this passage. Each question should have 4 options and indicate the correct one. Text: ${text}`,
                },
              ],
            },
          ],
        }
      );

      const resultText = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) throw new Error("No questions generated.");

      onGenerateQuestions(resultText);
    } catch (err) {
      console.error("PDF parse error:", err);
      setError("Failed to extract text or generate questions.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      <label style={{ fontWeight: 500 }}>Upload Educational PDF:</label>
      <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} />
      <button
        onClick={extractTextAndGenerate}
        disabled={!selectedFile || generating}
        style={{ marginTop: "1rem", padding: "10px 16px" }}
      >
        {generating ? "Generating..." : "Generate Questions from PDF"}
      </button>
      {error && <p style={{ color: "red", marginTop: 8 }}>{error}</p>}
    </div>
  );
}