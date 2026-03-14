const BASE_URL = "https://xorgsduvbpaokegawhbd.supabase.co/functions/v1/erpnext-proxy";
const ERPNEXT_URL = "https://edigivault.m.frappe.cloud";

export function getFileUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/private/")) return BASE_URL + "?path=" + encodeURIComponent(path);
  return ERPNEXT_URL + path;
}

export async function fetchList(doctype: string, fields: string[], filters?: any[], limit?: number, orderBy?: string) {
  const p = new URLSearchParams();
  p.set("path", "/api/resource/" + doctype);
  p.set("fields", JSON.stringify(fields));
  if (filters) p.set("filters", JSON.stringify(filters));
  if (limit) p.set("limit_page_length", String(limit));
  if (orderBy) p.set("order_by", orderBy);
  return (await (await fetch(BASE_URL + "?" + p)).json()).data;
}

export async function fetchOne(doctype: string, name: string) {
  return (await (await fetch(BASE_URL + "?path=/api/resource/" + doctype + "/" + encodeURIComponent(name))).json()).data;
}

export async function createRecord(doctype: string, body: any) {
  return (await fetch(BASE_URL + "?path=/api/resource/" + doctype, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })).json();
}

export async function updateRecord(doctype: string, name: string, body: any) {
  return (await fetch(BASE_URL + "?path=/api/resource/" + doctype + "/" + encodeURIComponent(name), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  })).json();
}
