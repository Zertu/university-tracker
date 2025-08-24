import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRelationshipsAPI() {
  try {
    console.log('🧪 Testing Teacher Relationships API...\n');

    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@test.com' },
    });

    if (!teacher) {
      console.log('❌ Teacher account not found');
      return;
    }

    console.log('✅ Teacher account found:', teacher.name);

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
            studentProfile: {
              select: {
                graduationYear: true,
                gpa: true,
                satScore: true,
                actScore: true,
              },
            },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n📚 Found ${relationships.length} teacher-student relationships`);
    
    relationships.forEach((rel, index) => {
      console.log(`\n${index + 1}. Student: ${rel.student.name}`);
      console.log(`   Email: ${rel.student.email}`);
      console.log(`   Applications: ${rel.student.applications.length}`);
      
      if (rel.student.studentProfile) {
        console.log(`   Profile: Class of ${rel.student.studentProfile.graduationYear || 'N/A'}, GPA: ${rel.student.studentProfile.gpa || 'N/A'}`);
      }
      
      rel.student.applications.forEach((app, appIndex) => {
        console.log(`   ${appIndex + 1}. ${app.university.name} - ${app.status}`);
      });
    });

    console.log('\n✅ Teacher relationships API test completed!');

  } catch (error) {
    console.error('❌ Error testing relationships API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRelationshipsAPI();
