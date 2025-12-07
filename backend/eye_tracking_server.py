from flask import Flask, jsonify
import cv2
import mediapipe as mp
import time
import threading
import math

app = Flask(__name__)

latest_event = {"event": None, "timestamp": None}

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)

LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
EAR_THRESHOLD = 0.20
LONG_CLOSE_DURATION = 3.0
BLINK_MIN = 0.15
BLINK_MAX = 1.5

def calculate_ear(eye_points, landmarks, img_w, img_h):
    def dist(p1, p2):
        return math.dist(p1, p2)
    coords = [(int(landmarks[i].x * img_w), int(landmarks[i].y * img_h)) for i in eye_points]
    vertical1 = dist(coords[1], coords[5])
    vertical2 = dist(coords[2], coords[4])
    horizontal = dist(coords[0], coords[3])
    return (vertical1 + vertical2) / (2.0 * horizontal)

def eye_tracking_loop():
    global latest_event
    cap = cv2.VideoCapture(0)
    eye_closed_start = None
    eye_state = "open"
    last_blink_time = 0
    last_long_close_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        h, w, _ = frame.shape
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(frame_rgb)
        current_time = time.time()

        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0].landmark
            left_ear = calculate_ear(LEFT_EYE, landmarks, w, h)
            right_ear = calculate_ear(RIGHT_EYE, landmarks, w, h)
            avg_ear = (left_ear + right_ear) / 2.0

            if avg_ear < EAR_THRESHOLD:
                if eye_state == "open":
                    eye_closed_start = current_time
                    eye_state = "closed"
                else:
                    duration = current_time - eye_closed_start
                    if duration >= LONG_CLOSE_DURATION and current_time - last_long_close_time > 2:
                        latest_event = {"event": "LONG_CLOSE", "timestamp": time.time()}
                        last_long_close_time = current_time
            else:
                if eye_state == "closed":
                    duration = current_time - eye_closed_start
                    if BLINK_MIN < duration < BLINK_MAX and current_time - last_blink_time > 1:
                        latest_event = {"event": "BLINK", "timestamp": time.time()}
                        last_blink_time = current_time
                eye_state = "open"
                eye_closed_start = None

def start_tracking():
    thread = threading.Thread(target=eye_tracking_loop)
    thread.daemon = True
    thread.start()

@app.route('/get-event', methods=['GET'])
def get_event():
    global latest_event
    response = latest_event.copy()
    latest_event = {"event": None, "timestamp": None}  
    return jsonify(response)

if __name__ == '__main__':
    start_tracking()
    app.run(host='0.0.0.0', port=5001)
