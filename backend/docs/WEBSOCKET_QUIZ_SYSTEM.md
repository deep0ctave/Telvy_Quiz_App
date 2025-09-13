# WebSocket Quiz System Documentation

## Overview

This document describes the real-time WebSocket system implemented for the Telvy Quiz App. The system provides server-controlled timer synchronization, real-time quiz state updates, and secure quiz management to prevent client-side manipulation.

## Architecture

### Backend Components

1. **QuizSocketService** (`services/quizSocketService.js`)
   - Manages WebSocket connections and authentication
   - Handles server-side timer synchronization
   - Processes quiz state updates in real-time
   - Manages quiz attempts and submissions

2. **Socket.IO Integration** (`server.js`)
   - HTTP server with Socket.IO WebSocket support
   - CORS configuration for frontend connections
   - Graceful shutdown handling

3. **Health Monitoring** (`routes/healthRoutes.js`)
   - WebSocket service status endpoints
   - Active attempts monitoring
   - Service statistics

### Frontend Components

1. **SocketService** (`services/socketService.js`)
   - WebSocket client connection management
   - Event handling and callback system
   - Authentication and error handling

2. **useSocket Hook** (`hooks/useSocket.jsx`)
   - React hook for WebSocket functionality
   - Timer synchronization
   - State management integration

3. **useQuizTimer Hook** (`hooks/useQuizTimer.jsx`)
   - Specialized hook for quiz timer functionality
   - Real-time timer updates
   - Progress tracking

## Key Features

### 🔒 **Security & Anti-Cheating**
- **Server-side Timer**: Timer runs on the server, preventing client manipulation
- **Real-time Validation**: All quiz actions validated server-side
- **Auto-submission**: Quizzes auto-submit when time expires
- **State Synchronization**: Quiz state synced in real-time

### ⏱️ **Timer Management**
- **Server-controlled**: Timer runs on server with 1-second precision
- **Real-time Updates**: Frontend receives timer updates every second
- **Auto-submission**: Automatic submission when time expires
- **Sync Recovery**: Timer can be re-synced if connection is lost

### 🔄 **State Synchronization**
- **Real-time Updates**: Quiz answers synced to server in real-time
- **Conflict Resolution**: Server handles concurrent updates
- **Recovery**: State can be recovered after connection issues
- **Persistence**: All state changes persisted to database

## WebSocket Events

### Client → Server Events

| Event | Description | Parameters |
|-------|-------------|------------|
| `authenticate` | Authenticate user with JWT token | `{ token: string }` |
| `start_quiz_attempt` | Start a new quiz attempt | `{ quiz_id: number }` |
| `update_quiz_state` | Update quiz state/answers | `{ attempt_id: number, state: object }` |
| `submit_quiz` | Submit completed quiz | `{ attempt_id: number }` |
| `request_timer_sync` | Request timer synchronization | `{ attempt_id: number }` |

### Server → Client Events

| Event | Description | Data |
|-------|-------------|------|
| `authenticated` | Authentication successful | `{ userId: number, role: string }` |
| `quiz_started` | Quiz attempt started | `{ attempt_id, quiz, questions, timer }` |
| `timer_update` | Timer update (every second) | `{ attempt_id, remaining_time, total_time, is_expired }` |
| `state_updated` | State update confirmation | `{ attempt_id, timestamp }` |
| `quiz_submitted` | Quiz submission successful | `{ attempt_id, score, results }` |
| `quiz_auto_submitted` | Auto-submission due to time expiry | `{ attempt_id, reason, result }` |
| `error` | General error | `{ message: string }` |
| `auth_error` | Authentication error | `{ message: string }` |
| `quiz_start_error` | Quiz start error | `{ message: string }` |
| `state_update_error` | State update error | `{ message: string }` |
| `submit_error` | Submission error | `{ message: string }` |
| `timer_error` | Timer error | `{ message: string }` |

## API Endpoints

### WebSocket Status
```
GET /api/health/websocket/status
```
Returns WebSocket service statistics (Admin/Teacher only).

**Response:**
```json
{
  "status": "success",
  "data": {
    "active_attempts": 5,
    "active_timers": 5,
    "connected_users": 12,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Active Attempts
```
GET /api/health/websocket/active-attempts/:userId
```
Returns active quiz attempts for a specific user (Admin/Teacher only).

**Response:**
```json
{
  "status": "success",
  "data": {
    "user_id": 123,
    "active_attempts": [
      {
        "attempt_id": 456,
        "quiz_id": 789,
        "timer": {
          "attempt_id": 456,
          "remaining_time": 1800,
          "total_time": 3600,
          "is_active": true
        },
        "last_sync": "2024-01-15T10:30:00.000Z"
      }
    ]
  }
}
```

## Frontend Usage

### Basic Setup

```jsx
import { useSocket, useQuizTimer } from '../hooks/useSocket';

function QuizComponent() {
  const { 
    isConnected, 
    isAuthenticated, 
    startQuizAttempt, 
    updateQuizState, 
    submitQuiz,
    error 
  } = useSocket();

  const { 
    timeRemaining, 
    formattedTime, 
    isExpired, 
    progressPercentage 
  } = useQuizTimer(attemptId);

  // Your quiz component logic here
}
```

### Starting a Quiz

```jsx
const handleStartQuiz = async (quizId) => {
  try {
    const result = await startQuizAttempt(quizId);
    setAttemptId(result.attempt_id);
    setQuestions(result.questions);
    setQuiz(result.quiz);
  } catch (error) {
    console.error('Failed to start quiz:', error);
  }
};
```

### Updating Quiz State

```jsx
const handleAnswerChange = (questionId, answer) => {
  const newState = {
    quiz_id: quizId,
    questions: questions.map(q => 
      q.id === questionId ? { ...q, answer } : q
    )
  };
  
  updateQuizState(attemptId, newState);
};
```

### Timer Display

```jsx
<div className="timer">
  <div className="time-remaining">
    {formattedTime}
  </div>
  <div className="progress-bar">
    <div 
      className="progress-fill" 
      style={{ width: `${progressPercentage}%` }}
    />
  </div>
  {isExpired && (
    <div className="time-expired">
      Time's up! Quiz will be submitted automatically.
    </div>
  )}
</div>
```

## Server-Side Timer Implementation

### Timer Management
- **Precision**: 1-second intervals
- **Storage**: In-memory with database persistence
- **Recovery**: Timers can be restored from database state
- **Cleanup**: Automatic cleanup on quiz completion

### Auto-Submission
```javascript
// Timer automatically submits quiz when time expires
if (remaining === 0 && timer.isActive) {
  this.autoSubmitQuiz(attemptId, userId);
  clearInterval(interval);
  this.attemptTimers.delete(attemptId);
}
```

## Security Considerations

### Authentication
- JWT token validation for all WebSocket connections
- User role verification for quiz operations
- Session management and cleanup

### Anti-Cheating Measures
- Server-side timer prevents client manipulation
- Real-time state validation
- Automatic submission on time expiry
- Connection monitoring and recovery

### Data Integrity
- All quiz state changes validated server-side
- Database transactions for critical operations
- Conflict resolution for concurrent updates

## Error Handling

### Connection Issues
- Automatic reconnection attempts
- State recovery after reconnection
- Graceful degradation when offline

### Quiz Errors
- Validation errors for invalid attempts
- Timeout handling for slow operations
- User-friendly error messages

### Server Errors
- Comprehensive logging for debugging
- Error recovery mechanisms
- Service monitoring and alerts

## Performance Considerations

### Memory Management
- Active attempts stored in memory for fast access
- Automatic cleanup of completed attempts
- Efficient timer management

### Database Optimization
- Batch state updates to reduce database load
- Indexed queries for fast lookups
- Connection pooling for scalability

### Network Optimization
- Efficient WebSocket message format
- Minimal data transfer for timer updates
- Compression for large state updates

## Testing

### Test Scripts
```bash
# Test WebSocket functionality
npm run test-websocket

# Test scheduled quiz system
npm run test-scheduled-quiz
```

### Manual Testing
1. Start the server with WebSocket support
2. Connect from frontend using the socket service
3. Test quiz attempts with timer synchronization
4. Verify auto-submission on time expiry
5. Test state synchronization and recovery

## Monitoring and Debugging

### Logging
- Comprehensive logging for all WebSocket events
- Timer synchronization logs
- Error tracking and debugging information

### Metrics
- Active connections count
- Quiz attempts in progress
- Timer accuracy and performance
- Error rates and types

### Health Checks
- WebSocket service status
- Active attempts monitoring
- Connection quality metrics

## Configuration

### Environment Variables
```env
# WebSocket configuration
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
JWT_SECRET=your-jwt-secret-key

# Timer configuration (in code)
TIMER_UPDATE_INTERVAL=1000  # 1 second
AUTO_SUBMIT_BUFFER=0        # No buffer for auto-submission
```

### Customization Options
- Timer update frequency
- Auto-submission behavior
- State sync frequency
- Connection timeout settings

## Future Enhancements

### Planned Features
1. **Multi-room Support**: Separate rooms for different quiz sessions
2. **Live Proctoring**: Real-time monitoring of quiz attempts
3. **Collaborative Quizzes**: Multi-user quiz sessions
4. **Advanced Analytics**: Real-time quiz performance tracking
5. **Mobile Optimization**: Enhanced mobile WebSocket support

### Scalability Improvements
1. **Redis Integration**: Distributed timer management
2. **Load Balancing**: Multiple server instances
3. **Message Queues**: Asynchronous processing
4. **CDN Integration**: Optimized content delivery

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check CORS configuration
   - Verify JWT token validity
   - Ensure server is running

2. **Timer Sync Issues**
   - Check server time synchronization
   - Verify WebSocket connection stability
   - Monitor server performance

3. **State Update Problems**
   - Check database connectivity
   - Verify user permissions
   - Monitor memory usage

### Debug Commands
```bash
# Check WebSocket status
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/health/websocket/status

# Test WebSocket connection
npm run test-websocket
```

This WebSocket system provides a robust, secure, and real-time quiz experience that prevents client-side manipulation while ensuring smooth user interactions.
