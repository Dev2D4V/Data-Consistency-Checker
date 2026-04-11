require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// Clean sample data - all valid documents
// Sample data with both clean and inconsistent documents
const sampleUsers = [
  // VALID USERS
  { name: 'John Doe', email: 'john.doe@example.com', age: 30, role: 'user', isActive: true },
  { name: 'Jane Smith', email: 'jane.smith@example.com', age: 25, role: 'admin', isActive: true },
  
  // INCONSISTENT USERS (for testing)
  { 
    name: 'Missing Email User', 
    email: '', // Required field missing
    age: 20, 
    role: 'user', 
    isActive: true 
  },
  { 
    name: 'Negative Age User', 
    email: 'negative@example.com', 
    age: -5, // Out of range
    role: 'user', 
    isActive: true 
  },
  { 
    name: 'Invalid Role User', 
    email: 'role@example.com', 
    age: 40, 
    role: 'guest', // Invalid enum value
    isActive: true 
  },
  { 
    name: 'Wrong Type User', 
    email: 'type@example.com', 
    age: '25', // Should be number
    role: 'user', 
    isActive: true 
  },
  { 
    name: 'Bad Email User', 
    email: 'invalid-email-format', // Fails custom validation
    age: 33, 
    role: 'user', 
    isActive: true 
  },
  { 
    name: 'Too Old User', 
    email: 'old@example.com', 
    age: 200, // Out of range [0, 150]
    role: 'user', 
    isActive: true 
  }
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/consistencyChecker', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Clear existing users
    console.log('Clearing existing users...');
    await User.deleteMany({});
    
    // Insert sample users
    console.log('Inserting sample users...');
    const insertedUsers = await mongoose.connection.db.collection('users').insertMany(sampleUsers);
    
    console.log(`Successfully inserted ${insertedUsers.insertedCount} users`);
    
    // Display summary of inconsistencies
    console.log('\n=== Sample Data Summary ===');
    console.log('Total users inserted:', insertedUsers.insertedCount);
    console.log('All data is consistent and valid!');
    console.log('You can now run the consistency check to verify everything is working correctly.');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the seed function
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleUsers };
