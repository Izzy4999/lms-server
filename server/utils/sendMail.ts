import nodemailer, { Transporter } from "nodemailer";
import ejs from "ejs";
import path from "path";
import env from "./env";

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

const sendMail = async (options: EmailOptions): Promise<void> => {
  const transporter: Transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    service: env.SMTP_SERVICE,
    auth: {
      user: env.SMTP_MAIL,
      pass: env.SMTP_PASSWORD,
    },
  });

  const { email, subject, data, template } = options;

  const templatePath = path.join(
    __dirname,
    "../mails",
    template
  );

  const html = await ejs.renderFile(templatePath, data);

  const mailOptions = {
    from: env.SMTP_MAIL,
    to: email,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendMail;
