/**
 * Utilidad para suscribirse a eventos SSE de tareas del agente.
 * @module chat-sse
 */

/**
 * Subscribe to SSE events for a given task ID.
 * @param taskId The task ID to subscribe to.
 * @param onMessage Callback for each message event.
 * @returns Function to close the SSE connection.
 */
export function subscribeToTaskEvents(
  taskId: string,
  onMessage: (data: any) => void
): () => void {
  const eventSource = new EventSource(
    `http://localhost:3001/tasks/events/${taskId}`
  );
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  eventSource.onerror = () => {
    eventSource.close();
  };
  return () => eventSource.close();
}
