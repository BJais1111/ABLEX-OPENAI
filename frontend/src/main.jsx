// src/index.jsx

import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import '@fontsource/opendyslexic';

import { ClerkProvider } from "@clerk/clerk-react";
import { shadesOfPurple } from "@clerk/themes";

import App from "./App.jsx";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!clerkPubKey) throw new Error("Missing Clerk Publishable Key");

// 🧠 TTS Hover Utility
const speak = (text) => {
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
};

// 📦 TTS Wrapper
function AppWithTTS() {
  useEffect(() => {
    const handler = (e) => {
      const el = e.target;
      const label = el.getAttribute("aria-label") || el.innerText || el.alt;
      if (label && label.trim().length > 0) {
        speak(label.trim());
      }
    };

    document.addEventListener("mouseover", handler);
    return () => document.removeEventListener("mouseover", handler);
  }, []);

  return <App />;
}

// 🚦 Render with ClerkProvider
ReactDOM.createRoot(document.getElementById("root")).render(
  <ClerkProvider
    publishableKey={clerkPubKey}
    routing="history"
    afterSignInUrl="/"
    afterSignUpUrl="/"
    appearance={{
      baseTheme: shadesOfPurple,
      variables: {
        colorPrimary: "#6ec6ca",
        colorPrimaryText: "#ffffff",
        colorText: "#000000",
        colorTextOnPrimaryBackground: "#000000",
        colorTextOnInactive: "#666666",
        colorDisabledText: "#666666",
        colorAlphaShade: "#666666",
        colorInputText: "#000000",
        colorInputPlaceholder: "#666666",
        colorBackground: "#fdf6ff",
        colorInputBackground: "#e0f7fa",
        colorShimmer: "#fce7f3",
        colorSuccess: "#c8e6c9",
        colorDanger: "#fbcfe8",
      },
      elements: {
        signInButton: {
          borderRadius: "30px",
          fontSize: "1rem",
          padding: "0.75rem 1.5rem",
        },
        card: {
          borderRadius: "16px",
          boxShadow: "0 4px 16px rgba(150, 100, 200, 0.1)",
        },
        formButtonPrimary: {
          backgroundColor: "#6ec6ca",
          color: "#ffffff",
          borderRadius: "24px",
          fontWeight: "bold",
        },
        headerTitle: {
          fontFamily: "'Segoe UI', sans-serif",
          fontSize: "1.6rem",
          color: "#000000",
        },
        socialButtonsBlockButton: { color: "#000000" },
        socialButtonsBlockButtonText: { color: "#000000" },
        dividerText: { color: "#000000", fontWeight: "600" },
        footerActionLink: { color: "#000000", textDecoration: "underline" },
        footerActionText: { color: "#000000" },
        formResendCodeLink: { color: "#000000" },
        userButtonPopoverActionButton: { color: "#000000" },
        userButtonPopoverFooter: { backgroundColor: "#ffeef8", color: "#000000" },
      },
    }}
  >
    <AppWithTTS />
  </ClerkProvider>
);
