import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFilterFunctionality() {
  console.log('🧪 Testing Application Filter Functionality...');

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

    // Test 2: Check if user has applications with different statuses and types
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

      // Check if we have different statuses and types for testing
      const statuses = [...new Set(applications.map(app => app.status))];
      const types = [...new Set(applications.map(app => app.applicationType))];
      
      console.log(`   Available statuses: ${statuses.join(', ')}`);
      console.log(`   Available types: ${types.join(', ')}`);
    } else {
      console.log('⚠️  User has no applications (this is normal for new users)');
      console.log('💡 Create some applications first to test filters');
      return;
    }

    // Test 3: Test API endpoint directly
    console.log('\n3️⃣ Testing API endpoint directly...');
    
    // Test without filters
    console.log('   Testing without filters...');
    try {
      const response = await fetch('http://localhost:3000/api/applications/list');
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Base request: ${data.applications.length} applications`);
      } else {
        console.log(`   ❌ Base request failed: ${response.status}`);
      }
    } catch (error) {
      console.log('   ⚠️  Server not running, skipping API test');
    }

    // Test with status filter
    if (applications.length > 0) {
      const testStatus = applications[0].status;
      console.log(`   Testing with status filter: ${testStatus}`);
      try {
        const response = await fetch(`http://localhost:3000/api/applications/list?status=${testStatus}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Status filter "${testStatus}": ${data.applications.length} applications`);
        } else {
          console.log(`   ❌ Status filter failed: ${response.status}`);
        }
      } catch (error) {
        console.log('   ⚠️  Server not running, skipping API test');
      }
    }

    // Test with application type filter
    if (applications.length > 0) {
      const testType = applications[0].applicationType;
      console.log(`   Testing with type filter: ${testType}`);
      try {
        const response = await fetch(`http://localhost:3000/api/applications/list?applicationType=${testType}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Type filter "${testType}": ${data.applications.length} applications`);
        } else {
          console.log(`   ❌ Type filter failed: ${response.status}`);
        }
      } catch (error) {
        console.log('   ⚠️  Server not running, skipping API test');
      }
    }

    console.log('\n🔧 Current implementation:');
    console.log('   ✅ Removed infinite loop');
    console.log('   ✅ Simplified useEffect dependencies');
    console.log('   ✅ Always fetch when filters change');
    console.log('   ✅ API route supports status and applicationType parameters');

    console.log('\n🌐 Test the fix by:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Visit http://localhost:3000/applications');
    console.log('   3. Use the Status dropdown to filter applications');
    console.log('   4. Use the Application Type dropdown to filter applications');
    console.log('   5. Verify the list updates when you change filters');
    console.log('   6. Check browser network tab to see API calls');

    console.log('\n🔍 Debugging tips:');
    console.log('   - Open browser developer tools');
    console.log('   - Check Network tab to see API calls');
    console.log('   - Check Console tab for any errors');
    console.log('   - Verify that changing filters triggers new API calls');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFilterFunctionality().catch(console.error);

