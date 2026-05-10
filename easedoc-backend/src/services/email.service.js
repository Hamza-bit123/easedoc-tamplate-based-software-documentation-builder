import nodemailer from "nodemailer";

const requiredMailSettings = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "MAIL_FROM",
];

const getMissingMailSettings = () =>
  requiredMailSettings.filter((key) => !String(process.env[key] ?? "").trim());

/** Gmail app passwords are shown as four groups; pasted with spaces they fail auth. */
const normalizeEnvSecret = (value) =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, "");

const useNodemailerGmailPreset = (hostLower, userRaw) => {
  if (hostLower === "smtp-relay.gmail.com") {
    return false;
  }
  if (hostLower === "smtp.gmail.com") {
    return true;
  }
  const u = userRaw.toLowerCase();
  return u.endsWith("@gmail.com") || u.endsWith("@googlemail.com");
};

const createTransporter = () => {
  const missingSettings = getMissingMailSettings();

  if (missingSettings.length > 0) {
    throw {
      message: `Email sending is not configured. Missing: ${missingSettings.join(", ")}`,
    };
  }

  const host = String(process.env.SMTP_HOST).trim();
  const hostLower = host.toLowerCase();
  const userRaw = String(process.env.SMTP_USER).trim();
  const pass = normalizeEnvSecret(process.env.SMTP_PASS);

  if (!pass) {
    throw { message: "Email sending is not configured. SMTP_PASS is empty" };
  }

  const timeouts = {
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 25_000,
  };

  /** Preset uses smtp.gmail.com:465 + secure (matches Nodemailer's well-known "Gmail" entry). */
  if (useNodemailerGmailPreset(hostLower, userRaw)) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: userRaw, pass },
      ...timeouts,
    });
  }

  const port = Number(process.env.SMTP_PORT);
  const secure = process.env.SMTP_SECURE === "true";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure && port === 587,
    ...timeouts,
    auth: {
      user: userRaw,
      pass,
    },
  });
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const gmailAuthHelp =
  "Gmail rejected the SMTP login. Use the same Google account for SMTP_USER and MAIL_FROM; enable 2-Step Verification; create an App password (Google Account → Security → App passwords) and put that 16-character value in SMTP_PASS (wrap in double quotes in .env if it contains #). Your normal Gmail password will not work. Workspace accounts need admin to allow SMTP/app passwords.";

const formatSendMailError = (err) => {
  const base = err?.message || "Could not send email";
  const smtpReply = String(err?.response ?? "");
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(base)) {
    return "Could not reach the mail server. Check SMTP_HOST, your network, and firewall settings.";
  }
  if (
    err?.responseCode === 535 ||
    /Invalid login|authentication failed|535 5\.7\.8/i.test(smtpReply + base)
  ) {
    return gmailAuthHelp;
  }
  return base;
};

export const sendVerificationCodeEmail = async ({ to, fullName, code }) => {
  const transporter = createTransporter();
  const firstName = fullName?.trim().split(/\s+/)[0] || "there";
  const safeFirstName = escapeHtml(firstName);
  const fromEmail = String(process.env.MAIL_FROM).trim();
  const formattedFrom = `"EaseDoc Accounts" <${fromEmail}>`;

  try {
    await transporter.sendMail({
      from: formattedFrom,
      to,
      replyTo: fromEmail,
      subject: "EaseDoc account verification code",
      text: `Hello ${firstName},\n\nThank you for signing up with EaseDoc. To complete your registration, please use the following verification code:\n\n${code}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please safely ignore this email.\n\nBest regards,\nThe EaseDoc Team`,
      html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5; margin-bottom: 20px;">Verify your email address</h2>
        <p>Hello ${safeFirstName},</p>
        <p>Thank you for signing up with EaseDoc. To complete your registration and secure your account, please use the following verification code:</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin: 25px 0; text-align: center;">
          <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; margin: 0; color: #0f172a;">${code}</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">This security code will expire in 10 minutes.</p>
        <p>If you did not initiate this request, you can safely ignore this email. No account will be created without this verification step.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #64748b; font-size: 13px;">Best regards,<br><strong>The EaseDoc Team</strong></p>
      </div>
      `,
    });
  } catch (err) {
    throw { message: formatSendMailError(err) };
  }
};
