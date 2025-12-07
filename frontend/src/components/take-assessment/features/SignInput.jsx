import React, { useRef, useEffect, useState } from "react";
import * as mpHands from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";

export default function SignInput({ onChange }) {
  const videoRef = useRef(null);
  const [interp, setInterp] = useState(null);
  const [labels, setLabels] = useState([]);
  const [history, setHistory] = useState([]);

  // 0️⃣ Check if TFJS and TFLite are loaded
  useEffect(() => {
    console.log("Checking TensorFlow.js: window.tf is", typeof window.tf, window.tf);
    console.log("Checking TFLite: window.tflite is", typeof window.tflite, window.tflite);
    if (typeof window.tf !== "object") {
      console.error("⚠️ TensorFlow.js not found. Ensure tf.min.js is loaded in index.html.");
      return;
    }
    if (typeof window.tflite !== "object") {
      console.error("⚠️ TFLite plugin not found. Ensure tf-tflite.min.js is loaded in index.html.");
      return;
    }
    console.log("✅ TensorFlow.js and TFLite plugin are loaded");
  }, []);

  // 1️⃣ Load labels.csv
  useEffect(() => {
    fetch("/asl_model/keypoint_classifier_label.csv")
      .then((r) => r.text())
      .then((txt) => {
        setLabels(txt.trim().split("\n"));
        console.log("✅ Loaded labels:", txt.split("\n").length);
      })
      .catch((err) => console.error("Label load error:", err));
  }, []);

  // 2️⃣ Instantiate the TFLite interpreter
  useEffect(() => {
    (async () => {
      // Wait for window.tflite to be available
      const waitForTflite = async () => {
        let attempts = 0;
        const maxAttempts = 10;
        while (typeof window.tflite !== "object" && attempts < maxAttempts) {
          console.log(`Attempt ${attempts + 1}: window.tflite is ${typeof window.tflite}`);
          await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms
          attempts++;
        }
        if (typeof window.tflite !== "object") {
          console.error(
            "⚠️ TFLite not available after waiting. Ensure tf-tflite.min.js is loaded correctly. " +
            `Final state: window.tflite is ${typeof window.tflite}`
          );
          return false;
        }
        console.log("✅ window.tflite is available");
        return true;
      };

      if (!(await waitForTflite())) return;

      try {
        const buf = await fetch(
          "/asl_model/keypoint_classifier.tflite"
        ).then((r) => r.arrayBuffer());
        const i = await window.tflite.createInterpreter(new Uint8Array(buf));
        i.allocateTensors();
        setInterp(i);
        console.log("✅ TFLite interpreter ready");
      } catch (e) {
        console.error("TFLite load failed:", e);
      }
    })();
  }, []);

  // 3️⃣ Start MediaPipe Hands + camera when both labels & interp exist
  useEffect(() => {
    if (!interp || labels.length === 0 || !videoRef.current) return;
    console.log("📹 Starting MediaPipe Hands + camera…");

    const hands = new mpHands.Hands({
      locateFile: (f) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });
    hands.setOptions({
      maxNumHands: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });
    hands.onResults(onResults);

    const cam = new Camera(videoRef.current, {
      onFrame: async () => await hands.send({ image: videoRef.current }),
      width: 320,
      height: 240,
    });
    cam.start().catch((err) => console.error("Camera start failed:", err));
    videoRef.current.play().catch(() => {});

    return () => cam.stop();
  }, [interp, labels]);

  // 4️⃣ Inference + smoothing
  const onResults = (results) => {
    if (!results.multiHandLandmarks?.length) return;
    const lm = results.multiHandLandmarks[0];
    const bx = lm[0].x,
      by = lm[0].y;
    const arr = new Float32Array(42);
    for (let i = 0; i < 21; i++) {
      arr[2 * i] = lm[i].x - bx;
      arr[2 * i + 1] = lm[i].y - by;
    }

    const inIdx = interp.getInputIndex(0);
    interp.setTensor(inIdx, arr);
    interp.invoke();
    const out = interp.getOutputTensor(0).data;
    const p = out.indexOf(Math.max(...out));

    const h = [...history, p].slice(-5);
    setHistory(h);
    const stable = h
      .sort(
        (a, b) =>
          h.filter((v) => v === a).length -
          h.filter((v) => v === b).length
      )
      .pop();

    onChange(labels[stable]);
  };

  return (
    <div style={{ textAlign: "center", margin: "1rem 0" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: 320,
          height: 240,
          borderRadius: 8,
          background: "#000",
        }}
      />
      <p>✋ Sign your answer to fill the field</p>
    </div>
  );
}