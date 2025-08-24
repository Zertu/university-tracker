import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTeacherAccount() {
  try {
    const teacherData = {
      name: 'Test Teacher',
      email: 'teacher@test.com',
      passwordHash: await bcrypt.hash('password123', 10),
      role: 'teacher',
    };

    const existingTeacher = await prisma.user.findUnique({
      where: { email: teacherData.email },
    });

    if (existingTeacher) {
      console.log('Teacher account already exists');
      return;
    }

    const teacher = await prisma.user.create({
      data: teacherData,
    });

    console.log('Teacher account created successfully:');
    console.log('ID:', teacher.id);
    console.log('Email:', teacher.email);
    console.log('Name:', teacher.name);
    console.log('Role:', teacher.role);
    console.log('\nLogin credentials:');
    console.log('Email: teacher@test.com');
    console.log('Password: password123');

  } catch (error) {
    console.error('Error creating teacher account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTeacherAccount();
