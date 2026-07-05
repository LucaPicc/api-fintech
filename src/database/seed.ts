import { Prisma } from "../generated/prisma/client";
import { prisma } from "./prisma";

const users = [
  {
    name: "Origin Test",
    email: "origin-test@example.com",
    balance: new Prisma.Decimal("100000.00"),
  },
  {
    name: "Destination Test",
    email: "destination-test@example.com",
    balance: new Prisma.Decimal("100000.00"),
  },
];

async function main() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
      },
      create: user,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
