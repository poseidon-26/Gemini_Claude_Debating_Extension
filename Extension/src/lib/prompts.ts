export const PROMPTS = {
  GEMINI_PROPOSER_INITIAL: (query: string, contextBundle?: string) => `
You are participating in a structured debate as the 'Proposer'.
Your goal is to provide a first pass of ideas, approaches, or positions in response to the following query.

${contextBundle ? `Context Material:\n${contextBundle}\n\n` : ''}
User Query: "${query}"

Please provide your initial proposal, exploring possibilities, trade-offs, and a recommendation.
If you believe the discussion is resolved and no further debate would add value, end your response by explicitly stating: "I believe we've covered the key considerations."
  `.trim(),

  CLAUDE_CRITIC_INITIAL: (query: string, geminiProposal: string, contextBundle?: string) => `
You are participating in a structured debate as the 'Critic and Verifier'.
Another model (Gemini) has provided a proposal for the following query.

${contextBundle ? `Context Material:\n${contextBundle}\n\n` : ''}
User Query: "${query}"

Gemini's Proposal:
"""
${geminiProposal}
"""

Please structure your response with two clearly labeled sub-sections:
1. **Critique**: Challenge Gemini's reasoning, provide alternative framings, and point out gaps.
2. **Verification**: Fact-check and verify citation/source-credibility against anything Gemini claimed. Explicitly call out unverifiable or low-confidence claims.

If you believe the discussion is resolved and no further debate would add value, end your response by explicitly stating: "I believe we've covered the key considerations."
  `.trim(),

  GEMINI_CONTINUATION: (claudeResponse: string) => `
The Critic (Claude) has responded to your proposal:
"""
${claudeResponse}
"""

Please respond to the critique. Defend your points, concede where appropriate, and refine the proposal.
If you believe the discussion is resolved and no further debate would add value, end your response by explicitly stating: "I believe we've covered the key considerations."
  `.trim(),

  CLAUDE_CONTINUATION: (geminiResponse: string) => `
The Proposer (Gemini) has replied:
"""
${geminiResponse}
"""

Please continue your role as Critic and Verifier. Structure your response with **Critique** and **Verification** sections.
If you believe the discussion is resolved and no further debate would add value, end your response by explicitly stating: "I believe we've covered the key considerations."
  `.trim(),

  SYNTHESIS: (query: string, fullTranscript: string) => `
You are the 'Synthesizer'. A debate has just concluded regarding the following query:
"${query}"

Here is the full debate transcript:
"""
${fullTranscript}
"""

Your task is to produce a clean, synthesized final answer.
- Cover possibilities, trade-offs (good/bad/edge cases).
- Provide a clear final recommendation, in depth.
- If applicable, include citations to external sources referenced during the debate.
- Output a structured response that can be handed off to an engineer for implementation.
  `.trim(),
  
  PRE_FLIGHT_RECOMMENDATION: (query: string) => `
Given this query: "${query}"
What model variant/mode would you recommend using for yourself in a structured debate, and why? Please answer in exactly one sentence.
  `.trim()
};
