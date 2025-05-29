import type { Express } from "express";
import { createServer, type Server } from "http";
import { llmRouter } from "./services/llmService";
import { getCredits } from "./services/paymentsService";
import OpenAI from "openai";
import { Payments, EnvironmentName } from "@nevermined-io/payments";

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

  /**
   * GET /api/credit
   * Returns the credit available for the user
   * @returns {number} credit - The credit available
   */
  app.get("/api/credit", async (req, res) => {
    try {
      const nvmApiKey = process.env.NVM_API_KEY;
      const environment = process.env.NVM_ENVIRONMENT || "testing";
      const planDid = process.env.PLAN_DID;
      if (!nvmApiKey || !planDid) {
        return res
          .status(500)
          .json({ error: "Missing Nevermined API key or plan DID" });
      }
      const credit = await getCredits(nvmApiKey, environment, planDid);
      res.json({ credit });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch credit" });
    }
  });

  /**
   * POST /api/llm-router
   * Decides what to do with the user's message before sending it to the agent using OpenAI and the user's real credits.
   * @body {string} message - The user's message
   * @body {FullMessage[]} history - The conversation history
   * @returns { action: "forward" | "no_credit" | "order_plan" | "no_action", message?: string }
   */
  app.post("/api/llm-router", async (req, res) => {
    const { message, history } = req.body;
    if (typeof message !== "string") {
      return res.status(400).json({ error: "Missing message" });
    }
    try {
      const nvmApiKey = process.env.NVM_API_KEY;
      const environment = process.env.NVM_ENVIRONMENT || "testing";
      const planDid = process.env.PLAN_DID;
      if (!nvmApiKey || !planDid) {
        return res
          .status(500)
          .json({ error: "Missing Nevermined API key or plan DID" });
      }
      const credits = await getCredits(nvmApiKey, environment, planDid);
      const result = await llmRouter(message, history, credits);
      return res.json(result);
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to call LLM or get credits" });
    }
  });

  /**
   * POST /api/order-plan
   * Simulates the purchase of a Nevermined plan and returns a success message.
   * @returns {string} message - Confirmation message
   */
  app.post("/api/order-plan", async (req, res) => {
    res.json({ message: "Plan purchased successfully. You now have credits!" });
  });

  const httpServer = createServer(app);

  return httpServer;
}

/**
 * Initializes the Nevermined Payments library.
 * @param {string} nvmApiKey - Nevermined API key
 * @param {string} environment - testing, staging or production
 * @returns {Payments} - Authenticated Payments instance
 */
function initializePayments(nvmApiKey: string, environment: string): Payments {
  const payments = Payments.getInstance({
    nvmApiKey,
    environment: environment as EnvironmentName,
  });
  if (!payments.isLoggedIn) {
    throw new Error("Failed to log in to the Nevermined Payments Library");
  }
  return payments;
}

async function getUserCredits(): Promise<number> {
  const nvmApiKey = process.env.NVM_API_KEY;
  const environment = process.env.NVM_ENVIRONMENT || "testing";
  const planDid = process.env.PLAN_DID;
  if (!nvmApiKey || !planDid) {
    throw new Error("Missing Nevermined API key or plan DID");
  }
  const payments = initializePayments(nvmApiKey, environment);
  const balanceResult = await payments.getPlanBalance(planDid);
  const credit = parseInt(balanceResult.balance.toString());
  return credit;
}
