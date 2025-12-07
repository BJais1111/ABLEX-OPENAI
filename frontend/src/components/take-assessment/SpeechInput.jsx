import React, { useState, useEffect, useRef } from 'react';

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export default function SpeechInput({ onTranscribe }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognition) return;

    const recog = new SpeechRecognition();
    recog.continuous = false;
    recog.interimResults = false;

    // pick the right language tag
    const lang = window.currentLanguage?.toLowerCase?.() || 'english';
    recog.lang =
      lang === 'english'
        ? 'en-US'
        : lang === 'hindi'
        ? 'hi-IN'
        : lang === 'kannada'
        ? 'kn-IN'
        : 'en-US';

    recog.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      onTranscribe(text);
    };
    recog.onend = () => setListening(false);

    recognitionRef.current = recog;
  }, [onTranscribe]);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
    } else {
      setListening(true);
      recognitionRef.current.start();
    }
  };

  if (!SpeechRecognition) {
    return <p>Your browser doesn’t support speech recognition.</p>;
  }

  return (
    <button
      onClick={toggle}
      style={{
        marginLeft: '0.5rem',
        padding: '0.5rem 1rem',
        background: listening ? '#e53e3e' : '#38a169',
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
      }}
    >
      {listening ? '🎙️ Listening…' : '🎤 Speak'}
    </button>
  );
}
