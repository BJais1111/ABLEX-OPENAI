// src/components/CreateAssessment.jsx
import React, { useState, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import QuestionBuilder from "./QuestionBuilder";
import TimerSelector from "./TimerSelector";
import AssessmentPreview from "./AssessmentPreview";

export default function CreateAssessment() {
  const { user } = useUser();
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [timer, setTimer] = useState(10);

  // PDF upload state
  const [pdfFile, setPdfFile] = useState(null);
  const pdfInputRef = useRef();

  // Saving flag
  const [saving, setSaving] = useState(false);

  // Handlers for manual questions
  const handleAddQuestion = (q) => setQuestions((prev) => [...prev, q]);
  const handleDeleteQuestion = (i) => {
    const arr = [...questions];
    arr.splice(i, 1);
    setQuestions(arr);
  };

  // PDF handlers
  const openPdfDialog = () => pdfInputRef.current?.click();
  const handlePdfChange = (e) => {
    if (e.target.files.length) setPdfFile(e.target.files[0]);
  };

  // --- Helpers ---
  const parseMcqBlocks = (raw) => {
    const blocks = raw.split(/\n{2,}/).filter((b) => b.trim());
    return blocks.map((blk, idx) => {
      const lines = blk
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const questionText = (lines[0] || "").replace(/^\d+\.\s*/, "");
      const options = [];
      let correctAnswer = "";

      lines.slice(1).forEach((l) => {
        const m = l.match(/^([a-d])\)\s*(.*?)(\s*\*)?$/i);
        if (m) {
          const [, , text, star] = m;
          options.push(text);
          if (star) correctAnswer = text;
        }
      });

      return {
        questionText: questionText || `Question ${idx + 1}`,
        type: "mcq",
        options,
        correctAnswer: correctAnswer || (options[0] || ""),
      };
    });
  };

  // Save entire assessment
  const handleSave = async () => {
    if (!title.trim()) return alert("Enter an assessment title.");
    setSaving(true);

    try {
      let allQuestions = [...questions];

      // If a PDF is uploaded, generate MCQs from page 1 via FastAPI
      if (pdfFile) {
        const form = new FormData();
        form.append("file", pdfFile);
        form.append("page", 1);

        const { data } = await axios.post(
          "http://localhost:8000/generate-from-pdf",
          form,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        const raw = (data?.mcqs || "").trim();
        if (raw) {
          const pdfQuestions = parseMcqBlocks(raw);
          allQuestions = [...allQuestions, ...pdfQuestions];
        }
      }

      const payload = {
        createdBy: user.id,
        creatorName: user.firstName,
        title,
        timer,
        questions: allQuestions,
        targetSupports: [],
      };

      await axios.post("http://localhost:5000/assessments/create", payload);

      alert("✅ Assessment created!");
      setTitle("");
      setQuestions([]);
      setTimer(10);
      setPdfFile(null);
    } catch (err) {
      console.error(err);
      alert("❌ Failed: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        {/* HEADER */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.heading}>Create Inclusive Assessment</h1>
            <p style={styles.subheading}>
              Design pastel-calm, accessibility-first tests. Mix manual questions with
              AI-generated MCQs from PDFs and preview everything in real time.
            </p>
          </div>
          <span style={styles.badge}>Educator • AbleX</span>
        </header>

        {/* CONTENT GRID */}
        <main style={styles.mainGrid}>
          {/* LEFT COLUMN: setup */}
          <section style={styles.leftColumn}>
            {/* Title */}
            <div style={styles.card}>
              <label style={styles.label}>Assessment Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={saving}
                style={styles.input}
                placeholder="e.g., Solar System Basics"
              />
            </div>

            {/* PDF Upload */}
            <div style={styles.card}>
              <label style={styles.label}>Upload Reference PDF (optional)</label>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfChange}
                style={{ display: "none" }}
              />
              <button
                onClick={openPdfDialog}
                disabled={saving}
                style={styles.uploadButton}
              >
                {pdfFile ? "Change PDF" : "Upload PDF"}
              </button>
              {pdfFile && (
                <p style={styles.pdfName}>
                  Selected: <strong>{pdfFile.name}</strong>
                </p>
              )}
              <p style={styles.helperText}>
                We’ll auto-generate MCQs from page 1. You can add or edit questions
                below at any time.
              </p>
            </div>

            {/* Timer */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Timer</h2>
              <p style={styles.helperText}>
                Set the assessment duration. Autism-friendly or practice modes can keep
                this off.
              </p>
              <TimerSelector value={timer} onChange={setTimer} />
            </div>
          </section>

          {/* RIGHT COLUMN: questions + preview */}
          <section style={styles.rightColumn}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Add Questions</h2>
              <p style={styles.helperText}>
                Build MCQ or short-answer questions. You can attach images; AbleX will
                handle captions and accessibility on the student side.
              </p>
              <QuestionBuilder onAddQuestion={handleAddQuestion} />
            </div>

            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Live Preview</h2>
              <AssessmentPreview
                key={timer}
                title={title}
                questions={questions}
                timer={timer}
                previewMode="visual"
                onDeleteQuestion={handleDeleteQuestion}
              />
            </div>

            <div style={{ ...styles.card, textAlign: "right" }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={styles.saveButton}
              >
                {saving ? "Saving…" : "Save Assessment"}
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}


// 🎨 pastel, full-screen theme
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: "1.8rem 1.5rem 2.4rem", // a bit less padding
    backgroundImage: `
      linear-gradient(135deg, #fdf2ff 0%, #e0f5ff 45%, #fef6ff 100%),
      linear-gradient(#edf2ff 1px, transparent 1px),
      linear-gradient(90deg, #edf2ff 1px, transparent 1px)
    `,
    backgroundSize: "cover, 40px 40px, 40px 40px",
    backgroundPosition: "center, -1px -1px, -1px -1px",
    fontFamily: "'Poppins', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    color: "#111827",
  },

  // 🔥 make the main shell almost full-width
  shell: {
    width: "100%",
    maxWidth: "1440px",          // was 1180
    borderRadius: "28px",
    padding: "1.7rem 2rem 2.2rem",
    background:
      "radial-gradient(circle at top left, rgba(255,255,255,0.98), #ffffff 55%)",
    border: "1px solid rgba(255,255,255,0.8)",
    boxShadow: "0 26px 70px rgba(15, 23, 42, 0.18)",
    backdropFilter: "blur(20px)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1.5rem",
    marginBottom: "1.8rem",
  },
  heading: {
    fontSize: "2.6rem",
    fontWeight: 800,
    lineHeight: 1.1,
    margin: 0,
    background: "linear-gradient(90deg, #57c5ff, #6ed5cf, #f28bbf)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subheading: {
    fontSize: "1rem",
    color: "#4b5563",
    maxWidth: "640px",
    marginTop: "0.4rem",
    lineHeight: 1.7,
  },
  badge: {
    alignSelf: "flex-start",
    fontSize: "0.8rem",
    padding: "0.28rem 0.85rem",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #e0f2fe, #eef2ff)",
    border: "1px solid rgba(191, 219, 254, 0.9)",
    color: "#1f2937",
    fontWeight: 500,
  },

  // 🔥 spread columns more on a wide screen
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.9fr)", // wider right side
    columnGap: "2rem",
    rowGap: "1.5rem",
    alignItems: "flex-start",
  },

  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "1.3rem",
  },
  rightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "1.3rem",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "1.5rem 1.6rem",
    boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
    border: "1px solid rgba(229, 231, 235, 0.9)",
  },
  label: {
    fontWeight: 600,
    fontSize: "0.98rem",
    marginBottom: "0.5rem",
    display: "block",
    color: "#111827",
  },
  input: {
    width: "100%",
    padding: "0.9rem 1rem",
    fontSize: "0.98rem",
    borderRadius: "12px",
    border: "1px solid #d8c3e5",
    backgroundColor: "#fff9fd",
    outline: "none",
    transition: "border 0.2s ease, box-shadow 0.2s ease",
  },
  uploadButton: {
    padding: "0.75rem 1.4rem",
    fontSize: "0.95rem",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #7e5cfa, #ff88c2)",
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 12px 30px rgba(126, 92, 250, 0.4)",
  },
  pdfName: {
    marginTop: "0.75rem",
    fontSize: "0.9rem",
    color: "#4b5563",
  },
  helperText: {
    marginTop: "0.5rem",
    fontSize: "0.86rem",
    color: "#6b7280",
    lineHeight: 1.5,
  },
  sectionTitle: {
    fontSize: "1.15rem",
    fontWeight: 600,
    color: "#111827",
    marginBottom: "0.35rem",
  },
  saveButton: {
    padding: "0.75rem 1.8rem",
    fontSize: "0.98rem",
    borderRadius: "999px",
    border: "none",
    cursor: "pointer",
    color: "#ffffff",
    background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
    boxShadow: "0 14px 36px rgba(79, 70, 229, 0.5)",
  },
};
