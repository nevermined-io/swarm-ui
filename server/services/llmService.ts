import OpenAI from "openai";

/**
 * Calls the LLM to decide what to do with a user message before sending to the agent.
 * @param {string} message - The user's message
 * @param {any[]} history - The conversation history
 * @param {number} credits - The user's available credits
 * @returns {Promise<{action: string, message?: string}>}
 */
export async function llmRouter(
  message: string,
  history: any[],
  credits: number
): Promise<{ action: string; message?: string }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `You are an assistant that routes user messages in a chat with a Nevermined agent. You must choose one of four actions:

- forward: The message should be sent to the agent as usual.
- no_credit: The user does not have enough credits. You must provide a reason in 'message'.
- order_plan: The user wants to purchase credits for the agent's associated plan.
- no_action: The user does not want to do anything, or you need to ask for clarification before proceeding. In this case, respond in 'message' as if you were having a normal conversation with the user, giving a short, natural reply.

Rules (in order of priority, where 1 is the highest priority):
1. If the user request has no clear intent of creating a music video or purchasing credits, respond with 'no_action' and in 'message' give a polite, short, conversational reply.
2. If the user's request is ambiguous or missing essential information for creating a music video (for example, if they ask to create a music video but do not specify the theme, topic, style, song type, or visual aesthetics), respond with 'no_action' and in 'message' ask the user for the missing information in a conversational way. Do not proceed to 'forward' until ALL required details are provided and the user has explicitly confirmed they are ready to generate the music video.
3. If the user has provided all required details (theme, topic, style, song type, visual aesthetics, and any other relevant information) AND has given explicit approval to proceed (e.g., by saying 'yes', 'I'm ready', 'go ahead', 'let's do it', etc.), respond with 'forward'.
4. If the user wants to create a music video but does not have enough credits, respond with 'no_credit' and explain the reason in 'message'. Do not ask for clarification or forward the message if there are no credits.
5. If the user asks to buy credits, or clearly accepts a previous offer to buy credits (for example, by replying "yes", "ok", "I want to buy", "go ahead", "let's do it", or similar after being offered to purchase credits), respond with 'order_plan'. Do not repeat the lack of credits message in this case.

You must always ensure that before choosing 'forward', the user has provided:
- The main theme or topic of the video
- The visual style or aesthetics
- The type or genre of the song
- Any other relevant details (if mentioned)
- An explicit confirmation to proceed

If any of these are missing, continue asking for them in a friendly, conversational way using 'no_action'.

The message always has to be in English.

Examples:
User: "create a music video about a girl"
-> { "action": "no_action", "message": "What style or visual aesthetics would you like for the video? And what type of song should it be?" }

User: "I want it to be synth pop and colorful"
-> { "action": "no_action", "message": "Great! Do you want to add any other details, or should I go ahead and create the music video now?" }

User: "yes, go ahead"
-> { "action": "forward" }

User: "create a colorful music video about a redhead girl with an upbeat synth pop song"
-> { "action": "no_action", "message": "Would you like to add any more details, or should I create the music video now?" }

User: "that's all, go ahead"
-> { "action": "forward" }

Return only a JSON with the action and, if applicable, the message. Example:
{
  "action": "no_credit",
  "message": "You do not have enough credits to continue. Do you want to purchase credits for the agent's associated plan?"
}
or
{
  "action": "no_action",
  "message": "Okay, let me know if you need anything else!"
}
or
{
  "action": "no_action",
  "message": "What theme or topic would you like for your music video?"
}
or
{
  "action": "order_plan"
}

Conversation history (for context):
${JSON.stringify(history || [])}

User message:
"${message}"

User credits: ${credits}

Response:`;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an assistant that decides how to process messages in a chat with a Nevermined agent. Only respond with a valid JSON with the action and a reason if applicable.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 512,
    temperature: 0.2,
  });
  const text = completion.choices[0]?.message?.content?.trim() || "";
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      json = JSON.parse(match[0]);
    } else {
      throw new Error("LLM did not return valid JSON");
    }
  }
  return json;
}

/**
 * Summarizes the user's request into a short, catchy title using the conversation history.
 * @param {Array<{role: string, content: string}>} history - The conversation history (user and assistant messages)
 * @returns {Promise<string>} - The synthesized title
 */
export async function llmTitleSummarizer(
  history: { role: string; content: string }[]
): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `Given the following conversation between a user and an assistant, summarize the user's intent into a short, catchy title (max 10 words). Focus on the user's goal for the music video, not the assistant's questions.\n\nConversation history:\n${history
    .map(
      (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
    )
    .join("\n")}\n\nTitle:`;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an assistant that creates short, catchy titles for user requests based on the full conversation. For example, if the conversation is about creating a music video about a redhead girl, the title should be 'Redhead Girl Music Video'.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 16,
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content?.trim() || "Untitled";
}

/**
 * Synthesizes the user's intent from the conversation history using OpenAI.
 * @param {Array<{role: string, content: string}>} history - The conversation history (user and assistant messages)
 * @returns {Promise<string>} - The synthesized intent for the agent
 */
export async function llmIntentSynthesizer(
  history: { role: string; content: string }[]
): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `Given the following conversation between a user and an assistant, synthesize a single, clear English sentence that captures the music video what the user wants, as if you were giving instructions to an agent. Focus on the user's intent, not the assistant's questions.\n\nConversation history:\n${history
    .map(
      (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
    )
    .join("\n")}\n\nSynthesized intent:`;
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an assistant that synthesizes the user's intent from a conversation. Respond with a single, clear English sentence that summarizes the music video that the user wants, including the theme, style, and any other details that the user might have mentioned, ready to be used as a prompt for an agent.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 64,
    temperature: 0.3,
  });
  return completion.choices[0]?.message?.content?.trim() || "";
}
