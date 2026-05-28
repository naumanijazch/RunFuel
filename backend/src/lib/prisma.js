require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL

  const adapter = new PrismaPg({ connectionString: databaseUrl })
  return new PrismaClient({ adapter })
}

const prisma = createPrismaClient()

module.exports = prisma
