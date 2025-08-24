import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testProfileFix() {
  console.log('🧪 Testing profile fix...\n');

  try {
    // Test 1: Check accounts
    console.log('1️⃣ Checking test accounts...');
    const parent = await prisma.user.findUnique({
      where: { email: 'parent@test.com' }
    });
    const student = await prisma.user.findUnique({
      where: { email: 'student@test.com' }
    });

    if (!parent || !student) {
      console.log('❌ Test accounts not found');
      return;
    }
    console.log('✅ Test accounts found');

    // Test 2: Check relationship
    console.log('\n2️⃣ Checking relationship...');
    const relationship = await prisma.parentChildLink.findUnique({
      where: {
        parentId_childId: {
          parentId: parent.id,
          childId: student.id
        }
      }
    });

    if (!relationship) {
      console.log('❌ Relationship not found');
      return;
    }
    console.log('✅ Relationship found');

    // Test 3: Check student profile
    console.log('\n3️⃣ Checking student profile...');
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: student.id }
    });

    if (!studentProfile) {
      console.log('❌ Student profile not found');
      return;
    }
    console.log('✅ Student profile found');

    console.log('\n🎉 Profile fix test completed!');
    console.log('\n🌐 Test the fix by:');
    console.log('   1. Visit http://localhost:3000');
    console.log('   2. Login with parent@test.com / parent123');
    console.log('   3. Try to access /profile directly - should redirect to /parent-dashboard');
    console.log('   4. Go to Parent Dashboard and click "View Profile" - should work correctly');
    console.log('   5. Login with student@test.com / student123');
    console.log('   6. Access /profile - should work correctly');

    console.log('\n💡 Expected behavior:');
    console.log('   - Parents accessing /profile directly → redirect to /parent-dashboard');
    console.log('   - Parents viewing child profile via dashboard → works correctly');
    console.log('   - Students accessing own profile → works correctly');
    console.log('   - No more "Parent must specify childId" errors');

  } catch (error) {
    console.error('❌ Error during profile fix test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProfileFix().catch(console.error);
