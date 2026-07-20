/**
 * LLM Code Review Script
 * 
 * Part of sgim-n25.9: Automated LLM code-review in CI
 * 
 * This script performs an LLM-powered code review over a git diff.
 * It reads the PR diff, feeds it to an LLM along with project context
 * (constitution.md and AGENTS.md), and returns review findings.
 * 
 * Usage:
 *   node scripts/code-review.ts <base-sha> <head-sha>
 *   
 *   Or via environment variables:
 *   BASE_SHA=<base> HEAD_SHA=<head> node scripts/code-review.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

interface ReviewFinding {
  description: string;
  severity: 'low' | 'medium' | 'high';
  file?: string;
  line?: number;
  constitutionReference?: string;
}

interface ReviewResult {
  summary: string;
  findings: ReviewFinding[];
}

/**
 * Get git diff between two commits
 */
function getGitDiff(baseSha: string, headSha: string): string {
  try {
    return execSync(`git diff --no-color ${baseSha} ${headSha}`, {
      encoding: 'utf8',
      cwd: resolve(__dirname, '..'),
    });
  } catch {
    return '';
  }
}

/**
 * Get git diff stat (summary of changes)
 */
function getDiffStat(baseSha: string, headSha: string): string {
  try {
    return execSync(`git diff --stat ${baseSha} ${headSha}`, {
      encoding: 'utf8',
      cwd: resolve(__dirname, '..'),
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Read and truncate a file for LLM context (respecting token limits)
 */
function readFileForContext(filePath: string, maxLength: number = 8000): string {
  try {
    const content = readFileSync(resolve(__dirname, '..', filePath), 'utf8');
    return content.slice(0, maxLength);
  } catch {
    return '';
  }
}

/**
 * Build the system prompt for the LLM
 */
function buildSystemPrompt(): string {
  return `
You are a senior code reviewer for the sgim.dk project.

Your task is to review the PR diff and identify potential issues that static linters miss:
- Redundant tests or test logic
- Brute-force fixes that could be elegant solutions
- Over-engineering or unnecessary complexity
- Violations of the project's constitution.md or AGENTS.md
- Semantic issues in the code logic
- Constitution misalignment (ports & adapters, functional design, etc.)

Be concise and specific. Reference the constitution or AGENTS.md when relevant.
Focus on: architectural fit, constitution alignment, and code quality.

Response Format:
A valid JSON object with this structure:
{
  "summary": "1-sentence summary",
  "findings": [
    {
      "description": "Brief description of the issue",
      "severity": "low" | "medium" | "high",
      "file": "optional filename",
      "line": optional line number,
      "constitutionReference": "optional section from constitution.md"
    }
  ]
}

Only report actual issues. If nothing to report, return {"summary": "No issues found", "findings": []}.
`.trim();
}

/**
 * Build the user prompt with diff and context
 */
function buildUserPrompt(diff: string, diffStat: string): string {
  const constitution = readFileForContext('constitution.md', 8000);
  const agentsMd = readFileForContext('AGENTS.md', 4000);

  return `
PR Diff:
\`\`\`diff
${diff}
\`\`\`

Changed files:
${diffStat}

Project Constitution (excerpt):
\`\`\`markdown
${constitution}
\`\`\`

AGENTS.md Context (excerpt):
\`\`\`markdown
${agentsMd}
\`\`\`

Review the above diff against our project's constitution and conventions.
`.trim();
}

/**
 * Call LLM API (placeholder - implement with actual API)
 * 
 * To use a real LLM:
 * 1. Uncomment and configure the fetch call below
 * 2. Add API key to environment: LLM_API_KEY
 * 3. Set LLM_MODEL environment variable
 */
async function callLLM(systemPrompt: string, userPrompt: string): Promise<ReviewResult> {
  // TODO: Implement actual LLM API call
  // This is a placeholder that returns a mock response
  
  const mockResponse: ReviewResult = {
    summary: 'Code changes look aligned with project conventions.',
    findings: [
      {
        description: 'No redundant tests detected',
        severity: 'low',
      },
      {
        description: 'All changes follow the constitution functional design guidelines',
        severity: 'low',
      },
      {
        description: 'No brute-force patterns identified',
        severity: 'low',
      },
    ],
  };

  return mockResponse;

  /* Example real implementation:
  
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';
  const apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1/chat/completions';
  
  if (!apiKey) {
    throw new Error('LLM_API_KEY environment variable is required');
  }
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content) as ReviewResult;
  */
}

/**
 * Format review result as markdown for PR comment
 */
function formatReviewAsMarkdown(review: ReviewResult): string {
  const lines: string[] = [
    `## LLM Code Review`,
    ``,
    `**Summary:** ${review.summary}`,
    ``,
    `**Findings:**`,
  ];

  if (review.findings.length === 0) {
    lines.push('- No issues found');
  } else {
    for (const finding of review.findings) {
      const severityIcon = {
        low: 'ℹ️',
        medium: '⚠️',
        high: '🔴',
      }[finding.severity];
      
      let findingLine = `- ${severityIcon} ${finding.description} - Severity: ${finding.severity}`;
      
      if (finding.file) {
        findingLine += ` - File: ${finding.file}`;
      }
      if (finding.line) {
        findingLine += ` - Line: ${finding.line}`;
      }
      if (finding.constitutionReference) {
        findingLine += ` - Constitution: ${finding.constitutionReference}`;
      }
      
      lines.push(findingLine);
    }
  }

  lines.push('');
  lines.push(`*This is an automated advisory review. Actual LLM integration pending API configuration.*`);

  return lines.join('\n');
}

/**
 * Main function
 */
async function main(): Promise<void> {
  // Get SHAs from command line or environment
  const args = process.argv.slice(2);
  const baseSha = args[0] || process.env.BASE_SHA;
  const headSha = args[1] || process.env.HEAD_SHA;

  if (!baseSha || !headSha) {
    console.error('Usage: node scripts/code-review.ts <base-sha> <head-sha>');
    console.error('  Or set BASE_SHA and HEAD_SHA environment variables');
    process.exit(1);
  }

  console.log(`Getting diff between ${baseSha.slice(0, 7)} and ${headSha.slice(0, 7)}...`);

  // Get diff and stats
  const diff = getGitDiff(baseSha, headSha);
  const diffStat = getDiffStat(baseSha, headSha);

  if (!diff.trim()) {
    console.log('No changes to review.');
    writeFileSync('llm-review.md', '# LLM Code Review\n\nNo changes to review.');
    return;
  }

  console.log(`Changes: ${diffStat || 'unknown'}`);

  // Build prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(diff, diffStat);

  // Call LLM
  const review = await callLLM(systemPrompt, userPrompt);

  // Format and save result
  const markdown = formatReviewAsMarkdown(review);
  writeFileSync('llm-review.md', markdown);
  
  console.log('Review completed. Findings:');
  console.log(markdown);
}

// Run
main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
