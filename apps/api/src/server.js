import { createApp } from "./app.js";

const port = Number(process.env.PORT || 3000);
const app = createApp();

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`woundcam-api listening on :${port}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
