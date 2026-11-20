
import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

function getTransporter() {
  const port = Number(env.SMTP_PORT || 587);

  if (
    !env.SMTP_HOST ||
    !env.SMTP_USER ||
    !env.SMTP_PASSWORD ||
    !env.SMTP_FROM
  ) {
    throw new Error('SMTP-Konfiguration fehlt.');
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD
    }
  });
}

export async function sendActivationEmail({
  to,
  firstName,
  activationUrl
}: {
  to: string;
  firstName: string;
  activationUrl: string;
}) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'Dein Zugang zu Pflegerouter ',
    text: `Hallo ${firstName},

für dich wurde ein Benutzerkonto bei Pflegerouter  eingerichtet.

Bitte öffne diesen Link, um dein Passwort festzulegen und dein Konto zu aktivieren:

${activationUrl}

Der Link ist 24 Stunden gültig.

Falls du kein Benutzerkonto erwartest, kannst du diese Nachricht ignorieren.

Viele Grüße
Dein Pflegerouter -Team`
  });
}
