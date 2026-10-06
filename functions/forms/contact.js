// Contact form handler for noresume.co/contact (Cloudflare Pages Function: POST /forms/contact).
// Lives at /forms/ because on noresume.co everything under /api/ is answered by a separate Cloudflare Worker
// (it serves /api/country and returns 404 for anything else), so a Pages Function at /api/contact never runs there.
// Restored 6 Oct 2026: the original was deleted from GitHub on 14 Apr 2026, so every message sent since then
// failed with "Unable to send your message". Same behaviour as before (Turnstile check, email to the team via
// Resend, confirmation to the sender), plus: no debug details in replies, visitor text escaped in the emails,
// and a clear error if a Cloudflare setting (TURNSTILE_SECRET_KEY / RESEND_API_KEY) is missing.

const TO = 'hello@noresume.co';   // Simon 6 Oct 2026 (the deleted original sent to support@)
const JSON_HEADERS = { 'Content-Type': 'application/json' };

const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function onRequestPost({ request, env }) {
  if (!env.TURNSTILE_SECRET_KEY || !env.RESEND_API_KEY) {
    return reply(500, { success: false, error: 'The contact form is not set up yet. Please email hello@noresume.co.', code: 'not_configured' });
  }
  try {
    const form = await request.formData();
    const firstName = (form.get('firstName') || '').trim();
    const lastName = (form.get('lastName') || '').trim();
    const email = (form.get('email') || '').trim();
    const subject = (form.get('subject') || '').trim();
    const message = (form.get('message') || '').trim() || '(No message provided)';
    const token = form.get('cf-turnstile-response');

    if (!firstName || !email || !subject) {
      return reply(400, { success: false, error: 'Please fill in your name, email and enquiry type.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply(400, { success: false, error: 'Please enter a valid email address.' });
    }

    const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get('CF-Connecting-IP') }),
    });
    if (!(await check.json()).success) {
      return reply(400, { success: false, error: 'Security check failed. Please tick the box and try again.' });
    }

    const name = [firstName, lastName].filter(Boolean).join(' ');
    const host = new URL(request.url).hostname;
    const send = (body) => fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const toTeam = await send({
      from: 'NoResume Contact Form <noreply@noresume.co>',
      to: TO,
      reply_to: email,
      subject: `[Contact Form] ${subject} - ${name}`,
      html: `<h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${esc(name)}</p>
        <p><strong>Email:</strong> ${esc(email)}</p>
        <p><strong>Enquiry Type:</strong> ${esc(subject)}</p>
        <p><strong>Message:</strong></p>
        <p>${esc(message).replace(/\n/g, '<br>')}</p>
        <hr><p style="color:#666;font-size:12px;">Submitted from ${esc(host)}/contact<br>Time: ${new Date().toISOString()}</p>`,
    });
    if (!toTeam.ok) throw new Error('Resend ' + toTeam.status + ': ' + (await toTeam.text()));

    await send({
      from: 'NoResume <noreply@noresume.co>',
      to: email,
      reply_to: TO,
      subject: 'We received your message - NoResume',
      html: `<p>Hi ${esc(firstName)},</p>
        <p>Thanks for reaching out to NoResume. We've received your message and will get back to you within 24-48 hours.</p>
        <p><strong>Your enquiry:</strong> ${esc(subject)}</p>
        <p><strong>Your message:</strong></p>
        <p style="background:#f5f5f5;padding:12px;border-radius:4px;">${esc(message).replace(/\n/g, '<br>')}</p>
        <p>If you have any urgent questions, feel free to reply to this email.</p>
        <p>Best,<br>The NoResume Team</p>`,
    });

    return reply(200, { success: true });
  } catch (err) {
    console.log('contact form error', err && err.message);
    return reply(500, { success: false, error: 'Something went wrong. Please try again, or email hello@noresume.co.' });
  }
}

export async function onRequest() {
  return reply(405, { success: false, error: 'Use POST' });
}
