const APP_NAME = 'Smart School';

function appUrl(): string {
  return process.env.APP_URL || 'http://localhost:3000';
}

export function baseLayout(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 0 32px;text-align:center;background-color:#4f46e5;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">${APP_NAME}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                You received this email because you are registered with ${APP_NAME}.<br>
                <a href="${appUrl()}" style="color:#4f46e5;text-decoration:none;">${appUrl()}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background-color:#4f46e5;border-radius:6px;text-align:center;">
        <a href="${href}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function divider(): string {
  return `<hr style="margin:28px 0;border:0;border-top:1px solid #e2e8f0;">`;
}
