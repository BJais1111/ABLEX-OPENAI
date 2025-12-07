//  AbleX Onboarding.jsx with spaced layout, kind support labels, Tab/Enter navigation, and speech feedback
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";

const speak = (text) => {
  const synth = window.speechSynthesis;
  if (synth.speaking) synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 1;
  synth.speak(utter);
};

export default function Onboarding() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [supports, setSupports] = useState([]);
  const [language, setLanguage] = useState("english");
  const containerRef = useRef(null);

  const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  useEffect(() => {
    const handleKeyDown = (e) => {
      const focusableEls = containerRef.current.querySelectorAll(focusableSelectors);
      const firstEl = focusableEls[0];
      const lastEl = focusableEls[focusableEls.length - 1];

      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "Tab" || e.key === "Enter") {
        const focusedEl = document.activeElement;
        if (focusedEl && focusedEl.getAttribute("aria-label")) {
          speak(focusedEl.getAttribute("aria-label"));
        } else if (focusedEl && focusedEl.innerText) {
          speak(focusedEl.innerText);
        }
      }
    };

    const node = containerRef.current;
    node.addEventListener("keydown", handleKeyDown);
    node.addEventListener("keyup", handleKeyUp);
    return () => {
      node.removeEventListener("keydown", handleKeyDown);
      node.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const isIncompatible = (value) => {
    return (
      (value === "motor" && supports.includes("visual")) ||
      (value === "visual" && supports.includes("motor"))
    );
  };

  const handleSupportToggle = (value, label) => {
    if (supports.includes(value)) {
      setSupports(supports.filter((v) => v !== value));
      speak(label + " deselected");
    } else if (supports.length < 2 && !isIncompatible(value)) {
      setSupports([...supports, value]);
      speak(label + " selected");
    } else if (isIncompatible(value)) {
      speak("This combination is not supported");
    } else {
      speak("You can select only two support preferences.");
    }
  };

  const handleNext = async () => {
    if (!user) return;
    if (role === "educator") {
      speak("Welcome Educator. Redirecting to your dashboard.");
      await axios.post("http://localhost:5000/onboarding", {
        userId: user.id,
        role: "educator",
        isOnboarded: true
      });
      navigate("/dashboard/educator");
    } else {
      setStep(2);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    const summary = supports.length
      ? `Student support selected: ${supports.join(" and ")}. Redirecting.`
      : "Student selected. Redirecting.";
    speak(summary);

    await axios.post("http://localhost:5000/onboarding", {
      userId: user.id,
      role: "student",
      supports,
      language,
      isOnboarded: true
    });
    navigate("/dashboard/student");
  };

  return (
    <div ref={containerRef} style={styles.container}>
      <h1
        style={styles.title}
        tabIndex={0}
        onMouseEnter={() => speak("Welcome")}
        onFocus={() => speak("Welcome to AbleX")}
      >
        Welcome to AbleX✨
      </h1>

      {step === 1 && (
        <>
          <p style={styles.subtext} tabIndex={0} onMouseEnter={() => speak("Let us know who you are")}>Let us know who you are so we can personalize your experience.</p>

          <div style={styles.cardContainer}>
            <div
              tabIndex={0}
              role="button"
              aria-label="I’m an Educator"
              style={{
                ...styles.card,
                ...(role === "educator" ? styles.activeCardEducator : {}),
              }}
              onClick={() => {
                setRole("educator");
                speak("I’m an Educator");
              }}
              onMouseEnter={() => speak("I’m an Educator")}
              onKeyDown={(e) => {
                if (e.key === "Enter") setRole("educator");
              }}
            >
              <span style={styles.emoji}>👨‍🏫</span>
              <span style={styles.label}>I’m an Educator</span>
            </div>

            <div
              tabIndex={0}
              role="button"
              aria-label="I’m a Student"
              style={{
                ...styles.card,
                ...(role === "student" ? styles.activeCardStudent : {}),
              }}
              onClick={() => {
                setRole("student");
                speak("I’m a Student");
              }}
              onMouseEnter={() => speak("I’m a Student")}
              onKeyDown={(e) => {
                if (e.key === "Enter") setRole("student");
              }}
            >
              <span style={styles.emoji}>🎓</span>
              <span style={styles.label}>I’m a Student</span>
            </div>
          </div>

          <button
            disabled={!role}
            onClick={handleNext}
            onMouseEnter={() => speak("Continue")}
            style={{
              ...styles.button,
              ...(role ? {} : styles.buttonDisabled),
            }}
          >
            Continue →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p
            style={styles.subtext}
            tabIndex={0}
            onMouseEnter={() => speak("How can we best support your learning? You may select up to two.")}
          >
            How can we best support your learning? You may select up to two.
          </p>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ marginBottom: "20px", padding: "10px", fontSize: "1rem" }}
          >
            <option value="english">English</option>
            <option value="kannada">Kannada</option>
            <option value="hindi">Hindi</option>
          </select>

          <div style={styles.cardContainer}>
            {[
              { label: "I benefit from visual support", value: "visual", emoji: "👁️" },
              
              { label: "I use alternate input methods", value: "motor", emoji: "🦽" },
              { label: "I prefer focused and simplified content", value: "cognitive", emoji: "🧠" },
              { label: "I benefit from gamified and audio support", value: "adhd", emoji: "📚" },
              { label: "I prefer structured, sensory-friendly layout", value: "autism", emoji: "🧩" },
            ].map((opt) => (
              <div
                key={opt.value}
                tabIndex={0}
                role="button"
                aria-label={opt.label}
                style={{
                  ...styles.cardSmall,
                  ...(supports.includes(opt.value) ? styles.activeCardStudent : {}),
                }}
                onClick={() => handleSupportToggle(opt.value, opt.label)}
                onMouseEnter={() => speak(opt.label)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSupportToggle(opt.value, opt.label);
                }}
              >
                <span style={styles.emoji}>{opt.emoji}</span>
                <span style={styles.label}>{opt.label}</span>
              </div>
            ))}
          </div>

          <button
            disabled={!supports.length}
            onClick={handleFinish}
            onMouseEnter={() => speak("Continue to dashboard")}
            style={{
              ...styles.button,
              ...(supports.length ? {} : styles.buttonDisabled),
            }}
          >
            Continue to Dashboard →
          </button>
        </>
      )}
    </div>
  );
}



const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#F7F1FF",
    fontFamily: "'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px",
    textAlign: "center",
  },
  title: {
    fontSize: "2.6rem",
    color: "#333",
    marginBottom: "20px",
  },
  subtext: {
    color: "#666",
    fontSize: "1.2rem",
    maxWidth: "620px",
    marginBottom: "40px",
  },
  cardContainer: {
    display: "flex",
    gap: "30px",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: "40px",
  },
  card: {
    width: "260px",
    height: "180px",
    backgroundColor: "#fff",
    border: "2px solid #ccc",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
  },
  cardSmall: {
    width: "220px",
    height: "160px",
    backgroundColor: "#fff",
    border: "2px solid #ccc",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
  },
  activeCardEducator: {
    backgroundColor: "#D8EAFE",
    borderColor: "#A0D8EF",
  },
  activeCardStudent: {
    backgroundColor: "#DFFFE0",
    borderColor: "#B2F2BB",
  },
  emoji: {
    fontSize: "2.2rem",
    marginBottom: "10px",
  },
  label: {
    fontSize: "1.05rem",
    color: "#333",
    fontWeight: 500,
  },
  button: {
    fontSize: "1.1rem",
    padding: "14px 30px",
    border: "none",
    borderRadius: "10px",
    backgroundColor: "#A0D8EF",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
  },
};
