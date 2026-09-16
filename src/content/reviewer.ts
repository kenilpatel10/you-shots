import { completeJson } from "../llm";
import { ReviewResultSchema, type ReviewResult, type Script, type Topic } from "./schema";
import { getPrompts, promptContext } from "./prompts";
import { REVIEW_JSON_SCHEMA } from "./prompts/schemas";

/** Second, independent LLM pass acting as a strict children's-content editor and fact checker. */
export async function reviewScript(script: Script, topic: Topic): Promise<ReviewResult & { provider: string; model: string }> {
  const prompts = getPrompts();
  const ctx = promptContext();
  const { data, provider, model } = await completeJson(
    {
      system: prompts.reviewerSystem(ctx),
      user: prompts.reviewerUser(topic, JSON.stringify(script, null, 2)),
      jsonSchema: REVIEW_JSON_SCHEMA,
      temperature: 0.2,
    },
    ReviewResultSchema,
    "reviewer",
  );
  if (data.fixedScript) data.fixedScript = { ...data.fixedScript, topicId: topic.id, background: topic.category };
  return { ...data, provider, model };
}
