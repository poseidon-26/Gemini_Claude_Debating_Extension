import { DebateSession, DebateState, Turn, ModelTarget } from '../lib/types';
import { checkConvergence } from './convergence';
import { saveSession } from '../lib/storage';

export class DebateStateMachine {
  session: DebateSession;
  onStateChange: (state: DebateState, session: DebateSession) => void;

  constructor(session: DebateSession, onStateChange: (state: DebateState, session: DebateSession) => void) {
    this.session = session;
    this.onStateChange = onStateChange;
  }

  private async transition(newState: DebateState) {
    this.session.state = newState;
    this.session.lastUpdated = Date.now();
    await saveSession(this.session);
    this.onStateChange(newState, this.session);
  }

  async start(contextBundle?: string) {
    if (this.session.state !== 'IDLE') return;
    this.session.contextBundle = contextBundle;
    await this.transition('PRE_FLIGHT');
  }

  async approvePreFlight() {
    if (this.session.state !== 'PRE_FLIGHT') return;
    if (this.session.contextBundle) {
      await this.transition('CONTEXT_PREP');
      // In a real flow, context prep happens, then we go to GEMINI_TURN
      await this.transition('GEMINI_TURN');
    } else {
      await this.transition('GEMINI_TURN');
    }
  }

  async recordTurn(turn: Turn) {
    this.session.turns.push(turn);
    await saveSession(this.session);
  }

  async completeGeminiTurn(turn: Turn) {
    if (this.session.state !== 'GEMINI_TURN') return;
    await this.recordTurn(turn);
    await this.transition('CLAUDE_TURN');
  }

  async completeClaudeTurn(turn: Turn) {
    if (this.session.state !== 'CLAUDE_TURN') return;
    await this.recordTurn(turn);
    await this.transition('CONVERGENCE_CHECK');
  }

  async performConvergenceCheck() {
    if (this.session.state !== 'CONVERGENCE_CHECK') return;
    
    // Convergence check happens after Claude's turn. 
    // We check if either side explicitly signaled convergence or if Claude's latest matches its previous.
    const claudeTurns = this.session.turns.filter(t => t.model === 'claude');
    const latestClaude = claudeTurns[claudeTurns.length - 1];
    const previousClaude = claudeTurns.length > 1 ? claudeTurns[claudeTurns.length - 2] : undefined;

    const hasConverged = checkConvergence(latestClaude.text, previousClaude?.text);
    
    if (hasConverged) {
      await this.transition('SYNTHESIS');
      return;
    }

    if (this.session.turns.length >= this.session.turnCap) {
      await this.transition('FAILSAFE_PAUSE');
      return;
    }

    // Not converged, turn cap not hit -> back to Gemini
    await this.transition('GEMINI_TURN');
  }

  async pause(reason: 'MANUAL_PAUSE' | 'CONTEXT_LIMIT_PAUSE') {
    await this.transition(reason);
  }

  async resume() {
    // Basic resume to previous active turn based on who spoke last
    const lastTurn = this.session.turns[this.session.turns.length - 1];
    if (!lastTurn) {
      await this.transition('GEMINI_TURN');
    } else if (lastTurn.model === 'gemini') {
      await this.transition('CLAUDE_TURN'); // Claude is next
    } else {
      // Claude was last, so normally we go to convergence check, but let's just do GEMINI_TURN to continue
      await this.transition('GEMINI_TURN');
    }
  }
  
  async abortToSynthesis() {
    await this.transition('SYNTHESIS');
  }
  
  async completeSynthesis(finalAnswer: string) {
    this.session.finalAnswer = finalAnswer;
    await this.transition('DONE');
  }
}
