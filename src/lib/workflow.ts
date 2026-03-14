const WF = "https://xorgsduvbpaokegawhbd.supabase.co/functions/v1/workflow-engine";

export async function transition(entity: string, trigger: string, name: string, ctx?: any) {
  return (await fetch(WF, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity, trigger, name, context: ctx })
  })).json();
}

export const srTransition = (trigger: string, name: string) => transition("service_request", trigger, name);
export const docTransition = (trigger: string, name: string) => transition("document", trigger, name);
