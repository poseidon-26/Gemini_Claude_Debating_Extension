import { BaseMessage, StartDebatePayload, DebateSession, RedirectDebatePayload } from '../lib/types';
import { buildContextBundle } from '../background/contextManager';

document.addEventListener('DOMContentLoaded', () => {
  const setupView = document.getElementById('setup-view')!;
  const preFlightView = document.getElementById('pre-flight-view')!;
  const activeView = document.getElementById('active-view')!;
  const synthesisView = document.getElementById('synthesis-view')!;
  
  const queryInput = document.getElementById('query-input') as HTMLTextAreaElement;
  const startBtn = document.getElementById('start-btn')!;
  
  const useContextCb = document.getElementById('use-context-cb') as HTMLInputElement;
  const expectArtifactCb = document.getElementById('expect-artifact-cb') as HTMLInputElement;
  const selectDirBtn = document.getElementById('select-dir-btn')!;
  const selectedDirInfo = document.getElementById('selected-dir-info')!;
  
  const approvePreFlightBtn = document.getElementById('approve-pre-flight-btn')!;
  const cancelPreFlightBtn = document.getElementById('cancel-pre-flight-btn')!;

  const statusIndicator = document.getElementById('status-indicator')!;
  const turnCount = document.getElementById('turn-count')!;
  
  const pauseBtn = document.getElementById('pause-btn')!;
  const pauseModal = document.getElementById('pause-modal')!;
  const redirectInput = document.getElementById('redirect-input') as HTMLTextAreaElement;
  const resumeBtn = document.getElementById('resume-btn')!;
  const redirectBtn = document.getElementById('redirect-btn')!;
  const abortBtn = document.getElementById('abort-btn')!;
  
  const failsafeModal = document.getElementById('failsafe-modal')!;
  const failsafeContinueBtn = document.getElementById('failsafe-continue-btn')!;
  const failsafeStopBtn = document.getElementById('failsafe-stop-btn')!;

  const contextLimitModal = document.getElementById('context-limit-modal')!;
  const contextCompressBtn = document.getElementById('context-compress-btn')!;
  const contextAbortBtn = document.getElementById('context-abort-btn')!;

  const synthesisContent = document.getElementById('synthesis-content')!;
  const newDebateBtn = document.getElementById('new-debate-btn')!;
  
  let filesContext: {name: string, content: string}[] = [];

  function switchView(view: 'setup' | 'pre-flight' | 'active' | 'synthesis') {
    setupView.classList.remove('active');
    preFlightView.classList.remove('active');
    activeView.classList.remove('active');
    synthesisView.classList.remove('active');
    
    if (view === 'setup') setupView.classList.add('active');
    if (view === 'pre-flight') preFlightView.classList.add('active');
    if (view === 'active') activeView.classList.add('active');
    if (view === 'synthesis') synthesisView.classList.add('active');
  }

  function hideAllModals() {
    pauseModal.classList.remove('active');
    failsafeModal.classList.remove('active');
    contextLimitModal.classList.remove('active');
  }

  useContextCb.addEventListener('change', () => {
    selectDirBtn.style.display = useContextCb.checked ? 'inline-block' : 'none';
    if (!useContextCb.checked) {
      filesContext = [];
      selectedDirInfo.textContent = '';
    }
  });

  selectDirBtn.addEventListener('click', async () => {
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      selectedDirInfo.textContent = `Selected: ${dirHandle.name}`;
      
      filesContext = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.md') || entry.name.endsWith('.txt'))) {
          const file = await entry.getFile();
          const content = await file.text();
          filesContext.push({ name: entry.name, content });
        }
      }
    } catch (err) {
      console.error("Directory selection cancelled or failed", err);
    }
  });

  startBtn.addEventListener('click', () => {
    const query = queryInput.value.trim();
    if (!query) return;
    
    const contextBundle = buildContextBundle(filesContext);
    
    const payload: StartDebatePayload = {
      query,
      contextBundle,
      expectArtifact: expectArtifactCb.checked
    };
    
    chrome.runtime.sendMessage({ type: 'START_DEBATE', payload } as BaseMessage);
    // Transition to pre-flight happens automatically via state update
  });

  approvePreFlightBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'PRE_FLIGHT_APPROVE' } as BaseMessage);
  });

  cancelPreFlightBtn.addEventListener('click', () => {
    switchView('setup');
  });

  pauseBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'PAUSE_DEBATE' } as BaseMessage);
  });

  resumeBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESUME_DEBATE' } as BaseMessage);
    hideAllModals();
  });

  redirectBtn.addEventListener('click', () => {
    const text = redirectInput.value.trim();
    if (text) {
      const payload: RedirectDebatePayload = { text };
      chrome.runtime.sendMessage({ type: 'REDIRECT_DEBATE', payload } as BaseMessage);
      redirectInput.value = '';
    }
    hideAllModals();
  });

  abortBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'ABORT_DEBATE' } as BaseMessage);
    hideAllModals();
  });

  failsafeContinueBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESUME_DEBATE' } as BaseMessage);
    hideAllModals();
  });

  failsafeStopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'ABORT_DEBATE' } as BaseMessage);
    hideAllModals();
  });

  contextCompressBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'CONTEXT_COMPRESS' } as BaseMessage);
    hideAllModals();
  });

  contextAbortBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'ABORT_DEBATE' } as BaseMessage);
    hideAllModals();
  });

  newDebateBtn.addEventListener('click', () => {
    queryInput.value = '';
    filesContext = [];
    selectedDirInfo.textContent = '';
    useContextCb.checked = false;
    expectArtifactCb.checked = false;
    selectDirBtn.style.display = 'none';
    switchView('setup');
  });

  chrome.runtime.onMessage.addListener((message: BaseMessage) => {
    if (message.type === 'STATE_UPDATE') {
      const session = message.payload as DebateSession;
      
      if (session.state === 'DONE' && session.finalAnswer) {
        synthesisContent.textContent = session.finalAnswer;
        switchView('synthesis');
        hideAllModals();
      } else if (session.state === 'PRE_FLIGHT') {
        switchView('pre-flight');
      } else {
        switchView('active');
        statusIndicator.textContent = session.state.replace(/_/g, ' ');
        turnCount.textContent = session.turns.length.toString();
        
        hideAllModals();
        if (session.state === 'MANUAL_PAUSE') {
          pauseModal.classList.add('active');
        } else if (session.state === 'FAILSAFE_PAUSE') {
          failsafeModal.classList.add('active');
        } else if (session.state === 'CONTEXT_LIMIT_PAUSE') {
          contextLimitModal.classList.add('active');
        }
      }
    }
  });
});
