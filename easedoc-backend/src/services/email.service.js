import SibApiV3Sdk from "sib-api-v3-sdk";

const requiredMailSettings = [
  "BREVO_API_KEY",
  "MAIL_FROM",
];

const getMissingMailSettings = () =>
  requiredMailSettings.filter(
    (key) => !String(process.env[key] ?? "").trim()
  );

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const createBrevoClient = () => {
  const missingSettings = getMissingMailSettings();

  if (missingSettings.length > 0) {
    throw {
      message: `Email sending is not configured. Missing: ${missingSettings.join(
        ", "
      )}`,
    };
  }

  const defaultClient = SibApiV3Sdk.ApiClient.instance;

  const apiKey =
    defaultClient.authentications["api-key"];

  apiKey.apiKey = String(
    process.env.BREVO_API_KEY
  ).trim();

  return new SibApiV3Sdk.TransactionalEmailsApi();
};

const formatSendMailError = (err) => {
  const message =
    err?.response?.body?.message ||
    err?.message ||
    "Could not send email";

  if (
    /unauthorized|authentication/i.test(message)
  ) {
    return "Brevo API authentication failed. Check BREVO_API_KEY.";
  }

  return message;
};

export const sendVerificationCodeEmail = async ({
  to,
  fullName,
  code,
}) => {
  const apiInstance = createBrevoClient();

  const firstName =
    fullName?.trim().split(/\s+/)[0] || "there";

  const safeFirstName = escapeHtml(firstName);

  const fromEmail = String(
    process.env.MAIL_FROM
  ).trim();

  try {
    await apiInstance.sendTransacEmail({
      sender: {
        name: "EaseDoc Accounts",
        email: fromEmail,
      },

      to: [
        {
          email: to,
          name: fullName || "",
        },
      ],

      replyTo: {
        email: fromEmail,
        name: "EaseDoc Accounts",
      },

      subject: "EaseDoc account verification code",

      textContent: `Hello ${firstName},

Thank you for signing up with EaseDoc.

Your verification code is:

${code}

This code expires in 10 minutes.

If you did not request this, you can safely ignore this email.

Best regards,
The EaseDoc Team`,

      htmlContent: `
      <div style="font-family: Arial, sans-serif; color: #333333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">

        <h2 style="color: #4f46e5;">
          Verify your email address
        </h2>

        <p>Hello ${safeFirstName},</p>

        <p>
          Thank you for signing up with EaseDoc.
          Please use the verification code below:
        </p>

        <div style="
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 25px 0;
        ">
          <p style="
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            margin: 0;
            color: #0f172a;
          ">
            ${code}
          </p>
        </div>

        <p style="color: #64748b; font-size: 14px;">
          This code expires in 10 minutes.
        </p>

        <p>
          If you did not request this email,
          you can safely ignore it.
        </p>

        <hr style="
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 30px 0;
        " />

        <p style="color: #64748b; font-size: 13px;">
          Best regards,<br />
          <strong>The EaseDoc Team</strong>
        </p>

      </div>
      `,
    });
  } catch (err) {
    console.error(err);

    throw {
      message: formatSendMailError(err),
    };
  }
};