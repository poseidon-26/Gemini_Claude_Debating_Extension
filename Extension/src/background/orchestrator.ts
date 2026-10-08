import { DebateSession, StartDebatePayload, BaseMessage, AdapterPromptPayload, AdapterResponsePayload, RedirectDebatePayload } from '../lib/types';
import { DebateStateMachine } from './stateMachine';
import { saveSession } from '../lib/storage';
import { PROMPTS } from '../lib/prompts';

let activeStateMachine: DebateStateMachine | null = null;

async function findTab(urlPattern: string): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ url: urlPattern });
  return tabs[0];
}

function buildPromptWithRedirect(prompt: string, redirect?: string, expectArtifact?: boolean) {
  let finalPrompt = prompt;
  if (redirect) {
    finalPrompt += `\\n\\n[USER REDIRECTION INSTRUCTION]:\\n${redirect}`;
  }
  if (expectArtifact) {
    finalPrompt += `\\n\\n[USER REQUESTED ARTIFACT]: The user expects a structured document, code block, or native artifact for this response. Please provide one if your platform supports it.`;
  }
  return finalPrompt;
}

async function triggerGeminiTurn(session: DebateSession) {
  const tab = await findTab("*://gemini.google.com/*");
  if (!tab || !tab.id) {
    console.error("Gemini tab not found");
    return;
  }

  let prompt = '';
  if (session.turns.length === 0) {
    prompt = PROMPTS.GEMINI_PROPOSER_INITIAL(session.query, session.contextBundle);
  } else {
    const lastClaudeTurn = session.turns[session.turns.length - 1];
    prompt = PROMPTS.GEMINI_CONTINUATION(lastClaudeTurn.text);
  }

  prompt = buildPromptWithRedirect(prompt, session.redirectInstruction, session.expectArtifact);
  
  if (session.redirectInstruction) {
    session.redirectInstruction = undefined;
    await saveSession(session);
  }

  const payload: AdapterPromptPayload = { prompt, isArtifactExpected: session.expectArtifact };
  chrome.tabs.sendMessage(tab.id, { type: 'ADAPTER_PROMPT', payload });
}

async function triggerClaudeTurn(session: DebateSession) {
  const tab = await findTab("*://claude.ai/*");
  if (!tab || !tab.id) {
    console.error("Claude tab not found");
    return;
  }

  let prompt = '';
  const lastGeminiTurn = session.turns[session.turns.length - 1];
  if (session.turns.length === 1) { 
    prompt = PROMPTS.CLAUDE_CRITIC_INITIAL(session.query, lastGeminiTurn.text, session.contextBundle);
  } else {
    prompt = PROMPTS.CLAUDE_CONTINUATION(lastGeminiTurn.text);
  }

  prompt = buildPromptWithRedirect(prompt, session.redirectInstruction, session.expectArtifact);

  if (session.redirectInstruction) {
    session.redirectInstruction = undefined;
    await saveSession(session);
  }

  const payload: AdapterPromptPayload = { prompt, isArtifactExpected: session.expectArtifact };
  chrome.tabs.sendMessage(tab.id, { type: 'ADAPTER_PROMPT', payload });
}

async function handleStateChange(state: any, session: DebateSession) {
  chrome.runtime.sendMessage({ type: 'STATE_UPDATE', payload: session });

  if (state === 'GEMINI_TURN') {
    await triggerGeminiTurn(session);
  } else if (state === 'CLAUDE_TURN') {
    await triggerClaudeTurn(session);
  } else if (state === 'CONVERGENCE_CHECK') {
    if (activeStateMachine) {
      await activeStateMachine.performConvergenceCheck();
    }
  } else if (state === 'SYNTHESIS') {
    const tab = await findTab("*://claude.ai/*");
    if (tab && tab.id) {
       const transcript = session.turns.map(t => `[${t.model.toUpperCase()}]: ${t.text}`).join('\\n\\n');
       const prompt = PROMPTS.SYNTHESIS(session.query, transcript);
       chrome.tabs.sendMessage(tab.id, { type: 'ADAPTER_PROMPT', payload: { prompt, isArtifactExpected: true } });
    }
  }
}

export function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message: BaseMessage, sender, sendResponse) => {
    (async () => {
      try {
        if (message.type === 'START_DEBATE') {
          const payload = message.payload as StartDebatePayload;
          const session: DebateSession = {
            id: Date.now().toString(),
            query: payload.query,
            state: 'IDLE',
            turns: [],
            startTime: Date.now(),
            lastUpdated: Date.now(),
            turnCap: 12,
            expectArtifact: payload.expectArtifact
          };
          
          await saveSession(session);
          activeStateMachine = new DebateStateMachine(session, handleStateChange);
          await activeStateMachine.start(payload.contextBundle);
          
        } else if (message.type === 'PRE_FLIGHT_APPROVE') {
          if (activeStateMachine) {
            await activeStateMachine.approvePreFlight();
          }
        } else if (message.type === 'ADAPTER_RESPONSE') {
          if (!activeStateMachine) return;
          const payload = message.payload as AdapterResponsePayload;
          
          if (payload.isContextLimitApproaching) {
             await activeStateMachine.pause('CONTEXT_LIMIT_PAUSE');
             // In a real flow we might store the pending response to process after compression,
             // but for v1 we just pause.
             return;
          }

          const url = sender.tab?.url || '';
          const model = url.includes('gemini') ? 'gemini' : 'claude';
          
          if (activeStateMachine.session.state === 'SYNTHESIS') {
            await activeStateMachine.completeSynthesis(payload.text);
            return;
          }
          
          const turn = {
            model,
            role: model === 'gemini' ? 'Proposer' as const : 'CriticVerifier' as const,
            text: payload.text,
            artifacts: payload.artifacts,
            timestamp: Date.now()
          };

          if (model === 'gemini' && activeStateMachine.session.state === 'GEMINI_TURN') {
            await activeStateMachine.completeGeminiTurn(turn);
          } else if (model === 'claude' && activeStateMachine.session.state === 'CLAUDE_TURN') {
            await activeStateMachine.completeClaudeTurn(turn);
          }
        } else if (message.type === 'PAUSE_DEBATE') {
          if (activeStateMachine) {
            await activeStateMachine.pause('MANUAL_PAUSE');
          }
        } else if (message.type === 'RESUME_DEBATE') {
           if (activeStateMachine) {
             if (activeStateMachine.session.state === 'FAILSAFE_PAUSE') {
               activeStateMachine.session.turnCap += 6;
             }
             await activeStateMachine.resume();
           }
        } else if (message.type === 'REDIRECT_DEBATE') {
           if (activeStateMachine) {
             const payload = message.payload as RedirectDebatePayload;
             activeStateMachine.session.redirectInstruction = payload.text;
             await activeStateMachine.resume();
           }
        } else if (message.type === 'ABORT_DEBATE') {
           if (activeStateMachine) {
             await activeStateMachine.abortToSynthesis();
           }
        } else if (message.type === 'CONTEXT_COMPRESS') {
           // Simulate context compression for v1
           if (activeStateMachine) {
              const tab = await findTab("*://gemini.google.com/*");
              if (tab && tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: 'ADAPTER_COMPRESS_RESTART' });
              }
              const tab2 = await findTab("*://claude.ai/*");
              if (tab2 && tab2.id) {
                chrome.tabs.sendMessage(tab2.id, { type: 'ADAPTER_COMPRESS_RESTART' });
              }
              await activeStateMachine.resume();
           }
        }
      } catch (err) {
        console.error("Error handling message", err);
      }
    })();
    return true;
  });
}
