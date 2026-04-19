import { extractTextFromImage } from "./ocr.js";
import { createDefaultTTSService } from "./tts.js";
import { cleanOcrText, getSentences, getWords } from "./parser.js";

const SAMPLE_TEXT = `Learning English pronunciation takes steady practice.
Listen carefully, repeat clearly, and focus on rhythm.`;
let previewUrl = "";
let dictationRunId = 0;
let isDictationRunning = false;

const els = {
  inputText: document.querySelector("#input-text"),
  sourceTextBlock: document.querySelector("#source-text-block"),
  imageFile: document.querySelector("#image-file"),
  ocrText: document.querySelector("#ocr-text"),
  sampleBtn: document.querySelector("#sample-btn"),
  normalizeBtn: document.querySelector("#normalize-btn"),
  resetBtn: document.querySelector("#reset-btn"),
  ocrBtn: document.querySelector("#ocr-btn"),
  useOcrBtn: document.querySelector("#use-ocr-btn"),
  copyOcrBtn: document.querySelector("#copy-ocr-btn"),
  playAllBtn: document.querySelector("#play-all-btn"),
  playWordsBtn: document.querySelector("#play-words-btn"),
  playSentencesBtn: document.querySelector("#play-sentences-btn"),
  stopBtn: document.querySelector("#stop-btn"),
  dictationStartBtn: document.querySelector("#dictation-start-btn"),
  dictationStopBtn: document.querySelector("#dictation-stop-btn"),
  dictationProgress: document.querySelector("#dictation-progress"),
  dictationUnit: document.querySelector("#dictation-unit"),
  repeatCount: document.querySelector("#repeat-count"),
  repeatPauseMs: document.querySelector("#repeat-pause-ms"),
  nextItemPauseMs: document.querySelector("#next-item-pause-ms"),
  hideTextWhileRunning: document.querySelector("#hide-text-while-running"),
  showAnswerToggle: document.querySelector("#show-answer-toggle"),
  rateSelect: document.querySelector("#rate-select"),
  voiceSelect: document.querySelector("#voice-select"),
  status: document.querySelector("#status-message"),
  parseSummary: document.querySelector("#parse-summary"),
  preview: document.querySelector("#preview"),
  imagePreview: document.querySelector("#image-preview"),
};

const tts = createDefaultTTSService();

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? "#b42318" : "#0f9d58";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCurrentText() {
  return els.inputText.value.trim();
}

function updateParseSummary(text = getCurrentText()) {
  const sentenceCount = getSentences(text).length;
  const wordCount = getWords(text).length;
  els.parseSummary.textContent = `감지 결과: 문장 ${sentenceCount}개 / 단어 ${wordCount}개`;
}

function updateDictationProgress(current = 0, total = 0) {
  if (!total) {
    els.dictationProgress.textContent = "진행 상황: - / -";
    return;
  }

  els.dictationProgress.textContent = `진행 상황: ${current} / ${total}`;
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

function updateAnswerVisibility() {
  const shouldHide = isDictationRunning && els.hideTextWhileRunning.checked && !els.showAnswerToggle.checked;
  els.sourceTextBlock.classList.toggle("hidden", shouldHide);
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
  if (preferred) els.voiceSelect.value = preferred.voiceURI;

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
  };
}

function getDictationItems() {
  const text = getCurrentText();
  if (!text) return [];
  return els.dictationUnit.value === "word" ? getWords(text) : getSentences(text);
}

async function playChunks(chunks, modeLabel) {
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
        repeat: 1,
        pauseMs: Number(els.nextItemPauseMs.value),
      },
      {
        onChunkStart: (_chunk, idx) => {
          setStatus(`${modeLabel}: ${idx + 1}/${chunks.length} 재생 중`);
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

async function startDictation() {
  const items = getDictationItems();
  if (!items.length) {
    setStatus("받아쓰기를 시작하려면 텍스트를 먼저 입력해 주세요.", true);
    return;
  }

  dictationRunId += 1;
  const runId = dictationRunId;
  isDictationRunning = true;
  const repeatCount = Number(els.repeatCount.value);
  const repeatPauseMs = Number(els.repeatPauseMs.value);
  const nextItemPauseMs = Number(els.nextItemPauseMs.value);
  const modeLabel = els.dictationUnit.value === "word" ? "단어 받아쓰기" : "문장 받아쓰기";

  renderPreview(items);
  updateAnswerVisibility();

  try {
    setStatus(`${modeLabel}를 시작합니다.`);

    for (let i = 0; i < items.length; i += 1) {
      if (!isDictationRunning || runId !== dictationRunId) break;

      updateDictationProgress(i + 1, items.length);
      highlightSegment(i);

      for (let r = 0; r < repeatCount; r += 1) {
        if (!isDictationRunning || runId !== dictationRunId) break;

        setStatus(`${modeLabel} ${i + 1}/${items.length} (반복 ${r + 1}/${repeatCount})`);
        await tts.speakAll(items[i], getTtsOptions());

        if (r < repeatCount - 1) {
          await sleep(repeatPauseMs);
        }
      }

      if (i < items.length - 1) {
        await sleep(nextItemPauseMs);
      }
    }

    if (runId === dictationRunId) {
      setStatus("받아쓰기가 완료되었습니다.");
    }
  } catch (error) {
    if (runId !== dictationRunId || !isDictationRunning) {
      return;
    }
    setStatus(`받아쓰기 중 오류: ${error.message || error}`, true);
  } finally {
    if (runId === dictationRunId) {
      isDictationRunning = false;
      updateAnswerVisibility();
      updateDictationProgress(0, 0);
    }
  }
}

function stopDictation() {
  if (!isDictationRunning) {
    setStatus("현재 진행 중인 받아쓰기가 없습니다.");
    return;
  }

  isDictationRunning = false;
  dictationRunId += 1;
  tts.stop();
  updateAnswerVisibility();
  updateDictationProgress(0, 0);
  setStatus("받아쓰기를 중지했습니다.");
}

function bindEvents() {
  els.sampleBtn.addEventListener("click", () => {
    els.inputText.value = SAMPLE_TEXT;
    setStatus("샘플 문장을 불러왔습니다.");
    renderPreview(getSentences(SAMPLE_TEXT));
    updateParseSummary();
  });

  els.normalizeBtn.addEventListener("click", () => {
    const normalized = cleanOcrText(els.inputText.value);
    els.inputText.value = normalized;
    updateParseSummary(normalized);
    setStatus("텍스트 공백/빈 줄을 정리했습니다.");
  });

  els.resetBtn.addEventListener("click", () => {
    tts.stop();
    isDictationRunning = false;
    dictationRunId += 1;
    els.inputText.value = "";
    els.ocrText.value = "";
    els.imageFile.value = "";
    renderImagePreview(null);
    renderPreview([]);
    updateParseSummary("");
    updateAnswerVisibility();
    updateDictationProgress(0, 0);
    setStatus("초기화되었습니다.");
  });

  els.hideTextWhileRunning.addEventListener("change", updateAnswerVisibility);
  els.showAnswerToggle.addEventListener("change", updateAnswerVisibility);
  els.inputText.addEventListener("input", () => updateParseSummary());

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
      els.ocrText.value = cleanOcrText(text);

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
    updateParseSummary();
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
  els.playWordsBtn.addEventListener("click", () => playChunks(getWords(getCurrentText()), "단어 단위"));
  els.playSentencesBtn.addEventListener("click", () => playChunks(getSentences(getCurrentText()), "문장 단위"));
  els.dictationStartBtn.addEventListener("click", startDictation);
  els.dictationStopBtn.addEventListener("click", stopDictation);

  els.stopBtn.addEventListener("click", () => {
    tts.stop();
    if (isDictationRunning) {
      stopDictation();
      return;
    }
    setStatus("재생을 중지했습니다.");
  });
}

function init() {
  bindEvents();
  setStatus("준비되었습니다.");
  fillVoiceSelect();
  updateDictationProgress(0, 0);
  updateParseSummary("");

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = fillVoiceSelect;
  }
}

init();
