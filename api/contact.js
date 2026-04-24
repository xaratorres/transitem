/**
 * Vercel Function sense dependències: envia el formulari de contacte a Resend
 * via fetch directe (sense SDK).
 *
 * Variables d'entorn necessàries (per projecte, a Vercel dashboard):
 *   - RESEND_API_KEY  (https://resend.com/api-keys)
 *   - CONTACT_TO      email personal on arriben les consultes
 *   - CONTACT_FROM    remitent verificat a Resend (ex: "Denunciem <no-reply@denunciem.cat>")
 *
 * El camp `project` del body identifica l'origen al subject del mail.
 */

const MAX_MSG = 5000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateBuckets = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const arr = (rateBuckets.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) { rateBuckets.set(ip, arr); return true; }
  arr.push(now); rateBuckets.set(ip, arr); return false;
}

function isValidEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || req.headers.get('x-real-ip') || 'unknown';

  if (rateLimited(ip)) return json({ error: 'Massa peticions. Torna-ho a provar més tard.' }, 429);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'JSON invàlid' }, 400); }

  const { name, email, subject, message, website, project, consent } = body || {};

  if (website) return json({ ok: true }, 200); // honeypot
  if (!consent) return json({ error: 'Cal acceptar la política de privacitat.' }, 400);
  if (!isValidEmail(email)) return json({ error: 'Email no vàlid.' }, 400);
  if (typeof message !== 'string' || message.trim().length < 10 || message.length > MAX_MSG) {
    return json({ error: 'El missatge ha de tenir entre 10 i 5000 caràcters.' }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM || 'Formulari <onboarding@resend.dev>';
  const projectLabel = typeof project === 'string' ? project : 'desconegut';

  if (!apiKey || !to) return json({ error: 'Servei no configurat.' }, 500);

  const safeName = typeof name === 'string' ? name.slice(0, 120) : '';
  const safeSubject = typeof subject === 'string' ? subject.slice(0, 200) : 'Consulta sense assumpte';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[${projectLabel}] ${safeSubject}`,
        html: `
          <h2>Nou missatge de contacte — ${escapeHtml(projectLabel)}</h2>
          <p><strong>Nom:</strong> ${escapeHtml(safeName) || '<em>(no indicat)</em>'}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Assumpte:</strong> ${escapeHtml(safeSubject)}</p>
          <hr>
          <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>
          <hr>
          <p style="color:#888;font-size:12px">IP: ${escapeHtml(ip)}</p>
        `,
      }),
    });
    if (!res.ok) {
      console.error('Resend error:', await res.text());
      return json({ error: "No s'ha pogut enviar el missatge." }, 502);
    }
  } catch (err) {
    console.error('Fetch error:', err);
    return json({ error: "No s'ha pogut enviar el missatge." }, 502);
  }

  return json({ ok: true }, 200);
}

export const config = { runtime: 'edge' };
