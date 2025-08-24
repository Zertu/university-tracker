import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAPIResponse() {
  try {
    console.log('🧪 Testing API Response Structure...\n');

    // 1. Check if teacher exists
    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@test.com' },
    });

    if (!teacher) {
      console.log('❌ Teacher account not found');
      return;
    }

    console.log('✅ Teacher account found:', teacher.name);

    // 2. Test the exact query that the API uses
    const students = await prisma.teacherStudentLink.findMany({
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
                applicationType: true,
                deadline: true,
                university: {
                  select: {
                    name: true,
                    country: true,
                  },
                },
                requirements: {
                  select: {
                    id: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log(`\n📚 Found ${students.length} teacher-student relationships`);
    
    students.forEach((rel, index) => {
      console.log(`\n${index + 1}. Student: ${rel.student.name}`);
      console.log(`   Applications: ${rel.student.applications.length}`);
      
      rel.student.applications.forEach((app, appIndex) => {
        console.log(`   ${appIndex + 1}. Application ID: ${app.id}`);
        console.log(`      Status: ${app.status || 'undefined'}`);
        console.log(`      Type: ${app.applicationType || 'undefined'}`);
        console.log(`      University: ${app.university?.name || 'undefined'}`);
        console.log(`      Requirements: ${app.requirements?.length || 0}`);
        console.log(`      Deadline: ${app.deadline || 'undefined'}`);
      });
    });

    console.log('\n✅ API response structure test completed!');

  } catch (error) {
    console.error('❌ Error testing API response:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIResponse();
