import fs from "fs/promises";
import { AssemblyAI } from "assemblyai";
import path from "path";
import { FileSystemRouter } from "bun";
console.log("Service started. Listening on port 8080");
console.log("http://localhost:8080");

// Remove the environment variable check since we'll get the API key from the client
// const apiKey = process.env.ASSEMBLYAI_API_KEY;
// if (!apiKey) {
//   throw new Error("ASSEMBLYAI_API_KEY environment variable not set");
// }

// We'll create the client when needed with the API key from the request
// const client = new AssemblyAI({
//   apiKey: apiKey,
// });

async function transcribe(file: File, apiKey: string, speakersExpected = 2) {
  try {
    // Create a new client with the provided API key
    const client = new AssemblyAI({
      apiKey: apiKey,
    });

    const transcript = await client.transcripts.transcribe({
      audio: file,
      speakers_expected: speakersExpected,
      speaker_labels: true,
    });

    if (transcript.status === "error") {
      throw new Error(`Transcription failed: ${transcript.error}`);
    }

    if (!transcript.utterances) {
      throw new Error("Transcription utterances are null");
    }

    return transcript.utterances;
  } catch (error: any) {
    throw new Error(`Transcription error: ${error.message}`);
  }
}

Bun.serve({
  port: 8080,
  async fetch(req) {
    const url = new URL(req.url);

    // Handle static files from public directory
    if (url.pathname.startsWith("/public/")) {
      try {
        // Remove '/public' from the start to get the actual file path
        const filePath = path.join(".", url.pathname);
        const file = Bun.file(filePath);

        // Check if file exists
        const exists = await file.exists();
        if (!exists) {
          return new Response("File not found", { status: 404 });
        }

        // Determine content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentType =
          {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "text/javascript",
            ".json": "application/json",
            ".txt": "text/plain",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
          }[ext] || "application/octet-stream";

        return new Response(file, {
          headers: {
            "Content-Type": contentType,
          },
        });
      } catch (error) {
        console.error("Static file error:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    // Define routes
    const routes: Record<string, (req: Request) => Promise<Response>> = {
      "/": async () =>
        new Response(await Bun.file("./public/index.html").text(), {
          headers: { "Content-Type": "text/html" },
        }),

      "/results": async () =>
        new Response(await Bun.file("./public/results.html").text(), {
          headers: { "Content-Type": "text/html" },
        }),

      "/api/results": async () => {
        try {
          const resultsDir = "./public/results";
          const files = await fs.readdir(resultsDir);
          const txtFiles = files.filter((file) => file.endsWith(".txt"));

          return new Response(JSON.stringify(txtFiles), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error: any) {
          console.error("Error listing results:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },

      "/api/upload": async (req: Request) => {
        if (req.method !== "POST") {
          return new Response("Method not allowed", { status: 405 });
        }

        try {
          const body = await req.formData();
          const file = body.get("file");
          const apiKey = body.get("apiKey");
          const speakersExpected = body.get("speakersExpected");

          if (!file || !(file instanceof File)) {
            return new Response(
              JSON.stringify({ error: "No file provided or invalid file" }),
              { status: 400 }
            );
          }

          if (!apiKey || typeof apiKey !== "string") {
            return new Response(
              JSON.stringify({
                error: "No API key provided or invalid API key",
              }),
              { status: 400 }
            );
          }

          // Convert speakersExpected to number and validate
          const numSpeakers = speakersExpected
            ? parseInt(speakersExpected as string, 10)
            : 2;
          if (isNaN(numSpeakers) || numSpeakers < 2 || numSpeakers > 6) {
            return new Response(
              JSON.stringify({
                error: "Invalid number of speakers. Must be between 2 and 6.",
              }),
              { status: 400 }
            );
          }

          const result = await transcribe(file, apiKey, numSpeakers);
          const baseFileName = file.name.replace(/\.[^/.]+$/, "");
          await fs.writeFile(
            path.join("./public/results", `${baseFileName}.txt`),
            JSON.stringify(result, null, 2)
          );

          return new Response(
            JSON.stringify({
              success: true,
              data: result,
              resultUrl: `/public/results/${baseFileName}.txt`,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (error: any) {
          console.error("Upload error:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    };

    // Handle defined routes
    const handler = routes[url.pathname as keyof typeof routes];
    if (handler) {
      return handler(req);
    }

    // Return 404 for unmatched routes
    return new Response("Not Found", { status: 404 });
  },
});
