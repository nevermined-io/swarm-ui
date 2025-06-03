/**
 * Utilidad para suscribirse a eventos SSE de tareas del agente.
 * @module chat-sse
 */

/**
 * Subscribe to SSE events for a given task ID.
 * @param {string} taskId - The task ID to subscribe to.
 * @param {(data: any) => void} onMessage - Callback for each message event.
 * @returns {() => void} Function to close the SSE connection.
 */
export function subscribeToTaskEvents(
  taskId: string,
  onMessage: (data: any) => void
): () => void {
  const baseUrl = import.meta.env.VITE_SSE_URL;
  if (!baseUrl) {
    throw new Error(
      "Missing environment variable: VITE_SSE_URL. Please define it in your .env file."
    );
  }
  const eventSource = new EventSource(`${baseUrl}/tasks/events/${taskId}`);
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  eventSource.onerror = () => {
    eventSource.close();
  };
  return () => eventSource.close();
}
