import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  type: text("type", {
    enum: ["reasoning", "answer", "transaction", "error"],
  }).notNull(),
  conversationId: text("conversation_id").notNull(),
  isUser: boolean("is_user").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const messageSchema = createInsertSchema(messages);
export const conversationSchema = createInsertSchema(conversations);

/**
 * Representa una conversación en el sistema.
 * @typedef {Object} Conversation
 * @property {number} id - Conversation unique identifier
 * @property {string} title - Conversation title
 * @property {Date} timestamp - Creation date
 * @property {string} [taskId] - Associated task id for agent communication (opcional)
 */
export type Conversation = {
  id: number;
  title: string;
  timestamp: Date;
  /**
   * Associated task id for agent communication (opcional)
   */
  taskId?: string;
};

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof messageSchema>;
export type InsertConversation = z.infer<typeof conversationSchema>;
