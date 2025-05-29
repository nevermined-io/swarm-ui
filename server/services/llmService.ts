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
  console.log("credits", credits);
  const prompt = `You are an assistant that routes user messages in a chat with a Nevermined agent. You must choose one of four actions:

- forward: The message should be sent to the agent as usual.
- no_credit: The user does not have enough credits. You must provide a reason in 'message'.
- order_plan: The user wants to purchase credits for the agent's associated plan.
- no_action: The user does not want to do anything, or you need to ask for clarification before proceeding. In this case, respond in 'message' as if you were having a normal conversation with the user, giving a short, natural reply.

Rules (in order of priority):
1. If the user does not have enough credits, respond with 'no_credit' and explain the reason in 'message'. Do not ask for clarification or forward the message if there are no credits.
2. If the user asks to buy credits, respond with 'order_plan'.
3. If the user explicitly rejects or declines to buy credits (for example, says "no", "not now", "I don't want to buy credits", etc.), respond with 'no_action' and in 'message' give a polite, short, conversational reply (for example, "Okay, let me know if you need anything else!").
4. If the user's request is ambiguous or missing essential information (for example, if they ask to create a music video but do not specify the theme or topic), respond with 'no_action' and in 'message' ask the user for the missing information in a conversational way.
5. If the message is a normal query, there are credits, and the request is clear and complete, respond with 'forward'.

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
