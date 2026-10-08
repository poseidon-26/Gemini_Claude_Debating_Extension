import { BaseMessage, AdapterPromptPayload, AdapterResponsePayload } from '../lib/types';

console.log("Gemini Adapter Injected");

function getChatInput(): HTMLElement | null {
  // Try multiple fallback selectors
  return document.querySelector('div[contenteditable="true"]') || 
         document.querySelector('textarea') ||
         document.querySelector('.rich-textarea');
}

function getSubmitButton(): HTMLElement | null {
  return document.querySelector('button[aria-label="Send message"]') ||
         document.querySelector('.send-button');
}

// Observe DOM to wait for response to finish generating
function waitForResponse(): Promise<string> {
  return new Promise((resolve) => {
    // A simplified polling for v1, checking if the generating indicator goes away
    // In reality, this requires carefully observing mutation observers for the specific chat output structure
    
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      // Check for stop generation button (meaning it's still generating)
      const isGenerating = document.querySelector('button[aria-label="Stop generating"]');
      
      if (!isGenerating && attempts > 5) {
        clearInterval(interval);
        
        // Extract text from the last message block
        const messages = document.querySelectorAll('message-content, .model-response-text');
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
    
    if (input.tagName === 'TEXTAREA') {
      (input as HTMLTextAreaElement).value = prompt;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // For contenteditable, innerText is often ignored by the underlying framework.
      // document.execCommand('insertText') is currently the most reliable way to simulate user typing 
      // in rich text editors (DraftJS, ProseMirror, Lexical) from a content script.
      input.innerHTML = ''; // clear existing if any
      document.execCommand('insertText', false, prompt);
    }
    
    setTimeout(() => {
      const btn = getSubmitButton();
      if (btn) {
        btn.click();
      }
    }, 500);
  } else {
    console.error("Gemini input not found");
  }
}

chrome.runtime.onMessage.addListener((message: BaseMessage, sender, sendResponse) => {
  if (message.type === 'ADAPTER_PROMPT') {
    const payload = message.payload as AdapterPromptPayload;
    
    sendPrompt(payload.prompt);
    
    // Wait for response and send back
    waitForResponse().then(text => {
       chrome.runtime.sendMessage({
         type: 'ADAPTER_RESPONSE',
         payload: { text } as AdapterResponsePayload
       });
    });
  }
});
