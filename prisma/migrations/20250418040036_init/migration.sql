-- CreateTable
CREATE TABLE "Odd" (
    "id" SERIAL NOT NULL,
    "runner" TEXT NOT NULL,
    "bookkeeper" TEXT NOT NULL,
    "fixedP" DOUBLE PRECISION NOT NULL,
    "fixedW" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Odd_pkey" PRIMARY KEY ("id")
);
