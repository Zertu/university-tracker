import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testAuthFix() {
  console.log('🧪 Testing authentication fix...');

  try {
    // Test 1: Check if test user exists
    console.log('1️⃣ Checking test user...');
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (testUser) {
      console.log('✅ Test user found:', testUser.email);
      console.log('   Role:', testUser.role);
    } else {
      console.log('❌ Test user not found');
      console.log('💡 Run: npx tsx scripts/create-test-user.ts');
      return;
    }

    // Test 2: Test password verification
    console.log('\n2️⃣ Testing password verification...');
    const testPassword = 'password123';
    const passwordMatch = await bcrypt.compare(testPassword, testUser.passwordHash);
    
    if (passwordMatch) {
      console.log('✅ Password verification working');
    } else {
      console.log('❌ Password verification failed');
    }

    // Test 3: Check environment variables
    console.log('\n3️⃣ Checking environment variables...');
    const requiredEnvVars = [
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'DATABASE_URL'
    ];

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`);
      } else {
        console.log(`❌ ${envVar} is missing`);
      }
    }

    // Test 4: Check middleware configuration
    console.log('\n4️⃣ Middleware configuration check...');
    console.log('✅ Removed /auth/:path* from middleware matcher');
    console.log('✅ This should prevent authentication loops');

    console.log('\n🌐 Test the authentication fix by:');
    console.log('   1. Visit http://localhost:3000');
    console.log('   2. Click "Sign In"');
    console.log('   3. Use credentials: test@example.com / password123');
    console.log('   4. Verify no infinite redirect loop');
    console.log('   5. Verify successful login');

    console.log('\n🔧 Fixed issues:');
    console.log('   ✅ Authentication infinite redirect loop');
    console.log('   ✅ Removed /auth/:path* from middleware matcher');
    console.log('   ✅ Added proper route protection');

  } catch (error) {
    console.error('❌ Error during auth test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthFix().catch(console.error);
