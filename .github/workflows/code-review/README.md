# LLM Code Review Workflow

This workflow implements **sgim-n25.9: Automated LLM code-review in CI**.

## Status

⚠️ **ON HOLD** - This workflow is prepared but waits on **sgim-n25.7** (CI pipeline).

When the main CI pipeline (sgim-n25.7) is implemented, this workflow should be:
- Either merged into the main CI workflow
- Or enabled as a separate workflow that runs alongside CI

## Purpose

This is an **inferential sensor** that runs an automated LLM code review over PR diffs to catch semantic issues that linters miss:
- Redundant tests or test logic
- Brute-force fixes vs. elegant solutions
- Over-engineering or unnecessary complexity
- Violations of the project's `constitution.md` or `AGENTS.md`
- Semantic issues in code logic

## Design Decisions

### Advisory Only (Non-Blocking)
Per task requirements, this review is **advisory only** (`continue-on-error: true`). It does not block PR merges. Reviewers can act on findings at their discretion.

### Severity Policy
Findings are categorized as:
- **Low**: Suggestions, minor improvements
- **Medium**: Should address before merge
- **High**: Strongly recommended to address

Currently non-blocking for all severities. Can be escalated to blocking for High severity in the future.

### Context Fed to LLM
- The PR diff (changed files)
- `constitution.md` (project coding principles)
- `AGENTS.md` (agent instructions and project context)

This ensures findings reference our specific rules and conventions.

### Scope
- Runs on PR events: `opened`, `synchronize`, `reopened`
- Reviews only changed files (not the entire codebase)
- Posts findings as a PR comment (updates on subsequent pushes)

## Implementation Notes

The current implementation uses a **mock LLM** that returns placeholder findings. To activate real LLM review:

1. Choose an LLM provider/API (e.g., OpenAI, Anthropic, local LLM)
2. Add API credentials as GitHub Secrets (e.g., `LLM_API_KEY`)
3. Replace the mock review in the `Run LLM Code Review` step with actual API calls
4. Configure rate limiting and error handling

### Recommended LLM Integration Approach

```javascript
// Example structure for real LLM call
const response = await fetch('https://api.llm-provider.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.LLM_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini', // or similar
    temperature: 0.3, // Low temperature for consistent reviews
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 4000,
  }),
});
```

### Cost Considerations

- Limit review to files changed in PR (not entire repo)
- Set max tokens to prevent runaway costs
- Consider caching for unchanged reviews
- Use a cost-effective model for advisory reviews

## Testing

To test this workflow locally:

1. Create a test PR with changes
2. Uncomment the workflow file (remove ON HOLD comments)
3. Push to a test branch
4. Verify PR comment is posted with review findings

## Dependencies

- GitHub Actions
- Node.js 20+
- `@actions/core` and `@actions/github` npm packages (for the script)

## Related Tasks

- **sgim-n25.7**: CI pipeline - main CI workflow (this depends on it)
- **sgim-n25.3**: Architecture fitness - hard-fail boundary checks
- **sgim-n25.2**: Test runner + coverage thresholds
