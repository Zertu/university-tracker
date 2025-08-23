import { CreateApplicationSchema } from '@/lib/validations/application';

async function testApplicationValidation() {
  console.log('🧪 Testing application validation...');

  // Test valid data
  const validData = {
    universityId: '123e4567-e89b-12d3-a456-426614174000',
    applicationType: 'regular',
    deadline: '2025-01-15T23:59:59.000Z',
    notes: 'Test application'
  };

  try {
    const result = CreateApplicationSchema.parse(validData);
    console.log('✅ Valid data passed validation:', result);
  } catch (error) {
    console.error('❌ Valid data failed validation:', error);
  }

  // Test invalid data
  const invalidData = {
    universityId: '', // Empty string should fail
    applicationType: 'invalid_type', // Invalid enum value
    deadline: 'invalid-date', // Invalid date format
  };

  try {
    const result = CreateApplicationSchema.parse(invalidData);
    console.log('❌ Invalid data should have failed but passed:', result);
  } catch (error) {
    console.log('✅ Invalid data correctly failed validation:', error.errors);
  }

  // Test missing required fields
  const missingFields = {
    applicationType: 'regular',
    notes: 'Test application'
    // Missing universityId
  };

  try {
    const result = CreateApplicationSchema.parse(missingFields);
    console.log('❌ Missing fields should have failed but passed:', result);
  } catch (error) {
    console.log('✅ Missing fields correctly failed validation:', error.errors);
  }

  console.log('\n📋 Validation schema details:');
  console.log('Required fields:', Object.keys(CreateApplicationSchema.shape).filter(key => 
    !CreateApplicationSchema.shape[key].isOptional()
  ));
  console.log('Optional fields:', Object.keys(CreateApplicationSchema.shape).filter(key => 
    CreateApplicationSchema.shape[key].isOptional()
  ));
}

testApplicationValidation().catch(console.error);
