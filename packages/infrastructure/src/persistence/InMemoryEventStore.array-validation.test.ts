import { GameId } from '@twsoftball/domain';
import { describe, it, expect } from 'vitest';

import { InMemoryEventStore } from './InMemoryEventStore';

describe('InMemoryEventStore Array Validation', () => {
  it('should throw when events parameter is not an array (line 188)', async () => {
    const eventStore = new InMemoryEventStore();
    const gameId = GameId.generate();

    await expect(eventStore.append(gameId, 'Game', 'not-array' as never)).rejects.toThrow(
      'events must be an array'
    );
  });

  it('should throw when aggregateTypes parameter is not an array in getEvents (line 251)', async () => {
    const eventStore = new InMemoryEventStore();
    const gameId = GameId.generate();

    await expect(eventStore.getEventsByGameId(gameId, 'not-array' as never)).rejects.toThrow(
      'aggregateTypes must be an array or undefined'
    );
  });
});
