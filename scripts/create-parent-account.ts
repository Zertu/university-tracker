import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createParentAccount() {
  console.log('👨‍👩‍👧‍👦 Creating parent test account...');

  try {
    // Check if parent account already exists
    const existingParent = await prisma.user.findUnique({
      where: { email: 'parent@test.com' }
    });

    if (existingParent) {
      console.log('✅ Parent account already exists:');
      console.log(`   Email: ${existingParent.email}`);
      console.log(`   Name: ${existingParent.name}`);
      console.log(`   Role: ${existingParent.role}`);
      console.log(`   ID: ${existingParent.id}`);
      return;
    }

    // Create parent account
    const hashedPassword = await bcrypt.hash('parent123', 12);
    
    const parent = await prisma.user.create({
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

    console.log('✅ Parent account created successfully:');
    console.log(`   Email: ${parent.email}`);
    console.log(`   Name: ${parent.name}`);
    console.log(`   Role: ${parent.role}`);
    console.log(`   ID: ${parent.id}`);
    console.log(`   Created: ${parent.createdAt}`);

    console.log('\n🔑 Login credentials:');
    console.log('   Email: parent@test.com');
    console.log('   Password: parent123');

    console.log('\n🌐 Test the parent account by:');
    console.log('   1. Visit http://localhost:3000/auth/signin');
    console.log('   2. Use the credentials above');
    console.log('   3. Verify parent dashboard access');
    console.log('   4. Test connecting with student accounts');

  } catch (error) {
    console.error('❌ Error creating parent account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createParentAccount().catch(console.error);
