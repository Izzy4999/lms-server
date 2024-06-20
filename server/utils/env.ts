import { config } from "dotenv";
import { cleanEnv, makeValidator, port, str } from "envalid";

config();
const env = cleanEnv(process.env, {
  PORT: port(),
  CLOUD_NAME: str(),
  CLOUD_API_KEY: str(),
  CLOUD_API_SECRET_KEY: str(),
  REDIS_URL: str(),
  SECRET_KEY: str(),
  SMTP_HOST: str(),
  SMTP_PORT: port(),
  SMTP_MAIL: str(),
  SMTP_PASSWORD: str(),
  SMTP_SERVICE: str(),
  ACCESS_TOKEN: str(),
  REFRESH_TOKEN: str(),
});

export default env;
