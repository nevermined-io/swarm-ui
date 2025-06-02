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
  };
}

/**
 * Retrieve the task for a given task ID.
 * @param task_id The task ID to retrieve the task for.
 * @returns Promise resolving to the task.
 */
export async function getTask(task_id: string): Promise<any> {
  const response = await fetch(`/api/task?task_id=${task_id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) throw new Error("Failed to retrieve credits burned");
  const data = await response.json();
  return data;
}

/**
 * Updates credits and retrieves burn transaction for a completed task.
 * Calculates the current block number internally.
 * @param task_id The task ID to update and check burn transaction for.
 * @returns Promise resolving to burn transaction data (or null if not found).
 */
export async function updateCreditsAndGetBurnTx(task_id: string): Promise<{
  txHash: string;
  credits: number;
  planDid: string;
} | null> {
  try {
    const blockNumber = await getCurrentBlockNumber();
    await getTask(task_id);
    const burnTxResp = await fetch(
      `/api/find-burn-tx?fromBlock=${blockNumber}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    if (!burnTxResp.ok) return null;
    const burnTxData = await burnTxResp.json();
    return {
      txHash: burnTxData.txHash,
      credits: burnTxData.credits,
      planDid: burnTxData.planDid,
    };
  } catch {
    return null;
  }
}
