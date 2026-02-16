# Data Consistency Checker

A comprehensive full-stack application for monitoring and maintaining data consistency across MongoDB collections. This system provides automated consistency checks, data repair capabilities, detailed reporting, and a beautiful dashboard for monitoring.

## Features

- **Automated Consistency Checks**: Scans MongoDB collections for data inconsistencies
- **Smart Data Repair**: Automatically repairs common data issues (missing fields, wrong types, invalid values)
- **Detailed Reporting**: Comprehensive reports with fsck-style details of all operations
- **Real-time Dashboard**: Modern web interface for monitoring and manual checks
- **Scheduled Checks**: Shell scripts for automated off-peak consistency checks
- **Version-Controlled Rules**: Git-tracked validation rules that can be easily modified
- **Eventual Consistency Tracking**: Simulates replica consistency status

## Architecture

### Backend (Node.js + Express)
- **Express API**: RESTful endpoints for triggering checks and retrieving reports
- **Mongoose Models**: User, Report, and Status schemas
- **Validation Engine**: Modular validation rules with repair logic
- **Consistency Checker**: Core service for scanning and repairing data
- **Report Generator**: Service for creating and managing reports

### Frontend (HTML/CSS/JavaScript)
- **Modern Dashboard**: Clean, responsive interface
- **Real-time Updates**: Live status updates and progress indicators
- **Interactive Reports**: Detailed view of check results and repair actions
- **Statistics**: Historical data and trend analysis

### Database (MongoDB)
- **Users Collection**: Sample data with intentional inconsistencies
- **Reports Collection**: Historical consistency check reports
- **Status Collection**: Current consistency status tracking

## Project Structure

```
data-consistency-checker/
├── backend/
│   ├── models/
│   │   ├── User.js              # User schema
│   │   ├── Report.js            # Report schema
│   │   └── Status.js            # Status schema
│   ├── routes/
│   │   └── api.js               # Express API routes
│   ├── services/
│   │   ├── consistencyChecker.js # Core consistency checking logic
│   │   └── reportGenerator.js   # Report management service
│   ├── validationRules.js       # Validation and repair rules
│   ├── server.js                # Main Express server
│   ├── seed.js                  # Database seeding script
│   ├── package.json             # Dependencies
│   └── .env.example             # Environment variables template
├── frontend/
│   ├── index.html               # Main dashboard
│   ├── style.css                # Styling
│   └── script.js                # Frontend JavaScript
├── scripts/
│   ├── schedule_check.sh        # Bash scheduling script
│   └── schedule_check.ps1       # PowerShell scheduling script
├── .gitignore                   # Git ignore file
└── README.md                    # This file
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running on localhost:27017)
- Git

### Step 1: Clone and Setup
```bash
# Navigate to the project directory
cd data-consistency-checker

# Navigate to backend and install dependencies
cd backend
npm install
```

### Step 2: Environment Configuration
```bash
# Copy the environment template
cp .env.example .env

# Edit .env file with your configuration
# Default configuration should work for local MongoDB
```

### Step 3: Database Setup
```bash
# Make sure MongoDB is running
# Start MongoDB service (if not already running)
# On macOS: brew services start mongodb-community
# On Ubuntu: sudo systemctl start mongod
# On Windows: net start MongoDB

# Seed the database with sample data (includes inconsistencies)
npm run seed
```

### Step 4: Start the Application
```bash
# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

### Step 5: Access the Dashboard
Open your browser and navigate to:
- **Dashboard**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/health

## Usage

### Manual Consistency Check
1. Open the dashboard at http://localhost:3000
2. Click "Run Consistency Check" button
3. Watch the progress indicator
4. View the detailed report once complete

### Understanding the Dashboard
- **Status Section**: Shows current consistency status and last check times
- **Controls Section**: Buttons to run checks and refresh data
- **Latest Report**: Details of the most recent consistency check
- **Statistics**: Historical data and trends
- **Reports History**: All previous reports with filtering options

### Scheduled Checks

#### Linux/macOS (Cron)
```bash
# Make the script executable
chmod +x scripts/schedule_check.sh

# Add to crontab for daily 2 AM checks
crontab -e
# Add this line:
0 2 * * * /path/to/data-consistency-checker/scripts/schedule_check.sh
```

#### Windows (Task Scheduler)
```powershell
# Use the PowerShell script
# Create a scheduled task to run:
# C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -ExecutionPolicy Bypass -File "C:\path\to\data-consistency-checker\scripts\schedule_check.ps1"
```

## API Endpoints

### Main Endpoints
- `POST /api/check` - Trigger consistency check
- `GET /api/status` - Get current consistency status
- `GET /api/report/latest` - Get latest report
- `GET /api/reports` - Get all reports (with filtering)
- `GET /api/stats` - Get summary statistics
- `GET /api/health` - Health check

### Advanced Endpoints
- `POST /api/cleanup` - Clean up old reports
- `GET /api/reports?collection=users&limit=10` - Filtered reports

## Validation Rules

The validation rules are defined in `backend/validationRules.js` and are Git-tracked. Current rules include:

### User Collection Rules
- **Required Fields**: name, email
- **Type Validation**: name (string), email (string), age (number), role (string), isActive (boolean)
- **Allowed Values**: role must be one of ['user', 'admin', 'moderator']
- **Value Ranges**: age must be between 0-150
- **Default Values**: Applied for missing fields
- **Custom Validations**: Email format validation

### Repair Logic
- **Missing Fields**: Sets default values (email: missing@example.com, age: 0, role: user)
- **Type Conversion**: Converts string numbers to actual numbers
- **Invalid Values**: Sets to defaults or deletes if irreparable
- **Range Clamping**: Restricts values to valid ranges

## Git Tracking of Validation Rules

### View Rule History
```bash
# View the complete history of validation rule changes
git log -p backend/validationRules.js

# See just the commit messages
git log --oneline backend/validationRules.js
```

### Example Rule Evolution
1. **Initial Commit**: Basic validation with required fields and type checking
2. **Second Commit**: Added email format validation and age range limits

To simulate this history in your project:
```bash
git init
git add .
git commit -m "Initial implementation: basic validation rules"

# Then modify validationRules.js (e.g., add new rule)
git add backend/validationRules.js
git commit -m "Add email format validation and age range limits"
```

## Sample Data

The seed script creates 20 user documents with various inconsistencies:
- **Missing required fields** (name, email)
- **Wrong data types** (age as string)
- **Invalid values** (negative age, invalid roles)
- **Invalid email formats**
- **Out-of-range values**

This sample data demonstrates the repair capabilities of the system.

## Eventual Consistency

While this is a single-node setup, the system simulates eventual consistency tracking:
- **allReplicasConsistent** flag set to true after successful checks
- **lastConsistentTime** timestamp tracking
- **Status collection** for persistence

In a real distributed system, this would integrate with MongoDB replica set status.

## Monitoring and Logging

### Server Logs
- Console output shows detailed check progress
- Error logging for failed operations
- Performance metrics (duration, documents processed)

### Scheduled Check Logs
- Bash/PowerShell scripts log to `/var/log/consistency-checker.log` or `C:\Logs\consistency-checker.log`
- Includes timestamps, success/failure status, and error details

## Development

### Adding New Validation Rules
1. Edit `backend/validationRules.js`
2. Add rules to the appropriate collection object
3. Implement custom validation functions if needed
4. Update repair logic in the `repairDocument` function
5. Test with the seed data

### Extending to New Collections
1. Create Mongoose model in `backend/models/`
2. Add validation rules to `validationRules.js`
3. Update API endpoints to handle new collection
4. Modify frontend to support new collection type

### Custom Repair Logic
The repair logic in `repairDocument()` can be extended with:
- More sophisticated type conversions
- External API lookups for validation
- Conditional repair strategies
- Manual review workflows

## Troubleshooting

### Common Issues
1. **MongoDB Connection Failed**: Ensure MongoDB is running on localhost:27017
2. **Port Already in Use**: Change PORT in .env file or kill existing process
3. **Seed Script Fails**: Check MongoDB permissions and disk space
4. **Frontend Not Loading**: Ensure server is running and check browser console for errors

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm start

# Or for specific modules
DEBUG=consistency:* npm start
```

## Performance Considerations

- **Large Collections**: Consider pagination for collections with >100k documents
- **Memory Usage**: Monitor memory usage during large scans
- **Index Optimization**: Ensure proper indexes on queried fields
- **Concurrent Checks**: System prevents multiple simultaneous checks

## Security Notes

- **API Security**: In production, add authentication and rate limiting
- **Database Security**: Use MongoDB authentication and proper user permissions
- **Network Security**: Use HTTPS and consider VPN for database access
- **Input Validation**: All API inputs are validated, but consider additional sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - feel free to use this project for learning and development.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check the browser console for frontend errors
4. Review server logs for backend issues

---

**Happy Data Consistency Checking!** 🚀
