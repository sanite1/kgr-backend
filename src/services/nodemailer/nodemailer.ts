import { createTransport } from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import path from "path";
import logger from "../../config/logger";

const transporter = createTransport({
  host: process.env.SMTP_HOST || "smtp.zoho.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
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

if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  transporter.verify((error: any, _success: any) => {
    if (error)
      logger.error("SMTP connection error", { message: error.message });
    else logger.info("SMTP server is ready to send messages");
  });
} else {
  logger.warn("SMTP credentials not configured: emails will not be sent");
}

export default transporter;
