/**
 * Funciones de acceso a la API para el chat.
 * @module chat-api
 */

/**
 * Get the current block number from the backend.
 * @returns Promise resolving to the current block number.
 */
export async function getCurrentBlockNumber(): Promise<number> {
  const response = await fetch("/api/latest-block", {
    method: "GET",
  });
  if (!response.ok) throw new Error("Failed to get current block number");
  const data = await response.json();
  return data.blockNumber;
}

/**
 * Send a message to the orchestrator via backend proxy and return the created task ID.
 * @param content The user message to send.
 * @returns Promise resolving to the task ID.
 */
export async function sendTaskToOrchestrator(content: string): Promise<{
  task: { task_id: string };
  planDid: string;
}> {
  const response = await fetch("/api/orchestrator-task", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input_query: content }),
  });
  if (!response.ok) throw new Error("Failed to send message to orchestrator");
  const data = await response.json();
  return {
    task: data.task,
    planDid: data.planDid,
  };
}
