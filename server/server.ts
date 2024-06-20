import { app } from "./app";
import env from "./utils/env";

app.listen(env.PORT, () => {
  console.log(`server listening on ${env.PORT}`);
});
