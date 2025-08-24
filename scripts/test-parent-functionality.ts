import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testParentFunctionality() {
  console.log('🧪 Testing parent functionality...\n');

  try {
    // Test 1: Check parent account
    console.log('1️⃣ Checking parent account...');
    const parent = await prisma.user.findUnique({
      where: { email: 'parent@test.com' }
    });

    if (parent) {
      console.log('✅ Parent account found:', parent.email);
      console.log('   Role:', parent.role);
      console.log('   ID:', parent.id);
    } else {
      console.log('❌ Parent account not found');
      return;
    }

    // Test 2: Check student account
    console.log('\n2️⃣ Checking student account...');
    const student = await prisma.user.findUnique({
      where: { email: 'student@test.com' }
    });

    if (student) {
      console.log('✅ Student account found:', student.email);
      console.log('   Role:', student.role);
      console.log('   ID:', student.id);
    } else {
      console.log('❌ Student account not found');
      return;
    }

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
      console.log('   Type:', relationship.relationshipType);
      console.log('   Created:', relationship.createdAt);
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
      console.log('   Graduation Year:', studentProfile.graduationYear);
      console.log('   GPA:', studentProfile.gpa);
      console.log('   SAT Score:', studentProfile.satScore);
      console.log('   ACT Score:', studentProfile.actScore);
    } else {
      console.log('❌ Student profile not found');
    }

    // Test 5: Check if any applications exist
    console.log('\n5️⃣ Checking applications...');
    const applications = await prisma.application.findMany({
      where: { studentId: student.id },
      include: {
        university: {
          select: {
            name: true,
            country: true,
            tuitionInState: true,
            tuitionOutState: true,
            applicationFee: true,
          }
        }
      }
    });

    console.log(`✅ Found ${applications.length} applications`);
    applications.forEach((app, index) => {
      console.log(`   ${index + 1}. ${app.university.name} (${app.status})`);
    });

    // Test 6: Check parent notes
    console.log('\n6️⃣ Checking parent notes...');
    const notes = await prisma.parentNote.findMany({
      where: { parentId: parent.id },
      include: {
        application: {
          include: {
            university: {
              select: { name: true }
            }
          }
        }
      }
    });

    console.log(`✅ Found ${notes.length} parent notes`);
    notes.forEach((note, index) => {
      console.log(`   ${index + 1}. ${note.application.university.name}: ${note.content.substring(0, 50)}...`);
    });

    console.log('\n🎉 Parent functionality test completed!');
    console.log('\n🌐 Test the parent dashboard by:');
    console.log('   1. Visit http://localhost:3000');
    console.log('   2. Login with parent@test.com / parent123');
    console.log('   3. Navigate to Parent Dashboard');
    console.log('   4. Test all tabs: Overview, Applications, Financial, Notes');
    console.log('   5. Try viewing child profile');
    console.log('   6. Test adding notes to applications');

  } catch (error) {
    console.error('❌ Error during parent functionality test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testParentFunctionality().catch(console.error);
