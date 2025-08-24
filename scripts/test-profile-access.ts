import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testProfileAccess() {
  console.log('🧪 Testing profile access functionality...\n');

  try {
    // Test 1: Check parent account
    console.log('1️⃣ Checking parent account...');
    const parent = await prisma.user.findUnique({
      where: { email: 'parent@test.com' }
    });

    if (!parent) {
      console.log('❌ Parent account not found');
      return;
    }
    console.log('✅ Parent account found:', parent.email);

    // Test 2: Check student account
    console.log('\n2️⃣ Checking student account...');
    const student = await prisma.user.findUnique({
      where: { email: 'student@test.com' }
    });

    if (!student) {
      console.log('❌ Student account not found');
      return;
    }
    console.log('✅ Student account found:', student.email);

    // Test 3: Check student profile
    console.log('\n3️⃣ Checking student profile...');
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: student.id }
    });

    if (studentProfile) {
      console.log('✅ Student profile found');
      console.log('   Graduation Year:', studentProfile.graduationYear);
      console.log('   GPA:', studentProfile.gpa);
      console.log('   SAT Score:', studentProfile.satScore);
      console.log('   ACT Score:', studentProfile.actScore);
    } else {
      console.log('❌ Student profile not found - this is expected for new accounts');
    }

    // Test 4: Check relationship
    console.log('\n4️⃣ Checking parent-student relationship...');
    const relationship = await prisma.parentChildLink.findUnique({
      where: {
        parentId_childId: {
          parentId: parent.id,
          childId: student.id
        }
      }
    });

    if (relationship) {
      console.log('✅ Relationship found');
      console.log('   Type:', relationship.relationshipType);
    } else {
      console.log('❌ Relationship not found');
      return;
    }

    console.log('\n🎉 Profile access test completed!');
    console.log('\n🌐 Test the profile access by:');
    console.log('   1. Visit http://localhost:3000');
    console.log('   2. Login with parent@test.com / parent123');
    console.log('   3. Go to Parent Dashboard');
    console.log('   4. Click "View Profile" button');
    console.log('   5. Should show child profile or "No Academic Profile" message');
    console.log('   6. Login with student@test.com / student123');
    console.log('   7. Go to Profile page');
    console.log('   8. Should show student profile or "No Academic Profile" message');

  } catch (error) {
    console.error('❌ Error during profile access test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProfileAccess().catch(console.error);
