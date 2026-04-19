import { extractTextFromImage } from "./ocr.js";
import { createDefaultTTSService } from "./tts.js";
import { splitSentences, splitWords } from "./parser.js";

const SAMPLE_TEXT = `Learning English pronunciation takes steady practice.
Listen carefully, repeat clearly, and focus on rhythm.`;

const els = {
  inputText: document.querySelector("#input-text"),
  imageFile: document.querySelector("#image-file"),
  ocrText: document.querySelector("#ocr-text"),
  sampleBtn: document.querySelector("#sample-btn"),
  resetBtn: document.querySelector("#reset-btn"),
  ocrBtn: document.querySelector("#ocr-btn"),
  useOcrBtn: document.querySelector("#use-ocr-btn"),
  playWordsBtn: document.querySelector("#play-words-btn"),
  playSentencesBtn: document.querySelector("#play-sentences-btn"),
  stopBtn: document.querySelector("#stop-btn"),
  dictationBtn: document.querySelector("#dictation-btn"),
  repeatCount: document.querySelector("#repeat-count"),
  pauseMs: document.querySelector("#pause-ms"),
  rateRange: document.querySelector("#rate-range"),
  pitchRange: document.querySelector("#pitch-range"),
  voiceSelect: document.querySelector("#voice-select"),
  status: document.querySelector("#status-message"),
  preview: document.querySelector("#preview"),
};

const tts = createDefaultTTSService();

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? "#b42318" : "#0f9d58";
}

function getCurrentText() {
  return els.inputText.value.trim();
}

function renderPreview(items) {
  if (!items.length) {
    els.preview.textContent = "미리보기 항목이 없습니다.";
    return;
  }

  els.preview.innerHTML = items.map((item) => `<span class="segment">${item}</span>`).join("");
}

function fillVoiceSelect() {
  const voices = tts.listVoices();
  els.voiceSelect.innerHTML = "";

  if (!voices.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "사용 가능한 음성이 없습니다.";
    els.voiceSelect.append(opt);
    return;
  }

  voices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${voice.name} (${voice.lang})`;
    if (voice.lang.startsWith("en")) option.selected = true;
    els.voiceSelect.append(option);
  });
}

function getTtsOptions() {
  const voices = tts.listVoices();
  const selected = voices[Number(els.voiceSelect.value)] || voices.find((v) => v.lang.startsWith("en"));

  return {
    voice: selected,
    rate: Number(els.rateRange.value),
    pitch: Number(els.pitchRange.value),
    pauseMs: Number(els.pauseMs.value),
  };
}

async function playChunks(chunks, modeLabel, withRepeat = false) {
  if (!chunks.length) {
    setStatus("먼저 텍스트를 입력해 주세요.", true);
    return;
  }

  try {
    setStatus(`${modeLabel} 재생을 시작합니다...`);
    renderPreview(chunks);

    await tts.speakSequence(
      chunks,
      {
        ...getTtsOptions(),
        repeat: withRepeat ? Number(els.repeatCount.value) : 1,
      },
      {
        onChunkStart: (chunk, idx, repeatRound) => {
          const repeatMessage = withRepeat ? ` (반복 ${repeatRound + 1}회)` : "";
          setStatus(`${modeLabel}: ${idx + 1}/${chunks.length} 재생 중${repeatMessage}`);
          els.preview.innerHTML = `<strong>${chunk}</strong>`;
        },
      }
    );

    setStatus(`${modeLabel} 재생이 완료되었습니다.`);
  } catch (error) {
    setStatus(`재생 중 오류: ${error.message || error}`, true);
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
    renderPreview([]);
    setStatus("초기화되었습니다.");
  });

  els.ocrBtn.addEventListener("click", async () => {
    const file = els.imageFile.files?.[0];
    if (!file) {
      setStatus("먼저 이미지를 선택해 주세요.", true);
      return;
    }

    try {
      setStatus("OCR 준비 중...");
      const text = await extractTextFromImage(file, (pct) => {
        setStatus(`OCR 진행 중... ${pct}%`);
      });
      els.ocrText.value = text;
      setStatus("OCR 완료! 결과를 확인해 주세요.");
    } catch (error) {
      setStatus(`OCR 실패: ${error.message || error}`, true);
    }
  });

  els.useOcrBtn.addEventListener("click", () => {
    els.inputText.value = els.ocrText.value;
    setStatus("OCR 결과를 입력 텍스트로 복사했습니다.");
  });

  els.playWordsBtn.addEventListener("click", () => {
    playChunks(splitWords(getCurrentText()), "단어 단위");
  });

  els.playSentencesBtn.addEventListener("click", () => {
    playChunks(splitSentences(getCurrentText()), "문장 단위");
  });

  els.dictationBtn.addEventListener("click", () => {
    playChunks(splitSentences(getCurrentText()), "받아쓰기 모드", true);
  });

  els.stopBtn.addEventListener("click", () => {
    tts.stop();
    setStatus("재생을 중지했습니다.");
  });
}

function init() {
  bindEvents();
  fillVoiceSelect();
  setStatus("준비되었습니다.");

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = fillVoiceSelect;
  }
}

init();
