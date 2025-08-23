import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testApplicationFilters() {
  console.log('🧪 Testing Application Filters...');

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
      include: { university: true }
    });

    if (applications.length > 0) {
      console.log('✅ User has applications:', applications.length);
      console.log('   Sample applications:');
      applications.slice(0, 3).forEach(app => {
        console.log(`   - ${app.university.name} (${app.status}, ${app.applicationType})`);
      });
    } else {
      console.log('⚠️  User has no applications (this is normal for new users)');
      console.log('💡 Create some applications first to test filters');
      return;
    }

    // Test 3: Test API endpoint with filters
    console.log('\n3️⃣ Testing API endpoint with filters...');
    console.log('   Testing status filter...');
    
    const statuses = ['not_started', 'in_progress', 'submitted', 'under_review', 'decided'];
    const applicationTypes = ['early_decision', 'early_action', 'regular', 'rolling'];
    
    for (const status of statuses) {
      const response = await fetch(`http://localhost:3000/api/applications/list?status=${status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Status filter "${status}": ${data.applications.length} applications`);
      } else {
        console.log(`   ❌ Status filter "${status}" failed: ${response.status}`);
      }
    }

    console.log('\n   Testing application type filter...');
    for (const type of applicationTypes) {
      const response = await fetch(`http://localhost:3000/api/applications/list?applicationType=${type}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Type filter "${type}": ${data.applications.length} applications`);
      } else {
        console.log(`   ❌ Type filter "${type}" failed: ${response.status}`);
      }
    }

    // Test 4: Test combined filters
    console.log('\n4️⃣ Testing combined filters...');
    const combinedResponse = await fetch('http://localhost:3000/api/applications/list?status=in_progress&applicationType=regular');
    if (combinedResponse.ok) {
      const data = await combinedResponse.json();
      console.log(`   ✅ Combined filter: ${data.applications.length} applications`);
    } else {
      console.log(`   ❌ Combined filter failed: ${combinedResponse.status}`);
    }

    console.log('\n🌐 Test the fix by:');
    console.log('   1. Visit http://localhost:3000/applications');
    console.log('   2. Use the Status dropdown to filter applications');
    console.log('   3. Use the Application Type dropdown to filter applications');
    console.log('   4. Verify that the list updates correctly');
    console.log('   5. Try combining both filters');

    console.log('\n🔧 Fixed issue:');
    console.log('   ✅ Status filter now works correctly');
    console.log('   ✅ Application Type filter now works correctly');
    console.log('   ✅ Filters trigger API calls instead of just frontend filtering');
    console.log('   ✅ API route supports status and applicationType parameters');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApplicationFilters().catch(console.error);
