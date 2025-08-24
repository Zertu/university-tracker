import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testTeacherFunctionality() {
  try {
    console.log('🧪 Testing Teacher Functionality...\n');

    // 1. Check if teacher exists
    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@test.com' },
    });

    if (!teacher) {
      console.log('❌ Teacher account not found');
      return;
    }

    console.log('✅ Teacher account found:', teacher.name);

    // 2. Check teacher-student relationships
    const relationships = await prisma.teacherStudentLink.findMany({
      where: { teacherId: teacher.id },
      include: {
        student: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(`\n📚 Teacher-student relationships: ${relationships.length}`);
    relationships.forEach(rel => {
      console.log(`   - ${rel.student.name} (${rel.student.email}) - ${rel.relationshipType}`);
    });

    // 3. Check if students have applications
    const studentsWithApps = await prisma.user.findMany({
      where: {
        role: 'student',
        teacherLinks: {
          some: {
            teacherId: teacher.id,
          },
        },
      },
      include: {
        applications: {
          include: {
            university: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    console.log('\n📝 Students with applications:');
    studentsWithApps.forEach(student => {
      console.log(`   - ${student.name}: ${student.applications.length} applications`);
      student.applications.forEach(app => {
        console.log(`     * ${app.university.name} (${app.status})`);
      });
    });

    // 4. Check teacher notes
    const teacherNotes = await prisma.teacherNote.findMany({
      where: { teacherId: teacher.id },
      include: {
        application: {
          include: {
            university: {
              select: { name: true },
            },
            student: {
              select: { name: true },
            },
          },
        },
      },
    });

    console.log(`\n📝 Teacher notes: ${teacherNotes.length}`);
    teacherNotes.forEach(note => {
      console.log(`   - ${note.application.student.name} - ${note.application.university.name}`);
      console.log(`     "${note.note.substring(0, 50)}..."`);
    });

    // 5. Test dashboard statistics
    const totalStudents = relationships.length;
    const totalApplications = studentsWithApps.reduce((sum, student) => 
      sum + student.applications.length, 0
    );
    const submittedApplications = studentsWithApps.reduce((sum, student) => 
      sum + student.applications.filter(app => app.status === 'submitted').length, 0
    );

    console.log('\n📊 Dashboard Statistics:');
    console.log(`   - Total Students: ${totalStudents}`);
    console.log(`   - Total Applications: ${totalApplications}`);
    console.log(`   - Submitted Applications: ${submittedApplications}`);

    console.log('\n✅ Teacher functionality test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing teacher functionality:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTeacherFunctionality();
