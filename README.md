# Assembly AI Drop

A web app for transcribing audio files with speaker identification using AssemblyAI.

## Features

- Audio transcription with speaker diarization
- Confidence scores for each segment
- Statistics dashboard
- Export as Markdown
- Drag & drop interface
- API key management

## Setup

1. Install dependencies:
   ```bash
   bun install
   ```

2. Run the app:
   ```bash
   bun run index.ts
   ```

3. Open http://localhost:8080 in your browser

## Usage

1. Enter your AssemblyAI API key and click "Set"
2. Upload an audio file
3. View transcription with speaker labels
4. Copy as Markdown or view in results page

## Requirements

- Bun v1.1.3+
- AssemblyAI API key
