import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message } from '../types';
import * as api from '../services/api';

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const STORAGE_KEY = 'chatbot_session_id';

// ── Client-side offline responder fallback ─────────────────────────────────────
const getOfflineResponse = (userMessage: string): string => {
  const query = userMessage.toLowerCase().trim();
  
  if (query.includes('menu') || query.includes('food') || query.includes('dish') || query.includes('eat') || query.includes('drink')) {
    return "Here is our signature menu! We offer popular dishes like Butter Chicken, Lamb Biryani, Paneer Tikka, and local seasonal specialties. You can check our complete menu and upload new ones in the admin panel!";
  }
  if (query.includes('hour') || query.includes('open') || query.includes('close') || query.includes('time') || query.includes('schedule')) {
    return "We are open Monday to Friday from 11:00 AM to 10:00 PM, and on weekends from 10:00 AM to 11:00 PM. We look forward to serving you!";
  }
  if (query.includes('book') || query.includes('reservation') || query.includes('table') || query.includes('reserve')) {
    return "Reservations are easy! You can book a table by calling us directly at +1 (555) 123-4567 or emailing info@kalairestaurant.com.";
  }
  if (query.includes('location') || query.includes('where') || query.includes('address') || query.includes('map') || query.includes('street')) {
    return "We are located at 123 Main Street, City, State 12345. Feel free to stop by or call us for directions!";
  }
  if (query.includes('vegan') || query.includes('veg') || query.includes('vegetarian')) {
    return "Yes, we have plenty of delicious vegetarian and vegan options, including Paneer Butter Masala, Chana Masala, and vegan Dal Tadka. Please inform our staff about any dietary requirements!";
  }
  if (query.includes('hi') || query.includes('hello') || query.includes('hey') || query.includes('welcome') || query.includes('help')) {
    return "Hello! Welcome to Kalai Restaurant. I'm your AI assistant. How can I help you today? 🍽️";
  }
  
  return "Thank you for reaching out! Since the backend server is in demo/offline mode, I am responding from my local knowledge base. You can ask me about our menu, hours, location, or reservations!";
};

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
        console.warn('Failed to initialize chat session, using offline session:', err);
        // Do not block the chat widget, start an offline session ID
        const fallbackSessionId = `offline-${generateId()}`;
        setSessionId(fallbackSessionId);
        localStorage.setItem(STORAGE_KEY, fallbackSessionId);
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
          try {
            const { sessionId: newId } = await api.createSession();
            localStorage.setItem(STORAGE_KEY, newId);
            setSessionId(newId);
            currentSessionId = newId;
          } catch {
            currentSessionId = `offline-${generateId()}`;
            localStorage.setItem(STORAGE_KEY, currentSessionId);
            setSessionId(currentSessionId);
          }
        }

        // If the session ID starts with 'offline', skip network and use local responder immediately
        if (currentSessionId.startsWith('offline')) {
          await new Promise((r) => setTimeout(r, 600)); // natural typing delay
          const responseText = getOfflineResponse(content.trim());
          const botMsg: Message = {
            id: generateId(),
            role: 'assistant',
            content: responseText,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, botMsg]);
          if (!isOpen) {
            setUnreadCount((prev) => prev + 1);
          }
          setIsTyping(false);
          return;
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
        console.warn('Failed to send message via API, falling back to local simulation:', err);
        
        // Mock natural typing response delay
        await new Promise((r) => setTimeout(r, 650));
        
        const offlineText = getOfflineResponse(content.trim());
        const botMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: offlineText,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
        
        if (!isOpen) {
          setUnreadCount((prev) => prev + 1);
        }
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
      setSessionId(`offline-${generateId()}`);
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
