require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// Clean sample data - all valid documents
const sampleUsers = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    age: 30,
    role: 'user',
    isActive: true
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    age: 25,
    role: 'admin',
    isActive: true
  },
  {
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    age: 35,
    role: 'user',
    isActive: true
  },
  {
    name: 'Alice Wilson',
    email: 'alice.wilson@example.com',
    age: 28,
    role: 'user',
    isActive: true
  },
  {
    name: 'Charlie Brown',
    email: 'charlie.brown@example.com',
    age: 42,
    role: 'user',
    isActive: true
  },
  {
    name: 'Diana Prince',
    email: 'diana.prince@example.com',
    age: 32,
    role: 'moderator',
    isActive: true
  },
  {
    name: 'Eve Adams',
    email: 'eve.adams@example.com',
    age: 29,
    role: 'user',
    isActive: false
  },
  {
    name: 'Frank Miller',
    email: 'frank.miller@example.com',
    age: 45,
    role: 'admin',
    isActive: true
  },
  {
    name: 'Grace Lee',
    email: 'grace.lee@example.com',
    age: 27,
    role: 'user',
    isActive: true
  },
  {
    name: 'Henry Ford',
    email: 'henry.ford@example.com',
    age: 50,
    role: 'moderator',
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
    
    console.log(`Successfully inserted ${insertedUsers.length} users`);
    
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
