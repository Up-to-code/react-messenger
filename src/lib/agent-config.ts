import type * as T from "./types";
export function agentConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const backend =
    env.AGENT_BACKEND ||
    (env.CREWAI_SERVICE_URL
      ? "crewai"
      : env.OPENROUTER_API_KEY || env.OPENROUTER_MODEL
        ? "openrouter"
        : env.OPENAI_API_KEY || env.OPENAI_MODEL
          ? "openai"
          : "demo");
  if (backend === "demo") return { backend, mode: "demo" };
  let options: T.ProviderOptions | undefined;
  if (backend === "openrouter")
    options = { apiKey: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL };
  if (backend === "openai")
    options = { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL };
  if (backend === "crewai")
    options = {
      serviceURL: env.CREWAI_SERVICE_URL,
      serviceToken: env.CREWAI_SERVICE_TOKEN,
    };
  const ready = Boolean(
    options &&
    (backend === "crewai"
      ? options.serviceURL && options.serviceToken
      : options.apiKey && options.model),
  );
  return {
    backend,
    ...options,
    mode: ready ? "live" : "unavailable",
    configurationError: !ready,
  };
}
