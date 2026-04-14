export async function onRequestPost(context) {
  const { request, env } = context;

  const headers = {
    'Access-Control-Allow-Origin': 'https://noresume.co',
    'Content-Type': 'application/json',
  };

  try {
    const formData = await request.formData();

    const firstName = formData.get('firstName')?.trim();
    const lastName = formData.get('lastName')?.trim();
    const email = formData.get('email')?.trim();
    const subject = formData.get('subject')?.trim();
    const message = formData.get('message')?.trim() || '(No message provided)';
    const turnstileToken = formData.get('cf-turnstile-response');

    if (!firstName || !lastName || !email || !subject) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address' }),
        { status: 400, headers }
      );
    }

    // Validate Turnstile token
    const secret = env.TURNSTILE_SECRET_KEY;
    const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secret,
        response: turnstileToken,
        remoteip: request.headers.get('CF-Connecting-IP'),
      }),
    });

    const turnstileResult = await turnstileResponse.json();

    if (!turnstileResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Security check failed.',
          debug: turnstileResult,
          secretExists: !!secret,
          secretLength: secret ? secret.length : 0
        }),
        { status: 400, headers }
      );
    }

    // Send email to support@noresume.co
    const supportEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NoResume Contact Form <noreply@noresume.co>',
        to: 'support@noresume.co',
        reply_to: email,
        subject: `[Contact Form] ${subject} - ${firstName} ${lastName}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${firstName} ${lastName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Enquiry Type:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Submitted from noresume.co/contact<br>
            IP: ${request.headers.get('CF-Connecting-IP')}<br>
            Time: ${new Date().toISOString()}
          </p>
        `,
      }),
    });

    if (!supportEmailResponse.ok) {
      const errorText = await supportEmailResponse.text();
      throw new Error('Failed to send email: ' + errorText);
    }

    // Send confirmation email to submitter
    const confirmationResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NoResume <noreply@noresume.co>',
        to: email,
        reply_to: 'support@noresume.co',
        subject: 'We received your message - NoResume',
        html: `
          <p>Hi ${firstName},</p>
          <p>Thanks for reaching out to NoResume. We've received your message and will get back to you within 24-48 hours.</p>
          <p><strong>Your enquiry:</strong> ${subject}</p>
          <p><strong>Your message:</strong></p>
          <p style="background: #f5f5f5; padding: 12px; border-radius: 4px;">${message.replace(/\n/g, '<br>')}</p>
          <p>If you have any urgent questions, feel free to reply to this email.</p>
          <p>Best,<br>The NoResume Team</p>
        `,
      }),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: 'Something went wrong. Please try again.' }),
      { status: 500, headers }
    );
  }
}
  
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://noresume.co',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
