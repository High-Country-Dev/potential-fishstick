import { faker } from "@faker-js/faker";
import { Prisma, PrismaClient } from "@prisma/client";

const fakeUser = (
  input?: Partial<Prisma.UserCreateArgs>
): Prisma.UserCreateManyInput => {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  const email = faker.internet.email(firstName, lastName).toLowerCase();
  const createdAt = faker.date.past(2);
  const updatedAt = faker.date.between(createdAt, new Date());

  return {
    ...input,
    firstName,
    lastName,
    email,
    password: "$2a$12$vBqJ38RMpP8eFSY9TpHs5uhVI8XaCy7RAC7TK6Ct6zplbV425i1wa", // 1234qwer
    role: "USER",
    createdAt,
    updatedAt,
  };
};

const fakeEvent = (
  input?: Partial<Prisma.EventCreateArgs>
): Prisma.EventCreateManyInput => {
  const title = faker.lorem.words(5);
  const createdAt = faker.date.past(2);
  const updatedAt = faker.date.between(createdAt, new Date());
  const date = faker.date.future();
  const url = faker.internet.url();

  return {
    ...input,
    title,
    description: faker.lorem.paragraph(),
    start: date,
    // end,
    adress1: faker.address.streetAddress(),
    // adress2,
    city: faker.helpers.arrayElement(["Boone", "Blowing Rock"]),
    county: "Watauga",
    state: "NC",
    zipCode: "28607",
    sourcePage: url,
    sourceScript: faker.lorem.words(3),
    linkUrl:
      url + `/event/${faker.datatype.number({ min: 10000, max: 99999 })}`,
    manuallyValidated: faker.datatype.boolean(),
    createdAt,
    updatedAt,
  };
};

const prisma = new PrismaClient();

const main = async () => {
  const allow_prod = process.argv.includes("--allow-prod");
  console.log("Doing main", allow_prod);

  const delete_data = process.argv.includes("--delete-data");
  console.log("Delete data", delete_data);

  // Can run on prod with this command:
  //  yarn workspace @mono/db ts-node prisma/seed.ts --allow-prod
  if (process.env.NODE_ENV === "production" && !allow_prod) {
    console.log("Not seeding because NODE_ENV is production!");
    return;
  }
  if ((process.env.DATABASE_URL ?? "").includes("_prod") && !allow_prod) {
    throw new Error("Cannot seed production database");
  }

  if (delete_data) {
    await prisma.tokens.deleteMany({});
    await prisma.passwordResetCode.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.event.deleteMany({});
  }

  await prisma.user.createMany({
    data: [
      ...Array(10)
        .fill(null)
        .map(() => fakeUser()),
      {
        ...fakeUser(),
        role: "ADMIN",
      },
    ],
  });

  await prisma.event.createMany({
    data: Array(20)
      .fill(null)
      .map(() => fakeEvent()),
  });

  await prisma.tag.createMany({
    data: [
      { name: "Rain or shine" },
      { name: "Family friendly" },
      { name: "Concert" },
      { name: "Indoors" },
      { name: "Outdoors" },
      { name: "RSVP Required" },
      { name: "Sports event" },
      { name: "Parking" },
      { name: "Free" },
      { name: "Paid" },
    ],
  });

  const tags = await prisma.tag.findMany({});
  const users = await prisma.user.findMany({});
  const events = await prisma.event.findMany({});

  const eventToTags = events.reduce((acc, event) => {
    const tagIds = faker.helpers
      .arrayElements(tags, faker.datatype.number(5))
      .map((tag) => tag.id);
    return [
      ...acc,
      ...tagIds.map((tagId) => ({
        eventId: event.id,
        tagId,
      })),
    ];
  }, [] as Prisma.EventToTagCreateManyInput[]);

  await prisma.eventToTag.createMany({
    data: eventToTags,
  });
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    console.log("Successfully updated database");
    await prisma.$disconnect();
    return;
  });
