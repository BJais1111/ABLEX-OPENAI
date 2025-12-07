import React, { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import "../../../fonts.css";

const correctSound = new Audio("/correct.mp3");
const motivationalMessages = ["Awesome! 🎯", "You rock! 💖", "Keep going! 🚀", "Fantastic! 🎉"];

export default function DyslexiaFeatures({ question, onAnswer, onCorrectSubmit }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [motivationalText, setMotivationalText] = useState("");
  const hasCelebrated = useRef(false);

  useEffect(() => {
    if (question?.questionText) {
      speak(question.questionText);
    }
    setSelectedOption(null);
    setIsSubmitted(false);
    hasCelebrated.current = false;
    setShowSuccess(false);
    setMotivationalText("");
  }, [question]);

  const speak = (text) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const handleOptionClick = (opt) => {
    setSelectedOption(opt);
    speak(opt);
  };

  const handleSubmit = () => {
    if (!selectedOption || isSubmitted) return;

    const isCorrect =
      selectedOption.trim().toLowerCase() === question.correctAnswer?.trim().toLowerCase();

    setIsSubmitted(true);
    if (onAnswer) onAnswer(selectedOption);

    if (isCorrect) {
      triggerConfetti();
      triggerEmojiFireworks();
      correctSound.play();
      showBalloon();

      const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      setMotivationalText(randomMessage);

      if (!hasCelebrated.current) {
        hasCelebrated.current = true;
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1500);
        setStreak((prev) => {
          const newStreak = prev + 1;
          if (newStreak % 5 === 0) setLevel((lvl) => lvl + 1);
          return newStreak;
        });

        // ⏩ Auto-advance after 1.8s
        if (onCorrectSubmit) {
          setTimeout(() => onCorrectSubmit(), 1800);
        }
      }
    } else {
      setStreak(0);
      setMotivationalText("");
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      shapes: ["circle", "square", "star"],
      scalar: 1.2,
    });
  };

  const triggerEmojiFireworks = () => {
    const emojis = ["✨", "🎉", "🌟"];
    emojis.forEach((emoji, idx) => {
      const elem = document.createElement("div");
      elem.textContent = emoji;
      elem.className = "emoji-firework";
      elem.style.left = `${Math.random() * 100}%`;
      elem.style.top = `${Math.random() * 100}%`;
      document.body.appendChild(elem);
      setTimeout(() => elem.remove(), 2000 + idx * 200);
    });
  };

  const showBalloon = () => {
    const balloon = document.createElement("div");
    balloon.className = "balloon";
    balloon.textContent = "🎈";
    document.body.appendChild(balloon);
    setTimeout(() => balloon.remove(), 3000);
  };

  if (!question) return null;

  return (
    <div style={styles.wrapper}>
      <style>{keyframes}</style>
      <p style={styles.question}>{question.questionText}</p>

      <div style={styles.status}>
        <span className="sparkle">🔥 Streak: {streak}</span> |{" "}
        <span className={`level ${level % 2 === 0 ? "shake" : ""}`}>🏆 Level: {level}</span>
      </div>

      {motivationalText && (
        <div style={styles.motivational} className="bounce">
          {motivationalText}
        </div>
      )}

      {showSuccess && (
        <div style={styles.successMessage} className="bounce">
          🎉 Well done! 🎉
        </div>
      )}

      {question.type === "mcq" && (
        <>
          <ul style={styles.optionList}>
            {(question.options || []).map((opt, idx) => (
              <li
                key={idx}
                tabIndex={0}
                role="button"
                aria-pressed={selectedOption === opt}
                style={{
                  ...styles.option,
                  backgroundColor: selectedOption === opt ? "#dbeafe" : "#fff",
                }}
                onClick={() => handleOptionClick(opt)}
                onFocus={() => speak(opt)}
                onMouseEnter={() => speak(opt)}
                className="hover-glow"
              >
                {opt}
              </li>
            ))}
          </ul>

          {selectedOption && !isSubmitted && (
            <button
              onClick={handleSubmit}
              style={{
                padding: "10px 20px",
                backgroundColor: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                marginTop: "1rem",
              }}
            >
              Submit Answer
            </button>
          )}
        </>
      )}

      {question.type === "short" && (
        <input
          type="text"
          placeholder="Type your answer..."
          style={styles.input}
          onFocus={() => speak("Type your answer")}
        />
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    fontFamily: "'OpenDyslexic', Arial, sans-serif",
    lineHeight: "1.8",
    letterSpacing: "0.08em",
    fontSize: "1.1rem",
    padding: "1rem",
    borderRadius: "10px",
    backgroundColor: "#f0f9ff",
    marginTop: "1rem",
    animation: "fadeIn 0.5s ease-in-out",
    textAlign: "center",
  },
  question: {
    marginBottom: "1rem",
    fontWeight: "bold",
  },
  status: {
    fontSize: "1.1rem",
    color: "#3b82f6",
    marginBottom: "1rem",
  },
  motivational: {
    fontSize: "1.4rem",
    color: "#f97316",
    fontWeight: "bold",
    marginBottom: "1rem",
  },
  optionList: {
    listStyle: "none",
    paddingLeft: 0,
  },
  option: {
    padding: "12px",
    border: "2px solid #60a5fa",
    borderRadius: "10px",
    marginBottom: "12px",
    cursor: "pointer",
    backgroundColor: "#fff",
    transition: "background-color 0.2s ease, transform 0.2s ease",
  },
  input: {
    width: "100%",
    padding: "12px",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  successMessage: {
    fontSize: "1.6rem",
    color: "#16a34a",
    fontWeight: "bold",
    margin: "1rem 0",
  },
};

const keyframes = `
@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

@keyframes shake {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(5deg); }
  50% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
  100% { transform: rotate(0deg); }
}

.sparkle {
  animation: sparkle 1.2s infinite alternate;
}

.level.shake {
  animation: shake 0.5s;
}

.bounce {
  animation: bounce 0.8s;
}

.emoji-firework {
  position: fixed;
  font-size: 2rem;
  animation: float 2s ease-out forwards;
  pointer-events: none;
}

@keyframes float {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-100px); }
}

.balloon {
  position: fixed;
  bottom: 0;
  left: 50%;
  font-size: 2.5rem;
  animation: balloon-rise 3s ease-out forwards;
  transform: translateX(-50%);
  pointer-events: none;
}

@keyframes balloon-rise {
  0% { bottom: 0; opacity: 1; }
  100% { bottom: 80%; opacity: 0; }
}

.hover-glow:hover {
  box-shadow: 0 0 12px 3px rgba(96, 165, 250, 0.8);
  transform: scale(1.05);
}
`;
