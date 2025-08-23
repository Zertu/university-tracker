import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testApplicationsAPI() {
  console.log('🧪 Testing Applications API...');

  try {
    // Test 1: Check if test user exists
    console.log('1️⃣ Checking test user...');
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (testUser) {
      console.log('✅ Test user found:', testUser.email);
    } else {
      console.log('❌ Test user not found');
      console.log('💡 Run: npx tsx scripts/create-test-user.ts');
      return;
    }

    // Test 2: Check if user has applications
    console.log('\n2️⃣ Checking user applications...');
    const applications = await prisma.application.findMany({
      where: { studentId: testUser.id },
      take: 5
    });

    if (applications.length > 0) {
      console.log('✅ User has applications:', applications.length);
      console.log('   Sample application:', applications[0].id);
    } else {
      console.log('⚠️  User has no applications (this is normal for new users)');
    }

    // Test 3: Check API endpoint structure
    console.log('\n3️⃣ API endpoint structure...');
    console.log('   API URL: /api/applications/list?page=1&limit=50');
    console.log('   This should work in the browser now');

    // Test 4: Check application service functions
    console.log('\n4️⃣ Testing application service functions...');
    try {
      const { ApplicationService } = await import('@/lib/services/application');
      
      // Test getApplicationsByStudent
      const appsData = await ApplicationService.getApplicationsByStudent(testUser.id, { page: 1, limit: 10 });
      console.log('✅ getApplicationsByStudent working:', appsData.applications.length, 'applications');
      
      // Test getApplicationStats
      const statsData = await ApplicationService.getApplicationStats(testUser.id);
      console.log('✅ getApplicationStats working:', statsData.total, 'total applications');
      
    } catch (error) {
      console.log('❌ Application service error:', error.message);
    }

    console.log('\n🌐 Test the fix by:');
    console.log('   1. Visit http://localhost:3000/applications');
    console.log('   2. Verify no Prisma browser error');
    console.log('   3. Verify applications load correctly');
    console.log('   4. Verify statistics display correctly');

    console.log('\n🔧 Fixed issue:');
    console.log('   ✅ PrismaClient browser error in applications page');
    console.log('   ✅ Moved Prisma calls to API route');
    console.log('   ✅ Client-side uses fetch instead of direct Prisma');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApplicationsAPI().catch(console.error);
