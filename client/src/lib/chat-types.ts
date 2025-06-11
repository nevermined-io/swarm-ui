/**
 * Tipos e interfaces para el contexto de chat.
 * @module chat-types
 */

import { Conversation } from "@shared/schema";

/**
 * FullMessage for chat context, compatible with all message types including 'warning'.
 * @typedef {Object} FullMessage
 * @property {number} id
 * @property {string} conversationId
 * @property {Date | null} timestamp
 * @property {boolean} isUser
 * @property {"reasoning" | "answer" | "final-answer" | "transaction" | "nvm-transaction-user" | "nvm-transaction-agent" | "error" | "warning" | "callAgent" | "usd-info"} type
 * @property {string} content
 * @property {string} [txHash]
 * @property {{ mimeType: string; parts: string[] }} [artifacts]
 * @property {number} [credits]
 * @property {string} [planDid]
 */
export interface FullMessage {
  id: number;
  conversationId: string;
  timestamp: Date | null;
  isUser: boolean;
  type:
    | "reasoning"
    | "answer"
    | "final-answer"
    | "transaction"
    | "nvm-transaction-user"
    | "nvm-transaction-agent"
    | "error"
    | "warning"
    | "callAgent"
    | "usd-info";
  content: string;
  txHash?: string;
  /**
   * Credits consumed in nvm-transaction
   */
  credits?: number;
  /**
   * Plan DID for nvm-transaction
   */
  planDid?: string;
  /**
   * Optional artifacts for media or extra data (images, audio, video, text, etc)
   * @type {{ mimeType: string; parts: string[] }}
   */
  artifacts?: {
    mimeType: string;
    parts: string[];
  };
}

/**
 * Interfaz para el contexto de chat de React.
 * @typedef {Object} ChatContextType
 */
export interface ChatContextType {
  messages: FullMessage[];
  conversations: Conversation[];
  currentConversationId: number | null;
  showReasoningCollapse: boolean;
  isStoredConversation: boolean;
  sendMessage: (content: string) => void;
  setCurrentConversationId: (id: number | null) => void;
  startNewConversation: () => void;
  onMessageTypingComplete: () => void;
}
