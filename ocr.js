const TESSERACT_SRC = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
let tesseractLoader;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src=\"${src}\"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("OCR 라이브러리를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

async function ensureTesseract() {
  if (!tesseractLoader) {
    tesseractLoader = loadScript(TESSERACT_SRC);
  }

  await tesseractLoader;

  if (!window.Tesseract) {
    throw new Error("OCR 라이브러리가 준비되지 않았습니다.");
  }

  return window.Tesseract;
}

export async function extractTextFromImage(file, onProgress) {
  if (!file) {
    throw new Error("이미지 파일이 선택되지 않았습니다.");
  }

  const Tesseract = await ensureTesseract();

  const result = await Tesseract.recognize(file, "eng", {
    logger: (message) => {
      if (!onProgress || message.status !== "recognizing text") return;
      const pct = Math.round((message.progress || 0) * 100);
      onProgress(pct);
    },
  });

  return (result.data.text || "").trim();
}
