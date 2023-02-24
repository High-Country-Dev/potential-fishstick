import { createTRPCRouter, publicProcedure } from "../trpc";

export const eventsRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) => {
    const events = ctx.prisma.event.findMany({});
    return events;
  }),
});
