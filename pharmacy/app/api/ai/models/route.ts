import { NextResponse } from 'next/server';
import { AiModelOption } from '@/types/pharmacy';
import { authenticateAiRequest, cleanString, parseGuardedJson } from '@/lib/apiRequestGuard';

// TODO: Require verified Firebase authentication before using server-owned keys in production.
export async function POST(req: Request) {
  try {
    const auth = await authenticateAiRequest(req);
    if (auth instanceof NextResponse) return auth;
    const parsedRequest = await parseGuardedJson(req, 'ai-models', auth.uid);
    if ('response' in parsedRequest) return parsedRequest.response;
    const body = parsedRequest.body;
    const { geminiApiKey, groqApiKey, xaiApiKey } = body;

    const discoveredModels: AiModelOption[] = [];
    const logs: string[] = [];
    const providerStatus: Record<string, { connected: boolean; count: number; message: string }> = {
      gemini: { connected: false, count: 0, message: 'کلید وارد نشده است' },
      groq: { connected: false, count: 0, message: 'کلید وارد نشده است' },
      xai: { connected: false, count: 0, message: 'کلید وارد نشده است' },
    };

    // 1. Fetch live models from Google Gemini API
    const effectiveGeminiKey = cleanString(geminiApiKey, 512) || (process.env.GEMINI_API_KEY || '').trim();
    const fetchGemini = async () => {
      if (effectiveGeminiKey) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${effectiveGeminiKey}`;
          const res = await fetch(url, { headers: { 'User-Agent': 'aistudio-pharma-app' } });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.models)) {
              const geminiList = data.models
                .filter((m: any) => {
                  const name = (m.name || '').replace(/^models\//, '');
                  const methods = m.supportedGenerationMethods || [];
                  return (
                    methods.includes('generateContent') &&
                    !name.includes('embedding') &&
                    !name.includes('aqa') &&
                    !name.includes('imagen') &&
                    !name.includes('tts')
                  );
                })
                .map((m: any) => {
                  const cleanId = (m.name || '').replace(/^models\//, '');
                  const displayName = m.displayName || cleanId;
                  const desc = m.description || '';
  
                  return {
                    id: cleanId,
                    name: displayName,
                    provider: 'gemini' as const,
                    description: {
                      fa: desc ? `مدل زنده گوگل: ${desc.substring(0, 120)}` : 'مدل آنلاین Google Gemini',
                      en: desc || 'Live Google Gemini model',
                    },
                    badge: 'Google Live',
                  };
                });
  
              discoveredModels.push(...geminiList);
              providerStatus.gemini = {
                connected: true,
                count: geminiList.length,
                message: `✅ دریافت شد (${geminiList.length} مدل زنده گوگل)`,
              };
              logs.push(`Found ${geminiList.length} live Gemini models`);
            }
          } else {
            providerStatus.gemini = {
              connected: false,
              count: 0,
              message: `⚠️ کلید نامعتبر است (Status ${res.status})`,
            };
            logs.push(`Gemini API returned status ${res.status}`);
          }
        } catch (geminiErr: any) {
          providerStatus.gemini = {
            connected: false,
            count: 0,
            message: `❌ خطا در اتصال به Gemini: ${geminiErr?.message || 'خطای شبکه'}`,
          };
          logs.push(`Failed to fetch Gemini models: ${geminiErr?.message}`);
        }
      }
    };

    // 2. Fetch live models from Groq API
    const effectiveGroqKey = cleanString(groqApiKey, 512) || (process.env.GROQ_API_KEY || '').trim();
    const fetchGroq = async () => {
      if (effectiveGroqKey) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/models', {
            headers: {
              Authorization: `Bearer ${effectiveGroqKey}`,
              'Content-Type': 'application/json',
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.data)) {
              const groqList = data.data
                .filter((m: any) => {
                  const id = m.id || '';
                  return !id.includes('whisper') && !id.includes('guard') && m.active !== false;
                })
                .map((m: any) => {
                  const id = m.id;
                  return {
                    id,
                    name: id,
                    provider: 'groq' as const,
                    description: {
                      fa: `مدل زنده و پرسرعت پردازشگر Groq LPU (${id})`,
                      en: `Live Groq LPU model (${id})`,
                    },
                    badge: 'Groq Live',
                  };
                });
  
              discoveredModels.push(...groqList);
              providerStatus.groq = {
                connected: true,
                count: groqList.length,
                message: `✅ دریافت شد (${groqList.length} مدل فعال Groq)`,
              };
              logs.push(`Found ${groqList.length} live Groq models`);
            }
          } else {
            providerStatus.groq = {
              connected: false,
              count: 0,
              message: `⚠️ کلید Groq نامعتبر است (Status ${res.status})`,
            };
            logs.push(`Groq API returned status ${res.status}`);
          }
        } catch (groqErr: any) {
          providerStatus.groq = {
            connected: false,
            count: 0,
            message: `❌ خطا در اتصال به Groq: ${groqErr?.message || 'خطای شبکه'}`,
          };
          logs.push(`Failed to fetch Groq models: ${groqErr?.message}`);
        }
      }
    };

    // 3. Fetch live models from xAI Grok API
    const effectiveXaiKey = cleanString(xaiApiKey, 512) || (process.env.XAI_API_KEY || '').trim();
    const fetchXai = async () => {
      if (effectiveXaiKey) {
        try {
          const res = await fetch('https://api.x.ai/v1/models', {
            headers: {
              Authorization: `Bearer ${effectiveXaiKey}`,
              'Content-Type': 'application/json',
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.data)) {
              const xaiList = data.data
                .filter((m: any) => !m.id.includes('embedding') && !m.id.includes('image'))
                .map((m: any) => ({
                  id: m.id,
                  name: m.id,
                  provider: 'xai' as const,
                  description: {
                    fa: `مدل رسمی xAI Grok: ${m.id}`,
                    en: `Live xAI Grok model: ${m.id}`,
                  },
                  badge: 'xAI Live',
                }));
  
              discoveredModels.push(...xaiList);
              providerStatus.xai = {
                connected: true,
                count: xaiList.length,
                message: `✅ دریافت شد (${xaiList.length} مدل xAI)`,
              };
            }
          } else {
            providerStatus.xai = {
              connected: false,
              count: 0,
              message: `⚠️ کلید xAI نامعتبر است (Status ${res.status})`,
            };
          }
        } catch (xaiErr: any) {
          providerStatus.xai = {
            connected: false,
            count: 0,
            message: `❌ خطا در اتصال به xAI: ${xaiErr?.message || 'خطای شبکه'}`,
          };
        }
      }
    };

    await Promise.allSettled([fetchGemini(), fetchGroq(), fetchXai()]);

    // Return strictly the models fetched dynamically from the user's active keys
    return NextResponse.json({
      success: true,
      models: discoveredModels,
      discoveredCount: discoveredModels.length,
      providerStatus,
      logs,
    });
  } catch (error: any) {
    console.error('Error fetching dynamic models:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'خطا در دریافت زنده مدل‌ها',
        models: [],
      },
      { status: 500 }
    );
  }
}
