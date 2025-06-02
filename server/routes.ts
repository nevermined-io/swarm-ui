import type { Express } from "express";
import { createServer, type Server } from "http";
import { llmRouter, llmTitleSummarizer } from "./services/llmService";
import {
  getUserCredits,
  createTask,
  orderPlanCredits,
  getBurnTransactionInfo,
  getTask,
} from "./services/paymentsService";
import { llmIntentSynthesizer } from "./services/llmService";
import { getCurrentBlockNumber } from "./services/blockchainService";

/**
 * POST /api/title/summarize
 * Synthesizes the user's input into a title using OpenAI, using the conversation history
 * @param {Array<{role: string, content: string}>} history - The conversation history
 * @returns {string} title - The synthesized title
 */
export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/title/summarize", async (req, res) => {
    try {
      const { history } = req.body;

      if (!Array.isArray(history)) {
        return res.status(400).json({ error: "Missing or invalid history" });
      }

      const title = await llmTitleSummarizer(history);
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
      const credit = await getUserCredits();
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
      const credits = await getUserCredits();
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
    const planDid = process.env.PLAN_DID;
    if (!planDid) {
      return res.status(500).json({ error: "Missing plan DID" });
    }
    const result = await orderPlanCredits(planDid);
    if (result.success) {
      res.json({
        message:
          result.message ||
          "Plan purchased successfully. You now have credits!",
        txHash: result.txHash,
        credits: result.credits,
        planDid,
      });
    } else {
      res.status(402).json({ error: result.message });
    }
  });

  /**
   * POST /api/intent/synthesize
   * Synthesizes the user's intent from the conversation history using OpenAI
   * @body {Array<{role: string, content: string}>} history - The conversation history
   * @returns {string} intent - The synthesized intent
   */
  app.post("/api/intent/synthesize", async (req, res) => {
    try {
      const { history } = req.body;
      if (!Array.isArray(history)) {
        return res.status(400).json({ error: "Missing or invalid history" });
      }
      const intent = await llmIntentSynthesizer(history);
      res.json({ intent });
    } catch (err) {
      res.status(500).json({ error: "Failed to synthesize intent" });
    }
  });

  /**
   * POST /api/orchestrator-task
   * Creates an orchestrator task using the payments library and returns the task_id.
   * @body {string} input_query - The user's message
   * @returns {object} - { task: { task_id: string } }
   */
  app.post("/api/orchestrator-task", async (req, res) => {
    const { input_query } = req.body;
    if (typeof input_query !== "string") {
      return res.status(400).json({ error: "Missing input_query" });
    }

    try {
      const task_id = await createTask(input_query);
      return res.status(200).json({
        task: { task_id },
        planDid: process.env.PLAN_DID,
      });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ error: "Failed to create orchestrator task" });
    }
  });

  /**
   * GET /api/latest-block
   * Returns the latest block number from the blockchain
   * @returns {number} blockNumber - The latest block number
   */
  app.get("/api/latest-block", async (req, res) => {
    try {
      const blockNumber = await getCurrentBlockNumber();
      res.json({ blockNumber });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch latest block" });
    }
  });

  /**
   * GET /api/find-burn-tx
   * Finds the burn transaction for the current plan and wallet from a given block
   * @query {number} fromBlock - The block number to start searching from
   * @query {string} [taskId] - (Optional) The task identifier
   * @returns {object} - { txHash, value, message }
   */
  app.get("/api/find-burn-tx", async (req, res) => {
    const { fromBlock } = req.query;
    if (!fromBlock) {
      return res.status(400).json({ error: "Missing fromBlock parameter" });
    }
    try {
      const result = await getBurnTransactionInfo(Number(fromBlock));
      if (result && result.txHash) {
        res.json(result);
      } else {
        res.status(404).json({ message: "No burn transaction found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Failed to search for burn transaction" });
    }
  });

  app.get("/api/task", async (req, res) => {
    const { task_id } = req.query;
    if (!task_id) {
      return res.status(400).json({ error: "Missing task_id" });
    }
    const task = await getTask(task_id as string);
    res.json(task);
  });

  const httpServer = createServer(app);

  return httpServer;
}
