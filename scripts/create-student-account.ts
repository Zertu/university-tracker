import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createStudentAccount() {
  console.log('🎓 Creating student test account...');

  try {
    // Check if student account already exists
    const existingStudent = await prisma.user.findUnique({
      where: { email: 'student@test.com' }
    });

    if (existingStudent) {
      console.log('✅ Student account already exists:');
      console.log(`   Email: ${existingStudent.email}`);
      console.log(`   Name: ${existingStudent.name}`);
      console.log(`   Role: ${existingStudent.role}`);
      console.log(`   ID: ${existingStudent.id}`);
      return;
    }

    // Create student account
    const hashedPassword = await bcrypt.hash('student123', 12);
    
    const student = await prisma.user.create({
      data: {
        email: 'student@test.com',
        passwordHash: hashedPassword,
        name: 'Test Student',
        role: 'student',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    });

    // Create student profile
    const studentProfile = await prisma.studentProfile.create({
      data: {
        userId: student.id,
        graduationYear: 2025,
        gpa: 3.8,
        satScore: 1400,
        actScore: 30,
        targetCountries: JSON.stringify(['USA', 'Canada']),
        intendedMajors: JSON.stringify(['Computer Science', 'Engineering']),
      }
    });

    console.log('✅ Student account created successfully:');
    console.log(`   Email: ${student.email}`);
    console.log(`   Name: ${student.name}`);
    console.log(`   Role: ${student.role}`);
    console.log(`   ID: ${student.id}`);
    console.log(`   Created: ${student.createdAt}`);

    console.log('\n📚 Student profile created:');
    console.log(`   Graduation Year: ${studentProfile.graduationYear}`);
    console.log(`   GPA: ${studentProfile.gpa}`);
    console.log(`   SAT Score: ${studentProfile.satScore}`);
    console.log(`   ACT Score: ${studentProfile.actScore}`);

    console.log('\n🔑 Login credentials:');
    console.log('   Email: student@test.com');
    console.log('   Password: student123');

    console.log('\n🌐 Test the student account by:');
    console.log('   1. Visit http://localhost:3000/auth/signin');
    console.log('   2. Use the credentials above');
    console.log('   3. Verify student dashboard access');
    console.log('   4. Test application management features');

  } catch (error) {
    console.error('❌ Error creating student account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createStudentAccount().catch(console.error);
