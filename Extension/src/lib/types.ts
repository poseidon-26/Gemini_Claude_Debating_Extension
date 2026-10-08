export type Role = 'Proposer' | 'CriticVerifier' | 'Synthesizer';
export type ModelTarget = 'gemini' | 'claude';

export type DebateState =
  | 'IDLE'
  | 'PRE_FLIGHT'
  | 'CONTEXT_PREP'
  | 'GEMINI_TURN'
  | 'CLAUDE_TURN'
  | 'CONVERGENCE_CHECK'
  | 'SYNTHESIS'
  | 'DONE'
  | 'FAILSAFE_PAUSE'
  | 'CONTEXT_LIMIT_PAUSE'
  | 'MANUAL_PAUSE';

export interface Turn {
  model: ModelTarget;
  role: Role;
  text: string;
  artifacts?: string[];
  timestamp: number;
}

export interface DebateSession {
  id: string;
  query: string;
  state: DebateState;
  turns: Turn[];
  startTime: number;
  lastUpdated: number;
  finalAnswer?: string;
  turnCap: number;
  contextBundle?: string;
  expectArtifact?: boolean;
  redirectInstruction?: string;
}

export type MsgType =
  | 'START_DEBATE'
  | 'PRE_FLIGHT_APPROVE'
  | 'PAUSE_DEBATE'
  | 'RESUME_DEBATE'
  | 'REDIRECT_DEBATE'
  | 'ABORT_DEBATE'
  | 'CONTEXT_COMPRESS'
  | 'STATE_UPDATE'
  | 'ADAPTER_PROMPT'
  | 'ADAPTER_RESPONSE'
  | 'ADAPTER_COMPRESS_RESTART';

export interface BaseMessage {
  type: MsgType;
  payload?: any;
}

export interface StartDebatePayload {
  query: string;
  contextBundle?: string;
  expectArtifact?: boolean;
}

export interface RedirectDebatePayload {
  text: string;
}

export interface AdapterPromptPayload {
  prompt: string;
  isArtifactExpected?: boolean;
}

export interface AdapterResponsePayload {
  text: string;
  artifacts?: string[];
  isContextLimitApproaching?: boolean;
}
