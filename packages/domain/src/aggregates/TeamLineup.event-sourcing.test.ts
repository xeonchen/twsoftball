import { FieldPosition } from '../constants/FieldPosition.js';
import { DomainError } from '../errors/DomainError.js';
import { DomainEvent } from '../events/DomainEvent.js';
import { FieldPositionChanged } from '../events/FieldPositionChanged.js';
import { PlayerAddedToLineup } from '../events/PlayerAddedToLineup.js';
import { PlayerSubstitutedIntoGame } from '../events/PlayerSubstitutedIntoGame.js';
import { TeamLineupCreated } from '../events/TeamLineupCreated.js';
import { GameId } from '../value-objects/GameId.js';
import { JerseyNumber } from '../value-objects/JerseyNumber.js';
import { PlayerId } from '../value-objects/PlayerId.js';
import { TeamLineupId } from '../value-objects/TeamLineupId.js';

import { TeamLineup } from './TeamLineup.js';

describe('TeamLineup - Event Sourcing', () => {
  let lineupId: TeamLineupId;
  let gameId: GameId;
  let player1: PlayerId;
  let player2: PlayerId;
  let player3: PlayerId;
  let jersey1: JerseyNumber;
  let jersey2: JerseyNumber;
  let jersey3: JerseyNumber;

  beforeEach(() => {
    lineupId = TeamLineupId.generate();
    gameId = GameId.generate();
    player1 = PlayerId.generate();
    player2 = PlayerId.generate();
    player3 = PlayerId.generate();
    jersey1 = new JerseyNumber('1');
    jersey2 = new JerseyNumber('2');
    jersey3 = new JerseyNumber('3');
  });

  describe('TeamLineup.applyEvent() - Event Application Logic', () => {
    let baseEvents: DomainEvent[];

    beforeEach(() => {
      // Base events for most tests: creation only
      baseEvents = [new TeamLineupCreated(lineupId, gameId, 'Home Tigers')];
    });

    describe('TeamLineupCreated Event Application', () => {
      it('should initialize empty lineup with correct identity', () => {
        const event = new TeamLineupCreated(lineupId, gameId, 'Test Team');
        const lineup = TeamLineup.fromEvents([event]);

        expect(lineup.id).toEqual(lineupId);
        expect(lineup.gameId).toEqual(gameId);
        expect(lineup.teamName).toBe('Test Team');
        expect(lineup.getActiveLineup()).toEqual([]);
        expect(lineup.getFieldingPositions()).toEqual(new Map());
        expect(lineup.getUncommittedEvents()).toHaveLength(0);
        expect(lineup.getVersion()).toBe(1);
      });

      it('should maintain empty state after TeamLineupCreated event', () => {
        const event = new TeamLineupCreated(lineupId, gameId, 'Empty Team');
        const lineup = TeamLineup.fromEvents([event]);

        expect(lineup.isLineupValid()).toBe(false);
        expect(lineup.getPlayerInfo(player1)).toBeUndefined();
        expect(lineup.isPlayerEligibleForReentry(player1)).toBe(false);
      });
    });

    describe('PlayerAddedToLineup Event Application', () => {
      it('should apply PlayerAddedToLineup event (add player to batting slot and field position)', () => {
        const events = [
          ...baseEvents,
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Pitcher',
            1,
            FieldPosition.PITCHER
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // Verify batting slot assignment
        const activeLineup = lineup.getActiveLineup();
        expect(activeLineup).toHaveLength(1);
        expect(activeLineup[0]?.position).toBe(1);
        expect(activeLineup[0]?.getCurrentPlayer()).toEqual(player1);
        expect(activeLineup[0]?.wasPlayerStarter(player1)).toBe(true);

        // Verify field position assignment
        const fieldPositions = lineup.getFieldingPositions();
        expect(fieldPositions.get(FieldPosition.PITCHER)).toEqual(player1);
        expect(fieldPositions.size).toBe(1);

        // Verify player history
        const playerInfo = lineup.getPlayerInfo(player1);
        expect(playerInfo).toBeDefined();
        expect(playerInfo?.playerId).toEqual(player1);
        expect(playerInfo?.jerseyNumber).toEqual(jersey1);
        expect(playerInfo?.playerName).toBe('John Pitcher');
        expect(playerInfo?.currentPosition).toBe(FieldPosition.PITCHER);
        expect(playerInfo?.isStarter).toBe(true);
        expect(playerInfo?.hasUsedReentry).toBe(false);
      });

      it('should apply PlayerAddedToLineup event with EXTRA_PLAYER position', () => {
        const events = [
          ...baseEvents,
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'Extra Batter',
            10,
            FieldPosition.EXTRA_PLAYER
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // EXTRA_PLAYER should be in batting lineup but not field positions
        expect(lineup.getActiveLineup()).toHaveLength(1);
        expect(lineup.getActiveLineup()[0]?.position).toBe(10);
        expect(lineup.getFieldingPositions().size).toBe(0);
        expect(lineup.getPlayerInfo(player1)?.currentPosition).toBeUndefined();
      });

      it('should apply multiple PlayerAddedToLineup events maintaining order', () => {
        const events = [
          ...baseEvents,
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player3,
            jersey3,
            'Third Player',
            3,
            FieldPosition.FIRST_BASE
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'First Player',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Second Player',
            2,
            FieldPosition.CATCHER
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        const activeLineup = lineup.getActiveLineup();
        expect(activeLineup).toHaveLength(3);
        // Should be sorted by batting position
        expect(activeLineup[0]?.position).toBe(1);
        expect(activeLineup[0]?.getCurrentPlayer()).toEqual(player1);
        expect(activeLineup[1]?.position).toBe(2);
        expect(activeLineup[1]?.getCurrentPlayer()).toEqual(player2);
        expect(activeLineup[2]?.position).toBe(3);
        expect(activeLineup[2]?.getCurrentPlayer()).toEqual(player3);
      });

      it('should apply PlayerAddedToLineup event with jersey number tracking', () => {
        const events = [
          ...baseEvents,
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'Player One',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Player Two',
            2,
            FieldPosition.CATCHER
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // Jersey numbers should be properly tracked
        expect(lineup.getPlayerInfo(player1)?.jerseyNumber).toEqual(jersey1);
        expect(lineup.getPlayerInfo(player2)?.jerseyNumber).toEqual(jersey2);

        // All players should be marked as starters
        expect(lineup.getPlayerInfo(player1)?.isStarter).toBe(true);
        expect(lineup.getPlayerInfo(player2)?.isStarter).toBe(true);
      });
    });

    describe('PlayerSubstitutedIntoGame Event Application', () => {
      beforeEach(() => {
        // Add base players for substitution tests
        baseEvents = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'Starting Pitcher',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Starting Catcher',
            2,
            FieldPosition.CATCHER
          ),
        ];
      });

      it('should apply PlayerSubstitutedIntoGame event (substitute new player)', () => {
        const events = [
          ...baseEvents,
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            player3,
            FieldPosition.FIRST_BASE,
            5
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // Verify batting slot substitution
        const activeLineup = lineup.getActiveLineup();
        expect(activeLineup[0]?.getCurrentPlayer()).toEqual(player3);
        expect(activeLineup[0]?.position).toBe(1);

        // Verify field position change
        const fieldPositions = lineup.getFieldingPositions();
        expect(fieldPositions.get(FieldPosition.FIRST_BASE)).toEqual(player3);
        expect(fieldPositions.get(FieldPosition.PITCHER)).toBeUndefined();

        // Verify outgoing player status
        const outgoingInfo = lineup.getPlayerInfo(player1);
        expect(outgoingInfo?.currentPosition).toBeUndefined();
        expect(lineup.isPlayerEligibleForReentry(player1)).toBe(true);

        // Verify incoming player status (substitute, not starter)
        const incomingInfo = lineup.getPlayerInfo(player3);
        expect(incomingInfo?.isStarter).toBe(false);
        expect(incomingInfo?.currentPosition).toBe(FieldPosition.FIRST_BASE);
      });

      it('should apply PlayerSubstitutedIntoGame event with EXTRA_PLAYER position', () => {
        const events = [
          ...baseEvents,
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            player3,
            FieldPosition.EXTRA_PLAYER,
            5
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // EXTRA_PLAYER doesn't occupy field positions
        expect(lineup.getFieldingPositions().size).toBe(1); // Only player2 remains
        expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toBeUndefined();
        expect(lineup.getPlayerInfo(player3)?.currentPosition).toBeUndefined();
      });

      it('should apply PlayerSubstitutedIntoGame event for starter re-entry', () => {
        const sub1 = PlayerId.generate();
        const events = [
          ...baseEvents,
          // First substitution - starter out
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            sub1,
            FieldPosition.FIRST_BASE,
            3
          ),
          // Starter re-enters
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            sub1,
            player1,
            FieldPosition.PITCHER,
            7
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // Verify re-entry
        expect(lineup.getActiveLineup()[0]?.getCurrentPlayer()).toEqual(player1);
        expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toEqual(player1);

        // Verify re-entry tracking
        expect(lineup.isPlayerEligibleForReentry(player1)).toBe(false); // Used re-entry
        expect(lineup.getPlayerInfo(player1)?.hasUsedReentry).toBe(true);
      });

      it('should handle complex substitution chain with re-entry tracking', () => {
        const sub1 = PlayerId.generate();
        const sub2 = PlayerId.generate();
        const events = [
          ...baseEvents,
          // First substitution
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            sub1,
            FieldPosition.SHORTSTOP,
            3
          ),
          // Second substitution
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            sub1,
            sub2,
            FieldPosition.SECOND_BASE,
            5
          ),
          // Original starter re-enters
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            sub2,
            player1,
            FieldPosition.PITCHER,
            8
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // Final state verification
        expect(lineup.getActiveLineup()[0]?.getCurrentPlayer()).toEqual(player1);
        expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toEqual(player1);

        // Re-entry eligibility
        expect(lineup.isPlayerEligibleForReentry(player1)).toBe(false); // Used re-entry
        expect(lineup.isPlayerEligibleForReentry(sub1)).toBe(false); // Non-starter
        expect(lineup.isPlayerEligibleForReentry(sub2)).toBe(false); // Non-starter
      });

      it('should maintain substitution history in batting slots', () => {
        const sub1 = PlayerId.generate();
        const events = [
          ...baseEvents,
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            sub1,
            FieldPosition.SHORTSTOP,
            5
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);
        const battingSlot = lineup.getActiveLineup()[0];

        expect(battingSlot?.getCurrentPlayer()).toEqual(sub1);
        expect(battingSlot?.getHistory().length).toBeGreaterThan(1);
      });
    });

    describe('FieldPositionChanged Event Application', () => {
      beforeEach(() => {
        // Add base players for position change tests
        baseEvents = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'Player One',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Player Two',
            2,
            FieldPosition.CATCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player3,
            jersey3,
            'Player Three',
            3,
            FieldPosition.FIRST_BASE
          ),
        ];
      });

      it('should apply FieldPositionChanged event (move player to new position)', () => {
        const events = [
          ...baseEvents,
          new FieldPositionChanged(
            gameId,
            lineupId,
            player1,
            FieldPosition.PITCHER,
            FieldPosition.SHORTSTOP,
            4
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        const fieldPositions = lineup.getFieldingPositions();
        expect(fieldPositions.get(FieldPosition.SHORTSTOP)).toEqual(player1);
        expect(fieldPositions.get(FieldPosition.PITCHER)).toBeUndefined();
        expect(fieldPositions.get(FieldPosition.CATCHER)).toEqual(player2); // Unchanged

        // Verify player history update
        expect(lineup.getPlayerInfo(player1)?.currentPosition).toBe(FieldPosition.SHORTSTOP);
      });

      it('should apply FieldPositionChanged event moving player to EXTRA_PLAYER', () => {
        const events = [
          ...baseEvents,
          new FieldPositionChanged(
            gameId,
            lineupId,
            player1,
            FieldPosition.PITCHER,
            FieldPosition.EXTRA_PLAYER,
            3
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // EXTRA_PLAYER doesn't appear in field positions
        expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toBeUndefined();
        expect(lineup.getFieldingPositions().size).toBe(2); // player2 and player3 remain
        expect(lineup.getPlayerInfo(player1)?.currentPosition).toBeUndefined();
      });

      it('should apply multiple FieldPositionChanged events in sequence', () => {
        const events = [
          ...baseEvents,
          new FieldPositionChanged(
            gameId,
            lineupId,
            player1,
            FieldPosition.PITCHER,
            FieldPosition.SHORTSTOP,
            2
          ),
          new FieldPositionChanged(
            gameId,
            lineupId,
            player2,
            FieldPosition.CATCHER,
            FieldPosition.PITCHER,
            2
          ),
          new FieldPositionChanged(
            gameId,
            lineupId,
            player3,
            FieldPosition.FIRST_BASE,
            FieldPosition.CATCHER,
            2
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // Verify circular position swap
        const fieldPositions = lineup.getFieldingPositions();
        expect(fieldPositions.get(FieldPosition.SHORTSTOP)).toEqual(player1);
        expect(fieldPositions.get(FieldPosition.PITCHER)).toEqual(player2);
        expect(fieldPositions.get(FieldPosition.CATCHER)).toEqual(player3);
        expect(fieldPositions.get(FieldPosition.FIRST_BASE)).toBeUndefined();
      });

      it('should handle position changes after substitutions', () => {
        const sub1 = PlayerId.generate();
        const events = [
          ...baseEvents,
          // Substitute player
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            sub1,
            FieldPosition.FIRST_BASE,
            3
          ),
          // Change substitute's position
          new FieldPositionChanged(
            gameId,
            lineupId,
            sub1,
            FieldPosition.FIRST_BASE,
            FieldPosition.SHORTSTOP,
            5
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.getFieldingPositions().get(FieldPosition.SHORTSTOP)).toEqual(sub1);
        expect(lineup.getFieldingPositions().get(FieldPosition.FIRST_BASE)).toBeUndefined();
        expect(lineup.getPlayerInfo(sub1)?.currentPosition).toBe(FieldPosition.SHORTSTOP);
      });
    });

    describe('Unknown Event Types', () => {
      it('should ignore unknown event types gracefully', () => {
        const unknownEvent = {
          id: 'unknown-event-id',
          type: 'UnknownEventType',
          gameId,
          teamLineupId: lineupId,
          timestamp: new Date(),
          aggregateVersion: 1,
        } as unknown as DomainEvent;

        const events: DomainEvent[] = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
          unknownEvent,
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Jane Smith',
            2,
            FieldPosition.CATCHER
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // Should process known events normally and ignore unknown ones
        expect(lineup.getActiveLineup()).toHaveLength(2);
        expect(lineup.getFieldingPositions().size).toBe(2);
        expect(lineup.getPlayerInfo(player1)).toBeDefined();
        expect(lineup.getPlayerInfo(player2)).toBeDefined();
      });

      it('should handle event with no type property', () => {
        const malformedEvent = {
          id: 'malformed-event-id',
          gameId,
          teamLineupId: lineupId,
          timestamp: new Date(),
          aggregateVersion: 1,
        } as unknown as DomainEvent;

        const events: DomainEvent[] = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
          malformedEvent,
        ];

        const lineup = TeamLineup.fromEvents(events);

        // Should ignore malformed event and process others
        expect(lineup.getActiveLineup()).toHaveLength(1);
        expect(lineup.getPlayerInfo(player1)).toBeDefined();
      });
    });

    describe('Event Idempotency', () => {
      it('should be idempotent (same event sequence produces identical results)', () => {
        const eventSequence = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Jane Smith',
            2,
            FieldPosition.CATCHER
          ),
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            player3,
            FieldPosition.FIRST_BASE,
            5
          ),
          new FieldPositionChanged(
            gameId,
            lineupId,
            player2,
            FieldPosition.CATCHER,
            FieldPosition.SHORTSTOP,
            6
          ),
        ];

        const lineup1 = TeamLineup.fromEvents([...eventSequence]);
        const lineup2 = TeamLineup.fromEvents([...eventSequence]);

        // Should produce identical results
        expect(lineup1.getActiveLineup()).toEqual(lineup2.getActiveLineup());
        expect(lineup1.getFieldingPositions()).toEqual(lineup2.getFieldingPositions());
        expect(lineup1.getPlayerInfo(player1)).toEqual(lineup2.getPlayerInfo(player1));
        expect(lineup1.getPlayerInfo(player2)).toEqual(lineup2.getPlayerInfo(player2));
        expect(lineup1.getPlayerInfo(player3)).toEqual(lineup2.getPlayerInfo(player3));
        expect(lineup1.isPlayerEligibleForReentry(player1)).toBe(
          lineup2.isPlayerEligibleForReentry(player1)
        );
      });

      it('should handle duplicate event application gracefully', () => {
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
        ];

        const lineup1 = TeamLineup.fromEvents(events);
        const lineup2 = TeamLineup.fromEvents(events);

        // Multiple reconstructions should be identical
        expect(lineup1.getActiveLineup()).toEqual(lineup2.getActiveLineup());
        expect(lineup1.getVersion()).toBe(lineup2.getVersion());
        expect(lineup1.teamName).toBe(lineup2.teamName);
      });
    });

    describe('Domain Invariants During Event Application', () => {
      it('should maintain domain invariants after applying events', () => {
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'Pitcher',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Catcher',
            2,
            FieldPosition.CATCHER
          ),
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            player3,
            FieldPosition.FIRST_BASE,
            3
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // Batting slots should be properly maintained
        expect(lineup.getActiveLineup()).toHaveLength(2);
        expect(
          lineup.getActiveLineup().every(slot => slot.position >= 1 && slot.position <= 20)
        ).toBe(true);

        // Field positions should be unique (except EXTRA_PLAYER)
        const fieldPositions = lineup.getFieldingPositions();
        const positions = Array.from(fieldPositions.keys());
        const uniquePositions = new Set(positions);
        expect(positions.length).toBe(uniquePositions.size);

        // Player info should be consistent
        expect(lineup.getPlayerInfo(player1)?.currentPosition).toBeUndefined(); // Substituted out
        expect(lineup.getPlayerInfo(player2)?.currentPosition).toBe(FieldPosition.CATCHER);
        expect(lineup.getPlayerInfo(player3)?.currentPosition).toBe(FieldPosition.FIRST_BASE);
      });

      it('should maintain jersey number uniqueness across all events', () => {
        const sub1 = PlayerId.generate();
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'Player 1',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Player 2',
            2,
            FieldPosition.CATCHER
          ),
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            sub1,
            FieldPosition.FIRST_BASE,
            3
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // All active players should have unique jersey numbers
        const activeJerseys = new Set([
          lineup.getPlayerInfo(player2)?.jerseyNumber.value,
          lineup.getPlayerInfo(sub1)?.jerseyNumber.value,
        ]);
        expect(activeJerseys.size).toBe(2);
      });

      it('should maintain re-entry eligibility rules throughout event stream', () => {
        const sub1 = PlayerId.generate();
        const sub2 = PlayerId.generate();
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'Starter',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Another Starter',
            2,
            FieldPosition.CATCHER
          ),
          // First substitution
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            sub1,
            FieldPosition.FIRST_BASE,
            3
          ),
          // Second substitution
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            sub1,
            sub2,
            FieldPosition.SHORTSTOP,
            5
          ),
          // Original starter re-enters
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            sub2,
            player1,
            FieldPosition.PITCHER,
            8
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        // Re-entry rules should be properly maintained
        expect(lineup.isPlayerEligibleForReentry(player1)).toBe(false); // Used re-entry
        expect(lineup.isPlayerEligibleForReentry(player2)).toBe(false); // Still active, not substituted
        expect(lineup.isPlayerEligibleForReentry(sub1)).toBe(false); // Non-starter
        expect(lineup.isPlayerEligibleForReentry(sub2)).toBe(false); // Non-starter

        // Player history should reflect re-entry usage
        expect(lineup.getPlayerInfo(player1)?.hasUsedReentry).toBe(true);
        expect(lineup.getPlayerInfo(player2)?.hasUsedReentry).toBe(false);
      });
    });
  });

  describe('TeamLineup.fromEvents() - Event Sourcing Reconstruction', () => {
    describe('Basic Reconstruction', () => {
      it('should create lineup from TeamLineupCreated event', () => {
        const events = [new TeamLineupCreated(lineupId, gameId, 'Home Tigers')];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.id).toEqual(lineupId);
        expect(lineup.gameId).toEqual(gameId);
        expect(lineup.teamName).toBe('Home Tigers');
        expect(lineup.getActiveLineup()).toEqual([]);
        expect(lineup.getFieldingPositions()).toEqual(new Map());
        expect(lineup.getUncommittedEvents()).toHaveLength(0); // Events are already committed
        expect(lineup.isLineupValid()).toBe(false); // No players yet
      });

      it('should replay events in chronological order', () => {
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Jane Smith',
            2,
            FieldPosition.CATCHER
          ),
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            player3,
            FieldPosition.FIRST_BASE,
            5
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.getActiveLineup()).toHaveLength(2);
        expect(lineup.getActiveLineup()[0]?.getCurrentPlayer()).toEqual(player3); // player3 substituted for player1
        expect(lineup.getActiveLineup()[1]?.getCurrentPlayer()).toEqual(player2); // player2 unchanged
        expect(lineup.getFieldingPositions().get(FieldPosition.FIRST_BASE)).toEqual(player3);
        expect(lineup.getFieldingPositions().get(FieldPosition.CATCHER)).toEqual(player2);
        expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toBeUndefined(); // player1 was at pitcher before substitution
      });

      it('should maintain domain invariants during reconstruction', () => {
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Jane Smith',
            2,
            FieldPosition.CATCHER
          ),
          new FieldPositionChanged(
            gameId,
            lineupId,
            player1,
            FieldPosition.PITCHER,
            FieldPosition.SHORTSTOP,
            3
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.getActiveLineup()).toHaveLength(2);
        expect(lineup.getFieldingPositions().get(FieldPosition.SHORTSTOP)).toEqual(player1);
        expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toBeUndefined();
        expect(lineup.getFieldingPositions().get(FieldPosition.CATCHER)).toEqual(player2);
        expect(lineup.getPlayerInfo(player1)?.currentPosition).toBe(FieldPosition.SHORTSTOP);
      });
    });

    describe('Error Handling', () => {
      it('should throw error for empty event array', () => {
        expect(() => TeamLineup.fromEvents([])).toThrow(DomainError);
      });

      it('should throw error if first event is not TeamLineupCreated', () => {
        const events = [
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
        ];

        expect(() => TeamLineup.fromEvents(events)).toThrow(DomainError);
      });

      it('should throw error for events with different teamLineupId', () => {
        const differentLineupId = TeamLineupId.generate();
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            differentLineupId, // Different lineup ID
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
        ];

        expect(() => TeamLineup.fromEvents(events)).toThrow(DomainError);
      });

      it('should throw error for events with different gameId', () => {
        const differentGameId = GameId.generate();
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            differentGameId, // Different game ID
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
        ];

        expect(() => TeamLineup.fromEvents(events)).toThrow(DomainError);
      });
    });

    describe('Event Processing', () => {
      it('should process PlayerAddedToLineup events correctly', () => {
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Jane Smith',
            2,
            FieldPosition.CATCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player3,
            jersey3,
            'Bob Johnson',
            10,
            FieldPosition.EXTRA_PLAYER
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.getActiveLineup()).toHaveLength(3);
        expect(lineup.getFieldingPositions().size).toBe(2); // EXTRA_PLAYER doesn't count
        expect(lineup.getPlayerInfo(player1)?.isStarter).toBe(true);
        expect(lineup.getPlayerInfo(player2)?.isStarter).toBe(true);
        expect(lineup.getPlayerInfo(player3)?.isStarter).toBe(true);
        expect(lineup.getPlayerInfo(player3)?.currentPosition).toBeUndefined(); // EXTRA_PLAYER has no field position
      });

      it('should process PlayerSubstitutedIntoGame events correctly', () => {
        const sub1 = PlayerId.generate();
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            sub1,
            FieldPosition.CATCHER,
            5
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.getActiveLineup()).toHaveLength(1);
        expect(lineup.getActiveLineup()[0]?.getCurrentPlayer()).toEqual(sub1);
        expect(lineup.getFieldingPositions().get(FieldPosition.CATCHER)).toEqual(sub1);
        expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toBeUndefined();
        expect(lineup.isPlayerEligibleForReentry(player1)).toBe(true); // Starter can re-enter
        expect(lineup.isPlayerEligibleForReentry(sub1)).toBe(false); // Substitute cannot
      });

      it('should process FieldPositionChanged events correctly', () => {
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Jane Smith',
            2,
            FieldPosition.CATCHER
          ),
          new FieldPositionChanged(
            gameId,
            lineupId,
            player1,
            FieldPosition.PITCHER,
            FieldPosition.FIRST_BASE,
            3
          ),
          new FieldPositionChanged(
            gameId,
            lineupId,
            player2,
            FieldPosition.CATCHER,
            FieldPosition.PITCHER,
            3
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.getFieldingPositions().get(FieldPosition.FIRST_BASE)).toEqual(player1);
        expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toEqual(player2);
        expect(lineup.getFieldingPositions().get(FieldPosition.CATCHER)).toBeUndefined();
        expect(lineup.getPlayerInfo(player1)?.currentPosition).toBe(FieldPosition.FIRST_BASE);
        expect(lineup.getPlayerInfo(player2)?.currentPosition).toBe(FieldPosition.PITCHER);
      });

      it('should handle events with mixed timestamps in chronological order', () => {
        const now = new Date();
        const event1 = new TeamLineupCreated(lineupId, gameId, 'Home Tigers');
        const event2 = new PlayerAddedToLineup(
          gameId,
          lineupId,
          player1,
          jersey1,
          'John Doe',
          1,
          FieldPosition.PITCHER
        );
        const event3 = new PlayerAddedToLineup(
          gameId,
          lineupId,
          player2,
          jersey2,
          'Jane Smith',
          2,
          FieldPosition.CATCHER
        );

        // Set timestamps to ensure proper ordering (event1 = oldest, event3 = newest)
        Object.defineProperty(event1, 'timestamp', {
          value: new Date(now.getTime() - 2000),
          writable: false,
        });
        Object.defineProperty(event2, 'timestamp', {
          value: new Date(now.getTime() - 1000),
          writable: false,
        });
        Object.defineProperty(event3, 'timestamp', {
          value: now,
          writable: false,
        });

        const events = [event1, event2, event3];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.getActiveLineup()).toHaveLength(2);
        expect(lineup.getActiveLineup()[0]?.getCurrentPlayer()).toEqual(player1);
        expect(lineup.getActiveLineup()[1]?.getCurrentPlayer()).toEqual(player2);
      });
    });

    describe('Complex Lineup Scenarios', () => {
      it('should handle full roster with substitutions and re-entries', () => {
        const sub1 = PlayerId.generate();
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          // Add starter lineup
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Jane Smith',
            2,
            FieldPosition.CATCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player3,
            jersey3,
            'Bob Johnson',
            3,
            FieldPosition.FIRST_BASE
          ),
          // Substitute starter out
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            sub1,
            FieldPosition.SHORTSTOP,
            3
          ),
          // Starter re-enters
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            sub1,
            player1,
            FieldPosition.PITCHER,
            7
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.getActiveLineup()).toHaveLength(3);
        expect(lineup.getActiveLineup()[0]?.getCurrentPlayer()).toEqual(player1); // Re-entered
        expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toEqual(player1);
        expect(lineup.isPlayerEligibleForReentry(player1)).toBe(false); // Used re-entry
        expect(lineup.getPlayerInfo(player1)?.hasUsedReentry).toBe(true);
      });

      it('should handle position changes with substitutions', () => {
        const sub1 = PlayerId.generate();
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Jane Smith',
            2,
            FieldPosition.CATCHER
          ),
          // Position change before substitution
          new FieldPositionChanged(
            gameId,
            lineupId,
            player1,
            FieldPosition.PITCHER,
            FieldPosition.FIRST_BASE,
            2
          ),
          // Substitute player who changed positions
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            sub1,
            FieldPosition.PITCHER,
            4
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.getActiveLineup()).toHaveLength(2);
        expect(lineup.getFieldingPositions().get(FieldPosition.PITCHER)).toEqual(sub1);
        expect(lineup.getFieldingPositions().get(FieldPosition.FIRST_BASE)).toBeUndefined(); // player1 was removed
        expect(lineup.getFieldingPositions().get(FieldPosition.CATCHER)).toEqual(player2);
      });

      it('should handle EXTRA_PLAYER scenarios correctly', () => {
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          // Add regular player
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
          // Add EXTRA_PLAYER (batting-only)
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Jane Smith',
            10,
            FieldPosition.EXTRA_PLAYER
          ),
          // Move regular player to EXTRA_PLAYER
          new FieldPositionChanged(
            gameId,
            lineupId,
            player1,
            FieldPosition.PITCHER,
            FieldPosition.EXTRA_PLAYER,
            5
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.getActiveLineup()).toHaveLength(2);
        expect(lineup.getFieldingPositions().size).toBe(0); // No defensive players
        expect(lineup.getPlayerInfo(player1)?.currentPosition).toBeUndefined(); // EXTRA_PLAYER has no position
        expect(lineup.getPlayerInfo(player2)?.currentPosition).toBeUndefined(); // EXTRA_PLAYER has no position
        expect(lineup.isLineupValid()).toBe(false); // No defensive coverage
      });

      it('should maintain re-entry eligibility tracking through complex substitutions', () => {
        const sub1 = PlayerId.generate();
        const sub2 = PlayerId.generate();
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          // Add starters
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'Starter 1',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Starter 2',
            2,
            FieldPosition.CATCHER
          ),
          // First wave of substitutions
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            sub1,
            FieldPosition.FIRST_BASE,
            3
          ),
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            2,
            player2,
            sub2,
            FieldPosition.SHORTSTOP,
            4
          ),
          // One starter re-enters
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            sub1,
            player1,
            FieldPosition.PITCHER,
            7
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.isPlayerEligibleForReentry(player1)).toBe(false); // Used re-entry
        expect(lineup.isPlayerEligibleForReentry(player2)).toBe(true); // Still eligible
        expect(lineup.isPlayerEligibleForReentry(sub1)).toBe(false); // Non-starter, not eligible
        expect(lineup.isPlayerEligibleForReentry(sub2)).toBe(false); // Non-starter, not eligible
        expect(lineup.getPlayerInfo(player1)?.hasUsedReentry).toBe(true);
        expect(lineup.getPlayerInfo(player2)?.hasUsedReentry).toBe(false);
      });
    });

    describe('State Consistency', () => {
      it('should maintain batting order consistency across events', () => {
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Second Batter',
            2,
            FieldPosition.CATCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'First Batter',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player3,
            jersey3,
            'Third Batter',
            3,
            FieldPosition.FIRST_BASE
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);
        const activeLineup = lineup.getActiveLineup();

        expect(activeLineup).toHaveLength(3);
        expect(activeLineup[0]?.position).toBe(1);
        expect(activeLineup[1]?.position).toBe(2);
        expect(activeLineup[2]?.position).toBe(3);
        expect(activeLineup[0]?.getCurrentPlayer()).toEqual(player1);
        expect(activeLineup[1]?.getCurrentPlayer()).toEqual(player2);
        expect(activeLineup[2]?.getCurrentPlayer()).toEqual(player3);
      });

      it('should maintain field position consistency across changes', () => {
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player2,
            jersey2,
            'Jane Smith',
            2,
            FieldPosition.CATCHER
          ),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player3,
            jersey3,
            'Bob Johnson',
            3,
            FieldPosition.FIRST_BASE
          ),
          // Complex position swaps
          new FieldPositionChanged(
            gameId,
            lineupId,
            player1,
            FieldPosition.PITCHER,
            FieldPosition.SHORTSTOP,
            3
          ),
          new FieldPositionChanged(
            gameId,
            lineupId,
            player2,
            FieldPosition.CATCHER,
            FieldPosition.PITCHER,
            3
          ),
          new FieldPositionChanged(
            gameId,
            lineupId,
            player3,
            FieldPosition.FIRST_BASE,
            FieldPosition.CATCHER,
            3
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);
        const positions = lineup.getFieldingPositions();

        expect(positions.get(FieldPosition.SHORTSTOP)).toEqual(player1);
        expect(positions.get(FieldPosition.PITCHER)).toEqual(player2);
        expect(positions.get(FieldPosition.CATCHER)).toEqual(player3);
        expect(positions.get(FieldPosition.FIRST_BASE)).toBeUndefined();
      });

      it('should preserve team identity throughout event stream', () => {
        const teamName = 'Springfield Nuclear Plant Workers';
        const events = [
          new TeamLineupCreated(lineupId, gameId, teamName),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'Homer Simpson',
            1,
            FieldPosition.PITCHER
          ),
          new PlayerSubstitutedIntoGame(
            gameId,
            lineupId,
            1,
            player1,
            player2,
            FieldPosition.CATCHER,
            5
          ),
          new FieldPositionChanged(
            gameId,
            lineupId,
            player2,
            FieldPosition.CATCHER,
            FieldPosition.SHORTSTOP,
            7
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.teamName).toBe(teamName);
        expect(lineup.id).toEqual(lineupId);
        expect(lineup.gameId).toEqual(gameId);
      });
    });

    describe('Performance and Edge Cases', () => {
      it('should handle empty uncommitted events after reconstruction', () => {
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.getUncommittedEvents()).toHaveLength(0);
        expect(lineup.getActiveLineup()).toHaveLength(1);
      });

      it('should handle single TeamLineupCreated event', () => {
        const events = [new TeamLineupCreated(lineupId, gameId, 'Home Tigers')];

        const lineup = TeamLineup.fromEvents(events);

        expect(lineup.id).toEqual(lineupId);
        expect(lineup.gameId).toEqual(gameId);
        expect(lineup.teamName).toBe('Home Tigers');
        expect(lineup.getActiveLineup()).toHaveLength(0);
        expect(lineup.isLineupValid()).toBe(false);
      });

      it('should maintain immutability of reconstructed lineup', () => {
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new PlayerAddedToLineup(
            gameId,
            lineupId,
            player1,
            jersey1,
            'John Doe',
            1,
            FieldPosition.PITCHER
          ),
        ];

        const lineup = TeamLineup.fromEvents(events);
        const originalActiveLineup = lineup.getActiveLineup();
        const originalFieldingPositions = lineup.getFieldingPositions();

        // Lineup properties should be immutable from external access
        expect(lineup.getActiveLineup()).toEqual(originalActiveLineup);
        expect(lineup.getFieldingPositions()).toEqual(originalFieldingPositions);
        expect(lineup.id).toEqual(lineupId);
        expect(lineup.gameId).toEqual(gameId);
        expect(lineup.teamName).toBe('Home Tigers');
      });

      it('should handle duplicate TeamLineupCreated events gracefully', () => {
        const events = [
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'),
          new TeamLineupCreated(lineupId, gameId, 'Home Tigers'), // Duplicate
        ];

        // Should throw error on duplicate creation event
        expect(() => TeamLineup.fromEvents(events)).toThrow(DomainError);
      });
    });
  });
});
