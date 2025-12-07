import React, { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import Confetti from "react-confetti";

export default function AssessmentPreview({ questions, title, timer }) {
  const { user } = useUser();
  const [mode, setMode] = useState("normal");
  const [isSaving, setIsSaving] = useState(false);
  const [xp, setXp] = useState(0);
  const [confetti, setConfetti] = useState(false);

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.post("http://localhost:5000/assessments/create", {
        createdBy: user.id,
        title,
        timer,
        questions,
        targetSupports: [mode],
      });
      alert("✅ Assessment saved!");
    } catch (err) {
      console.error("❌ Error saving assessment:", err);
      alert("❌ Failed to save assessment");
    } finally {
      setIsSaving(false);
    }
  };

  const renderXPBar = () => (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ fontWeight: "bold" }}>🎮 XP Preview</div>
      <div style={{
        background: "#e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
        height: "20px",
        width: "100%",
        marginTop: "4px"
      }}>
        <div style={{
          height: "100%",
          width: `${xp}%`,
          backgroundColor: "#10b981",
          transition: "width 0.3s ease"
        }} />
      </div>
    </div>
  );

  const handleGamifiedXP = () => {
    setXp((prev) => Math.min(prev + 10, 100));
    setConfetti(true);
    setTimeout(() => setConfetti(false), 2000);
  };

  const renderVisualMode = () => (
    <div style={{ filter: "contrast(150%)", fontSize: "1.2rem" }}>
      {questions.map((q, idx) => (
        <div
          key={idx}
          tabIndex={0}
          onFocus={() => speak(q.questionText)}
          onMouseEnter={() => speak(q.questionText)}
          style={{
            marginBottom: "2rem",
            padding: "1rem",
            border: "2px solid #555",
            backgroundColor: "#000",
            color: "#fff",
          }}
        >
          <p><strong>Q{idx + 1}:</strong> {q.questionText}</p>
          {q.imageUrl && <img src={q.imageUrl} alt="question" style={{ maxWidth: 300 }} />}
          {q.type === "mcq" && (
            <ul>
              {q.options.map((opt, i) => (
                <li
                  key={i}
                  tabIndex={0}
                  onFocus={() => speak(opt)}
                  onMouseEnter={() => speak(opt)}
                  style={{ margin: "0.5rem 0" }}
                >
                  {opt}
                </li>
              ))}
            </ul>
          )}
          {q.type === "short" && (
            <input
              type="text"
              placeholder="Type your answer"
              style={{ padding: "0.5rem", marginTop: "1rem", width: "100%" }}
              tabIndex={0}
              onFocus={() => speak("Answer field")}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderDyslexiaAdhdMode = () => (
    <div
      style={{
        fontFamily: "'OpenDyslexic', sans-serif",
        letterSpacing: "0.08em",
        lineHeight: "1.8",
        fontSize: "1.15rem",
        padding: "1rem",
        backgroundColor: "#fefae0",
        borderRadius: "10px",
      }}
    >
      {questions.map((q, idx) => (
        <div key={idx} style={{ marginBottom: "2rem" }}>
          <p><strong>Q{idx + 1}:</strong> {q.questionText}</p>
          {q.imageUrl && <img src={q.imageUrl} alt="question" style={{ maxWidth: 300 }} />}
          {q.type === "mcq" && (
            <ul>
              {q.options.map((opt, i) => (
                <li key={i} style={{ marginBottom: "0.5rem" }}>
                  <button
                    onClick={handleGamifiedXP}
                    style={{
                      fontSize: "1rem",
                      padding: "0.5rem 1rem",
                      backgroundColor: "#c1fba4",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    {opt}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.type === "short" && (
            <input
              type="text"
              placeholder="Type your answer"
              onChange={handleGamifiedXP}
              style={{
                padding: "0.6rem",
                fontSize: "1rem",
                width: "100%",
                border: "1px solid #ccc",
                borderRadius: "6px",
              }}
            />
          )}
        </div>
      ))}
      {renderXPBar()}
      <p style={{ fontStyle: "italic", color: "#666" }}>
        🧠 Gamified experience preview enabled for Dyslexia/ADHD learners.
      </p>
    </div>
  );

  const renderAutismMode = () => (
    <div style={{
      backgroundColor: "#fff",
      padding: "1rem",
      fontSize: "1.1rem",
      lineHeight: "1.6",
      borderRadius: "10px",
    }}>
      <ol>
        {questions.map((q, idx) => (
          <li key={idx} style={{ marginBottom: "2rem" }}>
            <p><strong>Q{idx + 1}:</strong> {q.questionText}</p>
            {q.imageUrl && <img src={q.imageUrl} alt="question" style={{ maxWidth: 300 }} />}
            {q.type === "mcq" && (
              <ul style={{ listStyleType: "circle", marginTop: "0.5rem" }}>
                {q.options.map((opt, i) => (
                  <li key={i}>{opt}</li>
                ))}
              </ul>
            )}
            {q.type === "short" && (
              <input
                type="text"
                placeholder="Type your answer"
                style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem",
                  fontSize: "1rem",
                  width: "100%",
                  borderRadius: "6px",
                  border: "1px solid #bbb"
                }}
              />
            )}
          </li>
        ))}
      </ol>
      <p style={{ fontStyle: "italic", color: "#444" }}>
        🌈 Calm and structured layout tailored for autism support.
      </p>
    </div>
  );

  const renderPreview = () => {
    switch (mode) {
      case "visual":
        return renderVisualMode();
      case "adhd":
        return renderDyslexiaAdhdMode();
      case "autism":
        return renderAutismMode();
      default:
        return <p>✨ Preview for '{mode}' mode is coming soon.</p>;
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Segoe UI, sans-serif", overflow: "visible" }}>
      <h2 style={{ marginBottom: "1rem" }}>Preview Assessment: {title}</h2>

      {confetti && typeof window !== 'undefined' && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={200}
          recycle={false}
        />
      )}

      <label style={{ display: "block", marginBottom: "1rem" }}>
        Preview Mode:
        <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ marginLeft: "1rem" }}>
          
          <option value="visual">Visual</option>
          
          
          <option value="adhd">Dyslexia / ADHD</option>
          <option value="autism">Autism</option>
        </select>
      </label>

      {renderPreview()}

      <button
        onClick={handleSave}
        disabled={isSaving}
        style={{
          marginTop: "2rem",
          padding: "12px 24px",
          background: "#4CAF50",
          color: "#fff",
          border: "none",
          borderRadius: 6,
        }}
      >
        {isSaving ? "Saving..." : "Save Assessment"}
      </button>
    </div>
  );
}
