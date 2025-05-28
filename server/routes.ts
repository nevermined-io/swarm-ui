import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";

/**
 * POST /api/title/summarize
 * Sintetiza el input del usuario en un título usando OpenAI
 * @param {string} input - El input original del usuario
 * @returns {string} title - El título sintetizado
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  app.post("/api/title/summarize", async (req, res) => {
    try {
      const { input } = req.body;
      if (!input || typeof input !== "string") {
        return res.status(400).json({ error: "Missing or invalid input" });
      }
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      const prompt = `Summarize the following user request into a short, catchy title (max 10 words):\n"${input}"\nTitle:`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that creates short, catchy titles for user requests. For example, if the user request is 'Create a music video about a redhead girl', the title should be 'Redhead Girl Music Video'.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 16,
        temperature: 0.7,
      });
      const title =
        completion.choices[0]?.message?.content?.trim() || "Untitled";
      res.json({ title });
    } catch (err) {
      res.status(500).json({ error: "Failed to generate title" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
