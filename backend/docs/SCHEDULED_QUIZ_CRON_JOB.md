# Scheduled Quiz Cron Job System

## Overview

This document describes the automated cron job system that handles scheduled quiz assignments in the Telvy Quiz App. The system automatically assigns scheduled quizzes to students when their scheduled time arrives.

## Architecture

### Components

1. **ScheduledQuizService** (`services/scheduledQuizService.js`)
   - Handles the business logic for scheduled quiz assignments
   - Manages database operations for quiz scheduling
   - Provides statistics and monitoring capabilities

2. **CronService** (`services/cronService.js`)
   - Manages cron job scheduling and execution
   - Provides job status monitoring
   - Handles graceful shutdown of cron jobs

3. **Health Routes** (`routes/healthRoutes.js`)
   - Provides API endpoints for monitoring and managing cron jobs
   - Allows manual triggering of scheduled quiz assignments
   - Provides statistics and status information

## How It Works

### 1. Quiz Scheduling
- Teachers/Admins create quizzes with `quiz_type = 'scheduled'`
- They set a `scheduled_at` timestamp for when the quiz should be assigned
- The quiz is stored in the database but not yet assigned to students

### 2. Automated Assignment
- The cron job runs every 5 minutes (configurable)
- It queries for scheduled quizzes where `scheduled_at <= current_time`
- For each due quiz, it automatically assigns it to all active students
- Assignments are created with a due date (scheduled time + 1 hour buffer)

### 3. Assignment Logic
- **Target Students**: All active, verified students
- **Due Date**: Scheduled time + 1 hour buffer
- **Status**: 'assigned' (students can then start the quiz)
- **Conflict Handling**: Uses `ON CONFLICT DO NOTHING` to prevent duplicate assignments

## Configuration

### Cron Schedule
The default schedule is every 5 minutes: `*/5 * * * *`

You can modify this in `services/cronService.js`:
```javascript
// Every minute: '* * * * *'
// Every 10 minutes: '*/10 * * * *'
// Every hour: '0 * * * *'
const cronExpression = '*/5 * * * *';
```

### Timezone
All cron jobs run in UTC timezone. Make sure your scheduled times are set accordingly.

## API Endpoints

### Health Check
```
GET /api/health/
```
Basic health check endpoint.

### Cron Status
```
GET /api/health/cron/status
```
Returns the status of all cron jobs (Admin/Teacher only).

**Response:**
```json
{
  "status": "success",
  "data": {
    "isRunning": true,
    "jobs": [
      {
        "name": "scheduled-quiz-assignment",
        "running": true,
        "scheduled": true
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Manual Trigger
```
POST /api/health/cron/trigger-quiz-assignment
```
Manually triggers the scheduled quiz assignment job (Admin/Teacher only).

**Response:**
```json
{
  "status": "success",
  "message": "Quiz assignment job triggered successfully",
  "data": {
    "processed": 2,
    "totalAssigned": 45,
    "results": [
      {
        "quizId": 1,
        "quizTitle": "Math Quiz",
        "assignedCount": 25,
        "skipped": [],
        "totalStudents": 25
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Scheduled Quiz Statistics
```
GET /api/health/cron/scheduled-quiz-stats
```
Returns statistics about scheduled quizzes (Admin/Teacher only).

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalScheduled": 10,
    "dueForAssignment": 2,
    "futureScheduled": 8,
    "scheduledWithoutTime": 0
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Database Schema

### Quizzes Table
```sql
CREATE TABLE quizzes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  total_time INTEGER,
  quiz_type TEXT NOT NULL CHECK (quiz_type IN ('anytime','scheduled')),
  scheduled_at TIMESTAMP NULL,  -- When the quiz should be assigned
  number_of_questions INTEGER DEFAULT 0,
  image_url TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  tags TEXT[],
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Assignments Table
```sql
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  due_at TIMESTAMP,  -- When the assignment is due
  status TEXT DEFAULT 'assigned',
  CONSTRAINT unique_assignment UNIQUE (quiz_id, student_id, status)
);
```

## Testing

### Test Script
Run the test script to validate the cron job functionality:
```bash
npm run test-scheduled-quiz
```

This script will:
1. Test scheduled quiz statistics
2. Check for due quizzes
3. Test cron service status
4. Manually trigger assignment (if due quizzes exist)
5. Create a test scheduled quiz

### Manual Testing
1. Create a scheduled quiz with a time 1-2 minutes in the future
2. Wait for the cron job to run (every 5 minutes)
3. Check the assignments table for new assignments
4. Use the API endpoints to monitor the process

## Monitoring and Logging

### Log Messages
The system provides detailed logging:
- `[CRON]` - Cron service messages
- `[SCHEDULED_QUIZ]` - Scheduled quiz service messages

### Key Log Messages
- `[CRON] Starting cron service...`
- `[CRON] Running scheduled quiz assignment job...`
- `[SCHEDULED_QUIZ] Found X scheduled quizzes due for assignment`
- `[SCHEDULED_QUIZ] Auto-assigned quiz X to Y students`

## Customization

### Student Selection Logic
Currently, all active students are assigned to scheduled quizzes. You can customize this in `scheduledQuizService.js`:

```javascript
async getStudentsForScheduledQuiz(quizId, createdBy) {
  // Customize based on:
  // - School/class filters
  // - Quiz tags/difficulty
  // - Student performance history
  // - Custom assignment rules
}
```

### Assignment Timing
The due date is currently set to scheduled time + 1 hour. You can modify this in `scheduledQuizService.js`:

```javascript
// Add some buffer time for the quiz (e.g., 1 hour after scheduled time)
dueAt.setHours(dueAt.getHours() + 1);
```

## Troubleshooting

### Common Issues

1. **Cron jobs not running**
   - Check server logs for cron service startup messages
   - Verify the cron service is started in `server.js`
   - Check cron job status via API endpoint

2. **Quizzes not being assigned**
   - Verify quiz has `quiz_type = 'scheduled'`
   - Check `scheduled_at` timestamp is in the past
   - Ensure there are active students in the database
   - Check for existing assignments (system won't create duplicates)

3. **Timezone issues**
   - All times are stored and processed in UTC
   - Ensure your scheduled times are set correctly
   - Check server timezone settings

### Debug Mode
Enable detailed logging by checking the console output. The system provides comprehensive logging for debugging.

## Security Considerations

- All cron management endpoints require authentication
- Only Admin and Teacher roles can access cron endpoints
- Manual triggers are logged for audit purposes
- Database operations use parameterized queries to prevent SQL injection

## Performance Considerations

- Cron job runs every 5 minutes (configurable)
- Database queries are optimized with proper indexing
- Assignment creation uses batch operations
- Conflict handling prevents duplicate assignments efficiently

## Future Enhancements

Potential improvements:
1. **Selective Assignment**: Assign quizzes based on student criteria
2. **Notification System**: Send notifications when quizzes are assigned
3. **Retry Logic**: Handle failed assignments with retry mechanism
4. **Analytics**: Track assignment success rates and timing
5. **Webhook Support**: Notify external systems when assignments are created
6. **Bulk Operations**: Handle large numbers of students efficiently
