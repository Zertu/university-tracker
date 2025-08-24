import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testTeacherAPI() {
  try {
    console.log('🧪 Testing Teacher API...\n');

    // 1. Check if teacher exists
    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@test.com' },
    });

    if (!teacher) {
      console.log('❌ Teacher account not found');
      return;
    }

    console.log('✅ Teacher account found:', teacher.name);

    // 2. Test teacher-student relationships query
    const relationships = await prisma.teacherStudentLink.findMany({
      where: {
        teacherId: teacher.id,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            applications: {
              select: {
                id: true,
                status: true,
                university: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log(`\n📚 Teacher-student relationships: ${relationships.length}`);
    relationships.forEach(rel => {
      console.log(`   - ${rel.student.name} (${rel.student.email})`);
      console.log(`     Applications: ${rel.student.applications.length}`);
    });

    // 3. Test teacher notes query
    const notes = await prisma.teacherNote.findMany({
      where: {
        teacherId: teacher.id,
      },
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n📝 Teacher notes: ${notes.length}`);

    // 4. Test statistics calculation
    const totalStudents = relationships.length;
    const totalApplications = relationships.reduce((sum, rel) => 
      sum + rel.student.applications.length, 0
    );
    const submittedApplications = relationships.reduce((sum, rel) => 
      sum + rel.student.applications.filter(app => app.status === 'submitted').length, 0
    );

    console.log('\n📊 Statistics:');
    console.log(`   - Total Students: ${totalStudents}`);
    console.log(`   - Total Applications: ${totalApplications}`);
    console.log(`   - Submitted Applications: ${submittedApplications}`);

    console.log('\n✅ Teacher API test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing teacher API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTeacherAPI();
