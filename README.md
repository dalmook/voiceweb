# VoiceWeb (Phase 1 MVP)

영어 발음 연습과 받아쓰기를 위한 **정적 웹 앱**입니다. 백엔드 없이 브라우저만으로 동작하며, GitHub Pages에 배포할 수 있도록 구성했습니다.

## 주요 기능
- 텍스트 붙여넣기/직접 입력
- 이미지 업로드 후 브라우저 OCR 추출
- 단어 단위/문장 단위 TTS 재생
- 받아쓰기 모드(반복 횟수 + 쉬는 시간 설정)
- 샘플 문장 버튼, 초기화 버튼, 상태 메시지 영역

## 기술 원칙 (Phase 1)
- HTML/CSS/Vanilla JS만 사용
- 백엔드 없음 (정적 사이트)
- OCR: 브라우저에서 실행 (Tesseract.js CDN 로드)
- TTS: 브라우저 Web Speech API만 사용
- TTS는 provider 추상화 구조로 분리 (Phase 2 API 교체 대비)

## 파일 구조
```text
.
├── AGENTS.md         # 프로젝트 작업 지침
├── index.html        # 화면 레이아웃/섹션 구조
├── styles.css        # 모바일 우선 스타일
├── app.js            # UI 이벤트/상태/기능 오케스트레이션
├── ocr.js            # 브라우저 OCR 로딩 및 텍스트 추출
├── tts.js            # TTS provider 추상화 + 브라우저 provider 구현
├── parser.js         # 텍스트 정규화 및 단어/문장 분할 유틸
└── README.md
```

## 로컬 실행 방법
정적 서버로 `index.html`을 서비스하면 됩니다.

### 방법 A) Python
```bash
python3 -m http.server 8000
```
브라우저에서 `http://localhost:8000` 접속

### 방법 B) VS Code Live Server
- 프로젝트 폴더를 열고 Live Server로 `index.html` 실행

## GitHub Pages 배포
1. 이 저장소를 GitHub에 push
2. GitHub 저장소의 **Settings > Pages** 이동
3. **Source**를 `Deploy from a branch`로 선택
4. Branch를 `main`(또는 배포 브랜치), folder를 `/ (root)`로 선택
5. 저장 후 표시되는 URL로 접속

## 사용 흐름
1. 텍스트 입력 또는 이미지 업로드
2. OCR 실행 후 결과 편집(선택)
3. OCR 결과를 연습 텍스트로 복사(선택)
4. 단어/문장 재생 또는 받아쓰기 모드 실행
5. 상태 메시지와 미리보기 영역에서 진행 상황 확인

## 참고
- 일부 브라우저/OS에서는 Web Speech API 음성 목록이 늦게 로드될 수 있습니다.
- OCR 정확도는 이미지 해상도와 글자 선명도에 영향을 받습니다.
