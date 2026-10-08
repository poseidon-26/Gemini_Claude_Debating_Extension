import { BaseMessage, AdapterPromptPayload, AdapterResponsePayload } from '../lib/types';

console.log("Claude Adapter Injected");

function getChatInput(): HTMLElement | null {
  return document.querySelector('div[contenteditable="true"]') || 
         document.querySelector('.ProseMirror');
}

function getSubmitButton(): HTMLElement | null {
  return document.querySelector('button[aria-label="Send Message"]') ||
         document.querySelector('button:has(svg)');
}

function waitForResponse(): Promise<string> {
  return new Promise((resolve) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const isGenerating = document.querySelector('button[aria-label="Stop Generating"]');
      
      if (!isGenerating && attempts > 5) {
        clearInterval(interval);
        
        const messages = document.querySelectorAll('.font-claude-message');
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1] as HTMLElement;
          resolve(lastMessage.innerText || '');
        } else {
          resolve("Could not extract response text.");
        }
      }
    }, 1000);
  });
}

function sendPrompt(prompt: string) {
  const input = getChatInput();
  if (input) {
    input.focus();
    
    // For contenteditable, innerText is often ignored by the underlying framework.
    input.innerHTML = ''; // clear existing if any
    document.execCommand('insertText', false, prompt);
    
    setTimeout(() => {
      const btn = getSubmitButton();
      if (btn) {
        btn.click();
      }
    }, 500);
  } else {
    console.error("Claude input not found");
  }
}

chrome.runtime.onMessage.addListener((message: BaseMessage, sender, sendResponse) => {
  if (message.type === 'ADAPTER_PROMPT') {
    const payload = message.payload as AdapterPromptPayload;
    
    sendPrompt(payload.prompt);
    
    waitForResponse().then(text => {
       chrome.runtime.sendMessage({
         type: 'ADAPTER_RESPONSE',
         payload: { text } as AdapterResponsePayload
       });
    });
  }
});
