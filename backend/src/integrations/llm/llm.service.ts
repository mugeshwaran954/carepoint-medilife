import { env } from "../../config/env.js";

export interface PreVisitLLMResult {
  urgencyLevel: "LOW" | "MEDIUM" | "HIGH";
  chiefComplaint: string;
  suggestedQuestions: string[];
}

export interface PostVisitLLMResult {
  patientSummary: string;
  medicationSchedule: string[];
  followUpSteps: string[];
}

/**
 * Call LLM API (OpenAI, Gemini, or Anthropic based on env) with timeout and try/catch.
 * Returns raw text response or null if call fails/unconfigured.
 */
async function callLLMProvider(prompt: string, systemPrompt?: string): Promise<string | null> {
  const apiKey = env.llmApiKey;
  if (!apiKey) {
    return null;
  }

  const provider = (env.llmProvider || "openai").toLowerCase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    if (provider === "gemini") {
      const model = env.llmModel || "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt ? systemPrompt + "\n\n" : ""}${prompt}` }] }]
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json() as any;
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } else if (provider === "anthropic") {
      const model = env.llmModel || "claude-3-haiku-20240307";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model,
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt }]
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json() as any;
      return data.content?.[0]?.text || null;
    } else {
      // Default OpenAI
      const model = env.llmModel || "gpt-3.5-turbo";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || null;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("LLM API call failed or timed out:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function generatePreVisitLLM(input: {
  symptoms: string;
  duration?: string;
  additionalDetails?: string;
}): Promise<PreVisitLLMResult | null> {
  const prompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: ${input.symptoms}${input.duration ? ` (Duration: ${input.duration})` : ""}${input.additionalDetails ? ` (Details: ${input.additionalDetails})` : ""}

Return JSON strictly with format:
{
  "urgencyLevel": "LOW" | "MEDIUM" | "HIGH",
  "chiefComplaint": "Short concise chief complaint summary",
  "suggestedQuestions": ["Question 1", "Question 2", "Question 3"]
}`;

  const responseText = await callLLMProvider(
    prompt,
    "You are an expert AI triage assistant. Respond ONLY with valid JSON."
  );

  if (!responseText) return null;

  try {
    // Clean code blocks if present
    const cleaned = responseText.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const urgencyUpper = String(parsed.urgencyLevel || "").toUpperCase();
    if (
      parsed &&
      ["LOW", "MEDIUM", "HIGH"].includes(urgencyUpper) &&
      typeof parsed.chiefComplaint === "string" &&
      Array.isArray(parsed.suggestedQuestions)
    ) {
      return {
        urgencyLevel: urgencyUpper as "LOW" | "MEDIUM" | "HIGH",
        chiefComplaint: parsed.chiefComplaint,
        suggestedQuestions: parsed.suggestedQuestions.slice(0, 3)
      };
    }
  } catch {
    // Parse error
  }
  return null;
}

export async function generatePostVisitLLM(input: {
  clinicalNotes?: string;
  prescriptions?: Array<{ medicationName: string; dosage: string; frequency: string; duration: string; instructions?: string }>;
  followUpInstructions?: string;
}): Promise<PostVisitLLMResult | null> {
  const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: ${input.clinicalNotes || "N/A"} ${input.prescriptions && input.prescriptions.length ? `Prescriptions: ${JSON.stringify(input.prescriptions)}` : ""} ${input.followUpInstructions ? `Follow-up: ${input.followUpInstructions}` : ""}

Return JSON strictly with format:
{
  "patientSummary": "Clear, compassionate summary of the visit",
  "medicationSchedule": ["Medication 1 schedule description", "Medication 2 schedule description"],
  "followUpSteps": ["Step 1", "Step 2"]
}`;

  const responseText = await callLLMProvider(
    prompt,
    "You are a helpful medical summary assistant. Respond ONLY with valid JSON."
  );

  if (!responseText) return null;

  try {
    const cleaned = responseText.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (
      parsed &&
      typeof parsed.patientSummary === "string" &&
      Array.isArray(parsed.medicationSchedule) &&
      Array.isArray(parsed.followUpSteps)
    ) {
      return {
        patientSummary: parsed.patientSummary,
        medicationSchedule: parsed.medicationSchedule,
        followUpSteps: parsed.followUpSteps
      };
    }
  } catch {
    // Parse error
  }
  return null;
}
