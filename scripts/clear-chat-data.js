import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearChatData() {
  try {
    await prisma.message.deleteMany()
    await prisma.chatRoom.deleteMany()
    console.log('Successfully cleared chat data')
  } catch (error) {
    console.error('Error clearing chat data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearChatData()
