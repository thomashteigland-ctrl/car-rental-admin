import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MARKET_MODELS = [
  {
    variant: "2.813.2825.2000267",
    name: "Toyota Proace",
    params: {
      registration_class: "2",
      sales_form: "1",
      transmission: "2",
      variant: "2.813.2825.2000267",
    },
  },
  {
    variant: "1.8101.8368",
    name: "BYD Tang",
    params: {
      registration_class: "1",
      sales_form: "1",
      transmission: "2",
      variant: "1.8101.8368",
    },
  },
];

async function main() {
  for (const m of MARKET_MODELS) {
    await prisma.marketModel.upsert({
      where: { variant: m.variant },
      update: { name: m.name, params: m.params },
      create: m,
    });
  }

  await prisma.scrapeJob.upsert({
    where: { id: "current" },
    update: {},
    create: { id: "current", status: "idle", message: "" },
  });

  const categories = [
    { kind: "revenue", name: "Base rental", accountCode: "3000" },
    { kind: "revenue", name: "Extra km", accountCode: "3000" },
    { kind: "revenue", name: "Extra days", accountCode: "3000" },
    { kind: "revenue", name: "Extras", accountCode: "3000" },
    { kind: "revenue", name: "Cleaning fee", accountCode: "3000" },
    { kind: "revenue", name: "Damage charge", accountCode: "3000" },
    { kind: "revenue", name: "Fuel charge", accountCode: "3000" },
    { kind: "cost", name: "Platform fee", accountCode: "7300" },
    { kind: "cost", name: "Payment fee", accountCode: "7770" },
    { kind: "cost", name: "Wash", accountCode: "7010" },
    { kind: "cost", name: "Fuel", accountCode: "7000" },
    { kind: "cost", name: "Tolls", accountCode: "7040" },
    { kind: "cost", name: "Damage repair", accountCode: "7020" },
    { kind: "cost", name: "Other", accountCode: "7790" },
  ];

  for (const c of categories) {
    await prisma.lineItemCategory.upsert({
      where: { kind_name: { kind: c.kind, name: c.name } },
      update: { accountCode: c.accountCode },
      create: c,
    });
  }

  await prisma.appSetting.upsert({
    where: { key: "default_vat_percent" },
    update: {},
    create: { key: "default_vat_percent", value: "25" },
  });
  await prisma.appSetting.upsert({
    where: { key: "currency" },
    update: {},
    create: { key: "currency", value: "NOK" },
  });

  console.log("Seeded market models, scrape job, categories, settings");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
