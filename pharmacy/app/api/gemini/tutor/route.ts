import { NextResponse } from 'next/server';
import { executeAiInference } from '@/lib/aiService';
import { authenticateAiRequest, clampNumber, cleanString, parseAiProvider, parseGuardedJson, publicAiError } from '@/lib/apiRequestGuard';

// TODO: Require verified Firebase authentication before using server-owned keys in production.
export async function POST(req: Request) {
  try {
    const auth = await authenticateAiRequest(req);
    if (auth instanceof NextResponse) return auth;
    const parsedRequest = await parseGuardedJson(req, 'ai-tutor', auth.uid);
    if ('response' in parsedRequest) return parsedRequest.response;
    const body = parsedRequest.body;
    const {
      prompt,
      conversationHistory = [],
      provider = 'gemini',
      model = 'gemini-2.5-flash',
      apiKey,
      temperature = 0.3,
    } = body;

    const safePrompt = cleanString(prompt, 12_000);
    const safeProvider = parseAiProvider(provider);
    const safeModel = cleanString(model, 120);
    const safeApiKey = cleanString(apiKey, 512);
    const safeTemperature = clampNumber(temperature, 0.3, 0, 1);
    const safeHistory = Array.isArray(conversationHistory) ? conversationHistory.slice(-20) : [];

    if (!safePrompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    if (!safeProvider || !safeModel) {
      return NextResponse.json({ error: 'Invalid AI provider or model' }, { status: 400 });
    }

    const systemInstruction = `You are "Professor Pharma AI", an expert Australian Clinical Pharmacy Tutor and professional learning mentor.
Guidelines for your responses:
- Reference authentic Australian sources: Australian Medicines Handbook (AMH), Therapeutic Guidelines (eTG), Australian Pharmaceutical Formulary (APF), PBS, and Pharmacy Board of Australia standards.
- Provide bilingual clarity: Detailed explanations in Persian with all key medical terms, drug names, and clinical mnemonics in English.
- Highlight Australian caution labels (CAL A-L), Narrow Therapeutic Index (NTI), S4 vs S8 scheduling, and practical dispensing advice.
- When answering questions, include clinical pearls, diagnostic tests, and safe learning checks.
- Use clear markdown with bullet points and bolding for high readability.`;

    let fullPrompt = safePrompt;
    if (safeHistory.length > 0) {
      const historyContext = safeHistory
        .filter((m): m is { role: string; content: string } => !!m && typeof m === 'object' && typeof m.role === 'string' && typeof m.content === 'string')
        .map((m) => `${cleanString(m.role, 20).toUpperCase()}: ${cleanString(m.content, 4000)}`)
        .join('\n\n');
      fullPrompt = `Previous Conversation Context:\n${historyContext}\n\nCurrent User Question:\n${safePrompt}`;
    }

    const text = await executeAiInference({
      provider: safeProvider,
      model: safeModel,
      userApiKey: safeApiKey,
      prompt: fullPrompt,
      systemInstruction,
      responseFormat: 'text',
      temperature: safeTemperature,
    });

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Error in AI tutor endpoint:', error);
    return NextResponse.json(
      { error: publicAiError(error, 'Failed to process AI tutor request') },
      { status: 500 }
    );
  }
}
