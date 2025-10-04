# Lineup Management API Documentation

## Overview

The Lineup Management API provides comprehensive functionality for managing team
lineups, player substitutions, and field position assignments in the TW Softball
application. This API follows RESTful conventions and implements the CQRS
pattern for optimal performance and scalability.

## Table of Contents

- [Authentication](#authentication)
- [Base URLs](#base-urls)
- [Request/Response Format](#requestresponse-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Lineup Management](#lineup-management)
- [Player Substitutions](#player-substitutions)
- [Position Management](#position-management)
- [Validation Rules](#validation-rules)
- [Webhooks](#webhooks)
- [SDK Usage](#sdk-usage)
- [Examples](#examples)

## Authentication

All API requests require authentication using JWT Bearer tokens.

```http
Authorization: Bearer <your-jwt-token>
```

### Authentication Flow

1. Obtain access token from `/api/auth/login`
2. Include token in all subsequent requests
3. Refresh token when needed using `/api/auth/refresh`

## Base URLs

- **Production**: `https://api.twsoftball.com/v1`
- **Staging**: `https://staging-api.twsoftball.com/v1`
- **Development**: `http://localhost:3000/api/v1`

## Request/Response Format

### Content Type

All requests and responses use `application/json` unless otherwise specified.

### Request Headers

```http
Content-Type: application/json
Authorization: Bearer <token>
X-Request-ID: <unique-request-id>
```

### Response Structure

```json
{
  "success": true,
  "data": {},
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789",
    "version": "1.0.0"
  }
}
```

### Error Response Structure

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Player is not eligible for substitution",
    "details": {
      "field": "playerId",
      "reason": "Player has already been substituted this inning"
    }
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456789"
  }
}
```

## Error Handling

### HTTP Status Codes

| Code | Description           |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 409  | Conflict              |
| 422  | Unprocessable Entity  |
| 429  | Rate Limited          |
| 500  | Internal Server Error |

### Error Codes

| Code                   | Description                         |
| ---------------------- | ----------------------------------- |
| `VALIDATION_ERROR`     | Request validation failed           |
| `PLAYER_NOT_FOUND`     | Player does not exist               |
| `PLAYER_NOT_ELIGIBLE`  | Player cannot be substituted        |
| `POSITION_OCCUPIED`    | Field position is already assigned  |
| `LINEUP_LOCKED`        | Lineup cannot be modified           |
| `GAME_NOT_FOUND`       | Game does not exist                 |
| `INSUFFICIENT_PLAYERS` | Not enough players for valid lineup |

## Rate Limiting

- **Rate Limit**: 1000 requests per hour per user
- **Burst Limit**: 50 requests per minute
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Lineup Management

### Get Current Lineup

Retrieve the current active lineup for a game.

```http
GET /api/v1/games/{gameId}/lineup
```

#### Parameters

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| `gameId`  | string | Yes      | Unique game identifier                |
| `teamId`  | string | No       | Specific team (defaults to home team) |
| `inning`  | number | No       | Specific inning (defaults to current) |

#### Response

```json
{
  "success": true,
  "data": {
    "gameId": "game_123",
    "teamId": "team_home",
    "inning": 5,
    "lineup": [
      {
        "battingSlot": 1,
        "playerId": "player_001",
        "playerName": "John Smith",
        "jerseyNumber": 12,
        "fieldPosition": "PITCHER",
        "isActive": true,
        "substitutionHistory": []
      }
    ],
    "bench": [
      {
        "playerId": "player_010",
        "playerName": "Mike Johnson",
        "jerseyNumber": 25,
        "isStarter": false,
        "eligibleForReentry": false,
        "lastSubstitutionInning": null
      }
    ],
    "metadata": {
      "totalPlayers": 15,
      "activePlayers": 10,
      "benchPlayers": 5,
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  }
}
```

### Update Lineup

Update the team lineup configuration.

```http
PUT /api/v1/games/{gameId}/lineup
```

#### Request Body

```json
{
  "lineup": [
    {
      "battingSlot": 1,
      "playerId": "player_001",
      "fieldPosition": "PITCHER"
    }
  ],
  "validateOnly": false
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "lineupId": "lineup_456",
    "validationResults": {
      "isValid": true,
      "warnings": [],
      "errors": []
    },
    "appliedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Validate Lineup

Validate a lineup configuration without applying changes.

```http
POST /api/v1/games/{gameId}/lineup/validate
```

#### Request Body

```json
{
  "lineup": [
    {
      "battingSlot": 1,
      "playerId": "player_001",
      "fieldPosition": "PITCHER"
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "isValid": true,
    "warnings": [
      {
        "code": "PLAYER_OUT_OF_POSITION",
        "message": "Player is playing outside their primary position",
        "field": "fieldPosition",
        "severity": "warning"
      }
    ],
    "errors": [],
    "suggestions": [
      {
        "type": "OPTIMIZATION",
        "message": "Consider moving Player X to their primary position for better performance"
      }
    ]
  }
}
```

## Player Substitutions

### Create Substitution

Execute a player substitution during the game.

```http
POST /api/v1/games/{gameId}/substitutions
```

#### Request Body

```json
{
  "outgoingPlayerId": "player_001",
  "incomingPlayerId": "player_010",
  "battingSlot": 3,
  "fieldPosition": "THIRD_BASE",
  "inning": 5,
  "isReentry": false,
  "reason": "INJURY"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "substitutionId": "sub_789",
    "gameId": "game_123",
    "inning": 5,
    "timestamp": "2024-01-15T10:30:00Z",
    "outgoingPlayer": {
      "playerId": "player_001",
      "playerName": "John Smith",
      "battingSlot": 3,
      "fieldPosition": "THIRD_BASE"
    },
    "incomingPlayer": {
      "playerId": "player_010",
      "playerName": "Mike Johnson",
      "battingSlot": 3,
      "fieldPosition": "THIRD_BASE"
    },
    "eligibilityChecks": {
      "passed": true,
      "checks": [
        {
          "rule": "REENTRY_LIMIT",
          "status": "PASSED",
          "message": "Player has not exceeded re-entry limits"
        }
      ]
    }
  }
}
```

### Get Substitution History

Retrieve the complete substitution history for a game.

```http
GET /api/v1/games/{gameId}/substitutions
```

#### Parameters

| Parameter  | Type   | Required | Description                    |
| ---------- | ------ | -------- | ------------------------------ |
| `gameId`   | string | Yes      | Unique game identifier         |
| `inning`   | number | No       | Filter by specific inning      |
| `playerId` | string | No       | Filter by specific player      |
| `limit`    | number | No       | Maximum results (default: 50)  |
| `offset`   | number | No       | Pagination offset (default: 0) |

#### Response

```json
{
  "success": true,
  "data": {
    "substitutions": [
      {
        "substitutionId": "sub_789",
        "inning": 5,
        "timestamp": "2024-01-15T10:30:00Z",
        "type": "REGULAR",
        "outgoingPlayer": {
          "playerId": "player_001",
          "playerName": "John Smith"
        },
        "incomingPlayer": {
          "playerId": "player_010",
          "playerName": "Mike Johnson"
        },
        "reason": "INJURY"
      }
    ],
    "pagination": {
      "total": 3,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

### Check Substitution Eligibility

Validate if a player substitution is allowed.

```http
POST /api/v1/games/{gameId}/substitutions/check-eligibility
```

#### Request Body

```json
{
  "outgoingPlayerId": "player_001",
  "incomingPlayerId": "player_010",
  "inning": 5,
  "isReentry": false
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "eligible": true,
    "checks": [
      {
        "rule": "REENTRY_LIMIT",
        "status": "PASSED",
        "message": "Player has not exceeded re-entry limits"
      },
      {
        "rule": "INNING_PARTICIPATION",
        "status": "PASSED",
        "message": "Player has not participated in this inning"
      }
    ],
    "warnings": [],
    "recommendations": [
      {
        "type": "STRATEGIC",
        "message": "Consider saving this substitution for later innings"
      }
    ]
  }
}
```

## Position Management

### Get Field Positions

Retrieve current field position assignments.

```http
GET /api/v1/games/{gameId}/positions
```

#### Response

```json
{
  "success": true,
  "data": {
    "positions": {
      "PITCHER": {
        "playerId": "player_001",
        "playerName": "John Smith",
        "battingSlot": 1
      },
      "CATCHER": {
        "playerId": "player_002",
        "playerName": "Jane Doe",
        "battingSlot": 2
      }
    },
    "formation": "STANDARD",
    "coverage": {
      "infield": "COMPLETE",
      "outfield": "COMPLETE",
      "battery": "COMPLETE"
    }
  }
}
```

### Update Field Position

Change a player's field position.

```http
PUT /api/v1/games/{gameId}/positions/{position}
```

#### Request Body

```json
{
  "playerId": "player_003",
  "validatePositionConflicts": true
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "position": "FIRST_BASE",
    "previousPlayerId": "player_005",
    "newPlayerId": "player_003",
    "timestamp": "2024-01-15T10:30:00Z",
    "conflicts": [],
    "adjustments": [
      {
        "playerId": "player_005",
        "newPosition": "BENCH",
        "reason": "POSITION_REASSIGNMENT"
      }
    ]
  }
}
```

## Validation Rules

### Lineup Validation Rules

1. **Batting Order**: Must be consecutive numbers starting from 1
2. **Position Coverage**: All required positions must be filled
3. **Player Eligibility**: Players must be eligible to play
4. **Duplicate Prevention**: No player can occupy multiple positions
5. **Minimum Players**: At least 9 players required for valid lineup

### Substitution Validation Rules

1. **Re-entry Limits**: Starters can re-enter once, substitutes cannot
2. **Inning Restrictions**: Players cannot be substituted in same inning they
   entered
3. **Position Eligibility**: Players must be eligible for assigned position
4. **Bench Availability**: Substitute player must be available on bench
5. **Game State**: Substitutions only allowed during valid game states

### Field Position Rules

1. **Required Positions**: Pitcher, Catcher, 1B, 2B, 3B, SS, LF, CF, RF
2. **Optional Positions**: Short Fielder (SF), Extra Player (EP)
3. **Position Conflicts**: One player per position at any time
4. **Formation Rules**: Must maintain valid defensive formation

## Webhooks

Subscribe to real-time lineup and substitution events.

### Webhook Events

| Event                  | Description                       |
| ---------------------- | --------------------------------- |
| `lineup.updated`       | Lineup configuration changed      |
| `substitution.created` | Player substitution executed      |
| `position.changed`     | Field position assignment changed |
| `player.benched`       | Player moved to bench             |
| `eligibility.changed`  | Player eligibility status changed |

### Webhook Payload Example

```json
{
  "event": "substitution.created",
  "data": {
    "substitutionId": "sub_789",
    "gameId": "game_123",
    "timestamp": "2024-01-15T10:30:00Z",
    "outgoingPlayer": {
      "playerId": "player_001",
      "playerName": "John Smith"
    },
    "incomingPlayer": {
      "playerId": "player_010",
      "playerName": "Mike Johnson"
    }
  },
  "metadata": {
    "eventId": "evt_456",
    "version": "1.0.0",
    "source": "lineup-management-service"
  }
}
```

## SDK Usage

### JavaScript/TypeScript SDK

```typescript
import { LineupManagementAPI } from '@twsoftball/api-client';

const client = new LineupManagementAPI({
  baseURL: 'https://api.twsoftball.com/v1',
  apiKey: 'your-api-key',
});

// Get current lineup
const lineup = await client.lineup.getCurrent('game_123');

// Execute substitution
const substitution = await client.substitutions.create({
  gameId: 'game_123',
  outgoingPlayerId: 'player_001',
  incomingPlayerId: 'player_010',
  battingSlot: 3,
  fieldPosition: 'THIRD_BASE',
  inning: 5,
});

// Check eligibility
const eligibility = await client.substitutions.checkEligibility({
  gameId: 'game_123',
  outgoingPlayerId: 'player_001',
  incomingPlayerId: 'player_010',
  inning: 5,
});
```

### React Hook Integration

```typescript
import { useLineupManagement } from '@twsoftball/react-hooks';

function LineupManager({ gameId }: { gameId: string }) {
  const {
    lineup,
    substitutions,
    loading,
    error,
    executeSubstitution,
    updateLineup
  } = useLineupManagement(gameId);

  const handleSubstitution = async (data: SubstitutionData) => {
    try {
      await executeSubstitution(data);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div>
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} />}
      {lineup && <LineupDisplay lineup={lineup} onSubstitute={handleSubstitution} />}
    </div>
  );
}
```

## Examples

### Complete Lineup Management Workflow

```typescript
// 1. Get current game lineup
const currentLineup = await client.lineup.getCurrent('game_123');

// 2. Validate proposed substitution
const eligibility = await client.substitutions.checkEligibility({
  gameId: 'game_123',
  outgoingPlayerId: 'player_001',
  incomingPlayerId: 'player_010',
  inning: 5,
});

if (eligibility.eligible) {
  // 3. Execute substitution
  const substitution = await client.substitutions.create({
    gameId: 'game_123',
    outgoingPlayerId: 'player_001',
    incomingPlayerId: 'player_010',
    battingSlot: 3,
    fieldPosition: 'THIRD_BASE',
    inning: 5,
  });

  // 4. Update local lineup state
  const updatedLineup = await client.lineup.getCurrent('game_123');

  console.log('Substitution completed:', substitution);
} else {
  console.log('Substitution not allowed:', eligibility.checks);
}
```

### Batch Lineup Operations

```typescript
// Update multiple positions simultaneously
const batchUpdate = await client.lineup.batchUpdate('game_123', {
  operations: [
    {
      type: 'SUBSTITUTE',
      outgoingPlayerId: 'player_001',
      incomingPlayerId: 'player_010',
      battingSlot: 1,
    },
    {
      type: 'POSITION_CHANGE',
      playerId: 'player_002',
      newPosition: 'FIRST_BASE',
    },
  ],
  validateAll: true,
});
```

### Error Handling Best Practices

```typescript
try {
  const substitution = await client.substitutions.create(substitutionData);
  return { success: true, data: substitution };
} catch (error) {
  if (error.code === 'PLAYER_NOT_ELIGIBLE') {
    // Handle eligibility error
    return {
      success: false,
      error: 'Player cannot be substituted at this time',
      suggestions: error.details.suggestions,
    };
  } else if (error.code === 'VALIDATION_ERROR') {
    // Handle validation error
    return {
      success: false,
      error: 'Invalid substitution data',
      details: error.details,
    };
  } else {
    // Handle unexpected error
    throw error;
  }
}
```

## Rate Limiting and Best Practices

### Optimization Tips

1. **Batch Operations**: Use batch APIs for multiple changes
2. **Caching**: Cache lineup data and update incrementally
3. **Validation**: Always validate before executing changes
4. **Error Handling**: Implement comprehensive error handling
5. **Monitoring**: Track API usage and performance metrics

### Performance Considerations

- Use pagination for large datasets
- Implement client-side caching for frequently accessed data
- Subscribe to webhooks for real-time updates
- Optimize network requests with proper HTTP caching headers
- Use compression for large payloads

---

## Support

For API support and questions:

- **Documentation**: [https://docs.twsoftball.com](https://docs.twsoftball.com)
- **Support Email**: api-support@twsoftball.com
- **Status Page**:
  [https://status.twsoftball.com](https://status.twsoftball.com)
- **GitHub Issues**:
  [https://github.com/twsoftball/api-issues](https://github.com/twsoftball/api-issues)

---

_Last Updated: January 15, 2024_ _API Version: 1.0.0_
