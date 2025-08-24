import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createParentStudentRelationship() {
  console.log('🔗 Creating parent-student relationship...');

  try {
    // Find parent and student accounts
    const parent = await prisma.user.findUnique({
      where: { email: 'parent@test.com' }
    });

    const student = await prisma.user.findUnique({
      where: { email: 'student@test.com' }
    });

    if (!parent) {
      console.log('❌ Parent account not found. Run: npx tsx scripts/create-parent-account.ts');
      return;
    }

    if (!student) {
      console.log('❌ Student account not found. Run: npx tsx scripts/create-student-account.ts');
      return;
    }

    // Check if relationship already exists
    const existingRelationship = await prisma.parentChildLink.findUnique({
      where: {
        parentId_childId: {
          parentId: parent.id,
          childId: student.id
        }
      }
    });

    if (existingRelationship) {
      console.log('✅ Parent-student relationship already exists:');
      console.log(`   Parent: ${parent.name} (${parent.email})`);
      console.log(`   Student: ${student.name} (${student.email})`);
      console.log(`   Relationship Type: ${existingRelationship.relationshipType}`);
      console.log(`   Created: ${existingRelationship.createdAt}`);
      return;
    }

    // Create relationship
    const relationship = await prisma.parentChildLink.create({
      data: {
        parentId: parent.id,
        childId: student.id,
        relationshipType: 'parent',
      }
    });

    console.log('✅ Parent-student relationship created successfully:');
    console.log(`   Parent: ${parent.name} (${parent.email})`);
    console.log(`   Student: ${student.name} (${student.email})`);
    console.log(`   Relationship Type: ${relationship.relationshipType}`);
    console.log(`   Created: ${relationship.createdAt}`);

    console.log('\n🌐 Test the relationship by:');
    console.log('   1. Login as parent: parent@test.com / parent123');
    console.log('   2. Go to Relationships page');
    console.log('   3. Verify student appears in connected students list');
    console.log('   4. Login as student: student@test.com / student123');
    console.log('   5. Go to Relationships page');
    console.log('   6. Verify parent appears in connected parents list');

  } catch (error) {
    console.error('❌ Error creating parent-student relationship:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createParentStudentRelationship().catch(console.error);
