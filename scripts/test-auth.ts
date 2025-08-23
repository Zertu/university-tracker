import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testAuthentication() {
  console.log('🧪 Testing authentication...');
  
  try {
    // Get test user from database
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    if (!user) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log('✅ Found test user:', user.email);
    
    // Test password verification
    const testPassword = 'password123';
    const isPasswordValid = await bcrypt.compare(testPassword, user.passwordHash);
    
    if (isPasswordValid) {
      console.log('✅ Password verification successful');
      console.log('📧 Email: test@example.com');
      console.log('🔑 Password: password123');
      console.log('👤 Role:', user.role);
      console.log('\n🎉 Authentication test passed! You can now log in with these credentials.');
    } else {
      console.log('❌ Password verification failed');
    }
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuthentication()
  .catch((e) => {
    console.error('❌ Error during authentication test:', e);
    process.exit(1);
  });
