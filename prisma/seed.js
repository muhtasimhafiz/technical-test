const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seed() {
  // Clear existing data
  await prisma.odd.deleteMany();

  const odds = [];
  for (let runnerIdx = 1; runnerIdx <= 20; runnerIdx++) {
    for (let bookkeeperIdx = 1; bookkeeperIdx <= 200; bookkeeperIdx++) {
      odds.push({
        runner: `Runner ${runnerIdx}`,
        bookkeeper: `Bookkeeper ${bookkeeperIdx}`,
        fixedP: parseFloat((Math.random() * 10).toFixed(1)),
        fixedW: parseFloat((Math.random() * 5).toFixed(1)),
      });
    }
  }

  await prisma.odd.createMany({ data: odds });
  console.log("Database seeded with 4000 odds entries.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
