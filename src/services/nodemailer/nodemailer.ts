import { createTransport } from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import path from "path";
import logger from "../../config/logger";

const transporter = createTransport({
  host: process.env.SMTP_HOST || "smtp.zoho.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: { user: process.env.AUTH_EMAIL, pass: process.env.AUTH_PASS },
  tls: { rejectUnauthorized: false },
});

const handlebarOptions = {
  viewEngine: {
    partialsDir: path.resolve("src/services/nodemailer/templates"),
    defaultLayout: "",
  },
  viewPath: path.resolve("src/services/nodemailer/templates"),
};

transporter.use("compile", hbs(handlebarOptions));

if (process.env.AUTH_EMAIL && process.env.AUTH_PASS) {
  transporter.verify((error: any, _success: any) => {
    if (error)
      logger.error("SMTP connection error", { message: error.message });
    else logger.info("SMTP server is ready to send messages");
  });
} else {
  logger.warn("SMTP credentials not configured — emails will not be sent");
}

export default transporter;
