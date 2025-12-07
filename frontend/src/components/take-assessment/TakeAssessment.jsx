// src/components/take-assessment/TakeAssessment.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import DyslexiaFeatures from "./features/DyslexiaFeatures";
import SipPuffListener from "./SipPuffListener";
import BrailleSpeaker from "./features/BrailleSpeaker";
import MotorPreference from "./MotorPreference";
import EyeTrackingListener from "./EyeTrackingListener";
import CognitiveFeatures from "./features/CognitiveFeatures";
import SignInput from "./features/SignInput";
import SpeechInput from "./SpeechInput";



// Reusable style for visual-mode buttons
const visualButtonStyle = {
  padding: "16px 32px",
  fontSize: "1.2rem",
  borderRadius: "12px",
  backgroundColor: "#2563eb",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
};

async function fetchHFCaption(imageUrl) {
  const blob = await fetch(imageUrl).then((r) => r.blob());
  const form = new FormData();
  form.append("file", blob, "image.jpg");
  const res = await fetch(HF_IMG2TXT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data[0]?.generated_text;
}

export default function TakeAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [startTime] = useState(new Date().toISOString());
  const { user } = useUser();

  // Core state
  const [assessment, setAssessment] = useState(null);
  const [supports, setSupports] = useState([]);
  const [motorPreference, setMotorPreference] = useState(null);
  const [language, setLanguage] = useState("english");
  const [loading, setLoading] = useState(true);

  // Keep window.currentLanguage in sync (used by speakText below)
  useEffect(() => {
    window.currentLanguage = language;
  }, [language]);

  // Question flow
  const [currentIndex, setCurrentIndex] = useState(0);
  const [simplified, setSimplified] = useState("");
  const [simplifying, setSimplifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [shortAnswers, setShortAnswers] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [highlightedOption, setHighlightedOption] = useState(0);

  // Cached translations
  const [translations, setTranslations] = useState({
    questions: [],
    options: [],
  });

  // Image a11y cache
  const [imageA11y, setImageA11y] = useState({});

  // Refs for IoT/keyboard loops
  const currentIndexRef = useRef(currentIndex);
  const highlightedOptionRef = useRef(highlightedOption);
  const questionsRef = useRef([]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
    highlightedOptionRef.current = highlightedOption;
    questionsRef.current = assessment?.questions || [];
  }, [currentIndex, highlightedOption, assessment]);

  useEffect(() => {
    setHighlightedOption(0);
  }, [currentIndex]);

  // Visual support
  const hasVisual = supports.includes("visual");
  // Quiet hover/focus TTS; we speak only on F/J usually
  const enableHoverTTS = hasVisual && false;

  const [highContrast, setHighContrast] = useState(false);
  useEffect(() => {
    if (hasVisual) setHighContrast(true);
  }, [hasVisual]);

  // 1) Load user prefs + assessment
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: userData } = await axios.get(
          `http://localhost:5000/get-user/${user.id}`
        );
        setSupports(userData.supports || []);
        setMotorPreference(userData.motorPreference || null);
        setLanguage(userData.language || "english");

        const { data: assessData } = await axios.get(
          `http://localhost:5000/assessments/${id}`
        );
        setAssessment(assessData);
      } catch (err) {
        console.error("❌ Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, user]);

  // 2) Batch-translate all question/option texts
  useEffect(() => {
    if (!assessment) return;
    const qs = assessment.questions.map((q) => q.questionText);
    const opts = assessment.questions.map((q) => q.options || []);
    if (language === "english") {
      setTranslations({ questions: qs, options: opts });
      return;
    }
    const flat = [...qs, ...opts.flat()];
    axios
      .post("http://localhost:8000/translate-batch", {
        sentences: flat,
        lang: language,
      })
      .then((res) => {
        const t = res.data.translations || [];
        const qTrans = t.slice(0, qs.length);
        let idx = qs.length;
        const optsTrans = opts.map((arr) => arr.map(() => t[idx++] || ""));
        setTranslations({ questions: qTrans, options: optsTrans });
      })
      .catch(() => setTranslations({ questions: qs, options: opts }));
  }, [assessment, language]);

  // 3) Clear simplified on question change
  useEffect(() => {
    setSimplified("");
  }, [currentIndex]);

  // 4) Simplify helper
  const handleSimplify = async (text) => {
    setSimplifying(true);
    try {
      const { data } = await axios.post(
        "http://localhost:5000/api/simplify-question",
        { questionText: text }
      );
      setSimplified(data.simplified || "Could not simplify.");
    } catch {
      setSimplified("❌ Failed to simplify.");
    } finally {
      setSimplifying(false);
    }
  };

  // 5) Timer logic
  const effectiveTimer =
    assessment && supports.includes("autism") ? null : assessment?.timer;
  useEffect(() => {
    if (!assessment || !effectiveTimer) return;
    let remaining = effectiveTimer * 60;
    setTimeLeft(remaining);
    const iv = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(iv);
    }, 1000);
    return () => clearInterval(iv);
  }, [assessment, effectiveTimer]);

  // 6) Submit score + go back to dashboard
  const submitScore = async () => {
    setSubmitLoading(true);
    try {
      let score = 0;
      assessment.questions.forEach((q, i) => {
        if (q.type === "mcq") {
          const sel = selectedAnswers[i];
          if (
            q.options[sel]?.trim().toLowerCase() ===
            q.correctAnswer?.trim().toLowerCase()
          )
            score++;
        } else {
          if (
            (shortAnswers[i] || "").trim().toLowerCase() ===
            (q.correctAnswer || "").trim().toLowerCase()
          )
            score++;
        }
      });
      await axios.post("http://localhost:5000/submit-score", {
        userId: user.id,
        name: user.fullName,
        supports,
        score,
        total: assessment.questions.length,
        startedAt: startTime,
      });
      alert("✅ Score submitted!");

      // redirect student back to their dashboard
      navigate("/dashboard/student");
    } catch {
      alert("Error submitting score.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // ───────────────────── F/J keyboard navigation (VISUAL ONLY) ─────────────────────
  const containerRef = useRef(null);
  const focusablesRef = useRef([]);
  const navIndexRef = useRef(-1);
  const [navIndex, setNavIndex] = useState(-1);
  const prevFocusRef = useRef(null);

  // refs for title + question header
  const titleRef = useRef(null);
  const questionRef = useRef(null);

  // Build/refresh focusable list (structural first, then actionable)
  const refreshFocusables = () => {
    if (!hasVisual || !containerRef.current) return;

    // Structural nodes explicitly marked for the cycle
    const structural = Array.from(
      containerRef.current.querySelectorAll('[data-fj-structural="1"]')
    ).filter((el) => el && el.getClientRects && el.getClientRects().length > 0);

    // Interactive things
    const actionables = Array.from(
      containerRef.current.querySelectorAll(
        "button, a[href], input:not([type='hidden']):not([disabled])"
      )
    ).filter((el) => el && el.getClientRects && el.getClientRects().length > 0);

    focusablesRef.current = [...structural, ...actionables];

    setNavIndex((i) => {
      const ni = Math.min(Math.max(i, -1), focusablesRef.current.length - 1);
      navIndexRef.current = ni;
      return ni;
    });
  };

  useEffect(() => {
    refreshFocusables();
  }, [
    hasVisual,
    currentIndex,
    translations,
    simplified,
    imageA11y,
    highContrast,
    submitLoading,
    assessment,
  ]);

  const ordWord = (i) =>
    ["first", "second", "third", "fourth", "fifth", "sixth"][i] ||
    `option ${i + 1}`;

  const clearFocusRing = (el) => {
    if (!el) return;
    try {
      el.style.outline = "";
      el.style.boxShadow = "";
      el.removeAttribute("data-fj-focus");
    } catch {}
  };

  const applyFocusRing = (el) => {
    if (!el) return;
    try {
      el.setAttribute("data-fj-focus", "1");
      // WHITE ring + subtle dark halo
      el.style.outline = "3px solid #ffffff";
      el.style.boxShadow = "0 0 0 4px rgba(0,0,0,0.6)";
      if (typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    } catch {}
  };

  const speakFocused = (el) => {
    if (!el) return;

    // If explicitly marked structural, just read its text
    if (el.getAttribute?.("data-fj-structural") === "1") {
      const t = (el.innerText || "").trim();
      if (t) speakText(t);
      return;
    }

    const tag = el.tagName?.toLowerCase();

    // Headings speak their text
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const t = (el.innerText || "").trim();
      if (t) speakText(t);
      return;
    }

    // Prefer inner radio/button if wrapper sneaks in
    if (!["input", "button", "a"].includes(tag)) {
      const inner =
        el.querySelector?.(
          "input[type='radio'], button, a[href], input:not([type='hidden'])"
        ) || null;
      if (inner) return speakFocused(inner);
    }

    if (tag === "input" && el.type === "radio") {
      const idxStr = el.getAttribute("data-opt-idx");
      const idx = idxStr ? parseInt(idxStr, 10) : NaN;
      let label = el.closest("label")?.textContent?.trim() || "";
      label = label.replace(/\s+/g, " ").trim();
      if (!Number.isNaN(idx)) {
        speakText(`${ordWord(idx)} option${label ? `: ${label}` : ""}`);
      } else {
        speakText(label || "Option");
      }
      return;
    }
    if (tag === "button") {
      const t = el.innerText?.trim() || "button";
      speakText(t);
      return;
    }
    if (tag === "a") {
      const t = el.innerText?.trim() || "link";
      speakText(t);
      return;
    }
    if (tag === "input") {
      speakText("Text field");
      return;
    }
  };

  useEffect(() => {
    if (!hasVisual) return;

    const onKey = (e) => {
      const key = e.key?.toLowerCase();

      // Ignore typing in text fields (except radios)
      const ae = document.activeElement;
      const tag = ae?.tagName?.toLowerCase();
      const typing =
        (tag === "input" && ae?.type !== "radio") ||
        tag === "textarea" ||
        ae?.isContentEditable;
      if (typing) return;

      // F → advance focus list and speak
      if (key === "f") {
        const list = focusablesRef.current;
        if (!list.length) return;
        e.preventDefault();

        const next = (navIndexRef.current + 1) % list.length;
        const el = list[next];

        // Prefer inner radio when focusing MCQ list items
        let target = el;
        if (el.tagName?.toLowerCase() !== "input" && el.querySelector) {
          const inner = el.querySelector("input[type='radio']");
          if (inner) target = inner;
        }

        try {
          clearFocusRing(prevFocusRef.current);
          target.focus?.();
          applyFocusRing(target);
          prevFocusRef.current = target;
        } catch {}

        navIndexRef.current = next;
        setNavIndex(next);
        speakFocused(target);
        return;
      }

      // J → "press" the focused thing (or re-say headings/structural)
      if (key === "j") {
        const list = focusablesRef.current;
        if (!list.length) return;
        e.preventDefault();

        let el = document.activeElement;
        if (!containerRef.current?.contains(el)) {
          el = list[Math.max(navIndexRef.current, 0)] || list[0];
          try {
            clearFocusRing(prevFocusRef.current);
            el.focus?.();
            applyFocusRing(el);
            prevFocusRef.current = el;
          } catch {}
        }
        if (!el) return;

        // Structural: just read again
        if (el.getAttribute?.("data-fj-structural") === "1") {
          const t = (el.innerText || "").trim();
          if (t) speakText(t);
          return;
        }

        const tname = el.tagName?.toLowerCase();

        // Headings: read again
        if (tname === "h1" || tname === "h2" || tname === "h3") {
          const t = (el.innerText || "").trim();
          if (t) speakText(t);
          return;
        }

        // If wrapper, prefer its interactive child
        if (!["input", "button", "a"].includes(tname) && el.querySelector) {
          const inner = el.querySelector(
            "input[type='radio'], button, a[href]"
          );
          if (inner) el = inner;
        }

        const t = el.tagName?.toLowerCase();

        if (t === "input" && el.type === "radio") {
          const idxStr = el.getAttribute("data-opt-idx");
          const idx = idxStr ? parseInt(idxStr, 10) : NaN;
          el.click();
          let label = el.closest("label")?.textContent?.trim() || "";
          label = label.replace(/\s+/g, " ").trim();
          if (!Number.isNaN(idx)) {
            speakText(
              `Selected ${ordWord(idx)} option${
                label ? `: ${label}` : ""
              }`
            );
          } else {
            speakText(label ? `Selected ${label}` : "Selected option");
          }
          return;
        }

        if (
          t === "button" ||
          t === "a" ||
          (t === "input" && el.type === "button")
        ) {
          const name =
            el.innerText?.trim() ||
            (t === "a" ? "link" : el.value || "button");
          speakText(`Activated ${name}`);
          el.click?.();
          return;
        }

        if (t === "input") {
          speakText("Editing text field");
          el.focus?.();
          return;
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasVisual]);
  // ────────────────────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <p style={{ padding: "3rem", fontSize: "1.4rem" }}>
        Loading assessment...
      </p>
    );
  if (!assessment)
    return (
      <p style={{ padding: "3rem", fontSize: "1.4rem" }}>
        Assessment not found.
      </p>
    );

  if (supports.includes("motor") && !motorPreference)
    return (
      <MotorPreference
        userId={user.id}
        onComplete={async () => {
          const { data } = await axios.get(
            `http://localhost:5000/get-user/${user.id}`
          );
          setMotorPreference(data.motorPreference);
        }}
      />
    );

  const { questions } = assessment;
  const hasDyslexia =
    supports.includes("dyslexia") || supports.includes("adhd");
  const hasAutism = supports.includes("autism");
  const isSipPuff = supports.includes("motor") && motorPreference === "sip";
  const isEyeTracking =
    supports.includes("motor") && motorPreference === "eye";
  const isHearing = supports.includes("hearing");

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((ci) => ci + 1);
    }
  };

  const translatedQ = translations.questions[currentIndex] || "";
  const translatedOpts = translations.options[currentIndex] || [];

  return (
    <div
      ref={containerRef}
      className={hasVisual ? "high-contrast" : ""}
      // FULL SCREEN black for visual users — fixed container to avoid margin collapse
      style={{
        position: hasVisual ? "fixed" : "relative",
        inset: hasVisual ? 0 : undefined,
        minHeight: "100vh",
        backgroundColor: hasVisual ? "#000" : undefined,
        color: hasVisual ? "#fff" : undefined,
        padding: hasVisual ? "24px 16px" : undefined, // prevents top-margin collapse and shows full black
        overflow: hasVisual ? "auto" : undefined,
      }}
    >
      {hasVisual && (
        <button
          onClick={() => setHighContrast((hc) => !hc)}
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            padding: "8px 12px",
            background: highContrast ? "#fff" : "#333",
            color: highContrast ? "#000" : "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            zIndex: 1000,
          }}
          onFocus={() =>
            speakText(
              highContrast ? "Normal contrast" : "High contrast toggle"
            )
          }
        >
          {highContrast ? "Normal Contrast" : "High Contrast"}
        </button>
      )}

      {/* Assessment title is focusable for visual users and will be read on focus */}
      <h1
        ref={titleRef}
        data-fj-structural="1"
        tabIndex={hasVisual ? 0 : -1}
        style={{
          fontSize: "1.6rem",
          fontWeight: 700,
          marginBottom: "0.75rem",
          outline: "none",
        }}
        onMouseEnter={() =>
          enableHoverTTS && speakText(assessment?.title || "")
        }
        onFocus={() => speakText(assessment?.title || "")}
      >
        {assessment?.title || ""}
      </h1>

      {supports.includes("cognitive") && (
        <CognitiveFeatures questionText={translatedQ} />
      )}

      {hasVisual && translatedQ && translatedOpts.length > 0 && (
        <BrailleSpeaker
          question={translatedQ}
          options={translatedOpts}
        />
      )}

      <h2
        ref={questionRef}
        data-fj-structural="1"
        style={{
          fontSize: "2.2rem",
          marginBottom: "1rem",
          lineHeight: "1.3",
        }}
        tabIndex={hasVisual ? 0 : -1}
        onMouseEnter={() => enableHoverTTS && speakText(translatedQ)}
        onFocus={() => speakText(translatedQ)}
      >
        {translatedQ}
      </h2>

      {!hasAutism && effectiveTimer != null && (
        <p
          style={{ fontSize: "1.4rem", marginBottom: "1rem" }}
          tabIndex={0}
          onFocus={() =>
            speakText(
              `Time left ${Math.floor(timeLeft / 60)} minutes ${String(
                timeLeft % 60
              ).padStart(2, "0")} seconds`
            )
          }
        >
          ⏱ Time Left:{" "}
          <strong>
            {Math.floor(timeLeft / 60)}:
            {String(timeLeft % 60).padStart(2, "0")}
          </strong>
        </p>
      )}

      {hasAutism && (
        <p
          style={{
            fontSize: "1.3rem",
            fontWeight: "bold",
            color: hasVisual ? "#E5E7EB" : "#334155",
            marginBottom: "1rem",
          }}
          tabIndex={0}
          onFocus={() =>
            speakText(
              `Step ${currentIndex + 1} of ${questions.length}`
            )
          }
        >
          Step {currentIndex + 1} of {questions.length}
        </p>
      )}

      {hasDyslexia ? (
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1.75rem",
            borderRadius: "16px",
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.10), rgba(236,72,153,0.08))",
            border: "1px solid rgba(148,163,184,0.4)",
            boxShadow: "0 14px 30px rgba(15,23,42,0.18)",
            backdropFilter: "blur(6px)",
          }}
          tabIndex={0}
          onFocus={() =>
            speakText(
              `Dyslexia and ADHD support zone. Question ${
                currentIndex + 1
              } of ${questions.length}. Focus on one question at a time.`
            )
          }
        >
          {/* Header row: title + progress pill */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginBottom: "0.75rem",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                Dyslexia & ADHD Support Zone
              </h3>
              <p
                style={{
                  marginTop: "0.2rem",
                  fontSize: "0.95rem",
                  color: "#475569",
                }}
              >
                Focus on one question at a time. Hints, gamification and
                pacing are tailored just for you.
              </p>
            </div>

            <div
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "999px",
                backgroundColor: "#ecfeff",
                border: "1px solid #22d3ee",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#0891b2",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                whiteSpace: "nowrap",
              }}
            >
              <span>🎮</span>
              <span>
                Question {currentIndex + 1} / {questions.length}
              </span>
            </div>
          </div>

          {/* Gentle info strip */}
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.7rem 0.9rem",
              borderRadius: "10px",
              backgroundColor: "#fefce8",
              border: "1px dashed #facc15",
              fontSize: "0.9rem",
              color: "#854d0e",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}
          >
            <span style={{ marginTop: "0.05rem" }}>💡</span>
            <span>
              Take your time. You’ll get feedback and small rewards as you
              answer correctly. You can always move to the next question
              when you’re ready.
            </span>
          </div>

          {/* Actual DyslexiaFeatures component */}
          <div
            style={{
              borderRadius: "12px",
              backgroundColor: "#ffffff",
              padding: "1.25rem",
              border: "1px solid #e2e8f0",
            }}
          >
            <DyslexiaFeatures
              question={questions[currentIndex]}
              onAnswer={(opt) => {
                setSelectedAnswers((a) => ({
                  ...a,
                  [currentIndexRef.current]:
                    questions[currentIndexRef.current].options.indexOf(
                      opt
                    ),
                }));
              }}
              onCorrectSubmit={handleNext}
            />
          </div>
        </div>
      ) : (
        <QuestionItem
          question={questions[currentIndex]}
          questionIndex={currentIndex}
          totalQuestions={questions.length}
          shortAnswers={shortAnswers}
          visualMode={hasVisual}
          cognitiveMode={supports.includes("cognitive")}
          autismMode={hasAutism}
          isHearing={isHearing}
          translatedQuestion={translatedQ}
          translatedOptions={translatedOpts}
          onSimplify={() => handleSimplify(translatedQ)}
          simplified={simplified}
          simplifying={simplifying}
          onAnswer={(i, sel) => {
            setSelectedAnswers((prev) => ({ ...prev, [i]: sel }));
            setHighlightedOption(sel);
          }}
          onShortAnswer={(i, ans) =>
            setShortAnswers((prev) => ({ ...prev, [i]: ans }))
          }
          highlightedOption={highlightedOption}
          imageA11y={imageA11y}
          setImageA11y={setImageA11y}
          language={language}
          enableHoverTTS={enableHoverTTS}
        />
      )}

      {/* Voice control (space bar shortcut active) */}
      {hasVisual && (
        <div style={{ marginTop: "1.25rem" }}>
          <VoiceControl
            enabled
            onSelect={(idx) => {
  if (!assessment?.questions[currentIndex]?.options?.length)
    return;
  setSelectedAnswers((prev) => ({
    ...prev,
    [currentIndex]: idx,
  }));
  setHighlightedOption(idx);

  const ord =
    ["first", "second", "third", "fourth"][idx] ||
    `option ${idx + 1}`;

  // 👉 Only this line changed:
  speakText(`Selected ${ord} option`);
}}

          onNext={() => {
  if (currentIndex < questions.length - 1) {
    handleNext();
    speakText("Next question");
  } else {
    // 👉 On last question: auto-submit
    speakText("Submitting your answers");
    submitScore();
  }
}}

            onSubmit={() => {
  // Always submit, even if not last question
  speakText("Submitting your answers");
  submitScore();
}}

            lang={language?.toLowerCase() === "english" ? "en-US" : "en-IN"}
          />
        </div>
      )}

      <div
        style={{
          marginTop: hasAutism ? "2.5rem" : "2rem",
          display: "flex",
          gap: hasAutism ? "1.5rem" : "1rem",
        }}
      >
        {currentIndex < questions.length - 1 ? (
          <button
            onClick={handleNext}
            style={
              hasAutism
                ? {
                    padding: "14px 28px",
                    fontSize: "1.2rem",
                    borderRadius: "10px",
                    backgroundColor: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }
                : visualButtonStyle
            }
            onMouseEnter={() => enableHoverTTS && speakText("Next")}
            onFocus={() => speakText("Next")}
          >
            Next
          </button>
        ) : (
          <button
            onClick={submitScore}
            disabled={submitLoading}
            style={
              hasAutism
                ? {
                    padding: "14px 28px",
                    fontSize: "1.2rem",
                    borderRadius: "10px",
                    backgroundColor: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }
                : visualButtonStyle
            }
            onMouseEnter={() =>
              enableHoverTTS && speakText("Finish")
            }
            onFocus={() =>
              speakText(
                submitLoading
                  ? "Submitting your answers"
                  : "Finish assessment"
              )
            }
          >
            {submitLoading ? "Submitting..." : "Finish"}
          </button>
        )}
      </div>

      {isEyeTracking && (
        <EyeTrackingListener
          onBlink={() => {
            const optsLen =
              questionsRef.current[currentIndexRef.current].options
                .length;
            const next =
              (highlightedOptionRef.current + 1) % optsLen;
            setHighlightedOption(next);
            setSelectedAnswers((a) => ({
              ...a,
              [currentIndexRef.current]: next,
            }));
          }}
          onLongClose={() => {
            if (
              currentIndexRef.current <
              questionsRef.current.length - 1
            ) {
              setCurrentIndex((ci) => ci + 1);
            } else {
              submitScore();
            }
          }}
        />
      )}
      {isSipPuff && (
        <SipPuffListener
          onSip={() => {
            const optsLen =
              questionsRef.current[currentIndexRef.current].options
                .length;
            const next =
              (highlightedOptionRef.current + 1) % optsLen;
            setHighlightedOption(next);
            setSelectedAnswers((a) => ({
              ...a,
              [currentIndexRef.current]: next,
            }));
          }}
          onPuff={() => {
            if (
              currentIndexRef.current <
              questionsRef.current.length - 1
            ) {
              setCurrentIndex((ci) => ci + 1);
            } else {
              submitScore();
            }
          }}
        />
      )}
    </div>
  );
}

function QuestionItem({
  question,
  questionIndex,
  totalQuestions,
  visualMode,
  cognitiveMode,
  autismMode,
  isHearing,
  translatedQuestion,
  translatedOptions,
  onSimplify,
  simplified,
  simplifying,
  onAnswer,
  onShortAnswer,
  shortAnswers,
  highlightedOption,
  imageA11y,
  setImageA11y,
  language,
  enableHoverTTS,
}) {
  const [selectedOption, setSelectedOption] = useState(null);
  const optionRefs = useRef([]);

  useEffect(() => {
    setSelectedOption(highlightedOption);
  }, [highlightedOption]);

  const base = "http://localhost:5000";
  const fullImageUrl = question.imageUrl
    ? question.imageUrl.startsWith("http")
      ? question.imageUrl
      : `${base}${question.imageUrl}`
    : null;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!fullImageUrl) return;
      if (
        imageA11y[fullImageUrl]?.caption &&
        imageA11y[fullImageUrl]?.hint !== undefined
      )
        return;
      try {
        const { data } = await axios.post(
          "http://localhost:8000/vision-describe-url",
          {
            image_url: fullImageUrl,
          }
        );
        let { caption = "An image is shown.", hint = "", missing = "" } =
          data || {};

        let tCaption = caption;
        let tHint = hint;
        if (language && language.toLowerCase() !== "english") {
          try {
            const resp = await axios.post(
              "http://localhost:8000/translate-batch",
              {
                sentences: [caption, hint || ""],
                lang: language,
              }
            );
            const arr = resp.data.translations || [];
            tCaption = arr[0] || caption;
            tHint = (arr[1] || "").trim();
          } catch {}
        }

        if (!cancelled) {
          setImageA11y((prev) => ({
            ...prev,
            [fullImageUrl]: {
              caption,
              hint,
              missing,
              tCaption,
              tHint,
            },
          }));
        }
      } catch {
        if (!cancelled) {
          setImageA11y((prev) => ({
            ...prev,
            [fullImageUrl]: {
              caption: "Image shown.",
              hint: "",
              missing: "",
              tCaption: null,
              tHint: null,
            },
          }));
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [fullImageUrl, language, setImageA11y, imageA11y]);

  const a11y = fullImageUrl ? imageA11y[fullImageUrl] : null;
  const shownCaption = a11y?.tCaption || a11y?.caption;
  const shownHint = (a11y?.tHint || a11y?.hint || "").trim();

  // NEW: summary that includes all options for the question
  const optionsSummary =
    question.type === "mcq" && translatedOptions.length
      ? translatedOptions
          .map((opt, idx) => `Option ${idx + 1}: ${opt}`)
          .join(". ")
      : "";

  return (
    <div
      tabIndex={0}
      onMouseEnter={() =>
        enableHoverTTS && speakText(translatedQuestion)
      }
      onMouseLeave={() => window.speechSynthesis.cancel()}
      onFocus={() =>
        speakText(
          `Question ${questionIndex + 1} of ${totalQuestions}. ${
            translatedQuestion || ""
          }${optionsSummary ? `. ${optionsSummary}` : ""}`
        )
      }
      style={
        autismMode
          ? {
              borderWidth: "3px",
              borderStyle: "solid",
              borderColor: "#cbd5e1",
              background: "#fff",
              color: "#000",
              padding: "2rem",
              borderRadius: "12px",
              marginTop: "1.5rem",
              fontSize: "1.4rem",
            }
          : {
              marginTop: "1.5rem",
              padding: "1.5rem",
              border: "2px solid #ccc",
              borderRadius: "8px",
              fontSize: "1.3rem",
              background: "transparent",
            }
      }
    >
      <p
        data-fj-structural="1"
        style={{ marginBottom: "1rem", lineHeight: "1.4" }}
      >
        <strong>
          Question {questionIndex + 1}/{totalQuestions}:
        </strong>{" "}
        {translatedQuestion}
      </p>

      {cognitiveMode && (
        <div style={{ margin: "1.2rem 0" }}>
          <button
            onClick={onSimplify}
            disabled={simplifying}
            style={{
              ...visualButtonStyle,
              backgroundColor: "#4f46e5",
              marginBottom: "1rem",
            }}
            onFocus={() => speakText("Simplify question")}
          >
            {simplifying ? "Simplifying..." : "🧠 Simplify Question"}
          </button>
          {simplified && (
            <div
              style={{
                backgroundColor: "#f1f5f9",
                padding: "1.2rem",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "#cbd5e1",
                borderRadius: "8px",
                fontFamily: "Segoe UI, sans-serif",
                whiteSpace: "pre-wrap",
                fontSize: "1.1rem",
                color: "#000",
              }}
            >
              <p>
                <strong>🔍 Simplified:</strong>
              </p>
              {simplified}
            </div>
          )}
        </div>
      )}

      {fullImageUrl && (
        <div style={{ marginTop: "1rem" }}>
          <img
            src={fullImageUrl}
            alt={shownCaption || "Assessment image"}
            style={{
              maxWidth: "320px",
              width: "100%",
              height: "auto",
              borderRadius: 8,
            }}
            onMouseEnter={() =>
              enableHoverTTS &&
              shownCaption &&
              speakText(shownCaption)
            }
            onFocus={() => shownCaption && speakText(shownCaption)}
          />
          <div style={{ marginTop: "0.5rem" }}>
            <p style={{ margin: 0, fontStyle: "italic" }}>
              {shownCaption || "Describing image…"}
            </p>
            {!!shownHint && (
              <p
                style={{ marginTop: "0.25rem", color: "#D1D5DB" }}
                onMouseEnter={() =>
                  enableHoverTTS && speakText(shownHint)
                }
                onFocus={() => speakText(shownHint)}
              >
                💡 {shownHint}
              </p>
            )}
          </div>
        </div>
      )}

      {question.type === "mcq" && (
        <ul
          style={{
            listStyle: "none",
            paddingLeft: 0,
            fontSize: "1.2rem",
            display: "flex",
            flexDirection: "column",
            gap: "2rem",
          }}
        >
          {translatedOptions.map((opt, i) => (
            <li
              key={i}
              tabIndex={0}
              ref={(el) => (optionRefs.current[i] = el)}
              style={{ marginBottom: "0.8rem" }}
              onKeyDown={(e) => {
                if (e.key === "Tab" && !e.shiftKey) {
                  e.preventDefault();
                  const nxt =
                    (i + 1) % translatedOptions.length;
                  optionRefs.current[nxt]?.focus();
                } else if (e.key === "Tab" && e.shiftKey) {
                  e.preventDefault();
                  const prv =
                    (i - 1 + translatedOptions.length) %
                    translatedOptions.length;
                  optionRefs.current[prv]?.focus();
                }
              }}
              onFocus={() =>
                speakText(`Option ${i + 1}: ${opt}`)
              }
            >
              <label style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name={`q-${questionIndex}`}
                  data-q-index={questionIndex}
                  data-opt-idx={i}
                  checked={selectedOption === i}
                  onChange={() => {
                    setSelectedOption(i);
                    onAnswer(questionIndex, i);
                    speakText(
                      `Selected option ${i + 1}: ${opt}`
                    );
                  }}
                  style={{
                    transform: "scale(1.3)",
                    marginRight: "0.5rem",
                  }}
                />
                {opt}
              </label>
            </li>
          ))}
        </ul>
      )}

      {question.type === "short" &&
        (isHearing ? (
          <SignInput
            onChange={(val) =>
              onShortAnswer(questionIndex, val)
            }
          />
        ) : (
          <>
            <input
              type="text"
              placeholder="Type your answer…"
              value={shortAnswers[questionIndex] || ""}
              onChange={(e) =>
                onShortAnswer(questionIndex, e.target.value)
              }
              style={{
                marginTop: "0.8rem",
                padding: "8px",
                fontSize: "1.2rem",
                width: "100%",
                borderRadius: "6px",
                border: "1px solid #ccc",
                background: "#fff",
                color: "#000",
              }}
              onMouseEnter={() =>
                enableHoverTTS && speakText("Type your answer")
              }
              onMouseLeave={() => window.speechSynthesis.cancel()}
              onFocus={() => speakText("Answer text box")}
            />
            <SpeechInput
              onTranscribe={(text) => {
                onShortAnswer(questionIndex, text);
              }}
            />
          </>
        ))}
    </div>
  );
}

// 🎙️ Voice control component (space bar toggle, no visible hint)
function VoiceControl({
  enabled,
  onSelect,
  onNext,
  onSubmit,
  lang = "en-US",
}) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    listeningRef.current = listening;
  }, [listening]);

  const supported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition ||
      window.webkitSpeechRecognition);

  useEffect(() => {
    if (!supported) return;
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    recRef.current = rec;
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = lang;

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0]?.transcript || "")
        .join(" ")
        .toLowerCase()
        .trim();
      handleTranscript(transcript);
      setListening(false);
      rec.stop();
    };
    rec.onerror = () => {
      setListening(false);
      rec.stop();
    };
    rec.onend = () => setListening(false);

    return () => {
      try {
        rec.stop();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const handleTranscript = (t) => {
    const txt = t.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();

    if (/\b(submit|finish|done|complete|final|turn in)\b/.test(txt)) {
      onSubmit?.();
      return;
    }
    if (
      /\b(next|go next|continue|skip|move next|proceed|forward|move on)\b/.test(
        txt
      )
    ) {
      onNext?.();
      return;
    }

    const optionMap = [
      /\b(1st|first(?:\s+option)?|option\s*1|option\s*one|one|a|ay|alpha)\b/i,
      /\b(2nd|second(?:\s+option)?|option\s*2|option\s*two|two|b|bee|bravo)\b/i,
      /\b(3rd|third(?:\s+option)?|option\s*3|option\s*three|three|3nd|c|see|charlie)\b/i,
      /\b(4th|fourth(?:\s+option)?|option\s*4|option\s*four|four|d|dee|delta)\b/i,
    ];
    for (let i = 0; i < optionMap.length; i++) {
      if (optionMap[i].test(txt)) {
        onSelect?.(i);
        return;
      }
    }

    if (/\b(select|choose|pick)\b/i.test(txt)) {
      for (let i = 0; i < optionMap.length; i++) {
        if (optionMap[i].test(txt)) {
          onSelect?.(i);
          return;
        }
      }
    }
  };

  const start = () => {
    if (!supported || !enabled) return;
    try {
      setListening(true);
      recRef.current?.start();
      speakText(
        "Voice answer on."
      );
    } catch {
      setListening(false);
    }
  };
  const stop = () => {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  };

  // Space bar toggles microphone ON/OFF (global)
  useEffect(() => {
    if (!supported) return;

    const onKeyDown = (e) => {
      if (!enabled) return;

      const key = e.code || e.key;
      if (key === "Space" || key === " " || key === "Spacebar") {
        const ae = document.activeElement;
        const tag = ae?.tagName?.toLowerCase();
        const typing =
          tag === "input" ||
          tag === "textarea" ||
          ae?.isContentEditable;

        if (typing) return;

        e.preventDefault();

        if (!listeningRef.current) {
          start();
        } else {
          stop();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, supported]);

  return (
    <div
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        onClick={listening ? stop : start}
        style={{
          padding: "12px 18px",
          borderRadius: 999,
          border: "none",
          background: listening ? "#ef4444" : "#10b981",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
        }}
        title="Voice control (press to talk)"
        onFocus={() =>
          speakText(
            "Answer by voice button. You can also press the space bar to toggle the microphone."
          )
        }
      >
        {listening ? "◼ Stop Listening" : "🎙️ Answer by Voice"}
      </button>

      {!supported && (
        <span style={{ fontSize: 14, color: "#b91c1c" }}>
          Voice control not supported in this browser.
        </span>
      )}
    </div>
  );
}

// Global speech handlers
function stopSpeaking() {
  window.speechSynthesis.cancel();
}

async function speakText(text) {
  window.speechSynthesis.cancel();
  if ((window.currentLanguage || "english").toLowerCase() === "english") {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
    return;
  }
  try {
    const form = new URLSearchParams();
    form.append("text", text);
    const res = await fetch("http://localhost:5005/tts", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
  } catch (e) {
    console.error("❌ Dwani TTS failed:", e);
  }
}
