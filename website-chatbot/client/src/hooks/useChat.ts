import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message } from '../types';
import * as api from '../services/api';

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const STORAGE_KEY = 'chatbot_session_id';

export interface UseChatReturn {
  messages: Message[];
  sessionId: string | null;
  isTyping: boolean;
  isOpen: boolean;
  error: string | null;
  unreadCount: number;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  toggleOpen: () => void;
  setIsOpen: (open: boolean) => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const isInitialized = useRef(false);

  // ── Init session on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initSession = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSessionId(stored);
          // Try to load existing history
          try {
            const history = await api.getHistory(stored);
            if (history && history.length > 0) {
              const parsed = history.map((m) => ({
                ...m,
                timestamp: new Date(m.timestamp),
              }));
              setMessages(parsed);
            }
          } catch {
            // History not found, start fresh
            const { sessionId: newId } = await api.createSession();
            localStorage.setItem(STORAGE_KEY, newId);
            setSessionId(newId);
          }
        } else {
          const { sessionId: newId } = await api.createSession();
          localStorage.setItem(STORAGE_KEY, newId);
          setSessionId(newId);
        }
      } catch (err) {
        console.error('Failed to initialize chat session:', err);
        setError('Failed to connect to chat server.');
      }
    };

    initSession();
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isTyping) return;

      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);
      setError(null);

      let currentSessionId = sessionId;

      try {
        if (!currentSessionId) {
          const { sessionId: newId } = await api.createSession();
          localStorage.setItem(STORAGE_KEY, newId);
          setSessionId(newId);
          currentSessionId = newId;
        }

        const result = await api.sendMessage(currentSessionId, content.trim());
        const responseText = (result as any)?.data?.response ?? (result as any)?.response ?? "I'm here to help!";

        const botMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botMsg]);

        // Increment unread if chat is closed
        if (!isOpen) {
          setUnreadCount((prev) => prev + 1);
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        const errorMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: "I'm sorry, I couldn't process your request. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setError('Failed to get response from AI.');
      } finally {
        setIsTyping(false);
      }
    },
    [sessionId, isTyping, isOpen],
  );

  // ── Clear chat ────────────────────────────────────────────────────────────
  const clearChat = useCallback(async () => {
    setMessages([]);
    setError(null);
    setUnreadCount(0);
    localStorage.removeItem(STORAGE_KEY);
    try {
      const { sessionId: newId } = await api.createSession();
      localStorage.setItem(STORAGE_KEY, newId);
      setSessionId(newId);
    } catch {
      setSessionId(null);
    }
  }, []);

  // ── Toggle chat open ──────────────────────────────────────────────────────
  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) setUnreadCount(0);
      return !prev;
    });
  }, []);

  const handleSetIsOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) setUnreadCount(0);
  }, []);

  return {
    messages,
    sessionId,
    isTyping,
    isOpen,
    error,
    unreadCount,
    sendMessage,
    clearChat,
    toggleOpen,
    setIsOpen: handleSetIsOpen,
  };
}
