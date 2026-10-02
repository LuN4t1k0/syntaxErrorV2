import { release } from "./release";

release(process.env).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
