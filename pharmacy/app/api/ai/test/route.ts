import { NextResponse } from 'next/server';
import { executeAiInference } from '@/lib/aiService';
import { authenticateAiRequest, cleanString, parseAiProvider, parseGuardedJson, publicAiError } from '@/lib/apiRequestGuard';

// TODO: Require verified Firebase authentication before using server-owned keys in production.
export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const auth = await authenticateAiRequest(req);
    if (auth instanceof NextResponse) return auth;
    const parsedRequest = await parseGuardedJson(req, 'ai-test', auth.uid);
    if ('response' in parsedRequest) return parsedRequest.response;
    const body = parsedRequest.body;
    const { provider = 'gemini', model = 'gemini-2.5-flash', apiKey } = body;
    const safeProvider = parseAiProvider(provider);
    const safeModel = cleanString(model, 120);
    if (!safeProvider || !safeModel) {
      return NextResponse.json({ error: 'Invalid AI provider or model' }, { status: 400 });
    }

    const testPrompt = 'Hello! In 1 short sentence, confirm you are active for clinical pharmacology review.';
    const systemInstruction = 'You are an Australian clinical pharmacy AI assistant. Respond concisely.';

    const responseText = await executeAiInference({
      provider: safeProvider,
      model: safeModel,
      userApiKey: cleanString(apiKey, 512),
      prompt: testPrompt,
      systemInstruction,
      temperature: 0.1,
    });

    const elapsedMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'اتصال با موفقیت برقرار شد!',
      responseText: responseText.trim(),
      elapsedMs,
      model: safeModel,
      provider: safeProvider,
    });
  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    return NextResponse.json(
      {
        success: false,
        error: publicAiError(error, 'خطا در برقراری ارتباط با مدل هوش مصنوعی'),
        elapsedMs,
      },
      { status: 500 }
    );
  }
}
