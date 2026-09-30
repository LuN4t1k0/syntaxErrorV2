import * as Sentry from "@sentry/nextjs";
import { opcionesSentry } from "./src/lib/monitoreo";

Sentry.init(opcionesSentry(process.env.NEXT_PUBLIC_SENTRY_DSN));
