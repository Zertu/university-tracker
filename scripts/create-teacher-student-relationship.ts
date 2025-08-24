import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTeacherStudentRelationship() {
  try {
    // Find teacher
    const teacher = await prisma.user.findUnique({
      where: { email: 'teacher@test.com' },
    });

    if (!teacher) {
      console.log('Teacher not found. Please create teacher account first.');
      return;
    }

    // Find existing students
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      take: 3, // Link to first 3 students
    });

    if (students.length === 0) {
      console.log('No students found. Please create student accounts first.');
      return;
    }

    console.log(`Found ${students.length} students to link with teacher`);

    // Create relationships
    for (const student of students) {
      const existingRelationship = await prisma.teacherStudentLink.findUnique({
        where: {
          teacherId_studentId: {
            teacherId: teacher.id,
            studentId: student.id,
          },
        },
      });

      if (existingRelationship) {
        console.log(`Relationship already exists for student: ${student.name}`);
        continue;
      }

      const relationship = await prisma.teacherStudentLink.create({
        data: {
          teacherId: teacher.id,
          studentId: student.id,
          relationshipType: 'advisor',
        },
      });

      console.log(`Created relationship: ${teacher.name} -> ${student.name}`);
    }

    console.log('\nTeacher-student relationships created successfully!');

  } catch (error) {
    console.error('Error creating teacher-student relationships:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTeacherStudentRelationship();
