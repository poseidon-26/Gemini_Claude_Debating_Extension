function e(e,t){let n=new Set(e.toLowerCase().split(/\s+/)),r=new Set(t.toLowerCase().split(/\s+/)),i=new Set([...n].filter(e=>r.has(e))),a=new Set([...n,...r]);return i.size/a.size}function t(t,n){return t.includes(`I believe we've covered the key considerations`)?!0:n?e(t,n)>=.85:!1}var n=(e,t)=>t.some(t=>e instanceof t),r,i;function a(){return r||=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction]}function o(){return i||=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey]}var s=new WeakMap,c=new WeakMap,l=new WeakMap;function u(e){let t=new Promise((t,n)=>{let r=()=>{e.removeEventListener(`success`,i),e.removeEventListener(`error`,a)},i=()=>{t(g(e.result)),r()},a=()=>{n(e.error),r()};e.addEventListener(`success`,i),e.addEventListener(`error`,a)});return l.set(t,e),t}function d(e){if(s.has(e))return;let t=new Promise((t,n)=>{let r=()=>{e.removeEventListener(`complete`,i),e.removeEventListener(`error`,a),e.removeEventListener(`abort`,a)},i=()=>{t(),r()},a=()=>{n(e.error||new DOMException(`AbortError`,`AbortError`)),r()};e.addEventListener(`complete`,i),e.addEventListener(`error`,a),e.addEventListener(`abort`,a)});s.set(e,t)}var f={get(e,t,n){if(e instanceof IDBTransaction){if(t===`done`)return s.get(e);if(t===`store`)return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return g(e[t])},set(e,t,n){return e[t]=n,!0},has(e,t){return e instanceof IDBTransaction&&(t===`done`||t===`store`)||t in e}};function p(e){f=e(f)}function m(e){return o().includes(e)?function(...t){return e.apply(_(this),t),g(this.request)}:function(...t){return g(e.apply(_(this),t))}}function h(e){return typeof e==`function`?m(e):(e instanceof IDBTransaction&&d(e),n(e,a())?new Proxy(e,f):e)}function g(e){if(e instanceof IDBRequest)return u(e);if(c.has(e))return c.get(e);let t=h(e);return t!==e&&(c.set(e,t),l.set(t,e)),t}var _=e=>l.get(e);function v(e,t,{blocked:n,upgrade:r,blocking:i,terminated:a}={}){let o=indexedDB.open(e,t),s=g(o);return r&&o.addEventListener(`upgradeneeded`,e=>{r(g(o.result),e.oldVersion,e.newVersion,g(o.transaction),e)}),n&&o.addEventListener(`blocked`,e=>n(e.oldVersion,e.newVersion,e)),s.then(e=>{a&&e.addEventListener(`close`,()=>a()),i&&e.addEventListener(`versionchange`,e=>i(e.oldVersion,e.newVersion,e))}).catch(()=>{}),s}var y=[`get`,`getKey`,`getAll`,`getAllKeys`,`count`],b=[`put`,`add`,`delete`,`clear`],x=new Map;function S(e,t){if(!(e instanceof IDBDatabase&&!(t in e)&&typeof t==`string`))return;if(x.get(t))return x.get(t);let n=t.replace(/FromIndex$/,``),r=t!==n,i=b.includes(n);if(!(n in(r?IDBIndex:IDBObjectStore).prototype)||!(i||y.includes(n)))return;let a=async function(e,...t){let a=this.transaction(e,i?`readwrite`:`readonly`),o=a.store;return r&&(o=o.index(t.shift())),(await Promise.all([o[n](...t),i&&a.done]))[0]};return x.set(t,a),a}p(e=>({...e,get:(t,n,r)=>S(t,n)||e.get(t,n,r),has:(t,n)=>!!S(t,n)||e.has(t,n)}));var C=[`continue`,`continuePrimaryKey`,`advance`],w={},T=new WeakMap,E=new WeakMap,D={get(e,t){if(!C.includes(t))return e[t];let n=w[t];return n||=w[t]=function(...e){T.set(this,E.get(this)[t](...e))},n}};async function*O(...e){let t=this;if(t instanceof IDBCursor||(t=await t.openCursor(...e)),!t)return;t=t;let n=new Proxy(t,D);for(E.set(n,t),l.set(n,_(t));t;)yield n,t=await(T.get(n)||t.continue()),T.delete(n)}function k(e,t){return t===Symbol.asyncIterator&&n(e,[IDBIndex,IDBObjectStore,IDBCursor])||t===`iterate`&&n(e,[IDBIndex,IDBObjectStore])}p(e=>({...e,get(t,n,r){return k(t,n)?O:e.get(t,n,r)},has(t,n){return k(t,n)||e.has(t,n)}}));var A=null;function j(){return A||=v(`multi-agent-debate`,1,{upgrade(e){e.createObjectStore(`sessions`,{keyPath:`id`}).createIndex(`by-date`,`lastUpdated`)}}),A}async function M(e){await(await j()).put(`sessions`,e)}var N=class{session;onStateChange;constructor(e,t){this.session=e,this.onStateChange=t}async transition(e){this.session.state=e,this.session.lastUpdated=Date.now(),await M(this.session),this.onStateChange(e,this.session)}async start(e){this.session.state===`IDLE`&&(this.session.contextBundle=e,await this.transition(`PRE_FLIGHT`))}async approvePreFlight(){this.session.state===`PRE_FLIGHT`&&(this.session.contextBundle&&await this.transition(`CONTEXT_PREP`),await this.transition(`GEMINI_TURN`))}async recordTurn(e){this.session.turns.push(e),await M(this.session)}async completeGeminiTurn(e){this.session.state===`GEMINI_TURN`&&(await this.recordTurn(e),await this.transition(`CLAUDE_TURN`))}async completeClaudeTurn(e){this.session.state===`CLAUDE_TURN`&&(await this.recordTurn(e),await this.transition(`CONVERGENCE_CHECK`))}async performConvergenceCheck(){if(this.session.state!==`CONVERGENCE_CHECK`)return;let e=this.session.turns.filter(e=>e.model===`claude`),n=e[e.length-1],r=e.length>1?e[e.length-2]:void 0;if(t(n.text,r?.text)){await this.transition(`SYNTHESIS`);return}if(this.session.turns.length>=this.session.turnCap){await this.transition(`FAILSAFE_PAUSE`);return}await this.transition(`GEMINI_TURN`)}async pause(e){await this.transition(e)}async resume(){let e=this.session.turns[this.session.turns.length-1];e&&e.model===`gemini`?await this.transition(`CLAUDE_TURN`):await this.transition(`GEMINI_TURN`)}async abortToSynthesis(){await this.transition(`SYNTHESIS`)}async completeSynthesis(e){this.session.finalAnswer=e,await this.transition(`DONE`)}},P={GEMINI_PROPOSER_INITIAL:(e,t)=>`
You are participating in a structured debate as the 'Proposer'.
Your goal is to provide a first pass of ideas, approaches, or positions in response to the following query.

${t?`Context Material:\n${t}\n\n`:``}
User Query: "${e}"

Please provide your initial proposal, exploring possibilities, trade-offs, and a recommendation.
If you believe the discussion is resolved and no further debate would add value, end your response by explicitly stating: "I believe we've covered the key considerations."
  `.trim(),CLAUDE_CRITIC_INITIAL:(e,t,n)=>`
You are participating in a structured debate as the 'Critic and Verifier'.
Another model (Gemini) has provided a proposal for the following query.

${n?`Context Material:\n${n}\n\n`:``}
User Query: "${e}"

Gemini's Proposal:
"""
${t}
"""

Please structure your response with two clearly labeled sub-sections:
1. **Critique**: Challenge Gemini's reasoning, provide alternative framings, and point out gaps.
2. **Verification**: Fact-check and verify citation/source-credibility against anything Gemini claimed. Explicitly call out unverifiable or low-confidence claims.

If you believe the discussion is resolved and no further debate would add value, end your response by explicitly stating: "I believe we've covered the key considerations."
  `.trim(),GEMINI_CONTINUATION:e=>`
The Critic (Claude) has responded to your proposal:
"""
${e}
"""

Please respond to the critique. Defend your points, concede where appropriate, and refine the proposal.
If you believe the discussion is resolved and no further debate would add value, end your response by explicitly stating: "I believe we've covered the key considerations."
  `.trim(),CLAUDE_CONTINUATION:e=>`
The Proposer (Gemini) has replied:
"""
${e}
"""

Please continue your role as Critic and Verifier. Structure your response with **Critique** and **Verification** sections.
If you believe the discussion is resolved and no further debate would add value, end your response by explicitly stating: "I believe we've covered the key considerations."
  `.trim(),SYNTHESIS:(e,t)=>`
You are the 'Synthesizer'. A debate has just concluded regarding the following query:
"${e}"

Here is the full debate transcript:
"""
${t}
"""

Your task is to produce a clean, synthesized final answer.
- Cover possibilities, trade-offs (good/bad/edge cases).
- Provide a clear final recommendation, in depth.
- If applicable, include citations to external sources referenced during the debate.
- Output a structured response that can be handed off to an engineer for implementation.
  `.trim(),PRE_FLIGHT_RECOMMENDATION:e=>`
Given this query: "${e}"
What model variant/mode would you recommend using for yourself in a structured debate, and why? Please answer in exactly one sentence.
  `.trim()},F=null;async function I(e){return(await chrome.tabs.query({url:e}))[0]}function L(e,t,n){let r=e;return t&&(r+=`\\n\\n[USER REDIRECTION INSTRUCTION]:\\n${t}`),n&&(r+=`\\n\\n[USER REQUESTED ARTIFACT]: The user expects a structured document, code block, or native artifact for this response. Please provide one if your platform supports it.`),r}async function R(e){let t=await I(`*://gemini.google.com/*`);if(!t||!t.id){console.error(`Gemini tab not found`);return}let n=``;if(e.turns.length===0)n=P.GEMINI_PROPOSER_INITIAL(e.query,e.contextBundle);else{let t=e.turns[e.turns.length-1];n=P.GEMINI_CONTINUATION(t.text)}n=L(n,e.redirectInstruction,e.expectArtifact),e.redirectInstruction&&(e.redirectInstruction=void 0,await M(e));let r={prompt:n,isArtifactExpected:e.expectArtifact};chrome.tabs.sendMessage(t.id,{type:`ADAPTER_PROMPT`,payload:r})}async function z(e){let t=await I(`*://claude.ai/*`);if(!t||!t.id){console.error(`Claude tab not found`);return}let n=``,r=e.turns[e.turns.length-1];n=e.turns.length===1?P.CLAUDE_CRITIC_INITIAL(e.query,r.text,e.contextBundle):P.CLAUDE_CONTINUATION(r.text),n=L(n,e.redirectInstruction,e.expectArtifact),e.redirectInstruction&&(e.redirectInstruction=void 0,await M(e));let i={prompt:n,isArtifactExpected:e.expectArtifact};chrome.tabs.sendMessage(t.id,{type:`ADAPTER_PROMPT`,payload:i})}async function B(e,t){if(chrome.runtime.sendMessage({type:`STATE_UPDATE`,payload:t}),e===`GEMINI_TURN`)await R(t);else if(e===`CLAUDE_TURN`)await z(t);else if(e===`CONVERGENCE_CHECK`)F&&await F.performConvergenceCheck();else if(e===`SYNTHESIS`){let e=await I(`*://claude.ai/*`);if(e&&e.id){let n=t.turns.map(e=>`[${e.model.toUpperCase()}]: ${e.text}`).join(`\\n\\n`),r=P.SYNTHESIS(t.query,n);chrome.tabs.sendMessage(e.id,{type:`ADAPTER_PROMPT`,payload:{prompt:r,isArtifactExpected:!0}})}}}function V(){chrome.runtime.onMessage.addListener((e,t,n)=>((async()=>{try{if(e.type===`START_DEBATE`){let t=e.payload,n={id:Date.now().toString(),query:t.query,state:`IDLE`,turns:[],startTime:Date.now(),lastUpdated:Date.now(),turnCap:12,expectArtifact:t.expectArtifact};await M(n),F=new N(n,B),await F.start(t.contextBundle)}else if(e.type===`PRE_FLIGHT_APPROVE`)F&&await F.approvePreFlight();else if(e.type===`ADAPTER_RESPONSE`){if(!F)return;let n=e.payload;if(n.isContextLimitApproaching){await F.pause(`CONTEXT_LIMIT_PAUSE`);return}let r=(t.tab?.url||``).includes(`gemini`)?`gemini`:`claude`;if(F.session.state===`SYNTHESIS`){await F.completeSynthesis(n.text);return}let i={model:r,role:r===`gemini`?`Proposer`:`CriticVerifier`,text:n.text,artifacts:n.artifacts,timestamp:Date.now()};r===`gemini`&&F.session.state===`GEMINI_TURN`?await F.completeGeminiTurn(i):r===`claude`&&F.session.state===`CLAUDE_TURN`&&await F.completeClaudeTurn(i)}else if(e.type===`PAUSE_DEBATE`)F&&await F.pause(`MANUAL_PAUSE`);else if(e.type===`RESUME_DEBATE`)F&&(F.session.state===`FAILSAFE_PAUSE`&&(F.session.turnCap+=6),await F.resume());else if(e.type===`REDIRECT_DEBATE`){if(F){let t=e.payload;F.session.redirectInstruction=t.text,await F.resume()}}else if(e.type===`ABORT_DEBATE`)F&&await F.abortToSynthesis();else if(e.type===`CONTEXT_COMPRESS`&&F){let e=await I(`*://gemini.google.com/*`);e&&e.id&&chrome.tabs.sendMessage(e.id,{type:`ADAPTER_COMPRESS_RESTART`});let t=await I(`*://claude.ai/*`);t&&t.id&&chrome.tabs.sendMessage(t.id,{type:`ADAPTER_COMPRESS_RESTART`}),await F.resume()}}catch(e){console.error(`Error handling message`,e)}})(),!0))}console.log(`Background Service Worker initialized.`),V();