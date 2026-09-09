import { MindMapNode, NodeCustomImage } from '@/types/mindmap';
import { Language } from '@/types/pharmacy';

export interface TraversedBranchMetrics {
  rootTitle: string;
  totalNodes: number;
  totalSubBranches: number;
  totalCards: number;
  maxDepth: number;
  domainPath: string[];
}

/**
 * Recursively traverses a branch and extracts all nodes, questions, and clinical data.
 */
export function traverseBranchNodes(
  node: MindMapNode,
  currentDepth: number = 0,
  path: string[] = []
): {
  allNodes: { node: MindMapNode; depth: number; path: string[] }[];
  metrics: TraversedBranchMetrics;
} {
  const currentPath = [...path, node.title.en || node.title.fa];
  const results: { node: MindMapNode; depth: number; path: string[] }[] = [
    { node, depth: currentDepth, path: currentPath },
  ];

  let totalCards = node.card ? 1 : 0;
  let totalSubBranches = node.children.length > 0 ? 1 : 0;
  let maxDepth = currentDepth;

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childData = traverseBranchNodes(child, currentDepth + 1, currentPath);
      results.push(...childData.allNodes);
      totalCards += childData.metrics.totalCards;
      totalSubBranches += childData.metrics.totalSubBranches;
      if (childData.metrics.maxDepth > maxDepth) {
        maxDepth = childData.metrics.maxDepth;
      }
    }
  }

  return {
    allNodes: results,
    metrics: {
      rootTitle: `${node.title.fa} (${node.title.en})`,
      totalNodes: results.length,
      totalSubBranches,
      totalCards,
      maxDepth,
      domainPath: currentPath,
    },
  };
}

/**
 * Builds a visual ASCII / indented tree representation of the branch
 */
export function generateAsciiTree(node: MindMapNode, indent: string = '', isLast: boolean = true): string {
  const marker = indent === '' ? '🌐 ' : isLast ? '└── ' : '├── ';
  const title = `${node.title.fa} [${node.title.en}]`;
  let result = `${indent}${marker}${title}${node.card ? ` (📇 Flashcard B${node.card.box})` : ''}\n`;

  if (node.children && node.children.length > 0) {
    const nextIndent = indent + (indent === '' ? '   ' : isLast ? '    ' : '│   ');
    node.children.forEach((child, idx) => {
      const isChildLast = idx === node.children.length - 1;
      result += generateAsciiTree(child, nextIndent, isChildLast);
    });
  }

  return result;
}

/**
 * Generates Mermaid.js mindmap diagram syntax for instant rendering in AI or markdown viewers
 */
export function generateMermaidMindmap(node: MindMapNode): string {
  const sanitize = (text: string) =>
    (text || '').replace(/[()\[\]{}:"';\/\\#]/g, ' ').replace(/\s+/g, ' ').trim() || 'Node';

  function renderMermaidNode(n: MindMapNode, level: number): string {
    const indent = '  '.repeat(level + 1);
    const titleFa = sanitize(n.title.fa);
    const titleEn = sanitize(n.title.en);
    const label = `${titleFa} - ${titleEn}`;

    let out = `${indent}${level === 0 ? `root(("${label}"))` : `id_${n.id.replace(/[^a-zA-Z0-9_]/g, '_')}["${label}"]`}\n`;

    if (n.children && n.children.length > 0) {
      for (const child of n.children) {
        out += renderMermaidNode(child, level + 1);
      }
    }
    return out;
  }

  return `\`\`\`mermaid
mindmap
${renderMermaidNode(node, 0)}\`\`\``;
}

/**
 * Generates structured, high-context AI Infographic Prompt ready to paste into ChatGPT, Claude, Midjourney, DALL-E, Ideogram, Napkin, Canva, or Miro
 */
export function generateAiInfographicPrompt(
  rootNode: MindMapNode,
  language: Language,
  nodeImages?: Record<string, NodeCustomImage>
): string {
  const isFa = language === 'fa';
  const { allNodes, metrics } = traverseBranchNodes(rootNode);
  const asciiTree = generateAsciiTree(rootNode);
  const mermaidDiagram = generateMermaidMindmap(rootNode);

  // Extract all questions/cards with full clinical richness
  const flashcards = allNodes
    .filter((n) => !!n.node.card)
    .map((n) => n.node.card!);

  const topicNameFa = rootNode.title.fa;
  const topicNameEn = rootNode.title.en;

  let prompt = `# 🎨 AI INFOGRAPHIC & CLINICAL MIND MAP GENERATION PROMPT
## TARGET TOPIC: ${topicNameEn} / ${topicNameFa}
**Domain / Hierarchy Path**: ${metrics.domainPath.join(' ➔ ')}
**Scope**: ${metrics.totalNodes} Nodes | ${metrics.totalSubBranches} Sub-branches | ${metrics.totalCards} Clinical Cards | Depth: Level ${metrics.maxDepth}

---

### 📋 INSTRUCTIONS FOR THE AI (SYSTEM PROMPT):
You are an expert Medical & Pharmaceutical Infographic Designer and Clinical Pharmacist specializing in Australian Pharmacy (APF, AMH, eTG, SUSMP, PBS).
Your goal is to design a **comprehensive, visually stunning, high-yield educational infographic** or **visual study diagram** based on the hierarchical medical knowledge below.

#### Visual Design Recommendations:
1. **Central Hero Concept**: Place "${topicNameEn} (${topicNameFa})" in the central visual anchor.
2. **Distinct Categorical Pillars**: Group the data into color-coded thematic sections:
   - 🩺 **Clinical Pathophysiology & Triage** (Symptoms, Red Flags, WWHAM Referral Criteria).
   - 💊 **Pharmacology & Active Substances** (Mechanisms of Action, Drug Classes, S2/S3/S4 Scheduling).
   - 🛡️ **Safety & Cautionary Labels** (APF CAL warning stickers, TGA Pregnancy Categories, CYP450 Interactions).
   - 📋 **Counseling & Dispensing Pearls** (Dosage, Special Populations, Bioequivalence/A-Flag, Patient Advice).
3. **Typography & Layout**: Clean, high-contrast, modern layout with icons, callout boxes for "High-Yield Board Pearls", and flowchart arrows indicating clinical decisions.

---

### 🌲 HIERARCHICAL BRANCH TREE (RELATIONSHIPS & STRUCTURE):
\`\`\`text
${asciiTree}\`\`\`

---

### 📊 READY-TO-RENDER MERMAID.JS DIAGRAM:
${mermaidDiagram}

---

### 🧬 DETAILED CLINICAL KNOWLEDGE BLOCKS (${flashcards.length} Concepts):
`;

  if (flashcards.length === 0) {
    // If it's a higher branch with no direct cards, list the child topics
    prompt += `\n*This branch contains ${metrics.totalSubBranches} hierarchical sub-topics:*\n`;
    allNodes.forEach(({ node, depth }) => {
      if (node.id !== rootNode.id) {
        const indent = '  '.repeat(depth);
        prompt += `${indent}- **${node.title.en}** (${node.title.fa}) [Level ${node.level}]\n`;
      }
    });
  } else {
    flashcards.forEach((card, idx) => {
      const qFa = typeof card.question === 'object' ? card.question.fa || card.question.en : card.question;
      const qEn = typeof card.question === 'object' ? card.question.en || card.question.fa : card.question;
      const aFa = typeof card.answer === 'object' ? card.answer.fa || card.answer.en : card.answer;
      const aEn = typeof card.answer === 'object' ? card.answer.en || card.answer.fa : card.answer;
      const pearlFa = card.pearl ? (typeof card.pearl === 'object' ? card.pearl.fa : card.pearl) : '';
      const pearlEn = card.pearl ? (typeof card.pearl === 'object' ? card.pearl.en : card.pearl) : '';

      prompt += `
#### [Card ${idx + 1}] ${card.topic || 'Clinical Topic'}
- **Question (EN)**: ${qEn}
- **Question (FA)**: ${qFa}
- **Clinical Answer (EN)**: ${aEn}
- **Clinical Answer (FA)**: ${aFa}
${pearlEn || pearlFa ? `- **High-Yield Clinical Pearl**: ${pearlEn} / ${pearlFa}` : ''}
${card.type === 'mcq' && card.mcqOptions ? `- **Options**: ${card.mcqOptions.map((o) => `[${o.id}] ${typeof o.text === 'object' ? o.text.en : o.text}`).join(' | ')} (Correct: ${card.mcqOptions.find((o) => o.isCorrect)?.id || 'N/A'})` : ''}
`;
    });
  }

  if (nodeImages && Object.keys(nodeImages).length > 0) {
    prompt += `\n---\n### 🖼️ ATTACHED VISUAL REFERENCES / IMAGES:\n`;
    Object.entries(nodeImages).forEach(([key, img]) => {
      if (img.url) {
        prompt += `- **Reference (${key})**: ${img.url} ${img.caption ? `(${img.caption})` : ''}\n`;
      }
    });
  }

  prompt += `\n---\n*Generated by Australia Pharmacy Master Suite - Leitner Mind Map Engine*`;

  return prompt;
}

/**
 * Generates Clean Structured Markdown
 */
export function generateStructuredMarkdown(rootNode: MindMapNode, language: Language): string {
  const isFa = language === 'fa';
  const { allNodes } = traverseBranchNodes(rootNode);

  let md = `# ${rootNode.title.fa} / ${rootNode.title.en}\n\n`;

  allNodes.forEach(({ node, depth }) => {
    if (depth === 0) return;
    const heading = '#'.repeat(Math.min(depth + 1, 6));
    md += `${heading} ${node.title.fa} (${node.title.en})\n`;

    if (node.card) {
      const c = node.card;
      const q = typeof c.question === 'object' ? (isFa ? c.question.fa : c.question.en) : c.question;
      const a = typeof c.answer === 'object' ? (isFa ? c.answer.fa : c.answer.en) : c.answer;
      const p = c.pearl ? (typeof c.pearl === 'object' ? (isFa ? c.pearl.fa : c.pearl.en) : c.pearl) : null;

      md += `\n**پرسش / مبحث**: ${q}\n\n`;
      md += `**پاسخ و نکات بالینی**: ${a}\n\n`;
      if (p) {
        md += `> 💡 **نکته کلیدی**: ${p}\n\n`;
      }
    }
    md += `\n`;
  });

  return md;
}
