import { useEffect, useRef } from 'react';
import { NodeEvent } from './types';

export function useSSE(taskId: string | null, onEvent: (event: NodeEvent) => void) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!taskId) return;

    let eventSource: EventSource | null = null;
    let isCancelled = false;

    try {
      eventSource = new EventSource(`/tasks/${taskId}/stream`);

      eventSource.onmessage = (e) => {
        if (isCancelled) return;
        try {
          const event: NodeEvent = JSON.parse(e.data);
          onEventRef.current(event);
        } catch (err) {
          console.error('Failed to parse SSE event:', err);
        }
      };

      eventSource.onerror = (err) => {
        // SSE error or stream ended
        console.debug('SSE connection info:', err);
      };
    } catch (e) {
      console.error('Failed to initialize EventSource:', e);
    }

    return () => {
      isCancelled = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [taskId]);
}
