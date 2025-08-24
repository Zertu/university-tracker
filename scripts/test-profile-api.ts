import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testProfileAPI() {
  console.log('🧪 Testing profile API...\n');

  try {
    // Test 1: Get student profile directly from database
    console.log('1️⃣ Getting student profile from database...');
    const student = await prisma.user.findUnique({
      where: { email: 'student@test.com' }
    });

    if (!student) {
      console.log('❌ Student not found');
      return;
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: student.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    });

    if (studentProfile) {
      console.log('✅ Student profile found in database');
      console.log('   User:', studentProfile.user.name);
      console.log('   Email:', studentProfile.user.email);
      console.log('   Role:', studentProfile.user.role);
      console.log('   Graduation Year:', studentProfile.graduationYear);
      console.log('   GPA:', studentProfile.gpa);
    } else {
      console.log('❌ Student profile not found in database');
    }

    // Test 2: Test API endpoint simulation
    console.log('\n2️⃣ Testing API endpoint simulation...');
    
    // Simulate the API logic
    const targetUserId = student.id;
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: targetUserId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    });

    if (profile) {
      console.log('✅ API simulation successful');
      console.log('   Profile ID:', profile.id);
      console.log('   User ID:', profile.userId);
      console.log('   User Name:', profile.user.name);
      
      // Parse JSON fields
      const targetCountries = profile.targetCountries ? JSON.parse(profile.targetCountries) : [];
      const intendedMajors = profile.intendedMajors ? JSON.parse(profile.intendedMajors) : [];
      
      console.log('   Target Countries:', targetCountries);
      console.log('   Intended Majors:', intendedMajors);
    } else {
      console.log('❌ API simulation failed - profile not found');
    }

    console.log('\n🎉 Profile API test completed!');
    console.log('\n💡 If the database shows the profile but the API fails,');
    console.log('   there might be an issue with the API route or authentication.');

  } catch (error) {
    console.error('❌ Error during profile API test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testProfileAPI().catch(console.error);
