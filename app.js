import { extractTextFromImage } from "./ocr.js";
import { createDefaultTTSService } from "./tts.js";
import { splitSentences, splitWords } from "./parser.js";

const SAMPLE_TEXT = `Learning English pronunciation takes steady practice.
Listen carefully, repeat clearly, and focus on rhythm.`;
let previewUrl = "";

const els = {
  inputText: document.querySelector("#input-text"),
  imageFile: document.querySelector("#image-file"),
  ocrText: document.querySelector("#ocr-text"),
  sampleBtn: document.querySelector("#sample-btn"),
  resetBtn: document.querySelector("#reset-btn"),
  ocrBtn: document.querySelector("#ocr-btn"),
  useOcrBtn: document.querySelector("#use-ocr-btn"),
  copyOcrBtn: document.querySelector("#copy-ocr-btn"),
  playAllBtn: document.querySelector("#play-all-btn"),
  playWordsBtn: document.querySelector("#play-words-btn"),
  playSentencesBtn: document.querySelector("#play-sentences-btn"),
  stopBtn: document.querySelector("#stop-btn"),
  dictationBtn: document.querySelector("#dictation-btn"),
  repeatCount: document.querySelector("#repeat-count"),
  pauseMs: document.querySelector("#pause-ms"),
  rateSelect: document.querySelector("#rate-select"),
  voiceSelect: document.querySelector("#voice-select"),
  status: document.querySelector("#status-message"),
  preview: document.querySelector("#preview"),
  imagePreview: document.querySelector("#image-preview"),
};

const tts = createDefaultTTSService();

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? "#b42318" : "#0f9d58";
}

function getCurrentText() {
  return els.inputText.value.trim();
}

function renderPreview(items = []) {
  if (!items.length) {
    els.preview.textContent = "미리보기 항목이 없습니다.";
    return;
  }

  els.preview.innerHTML = items
    .map((item, idx) => `<span class="segment" data-idx="${idx}">${item}</span>`)
    .join("");
}

function highlightSegment(index) {
  const chips = els.preview.querySelectorAll(".segment");
  chips.forEach((chip) => {
    const active = Number(chip.dataset.idx) === index;
    chip.classList.toggle("active", active);
  });
}

function setOCRLoading(isLoading) {
  els.ocrBtn.disabled = isLoading;
  els.imageFile.disabled = isLoading;
  els.ocrBtn.textContent = isLoading ? "OCR 처리 중..." : "이미지에서 텍스트 추출(OCR)";
}

function isPoorOCRResult(text, confidence) {
  const compact = text.replace(/\s/g, "");
  return compact.length < 15 || confidence < 55;
}

function renderImagePreview(file) {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }

  if (!file) {
    els.imagePreview.hidden = true;
    els.imagePreview.removeAttribute("src");
    return;
  }

  previewUrl = URL.createObjectURL(file);
  els.imagePreview.src = previewUrl;
  els.imagePreview.hidden = false;
}

function fillVoiceSelect() {
  const voices = tts.listVoices();
  const englishVoices = tts.listEnglishVoices();
  els.voiceSelect.innerHTML = "";

  if (!voices.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "사용 가능한 음성이 없습니다.";
    els.voiceSelect.append(opt);
    setStatus("음성 데이터를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.", true);
    return;
  }

  voices.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.voiceURI;
    option.textContent = `${voice.name} (${voice.lang})`;
    els.voiceSelect.append(option);
  });

  const preferred = tts.getPreferredVoice();
  if (preferred) {
    els.voiceSelect.value = preferred.voiceURI;
  }

  if (!englishVoices.length) {
    setStatus("영어 음성을 찾지 못했습니다. 현재 기기 기본 음성으로 재생됩니다.", true);
  }
}

function getTtsOptions() {
  const selectedVoice = tts.getPreferredVoice(els.voiceSelect.value);

  return {
    voice: selectedVoice,
    rate: Number(els.rateSelect.value),
    pitch: 1,
    pauseMs: Number(els.pauseMs.value),
  };
}

async function playChunks(chunks, modeLabel, withRepeat = false) {
  if (!chunks.length) {
    setStatus("먼저 텍스트를 입력해 주세요.", true);
    return;
  }

  try {
    renderPreview(chunks);
    setStatus(`${modeLabel} 재생을 시작합니다...`);

    await tts.speakSequence(
      chunks,
      {
        ...getTtsOptions(),
        repeat: withRepeat ? Number(els.repeatCount.value) : 1,
      },
      {
        onChunkStart: (_chunk, idx, repeatRound) => {
          const repeatMessage = withRepeat ? ` (반복 ${repeatRound + 1}회)` : "";
          setStatus(`${modeLabel}: ${idx + 1}/${chunks.length} 재생 중${repeatMessage}`);
          highlightSegment(idx);
        },
      }
    );

    setStatus(`${modeLabel} 재생이 완료되었습니다.`);
  } catch (error) {
    setStatus(`재생 중 오류: ${error.message || error}`, true);
  }
}

async function playAllText() {
  const text = getCurrentText();
  if (!text) {
    setStatus("먼저 텍스트를 입력해 주세요.", true);
    return;
  }

  try {
    renderPreview([text]);
    highlightSegment(0);
    setStatus("전체 재생을 시작합니다...");
    await tts.speakAll(text, getTtsOptions());
    setStatus("전체 재생이 완료되었습니다.");
  } catch (error) {
    setStatus(`전체 재생 오류: ${error.message || error}`, true);
  }
}

function bindEvents() {
  els.sampleBtn.addEventListener("click", () => {
    els.inputText.value = SAMPLE_TEXT;
    setStatus("샘플 문장을 불러왔습니다.");
    renderPreview(splitSentences(SAMPLE_TEXT));
  });

  els.resetBtn.addEventListener("click", () => {
    tts.stop();
    els.inputText.value = "";
    els.ocrText.value = "";
    els.imageFile.value = "";
    renderImagePreview(null);
    renderPreview([]);
    setStatus("초기화되었습니다.");
  });

  els.imageFile.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    renderImagePreview(file);
    if (file) {
      setStatus("이미지 미리보기를 확인한 뒤 OCR 버튼을 눌러 주세요.");
    }
  });

  els.ocrBtn.addEventListener("click", async () => {
    const file = els.imageFile.files?.[0];
    if (!file) {
      setStatus("먼저 이미지를 선택해 주세요.", true);
      return;
    }

    try {
      setOCRLoading(true);
      setStatus("OCR 준비 중...");
      const { text, confidence } = await extractTextFromImage(file, (pct) => {
        setStatus(`OCR 진행 중... ${pct}%`);
      });
      els.ocrText.value = text;

      if (!text) {
        setStatus("글자를 거의 인식하지 못했습니다. 이미지를 더 선명하게 준비해 주세요.", true);
        return;
      }

      if (isPoorOCRResult(text, confidence)) {
        setStatus(
          "OCR 결과가 다소 부정확할 수 있어요. 이미지에서 글자 영역만 잘라내거나 더 선명한 사진으로 다시 시도해 주세요.",
          true
        );
        return;
      }

      setStatus(`OCR 완료! (신뢰도 약 ${Math.round(confidence)}%) 결과를 확인해 주세요.`);
    } catch (error) {
      setStatus(`OCR 실패: ${error.message || error}`, true);
    } finally {
      setOCRLoading(false);
    }
  });

  els.useOcrBtn.addEventListener("click", () => {
    els.inputText.value = els.ocrText.value;
    setStatus("OCR 결과를 입력 텍스트로 복사했습니다.");
  });

  els.copyOcrBtn.addEventListener("click", async () => {
    const text = els.ocrText.value;
    if (!text.trim()) {
      setStatus("복사할 OCR 텍스트가 없습니다.", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setStatus("OCR 텍스트를 클립보드에 복사했습니다.");
    } catch {
      setStatus("브라우저 보안 설정으로 복사에 실패했습니다. 텍스트를 직접 선택해 복사해 주세요.", true);
    }
  });

  els.playAllBtn.addEventListener("click", playAllText);
  els.playWordsBtn.addEventListener("click", () => playChunks(splitWords(getCurrentText()), "단어 단위"));
  els.playSentencesBtn.addEventListener("click", () => playChunks(splitSentences(getCurrentText()), "문장 단위"));
  els.dictationBtn.addEventListener("click", () => playChunks(splitSentences(getCurrentText()), "받아쓰기 모드", true));

  els.stopBtn.addEventListener("click", () => {
    tts.stop();
    setStatus("재생을 중지했습니다.");
  });
}

function init() {
  bindEvents();
  setStatus("준비되었습니다.");
  fillVoiceSelect();

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = fillVoiceSelect;
  }
}

init();
