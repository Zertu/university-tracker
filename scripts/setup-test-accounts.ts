import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setupTestAccounts() {
  console.log('🚀 Setting up test accounts for university tracker...\n');

  try {
    // Step 1: Create parent account
    console.log('👨‍👩‍👧‍👦 Step 1: Creating parent account...');
    let parent = await prisma.user.findUnique({
      where: { email: 'parent@test.com' }
    });

    if (!parent) {
      const hashedPassword = await bcrypt.hash('parent123', 12);
      parent = await prisma.user.create({
        data: {
          email: 'parent@test.com',
          passwordHash: hashedPassword,
          name: 'Test Parent',
          role: 'parent',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        }
      });
      console.log('✅ Parent account created');
    } else {
      console.log('✅ Parent account already exists');
    }

    // Step 2: Create student account
    console.log('\n🎓 Step 2: Creating student account...');
    let student = await prisma.user.findUnique({
      where: { email: 'student@test.com' }
    });

    if (!student) {
      const hashedPassword = await bcrypt.hash('student123', 12);
      student = await prisma.user.create({
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
      console.log('✅ Student account created');
    } else {
      console.log('✅ Student account already exists');
    }

    // Step 3: Create student profile
    console.log('\n📚 Step 3: Creating student profile...');
    let studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: student.id }
    });

    if (!studentProfile) {
      studentProfile = await prisma.studentProfile.create({
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
      console.log('✅ Student profile created');
    } else {
      console.log('✅ Student profile already exists');
    }

    // Step 4: Create parent-student relationship
    console.log('\n🔗 Step 4: Creating parent-student relationship...');
    let relationship = await prisma.parentChildLink.findUnique({
      where: {
        parentId_childId: {
          parentId: parent.id,
          childId: student.id
        }
      }
    });

    if (!relationship) {
      relationship = await prisma.parentChildLink.create({
        data: {
          parentId: parent.id,
          childId: student.id,
          relationshipType: 'parent',
        }
      });
      console.log('✅ Parent-student relationship created');
    } else {
      console.log('✅ Parent-student relationship already exists');
    }

    // Summary
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Test Account Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👨‍👩‍👧‍👦 Parent Account:');
    console.log(`   Email: parent@test.com`);
    console.log(`   Password: parent123`);
    console.log(`   Name: ${parent.name}`);
    console.log(`   Role: ${parent.role}`);
    console.log('');
    console.log('🎓 Student Account:');
    console.log(`   Email: student@test.com`);
    console.log(`   Password: student123`);
    console.log(`   Name: ${student.name}`);
    console.log(`   Role: ${student.role}`);
    console.log(`   Graduation Year: ${studentProfile.graduationYear}`);
    console.log(`   GPA: ${studentProfile.gpa}`);
    console.log(`   SAT Score: ${studentProfile.satScore}`);
    console.log(`   ACT Score: ${studentProfile.actScore}`);
    console.log('');
    console.log('🔗 Relationship:');
    console.log(`   Type: ${relationship.relationshipType}`);
    console.log(`   Created: ${relationship.createdAt.toLocaleDateString()}`);

    console.log('\n🌐 Testing Instructions:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Visit http://localhost:3000');
    console.log('3. Test parent account:');
    console.log('   - Login with parent@test.com / parent123');
    console.log('   - Check parent dashboard');
    console.log('   - Go to Relationships page');
    console.log('   - Verify connected student appears');
    console.log('');
    console.log('4. Test student account:');
    console.log('   - Login with student@test.com / student123');
    console.log('   - Check student dashboard');
    console.log('   - Go to Relationships page');
    console.log('   - Verify connected parent appears');
    console.log('');
    console.log('5. Test relationship features:');
    console.log('   - Parent can view student applications');
    console.log('   - Parent can add notes to applications');
    console.log('   - Student can see parent connections');

  } catch (error) {
    console.error('❌ Error during setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestAccounts().catch(console.error);
