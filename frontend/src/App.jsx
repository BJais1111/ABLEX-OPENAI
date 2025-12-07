import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  useAuth,
  useUser,
} from "@clerk/clerk-react";
import { useEffect } from "react";
import './fonts.css'; // or './styles/fonts.css' if placed in /styles

import LandingPage from "./components/LandingPage";
import Onboarding from "./components/Onboarding";
import DashboardStudent from "./components/DashboardStudent";
import DashboardEducator from "./components/DashboardEducator";
import OnboardRedirect from "./components/OnboardRedirect";
import CreateAssessment from "./components/assessments/CreateAssessment";
import TakeAssessment from "./components/take-assessment/TakeAssessment";
import EducatorScores from "./components/EducatorScores"; // ✅ NEW: Scores page
import AccessibilitySettings from "./components/AccessibilitySettings";


function ProtectedRoute({ children }) {
  const { isSignedIn } = useAuth();
  return isSignedIn ? children : <Navigate to="/" />;
}

function App() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!isLoaded && !synth.speaking) {
      const utter = new SpeechSynthesisUtterance("Loading AbleX...");
      utter.lang = "en-US";
      utter.rate = 1;
      synth.speak(utter);
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#fce4ec",
          fontFamily: "'Segoe UI', sans-serif",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            border: "6px solid #e0f7fa",
            borderTop: "6px solid #00bcd4",
            borderRadius: "50%",
            width: "60px",
            height: "60px",
            animation: "spin 1s linear infinite",
            marginBottom: "1rem",
          }}
          aria-hidden="true"
        />
        <p
          style={{ fontSize: "1.2rem", color: "#444" }}
          aria-live="polite"
        >
          Loading AbleX...
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

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <SignedIn>
                <OnboardRedirect />
              </SignedIn>
              <SignedOut>
                <LandingPage />
              </SignedOut>
            </>
          }
        />

        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/settings" element={<AccessibilitySettings />} />

        <Route
          path="/dashboard/student"
          element={
            <ProtectedRoute>
              <DashboardStudent />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/educator"
          element={
            <ProtectedRoute>
              <DashboardEducator />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assessments/create"
          element={
            <ProtectedRoute>
              <CreateAssessment />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assessment/:id"
          element={
            <ProtectedRoute>
              <TakeAssessment />
            </ProtectedRoute>
          }
        />

        <Route
          path="/educator/scores"
          element={
            <ProtectedRoute>
              <EducatorScores />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
