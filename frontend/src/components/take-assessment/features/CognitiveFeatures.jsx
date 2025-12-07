// src/components/assessments/CognitiveFeatures.jsx

import React, { useState, useEffect } from "react";
import axios from "axios";

export default function CognitiveFeatures({
  questionText,
  language = "english"
}) {
  const [simplified, setSimplified] = useState("");
  const [simplifyLoading, setSimplifyLoading] = useState(false);

  const [explanation, setExplanation] = useState("");
  const [explainLoading, setExplainLoading] = useState(false);

  // clear results when question or language changes
  useEffect(() => {
    setSimplified("");
    setExplanation("");
  }, [questionText, language]);

  const simplifyText = async () => {
    setSimplifyLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/simplify-question",
        { questionText }
      );
      setSimplified(res.data.simplified);
    } catch (err) {
      console.error("❌ Error simplifying text:", err);
      setSimplified("❌ Failed to simplify.");
    } finally {
      setSimplifyLoading(false);
    }
  };

  const explainWithAI = async () => {
    setExplainLoading(true);
    try {
      const res = await axios.post("http://localhost:5005/chat", {
        prompt: questionText,
        lang: language
      });
      setExplanation(res.data.reply);
    } catch (err) {
      console.error("❌ Error getting AI explanation:", err);
      setExplanation("❌ Failed to get explanation.");
    } finally {
      setExplainLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Cohere-backed simplify */}
      <button
        onClick={simplifyText}
        disabled={simplifyLoading}
        style={styles.button}
      >
        {simplifyLoading ? "Simplifying…" : "🧠 Simplify Question"}
      </button>
      {simplified && (
        <div style={styles.result}>
          <p style={styles.title}>✨ Simplified Version:</p>
          <pre style={styles.pre}>{simplified}</pre>
        </div>
      )}

      {/* Dwani LLM explanation */}
      <button
        onClick={explainWithAI}
        disabled={explainLoading}
        style={{
          ...styles.button,
          marginTop: "1rem",
          backgroundColor: "#DDEBF7",
          borderColor: "#A4C2F4"
        }}
      >
        {explainLoading ? "Generating Explanation…" : "💬 Explain with AI"}
      </button>
      {explanation && (
        <div style={{ ...styles.result, backgroundColor: "#FFF4E5", borderColor: "#FFD7A8" }}>
          <p style={styles.title}>Small Hint:</p>
          <pre style={styles.pre}>{explanation}</pre>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    marginTop: "1rem",
    marginBottom: "1rem",
    fontFamily: "'Poppins', sans-serif"
  },
  button: {
    backgroundColor: "#FADADD", // soft pastel pink
    color: "#4A4A4A",
    border: "2px solid #FBC4AB",
    borderRadius: "12px",
    padding: "10px 18px",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "0.3s ease",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
  },
  result: {
    marginTop: "0.5rem",
    padding: "1rem",
    backgroundColor: "#E0F7FA", // soft pastel blue
    border: "2px dashed #B2EBF2",
    borderRadius: "12px",
    color: "#333"
  },
  pre: {
    whiteSpace: "pre-wrap",
    margin: 0,
    fontSize: "1rem",
    fontFamily: "'Poppins', sans-serif'"
  },
  title: {
    fontWeight: "bold",
    color: "#6D597A", // soft purple for headings
    marginBottom: "0.5rem",
    fontSize: "1.1rem"
  }
};
