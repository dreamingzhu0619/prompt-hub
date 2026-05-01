import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';

const useMock = import.meta.env.VITE_USE_MOCK === 'true';

export function useAgentSSE() {
  const [steps, setSteps] = useState([]);
  const [finalResult, setFinalResult] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | running | completed | error
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const mockTimerRef = useRef(null);

  const reset = useCallback(() => {
    setSteps([]);
    setFinalResult(null);
    setStatus('idle');
    setError(null);
  }, []);

  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (mockTimerRef.current) {
      clearTimeout(mockTimerRef.current);
      mockTimerRef.current = null;
    }
    setStatus((prev) => (prev === 'running' ? 'completed' : prev));
  }, []);

  const startMockStream = useCallback(() => {
    const mockSteps = api.getMockAgentSteps();
    const mockResult = api.getMockAgentFinalResult();
    let index = 0;

    const emitNext = () => {
      if (index < mockSteps.length) {
        const step = { ...mockSteps[index], id: index + 1 };
        setSteps((prev) => [...prev, step]);
        index++;
        mockTimerRef.current = setTimeout(emitNext, 1200 + Math.random() * 800);
      } else {
        setStatus('completed');
        setFinalResult(mockResult);
      }
    };

    mockTimerRef.current = setTimeout(emitNext, 600);
  }, []);

  const normalizeStep = useCallback((data) => {
    if (data.step_type === 'reasoning') {
      return {
        type: 'thinking',
        content: data.output?.thought || data.output?.raw_response || '',
        raw: data,
      };
    }

    if (data.step_type === 'tool') {
      return {
        type: 'tool_result',
        tool: data.step_name,
        result: data.output?.results || data.output || [],
        params: data.input?.tool_input || {},
        raw: data,
      };
    }

    if (data.step_type === 'error') {
      return {
        type: 'error',
        content: data.output?.message || 'Agent 执行出错',
        raw: data,
      };
    }

    return {
      type: 'thinking',
      content: data.output?.thought || data.output?.message || 'Agent 执行中',
      raw: data,
    };
  }, []);

  const connect = useCallback((agentId) => {
    reset();
    setStatus('running');

    if (useMock) {
      startMockStream();
      return;
    }

    const url = api.getAgentStreamUrl(agentId);
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('step', (event) => {
      try {
        const data = JSON.parse(event.data);
        const normalized = normalizeStep(data);
        setSteps((prev) => [...prev, { ...normalized, id: prev.length + 1 }]);
      } catch (e) {
        console.error('Failed to parse step event:', e);
      }
    });

    es.addEventListener('result', (event) => {
      try {
        const data = JSON.parse(event.data);
        setStatus('completed');
        setFinalResult(data);
        es.close();
        eventSourceRef.current = null;
      } catch (e) {
        console.error('Failed to parse result event:', e);
      }
    });

    es.addEventListener('error', (event) => {
      if (es.readyState === EventSource.CLOSED) return;
      let errorMsg = 'Agent 执行出错';
      try {
        const data = JSON.parse(event.data);
        errorMsg = data.message || errorMsg;
      } catch {
        // SSE connection error (not a data event)
      }
      setError(errorMsg);
      setStatus('error');
      es.close();
      eventSourceRef.current = null;
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) return;
      setError('SSE 连接中断');
      setStatus('error');
      es.close();
      eventSourceRef.current = null;
    };
  }, [normalizeStep, reset, startMockStream]);

  return { steps, finalResult, status, error, connect, stop, reset };
}
