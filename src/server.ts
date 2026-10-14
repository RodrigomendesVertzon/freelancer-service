import { app } from "./app";
import { env } from "./config/env";
import { checkDatabase, db } from "./config/db";
import { logger } from "./config/logger";

async function bootstrap() {
  await checkDatabase();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "freelancer-service started");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    server.close(async () => {
      await db.end();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, "failed to start freelancer-service");
  process.exit(1);
});
