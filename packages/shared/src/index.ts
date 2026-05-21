export type LearningMode =
  | "explain_simply"
  | "exam_mode"
  | "visual_mode"
  | "step_by_step"
  | "fast_revision"
  | "challenge_me";

export type PipelineStatus =
  | "searching_textbook"
  | "retrieving_notes"
  | "checking_internet_sources"
  | "generating_answer"
  | "generating_graph"
  | "loading_simulation";

export type SourceTrustLevel = "high" | "medium" | "variable";

export interface SourceReference {
  id: string;
  title: string;
  sourceType: "ssc_textbook" | "board_question" | "uploaded_notes" | "teacher_material" | "internet";
  trustLevel: SourceTrustLevel;
  chapter?: string;
  page?: number;
  url?: string;
}

export type VisualBlock =
  | {
      id: string;
      type: "physics.projectile";
      params: {
        speed: number;
        angleDegrees: number;
        gravity: number;
      };
      confidence?: number;
      replayable?: boolean;
    }
  | {
      id: string;
      type: "math.sineGraph";
      params: {
        amplitude: number;
        frequency: number;
        phase: number;
      };
      confidence?: number;
      replayable?: boolean;
    };

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  learningMode?: LearningMode;
  visualBlocks?: VisualBlock[];
  sources?: SourceReference[];
  createdAt: string;
}
