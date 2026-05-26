import type { LearningVisualBlock } from "../features/visual-blocks/visualBlockTypes";

export type LearningMode =
  | "explain_simply"
  | "exam_mode"
  | "visual_mode"
  | "step_by_step"
  | "fast_revision"
  | "challenge_me";

export interface ChatHistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatMessage extends ChatHistoryMessage {
  id: number;
  conversation_id: number;
  created_at: string;
  visual_blocks?: any[];
  mode?: string;
  sources?: any[];
}

export interface Conversation {
  id: number;
  learner_id?: number;
  title: string;
  selected_mode: string;
  created_at: string;
  messages: ChatMessage[];
}

export interface ChatApiResponse {
  content: string;
  visual_blocks: LearningVisualBlock[];
  model: string;
}

export type ChatStreamEvent =
  | {
      type: "meta";
      model: string;
      visual_blocks: LearningVisualBlock[];
    }
  | {
      type: "token";
      content: string;
    }
  | {
      type: "error";
      content: string;
    }
  | {
      type: "done";
    };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function getConversations(learnerId: number): Promise<Conversation[]> {
  const response = await fetch(`${API_BASE_URL}/api/conversations/?learner_id=${learnerId}`);
  if (!response.ok) throw new Error("Failed to fetch conversations");
  return response.json();
}

export async function getConversation(conversationId: number): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/api/conversations/${conversationId}`);
  if (!response.ok) throw new Error("Failed to fetch conversation");
  return response.json();
}

export async function createConversation(learnerId: number | null, title?: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE_URL}/api/conversations/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ learner_id: learnerId, title: title || "New Conversation" }),
  });
  if (!response.ok) throw new Error("Failed to create conversation");
  return response.json();
}

export async function getLearnerProfile(learnerId: number) {
  const response = await fetch(`${API_BASE_URL}/api/learners/${learnerId}`);
  if (!response.ok) throw new Error("Failed to fetch learner");
  return response.json();
}

export async function createLearnerProfile(data: any) {
  const response = await fetch(`${API_BASE_URL}/api/learners/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create learner");
  return response.json();
}

export async function sendChatMessage({
  history,
  learningMode,
  message,
  conversationId,
}: {
  history: ChatHistoryMessage[];
  learningMode: LearningMode;
  message: string;
  conversationId?: number;
}) {
  const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
    body: JSON.stringify({
      history,
      learning_mode: learningMode,
      message,
      conversation_id: conversationId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const fallbackMessage = `Chat request failed with status ${response.status}`;
    throw new Error(fallbackMessage);
  }

  return (await response.json()) as ChatApiResponse;
}

export async function streamChatMessage({
  history,
  learningMode,
  message,
  conversationId,
  onEvent,
}: {
  history: ChatHistoryMessage[];
  learningMode: LearningMode;
  message: string;
  conversationId?: number;
  onEvent: (event: ChatStreamEvent) => void;
}) {
  const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    body: JSON.stringify({
      history,
      learning_mode: learningMode,
      message,
      conversation_id: conversationId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok || !response.body) {
    const fallbackResponse = await sendChatMessage({
      history,
      learningMode,
      message,
      conversationId,
    });

    onEvent({
      type: "meta",
      model: fallbackResponse.model,
      visual_blocks: fallbackResponse.visual_blocks,
    });
    onEvent({
      type: "token",
      content: fallbackResponse.content,
    });
    onEvent({
      type: "done",
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const eventText of events) {
      const dataLine = eventText.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;
      onEvent(JSON.parse(dataLine.slice(6)) as ChatStreamEvent);
    }
  }
}
