// Klijentski WebAuthn: prijava (#passkey-prijava na /prijava) i upis (#passkey-upis na /kljucevi).
// Preneseno iz omm.domovina.ai src/lib/admin/klijent.ts (izvorno pay.domovina.ai).
const b64uToBuf = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0)).buffer;
};
const bufToB64u = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

function credToJSON(c: any) {
  if (typeof c.toJSON === "function") return c.toJSON();
  const r = c.response;
  const response: Record<string, unknown> = { clientDataJSON: bufToB64u(r.clientDataJSON) };
  if (r.attestationObject) {
    response.attestationObject = bufToB64u(r.attestationObject);
    response.transports = r.getTransports ? r.getTransports() : [];
  } else {
    response.authenticatorData = bufToB64u(r.authenticatorData);
    response.signature = bufToB64u(r.signature);
    if (r.userHandle) response.userHandle = bufToB64u(r.userHandle);
  }
  return { id: c.id, rawId: bufToB64u(c.rawId), type: c.type, response,
    clientExtensionResults: c.getClientExtensionResults(), authenticatorAttachment: c.authenticatorAttachment };
}

const PKC = PublicKeyCredential as any;
function requestOptions(o: any) {
  if (PKC.parseRequestOptionsFromJSON) return PKC.parseRequestOptionsFromJSON(o);
  return { ...o, challenge: b64uToBuf(o.challenge),
    allowCredentials: (o.allowCredentials || []).map((c: any) => ({ ...c, id: b64uToBuf(c.id) })) };
}
function creationOptions(o: any) {
  if (PKC.parseCreationOptionsFromJSON) return PKC.parseCreationOptionsFromJSON(o);
  return { ...o, challenge: b64uToBuf(o.challenge), user: { ...o.user, id: b64uToBuf(o.user.id) },
    excludeCredentials: (o.excludeCredentials || []).map((c: any) => ({ ...c, id: b64uToBuf(c.id) })) };
}

async function post(url: string, body?: unknown): Promise<any> {
  const r = await fetch(url, { method: "POST", credentials: "same-origin",
    headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "HTTP " + r.status);
  return data;
}

function show(text: string) {
  const el = document.getElementById("passkey-poruka");
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
}

// Odustajanje u dijalogu preglednika nije greška koju treba prikazati.
const odustao = (e: unknown) => (e as Error)?.name === "NotAllowedError";

if (!window.PublicKeyCredential) {
  document.querySelectorAll<HTMLElement>("[data-passkey]").forEach((el) => (el.hidden = true));
}

const prijavaBtn = document.getElementById("passkey-prijava") as HTMLButtonElement | null;
prijavaBtn?.addEventListener("click", async () => {
  try {
    const opts = await post("/auth/passkey/opcije");
    const cred = await navigator.credentials.get({ publicKey: requestOptions(opts) });
    const res = await post("/auth/passkey/prijava", { response: credToJSON(cred), natrag: prijavaBtn.dataset.natrag });
    location.href = res.natrag;
  } catch (e) {
    if (!odustao(e)) show("Prijava ključem nije uspjela: " + (e as Error).message);
  }
});

const upisForma = document.getElementById("passkey-upis") as HTMLFormElement | null;
upisForma?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  try {
    const opts = await post("/kljucevi/opcije");
    const cred = await navigator.credentials.create({ publicKey: creationOptions(opts) });
    await post("/kljucevi/upis", { response: credToJSON(cred), naziv: (upisForma.elements.namedItem("naziv") as HTMLInputElement).value });
    location.href = upisForma.dataset.natrag || "/kljucevi";
  } catch (e) {
    if (!odustao(e)) show("Dodavanje ključa nije uspjelo: " + (e as Error).message);
  }
});
