require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

// Sample data with various inconsistencies
const sampleUsers = [
  // Valid documents
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
  
  // Documents with missing required fields
  {
    name: 'Bob Johnson',
    // Missing email
    age: 35,
    role: 'user',
    isActive: true
  },
  {
    // Missing name
    email: 'alice@example.com',
    age: 28,
    role: 'user',
    isActive: true
  },
  
  // Documents with wrong data types
  {
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    age: '42', // String instead of number
    role: 'user',
    isActive: true
  },
  {
    name: 'Diana Prince',
    email: 'diana@example.com',
    age: 'not-a-number', // Invalid string
    role: 'user',
    isActive: true
  },
  
  // Documents with invalid values
  {
    name: 'Eve Wilson',
    email: 'eve@example.com',
    age: 25,
    role: 'superuser', // Invalid role
    isActive: true
  },
  {
    name: 'Frank Miller',
    email: 'frank@example.com',
    age: -5, // Negative age
    role: 'user',
    isActive: true
  },
  {
    name: 'Grace Lee',
    email: 'grace@example.com',
    age: 200, // Age too high
    role: 'user',
    isActive: true
  },
  
  // Documents with invalid email format
  {
    name: 'Henry Ford',
    email: 'invalid-email', // Invalid email format
    age: 45,
    role: 'user',
    isActive: true
  },
  {
    name: 'Iris West',
    email: 'iris@', // Incomplete email
    age: 32,
    role: 'user',
    isActive: true
  },
  
  // Documents with null/undefined values
  {
    name: 'Jack Ryan',
    email: null, // Null email
    age: 40,
    role: 'user',
    isActive: true
  },
  {
    name: 'Kate Kane',
    email: '', // Empty email
    age: 29,
    role: 'user',
    isActive: true
  },
  
  // Documents with missing optional fields
  {
    name: 'Luke Cage',
    email: 'luke@example.com',
    // Missing age
    role: 'user',
    isActive: true
  },
  {
    name: 'Maria Hill',
    email: 'maria@example.com',
    age: 33,
    // Missing role
    isActive: true
  },
  
  // More edge cases
  {
    name: 'Nick Fury',
    email: 'nick@example.com',
    age: '50', // String number
    role: 'admin',
    isActive: false
  },
  {
    name: 'Oliver Queen',
    email: 'oliver@example.com',
    age: 35,
    role: 'moderator',
    isActive: true
  },
  {
    name: 'Pepper Potts',
    email: 'pepper@example.com',
    age: 30,
    role: 'user',
    isActive: true
  },
  {
    name: 'Quentin Beck',
    email: 'quentin@example.com',
    age: 'abc', // Non-numeric string
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
    const insertedUsers = await User.insertMany(sampleUsers);
    
    console.log(`Successfully inserted ${insertedUsers.length} users`);
    
    // Display summary of inconsistencies
    console.log('\n=== Sample Data Summary ===');
    console.log('Total users inserted:', insertedUsers.length);
    
    const inconsistencies = {
      missingEmail: 0,
      missingName: 0,
      stringAge: 0,
      invalidRole: 0,
      invalidEmail: 0,
      outOfRangeAge: 0
    };
    
    sampleUsers.forEach(user => {
      if (!user.email || user.email === '' || user.email === null) inconsistencies.missingEmail++;
      if (!user.name || user.name === '' || user.name === null) inconsistencies.missingName++;
      if (typeof user.age === 'string') inconsistencies.stringAge++;
      if (user.role && !['user', 'admin', 'moderator'].includes(user.role)) inconsistencies.invalidRole++;
      if (user.email && !user.email.includes('@')) inconsistencies.invalidEmail++;
      if (typeof user.age === 'number' && (user.age < 0 || user.age > 150)) inconsistencies.outOfRangeAge++;
    });
    
    console.log('Inconsistencies created for testing:');
    console.log('- Missing email:', inconsistencies.missingEmail);
    console.log('- Missing name:', inconsistencies.missingName);
    console.log('- String age:', inconsistencies.stringAge);
    console.log('- Invalid role:', inconsistencies.invalidRole);
    console.log('- Invalid email:', inconsistencies.invalidEmail);
    console.log('- Out of range age:', inconsistencies.outOfRangeAge);
    
    console.log('\nSeed completed successfully!');
    console.log('You can now run the consistency check to see repairs in action.');
    
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
