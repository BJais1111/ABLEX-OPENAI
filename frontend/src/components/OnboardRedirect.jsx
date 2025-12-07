import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axios from "axios";

export default function OnboardRedirect() {
  const { user } = useUser();
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    const speak = (text) => {
      const synth = window.speechSynthesis;
      if (!synth.speaking) {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = "en-US";
        utter.rate = 1;
        synth.speak(utter);
      }
    };

    const checkOnboarding = async () => {
      try {
        speak("Checking your onboarding status.");
        const res = await axios.get(`http://localhost:5000/get-user/${user.id}`);
        const { isOnboarded, role } = res.data;

        if (!isOnboarded) {
          setDestination("/onboarding");
        } else {
          setDestination(`/dashboard/${role || "student"}`);
        }
      } catch (err) {
        console.error("❌ Error checking onboarding status:", err);
        setDestination("/onboarding");
      }
    };

    if (user) checkOnboarding();
  }, [user]);

  if (!destination) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "'Segoe UI', sans-serif",
          backgroundColor: "#eaf6ff",
        }}
      >
        <div
          style={{
            border: "6px solid #fce4ec",
            borderTop: "6px solid #6ec6ca",
            borderRadius: "50%",
            width: "60px",
            height: "60px",
            animation: "spin 1s linear infinite",
            marginBottom: "1.5rem",
          }}
          aria-hidden="true"
        />
        <p
          style={{ fontSize: "1.2rem", color: "#555" }}
          aria-live="polite"
        >
          Checking onboarding status…
        </p>

        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return <Navigate to={destination} />;
}
