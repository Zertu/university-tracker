import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEnvironment() {
  console.log('🔍 Checking environment configuration...');
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ NOT SET');
  console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ SET' : '❌ NOT SET');
  console.log('DATABASE_URL:', process.env.DATABASE_URL || '❌ NOT SET');
  
  // Check database connection
  console.log('\n🗄️  Database Connection:');
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if test user exists
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    if (testUser) {
      console.log('✅ Test user exists in database');
      console.log('   Email:', testUser.email);
      console.log('   Name:', testUser.name);
      console.log('   Role:', testUser.role);
    } else {
      console.log('❌ Test user not found in database');
    }
    
    // Count total users
    const userCount = await prisma.user.count();
    console.log('📊 Total users in database:', userCount);
    
  } catch (error) {
    console.log('❌ Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEnvironment()
  .catch((e) => {
    console.error('❌ Error checking environment:', e);
    process.exit(1);
  });
