import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUniversities() {
  console.log('🔍 Checking universities in database...');

  try {
    // Count universities
    const totalUniversities = await prisma.university.count();
    console.log(`📊 Total universities: ${totalUniversities}`);

    // Get sample universities
    const universities = await prisma.university.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        country: true,
        acceptanceRate: true,
        majorsOffered: true,
      },
    });

    console.log('\n🎓 Sample universities:');
    universities.forEach((uni, index) => {
      console.log(`  ${index + 1}. ${uni.name}`);
      console.log(`     Country: ${uni.country}`);
      console.log(`     Acceptance Rate: ${uni.acceptanceRate}%`);
      console.log(`     Majors: ${uni.majorsOffered ? 'Available' : 'Not set'}`);
    });

    // Check universities with Computer Science
    const csUniversities = await prisma.university.findMany({
      where: {
        majorsOffered: {
          contains: 'Computer Science',
        },
      },
      take: 3,
      select: {
        name: true,
        country: true,
        acceptanceRate: true,
      },
    });

    console.log('\n💻 Universities with Computer Science:');
    csUniversities.forEach((uni, index) => {
      console.log(`  ${index + 1}. ${uni.name} (${uni.country}) - ${uni.acceptanceRate}% acceptance`);
    });

  } catch (error) {
    console.error('❌ Error checking universities:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUniversities()
  .catch((e) => {
    console.error('❌ Error during university check:', e);
    process.exit(1);
  });
