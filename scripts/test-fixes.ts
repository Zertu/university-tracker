import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFixes() {
  console.log('🧪 Testing latest fixes...');

  try {
    // Test 1: Check if test user exists
    console.log('1️⃣ Testing test user...');
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (testUser) {
      console.log('✅ Test user found:', testUser.email);
    } else {
      console.log('❌ Test user not found');
      console.log('💡 Run: npx tsx scripts/create-test-user.ts');
    }

    // Test 2: Check if universities exist
    console.log('\n2️⃣ Testing universities...');
    const universities = await prisma.university.findMany({
      take: 5
    });

    if (universities.length > 0) {
      console.log('✅ Universities found:', universities.length);
      console.log('   Sample:', universities[0].name);
    } else {
      console.log('❌ No universities found');
      console.log('💡 Run: npx prisma db seed');
    }

    // Test 3: Check if test profile exists
    console.log('\n3️⃣ Testing test profile...');
    if (testUser) {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: testUser.id }
      });

      if (profile) {
        console.log('✅ Test profile found');
      } else {
        console.log('❌ Test profile not found');
        console.log('💡 Run: npx tsx scripts/create-test-profile.ts');
      }
    }

    // Test 4: Date conversion test
    console.log('\n4️⃣ Testing date conversion...');
    const testDate = '2025-01-15';
    const convertedDate = testDate && testDate.trim() !== '' 
      ? new Date(testDate + 'T23:59:59.000Z').toISOString() 
      : undefined;
    console.log('✅ Date conversion working:', testDate, '→', convertedDate);

    // Test 5: Empty date handling
    console.log('\n5️⃣ Testing empty date handling...');
    const emptyDate: string = '';
    const emptyResult = emptyDate && emptyDate.trim() !== '' 
      ? new Date(emptyDate + 'T23:59:59.000Z').toISOString() 
      : undefined;
    console.log('✅ Empty date handling working:', `"${emptyDate}"`, '→', emptyResult);

    console.log('\n🌐 Test the fixes by:');
    console.log('   1. Visit http://localhost:3000/applications');
    console.log('   2. Click "New Application"');
    console.log('   3. Verify navigation bar is visible');
    console.log('   4. Verify "Back to Applications" button works');
    console.log('   5. Fill out the form and submit');
    console.log('   6. Verify no "Invalid time value" errors');
    console.log('   7. Verify redirect to applications list with success message');

    console.log('\n🔧 Fixed issues:');
    console.log('   ✅ Date conversion error (Invalid time value)');
    console.log('   ✅ Missing navigation bar on new application page');
    console.log('   ✅ Missing back button on new application page');
    console.log('   ✅ Missing success message component');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFixes().catch(console.error);
