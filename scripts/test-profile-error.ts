import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testProfileError() {
  console.log('🧪 Testing profile error scenarios...\n');

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

    // Test 3: Check relationship
    console.log('\n3️⃣ Checking parent-student relationship...');
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
      console.log('   Parent ID:', relationship.parentId);
      console.log('   Child ID:', relationship.childId);
      console.log('   Type:', relationship.relationshipType);
    } else {
      console.log('❌ Relationship not found');
      return;
    }

    // Test 4: Check student profile
    console.log('\n4️⃣ Checking student profile...');
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: student.id }
    });

    if (studentProfile) {
      console.log('✅ Student profile found');
      console.log('   Profile ID:', studentProfile.id);
      console.log('   User ID:', studentProfile.userId);
    } else {
      console.log('❌ Student profile not found');
    }

    // Test 5: Simulate API calls
    console.log('\n5️⃣ Simulating API calls...');
    
    // Simulate parent accessing child profile with childId
    console.log('   Parent accessing child profile with childId:');
    console.log(`   GET /api/profile?childId=${student.id}`);
    console.log('   Expected: Success (200)');
    
    // Simulate parent accessing profile without childId
    console.log('   Parent accessing profile without childId:');
    console.log('   GET /api/profile');
    console.log('   Expected: Error (400) - "Parent must specify childId to view profile"');
    
    // Simulate student accessing own profile
    console.log('   Student accessing own profile:');
    console.log('   GET /api/profile');
    console.log('   Expected: Success (200)');

    console.log('\n🎉 Profile error test completed!');
    console.log('\n💡 The error suggests:');
    console.log('   1. Parent is trying to access /api/profile without childId');
    console.log('   2. This could happen if the URL parameter is not being passed correctly');
    console.log('   3. Or if the parent is accessing the profile page directly without going through the dashboard');

  } catch (error) {
    console.error('❌ Error during profile error test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProfileError().catch(console.error);
