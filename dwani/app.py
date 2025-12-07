
import os
import io
import re
import time
import base64
import random
import tempfile
import mimetypes
from pathlib import Path
from typing import List

import fitz  
import numpy as np
import requests
from PIL import Image

from fastapi import (
    FastAPI, Request, File, UploadFile, Form,
    HTTPException, Body, APIRouter
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv, find_dotenv


env_here = Path(__file__).with_name(".env")
if env_here.exists():
    load_dotenv(env_here)
else:
    load_dotenv(find_dotenv())


GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or "AIzaSyCEPE-jaeZEUe-lou9StMnueXvb_0DquFE").strip()
SARVAM_API_KEY = (os.getenv("SARVAM_API_KEY") or "").strip()


GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent"


OCR_ENABLED = (os.getenv("OCR_ENABLED", "true").lower() == "true")
EASYOCR_DIR = os.getenv("EASYOCR_DIR")  

print("GEMINI loaded?", bool(GEMINI_API_KEY), "prefix:", GEMINI_API_KEY[:6])


app = FastAPI(redirect_slashes=False)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

def clean_output(text: str, fallback: str) -> str:
    if not text:
        return fallback
    s = text.strip()
    if re.match(r"^[.,।॥…\s]+$", s):
        return fallback
    if len(s) < 2 or len(s) > 300:
        return fallback
    if "…" in s or s.count(",") > 5 or s.count(".") > 5:
        return fallback
    return s

def preprocess_text(t: str) -> str:
    t = t.replace("\r", "")
    
    t = re.sub(r'\b[Pp]age\s*\d+\b', ' ', t)
    t = re.sub(r'^\s*\d+\s*$', ' ', t, flags=re.MULTILINE)
    # collapse whitespace
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n{3,}', '\n\n', t)
    return t.strip()


_OCR = None  

def _get_ocr():
    global _OCR
    if _OCR is None:
        import easyocr
        _OCR = easyocr.Reader(['en'], gpu=False,
                              model_storage_directory=EASYOCR_DIR or None)
    return _OCR

def extract_text_from_pdf(path: str, page_number: int = 1) -> str:
    """
    Returns text from the given PDF page.
    Tries the real text layer first; if missing (scanned), uses OCR.
    """
    doc = fitz.open(path)
    if not (1 <= page_number <= len(doc)):
        raise ValueError("Page number out of range.")
    page = doc[page_number - 1]

    # 1) Digital text layer
    text = (page.get_text("text") or "").strip()
    if len(text) >= 80:
        return text

    # 2) OCR fallback for scanned pages
    if not OCR_ENABLED:
        return text

    pix = page.get_pixmap(dpi=220)  # higher DPI helps OCR
    img = Image.open(io.BytesIO(pix.tobytes())).convert("RGB")
    reader = _get_ocr()
    ocr_blocks = reader.readtext(np.array(img))  # [(bbox, text, conf)]
    ocr_text = " ".join(t for _, t, conf in ocr_blocks if t and conf > 0.4)
    return ocr_text.strip()

STOPWORDS = set("""
page pages section figure table chapter contents index abstract
the a an and or of to in for on with by from is are was were be as at this that
""".split())

def _local_mcqs(text: str, count: int = 5) -> str:
    sents = [s for s in re.split(r'(?<=[.?!])\s+', text) if len(s.split()) >= 7]
    words = re.findall(r'\b([A-Za-z][A-Za-z\-]{3,})\b', text)
    pool = []
    for w in words:
        lw = w.lower()
        if lw in STOPWORDS: continue
        if lw.startswith("page"): continue
        pool.append(w)
    pool = list(dict.fromkeys(pool)) or ["Concept","Topic","Context","Subject"]

    random.shuffle(sents)
    blocks, n = [], 1
    for s in sents:
        if re.search(r'\b[Pp]age\s*\d+\b', s):  # skip headers/footers
            continue
        cand = [w for w in pool if re.search(rf'\b{re.escape(w)}\b', s)]
        if not cand:
            continue
        ans = random.choice(cand)
        sentence = re.sub(r'\b\d+\b', '', s)  # avoid "_____ 1"
        cloze = re.sub(rf'\b{re.escape(ans)}\b', "_____", sentence, count=1)

        others = [w for w in pool if w != ans]
        random.shuffle(others)
        opts = ([ans] + others[:3] + ["Option A","Option B","Option C","Option D"])[:4]
        random.shuffle(opts)
        star = [f"{o} *" if o == ans else o for o in opts]
        blocks.append("\n".join([
            f"{n}. Fill in the blank: {cloze.strip()}",
            f"a) {star[0]}",
            f"b) {star[1]}",
            f"c) {star[2]}",
            f"d) {star[3]}",
        ]))
        n += 1
        if len(blocks) >= count:
            break

    if not blocks:
        blocks = ["\n".join([
            "1. Which option best fits the passage?",
            "a) Definition","b) Example","c) Conclusion *","d) Reference"
        ])]
    return "\n\n".join(blocks)


def _gemini_call(payload: dict):
    r = requests.post(
        f"{GEMINI_URL}?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json=payload, timeout=45
    )
    if r.status_code == 200:
        return r.json(), "queryparam"
    return {"__error__": f"{r.status_code}:{r.text[:400]}"}, "error"


def generate_mcqs(text: str, count: int = 5) -> str:
    """
    Output format (blank line between Qs):
      1. Question text
      a) option
      b) option
      c) option *
      d) option
    """
    if not GEMINI_API_KEY:
        print("[MCQ] No GEMINI_API_KEY → local fallback")
        return _local_mcqs(text, count)

    rules = (
        "You are an MCQ generator. Create exactly {count} MCQs based ONLY on the passage.\n"
        "STRICT PLAIN TEXT with a blank line between questions:\n"
        "1. Question text\n"
        "a) option\nb) option\nc) option\nd) option\n\n"
        "Mark the correct option by adding a trailing ' *' at the END of that option line "
        "(e.g., 'c) Paris *'). No extra commentary, no markdown, no JSON."
    ).format(count=count)
    prompt = f"{rules}\n\nPassage:\n{text[:5000]}"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 1200}
    }

    data, mode = _gemini_call(payload)
    if "__error__" in (data or {}):
        print("[MCQ] Gemini failed ->", data["__error__"])
        return _local_mcqs(text, count)

    out = ""
    for c in data.get("candidates", []):
        for p in c.get("content", {}).get("parts", []):
            if isinstance(p, dict) and p.get("text"):
                out += p["text"]
    out = (out or "").strip()

    if "1." in out and "a)" in out:
        print("[MCQ] Gemini OK via", mode, "chars:", len(out))
        return out

    print("[MCQ] Gemini unexpected format → fallback")
    return _local_mcqs(text, count)


class URLCaptionRequest(BaseModel):
    image_url: str
    lang: str = "english"

@app.post("/translate-batch")
async def translate_batch(request: Request):
    try:
        body = await request.json()
        sentences: List[str] = body.get("sentences", [])
        lang = body.get("lang", "kannada")
        filtered = [s.strip() for s in sentences if s and s.strip()]
        if not filtered:
            return {"translations": sentences}

        lang_codes = {"kannada": "kn-IN", "hindi": "hi-IN", "english": "en-IN"}
        target_code = lang_codes.get(lang.lower(), "kn-IN")

        if not SARVAM_API_KEY:
            return {"translations": filtered}

        headers = {"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}
        out = []
        for s in filtered:
            payload = {
                "input": s,
                "source_language_code": "en-IN",
                "target_language_code": target_code,
                "speaker_gender": "Male",
            }
            r = requests.post("https://api.sarvam.ai/translate", headers=headers, json=payload, timeout=30)
            r.raise_for_status()
            j = r.json()
            out.append(clean_output(j.get("translated_text", s), fallback=s))
        return {"translations": out}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


def _guess_mime_from_url(url: str) -> str:
    mt, _ = mimetypes.guess_type(url)
    return mt or "image/jpeg"

def _shrink_image(raw: bytes, max_px=1600) -> bytes:
    """Downscale big images to speed up inference & avoid timeouts."""
    try:
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        im.thumbnail((max_px, max_px))
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=85, optimize=True)
        return buf.getvalue()
    except Exception:
        return raw

def _gemini_vision_describe(image_b64: str, mime_type: str) -> dict:
    """
    Calls Gemini Vision with an image and returns a simple caption.
    """
    
    prompt = "Describe this image in one short sentence for a grade-5 student."

    payload = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": mime_type, "data": image_b64}},
                {"text": prompt},
            ]
        }],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 64
        }
    }

    data, _ = _gemini_call(payload)
    if "__error__" in (data or {}):
        return {"caption": "An image is shown.", "hint": "", "missing": ""}

    txt = ""
    for cand in data.get("candidates", []):
        parts = cand.get("content", {}).get("parts", [])
        for p in parts:
            t = p.get("text", "") if isinstance(p, dict) else ""
            if t and t.strip():
                txt += t.strip() + "\n"
    txt = (txt or "").strip()
    caption = (txt.splitlines() or ["An image is shown."])[0]
    return {"caption": caption, "hint": "", "missing": ""}

@app.post("/vision-describe-upload")
async def vision_describe_upload(file: UploadFile = File(...)):
    try:
        raw = await file.read()
        if not raw:
            raise HTTPException(400, "Empty image file")
        raw = _shrink_image(raw)
        mime_type = "image/jpeg"  
        b64 = base64.b64encode(raw).decode("utf-8")
        result = _gemini_vision_describe(b64, mime_type)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Vision describe failed: {e}")

class VisionURLBody(BaseModel):
    image_url: str

@app.post("/vision-describe-url")
async def vision_describe_url(body: VisionURLBody):
    try:
        url = body.image_url
        
        r = requests.get(
            url, timeout=20,
            headers={"User-Agent": "ABLE-edu/1.0 (localhost test) contact@example.com"}
        )
        r.raise_for_status()
        raw = r.content
        if not raw:
            raise HTTPException(400, "Could not fetch the image bytes")
        raw = _shrink_image(raw)
        mime_type = r.headers.get("Content-Type") or _guess_mime_from_url(url)
        
        mime_type = "image/jpeg"
        b64 = base64.b64encode(raw).decode("utf-8")
        result = _gemini_vision_describe(b64, mime_type)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Vision describe (url) failed: {e}")

@app.post("/tts")
async def tts(text: str = Form(...)):
    return JSONResponse(status_code=501, content={"error": "TTS endpoint placeholder."})

@app.post("/vision-caption-upload")
async def vision_caption_upload(file: UploadFile = File(...), lang: str = Form("english")):
    return JSONResponse(status_code=501, content={"caption": "Vision captioning placeholder."})

@app.post("/vision-caption-local")
async def vision_caption_local(path: str = Body(..., embed=True), lang: str = Body("kannada")):
    return JSONResponse(status_code=501, content={"caption": "Vision captioning local placeholder."})

@app.post("/chat")
async def chat(req: Request):
    return JSONResponse(status_code=501, content={"reply": "Chat placeholder."})

@app.post("/hf-caption")
async def hf_caption(req: URLCaptionRequest):
    return JSONResponse(status_code=501, content={"caption": "HF caption placeholder."})

@app.post("/asr-upload")
async def asr_upload(file: UploadFile = File(...), lang: str = Form("english")):
    return JSONResponse(status_code=501, content={"text": "ASR upload placeholder."})


@app.post("/generate-from-pdf")
async def generate_from_pdf(file: UploadFile = File(...), page: int = 1, count: int = 5):
    """
    Upload a PDF; extracts text from `page`, generates `count` MCQs (plain text format).
    """
    tmp_path = None
    try:
        suffix = os.path.splitext(file.filename or "")[1] or ".pdf"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tf:
            tf.write(await file.read())
            tmp_path = tf.name

        text = extract_text_from_pdf(tmp_path, page_number=page)
        text = preprocess_text(text)
        if not text or len(text) < 80:
            raise HTTPException(400, "PDF page had too little usable text")

        mcqs = generate_mcqs(text, count=count)
        return {"mcqs": mcqs}

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")
    finally:
        try:
            if tmp_path:
                os.unlink(tmp_path)
        except:
            pass


router = APIRouter()

@router.get("/_gemini_health")
def gemini_health():
    start = time.time()
    payload = {
        "contents": [{"parts": [{"text": "Reply with exactly: PONG"}]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 16}
    }

    r = requests.post(
        f"{GEMINI_URL}?key={GEMINI_API_KEY}",
        headers={"Content-Type": "application/json"},
        json=payload, timeout=20,
    )
    latency_ms = int((time.time() - start) * 1000)
    if r.status_code == 200:
        data = r.json()
        txt = ""
        for c in data.get("candidates", []):
            for p in c.get("content", {}).get("parts", []):
                if isinstance(p, dict) and p.get("text"):
                    txt += p["text"]
        txt = (txt or "").strip()
        return {"ok": (txt == "PONG"), "http": 200, "latency_ms": latency_ms, "got": txt, "mode": "queryparam"}

    return {
        "ok": False,
        "http": r.status_code,
        "error": r.text[:400],
    }

app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("dwani.app:app", host="0.0.0.0", port=8000, reload=True)
