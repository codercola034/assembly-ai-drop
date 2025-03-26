import fs from "fs/promises";
import { AssemblyAI } from "assemblyai";
import path from "path";
console.log("Service started");

const apiKey = process.env.ASSEMBLYAI_API_KEY;
if (!apiKey) {
  throw new Error("api key not set!");
}
const client = new AssemblyAI({
  apiKey: apiKey,
});

async function transcibe(file: File, speakersExpected = 2) {
  const transcript = await client.transcripts.transcribe({
    audio: file,
    speakers_expected: speakersExpected,
    speaker_labels: true,
  });

  if (transcript.status === "error") {
    console.error(`Transcription failed: ${transcript.error}`);
    process.exit(1);
  }

  if (!transcript.utterances) {
    console.error("Transcription utterances are null");
    process.exit(1);
  }

  return transcript.utterances;
}

Bun.serve({
  port: 8080,
  routes: {
    "/": async () =>
      new Response(await Bun.file("./public/index.html").bytes(), {
        headers: {
          "Content-Type": "text/html",
        },
      }),
    "/api/upload": {
      POST: async (req) => {
        const body = await req.formData();
        const file = body.get("file") as File;

        const result = await transcibe(file as any);
        await fs.writeFile(
          path.join("./public/results", file.name),
          JSON.stringify(result, null, 2),
        );
        return new Response(JSON.stringify(result));
      },
    },
    // Serve a file by buffering it in memory
    "/favicon.ico": new Response(
      await Bun.file("./public/favicon.ico").bytes(),
      {
        headers: {
          "Content-Type": "image/x-icon",
        },
      },
    ),
  },

  // (optional) fallback for unmatched routes:
  // Required if Bun's version < 1.2.3
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});
