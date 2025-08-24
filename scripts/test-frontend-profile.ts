import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFrontendProfile() {
  console.log('🧪 Testing frontend profile logic...\n');

  try {
    // Test 1: Simulate frontend URL parsing
    console.log('1️⃣ Testing URL parameter parsing...');
    
    // Simulate different URL scenarios
    const testUrls = [
      '/profile',
      '/profile?childId=cmep0j1zk0001nnw4nwm8dud5',
      '/profile?childId=invalid-id'
    ];

    testUrls.forEach((url, index) => {
      console.log(`   Test ${index + 1}: ${url}`);
      
      // Simulate URLSearchParams
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const childId = urlParams.get('childId');
      
      console.log(`   childId: ${childId || 'null'}`);
      console.log(`   isParentView: ${!!childId}`);
      
      // Simulate API URL construction
      const apiUrl = childId ? `/api/profile?childId=${childId}` : '/api/profile';
      console.log(`   API URL: ${apiUrl}`);
      console.log('');
    });

    // Test 2: Simulate profile data structure
    console.log('2️⃣ Testing profile data structure...');
    
    const student = await prisma.user.findUnique({
      where: { email: 'student@test.com' }
    });

    if (student) {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: student.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          }
        }
      });

      if (studentProfile) {
        // Simulate the API response structure
        const responseProfile = {
          ...studentProfile,
          targetCountries: studentProfile.targetCountries ? JSON.parse(studentProfile.targetCountries) : [],
          intendedMajors: studentProfile.intendedMajors ? JSON.parse(studentProfile.intendedMajors) : [],
        };

        console.log('✅ Profile data structure:');
        console.log('   ID:', responseProfile.id);
        console.log('   User ID:', responseProfile.userId);
        console.log('   User Name:', responseProfile.user.name);
        console.log('   User Email:', responseProfile.user.email);
        console.log('   User Role:', responseProfile.user.role);
        console.log('   Graduation Year:', responseProfile.graduationYear);
        console.log('   GPA:', responseProfile.gpa);
        console.log('   SAT Score:', responseProfile.satScore);
        console.log('   ACT Score:', responseProfile.actScore);
        console.log('   Target Countries:', responseProfile.targetCountries);
        console.log('   Intended Majors:', responseProfile.intendedMajors);
        console.log('   Created At:', responseProfile.createdAt);
        console.log('   Updated At:', responseProfile.updatedAt);
      }
    }

    // Test 3: Simulate error handling
    console.log('\n3️⃣ Testing error handling scenarios...');
    
    const errorScenarios = [
      { status: 404, message: 'Profile not found' },
      { status: 403, message: 'Access denied' },
      { status: 401, message: 'Unauthorized' },
      { status: 500, message: 'Internal server error' }
    ];

    errorScenarios.forEach((scenario, index) => {
      console.log(`   Scenario ${index + 1}: ${scenario.status} - ${scenario.message}`);
      
      // Simulate frontend error handling
      if (scenario.status === 404) {
        console.log('   → Should show "No Academic Profile" message');
      } else {
        console.log('   → Should show error message with retry button');
      }
      console.log('');
    });

    console.log('🎉 Frontend profile test completed!');
    console.log('\n💡 The issue might be:');
    console.log('   1. Authentication/session problem');
    console.log('   2. API route not working correctly');
    console.log('   3. Frontend error handling logic');
    console.log('   4. Network/CORS issues');

  } catch (error) {
    console.error('❌ Error during frontend profile test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFrontendProfile().catch(console.error);
