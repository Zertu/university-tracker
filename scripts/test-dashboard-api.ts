import fetch from 'node-fetch';

async function testDashboardAPI() {
  try {
    console.log('🧪 Testing Teacher Dashboard API...\n');

    // 注意：这个测试需要先登录获取session
    // 这里我们只是测试API的基本结构
    const response = await fetch('http://localhost:3000/api/teacher/dashboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('API Response:', JSON.stringify(data, null, 2));
      
      if (data.students) {
        console.log(`\n📚 Found ${data.students.length} teacher-student relationships`);
        data.students.forEach((item: any, index: number) => {
          console.log(`\n${index + 1}. Student: ${item.student?.name || 'Unknown'}`);
          console.log(`   Applications: ${item.student?.applications?.length || 0}`);
        });
      }
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing dashboard API:', error);
  }
}

testDashboardAPI();
