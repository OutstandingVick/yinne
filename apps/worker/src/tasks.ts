import { and, eq } from "drizzle-orm";
import type { TaskList } from "graphile-worker";
import { z } from "zod";
import { outboxMessages, withTenantTransaction } from "@yinne/database";
const payloadSchema = z.object({
  organizationId: z.string().uuid(),
  environment: z.enum(["test", "live"]),
  outboxMessageId: z.string().uuid(),
});

export const taskList: TaskList = {
  outbox_dispatch: async (rawPayload, helpers) => {
    const payload = payloadSchema.parse(rawPayload);
    await withTenantTransaction(
      { organizationId: payload.organizationId, environment: payload.environment },
      async (tx) => {
        const [message] = await tx
          .update(outboxMessages)
          .set({
            state: "processed",
            processedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
          })
          .where(
            and(
              eq(outboxMessages.organizationId, payload.organizationId),
              eq(outboxMessages.id, payload.outboxMessageId),
              eq(outboxMessages.state, "processing"),
            ),
          )
          .returning({ id: outboxMessages.id, topic: outboxMessages.topic });
        if (!message)
          throw new Error(
            "Outbox message is missing, belongs to another tenant, or is not processing.",
          );
        helpers.logger.info(
          "Dispatched foundational outbox message " + message.id + " on " + message.topic,
        );
      },
    );
  },
};

export { payloadSchema as outboxDispatchPayloadSchema };
