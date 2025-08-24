import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testParentProfileFix() {
  console.log('🧪 Testing parent profile functionality...\n');

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
    console.log('   Parent:', parent.name, `(${parent.email})`);
    console.log('   Student:', student.name, `(${student.email})`);

    // Test 2: Check relationship
    console.log('\n2️⃣ Checking parent-student relationship...');
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

    console.log('\n🎉 Parent profile functionality test completed!');
    console.log('\n🌐 Test the functionality by:');
    console.log('   1. Visit http://localhost:3000');
    console.log('   2. Login with parent@test.com / parent123');
    console.log('   3. Click "Edit Profile" button - should work');
    console.log('   4. Go to Parent Dashboard');
    console.log('   5. Click "View Profile" button - should work');
    console.log('   6. Login with student@test.com / student123');
    console.log('   7. Access /profile - should work');

    console.log('\n💡 Expected behavior:');
    console.log('   - Parents can edit their own profile (name, email)');
    console.log('   - Parents can view their children\'s academic profiles');
    console.log('   - Students can view and edit their own profiles');
    console.log('   - No more permission errors');

  } catch (error) {
    console.error('❌ Error during parent profile test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testParentProfileFix().catch(console.error);
