import { v2 as cloudinary } from "cloudinary";
import { app } from "./app";
import env from "./utils/env";

cloudinary.config({
  cloud_name: env.CLOUD_NAME,
  api_key: env.CLOUD_API_KEY,
  api_secret: env.CLOUD_API_SECRET_KEY,
});

app.listen(env.PORT, () => {
  console.log(`server listening on ${env.PORT}`);
});
