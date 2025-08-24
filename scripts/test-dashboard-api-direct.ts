import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDashboardAPIDirect() {
  try {
    console.log('🧪 Testing Teacher Dashboard API Direct...\n');

    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@test.com' },
    });

    if (!teacher) {
      console.log('❌ Teacher account not found');
      return;
    }

    console.log('✅ Teacher account found:', teacher.name);

    // 模拟API查询
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
    console.log('API Response Structure:');
    console.log(JSON.stringify(students, null, 2));

    // 模拟前端处理
    const studentData = students.map((item: any) => item.student);
    console.log('\nProcessed Students:');
    console.log(JSON.stringify(studentData, null, 2));

    console.log('\n✅ Dashboard API direct test completed!');

  } catch (error) {
    console.error('❌ Error testing dashboard API direct:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboardAPIDirect();
