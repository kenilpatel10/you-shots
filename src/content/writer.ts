import { completeJson } from "../llm";
import { ScriptSchema, type Script, type Topic } from "./schema";
import { getPrompts, promptContext } from "./prompts";
import { SCRIPT_JSON_SCHEMA } from "./prompts/schemas";

export async function writeScript(topic: Topic, feedback?: string[]): Promise<{ script: Script; provider: string; model: string }> {
  const prompts = getPrompts();
  const ctx = promptContext();
  const { data, provider, model } = await completeJson(
    {
      system: prompts.writerSystem(ctx),
      user: prompts.writerUser(topic, ctx, feedback),
      jsonSchema: SCRIPT_JSON_SCHEMA,
      temperature: feedback?.length ? 0.6 : 0.85,
    },
    ScriptSchema,
    "writer",
  );
  // The model sometimes rewrites the id; the topic decides.
  return { script: { ...data, topicId: topic.id, background: topic.category }, provider, model };
}
