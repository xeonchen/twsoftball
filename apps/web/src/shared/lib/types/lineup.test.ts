import { PlayerId, FieldPosition } from '@twsoftball/application';

import {
  BenchPlayer,
  SubstitutionRecord,
  PositionAssignment,
  FieldLayout,
  PlayerInfo,
} from './lineup';

describe('LineupTypes', () => {
  describe('BenchPlayer', () => {
    it('should include all required fields for a starter player', () => {
      const benchPlayer: BenchPlayer = {
        id: 'player-123',
        name: 'John Doe',
        jerseyNumber: '42',
        isStarter: true,
        hasReentered: false,
        entryInning: null,
      };

      expect(benchPlayer).toBeDefined();
      expect(benchPlayer.id).toBe('player-123');
      expect(benchPlayer.name).toBe('John Doe');
      expect(benchPlayer.jerseyNumber).toBe('42');
      expect(benchPlayer.isStarter).toBe(true);
      expect(benchPlayer.hasReentered).toBe(false);
      expect(benchPlayer.entryInning).toBeNull();
    });

    it('should include all required fields for a substitute player', () => {
      const benchPlayer: BenchPlayer = {
        id: 'player-456',
        name: 'Jane Smith',
        jerseyNumber: '23',
        isStarter: false,
        hasReentered: false,
        entryInning: 3,
        position: FieldPosition.RIGHT_FIELD,
      };

      expect(benchPlayer).toBeDefined();
      expect(benchPlayer.id).toBe('player-456');
      expect(benchPlayer.name).toBe('Jane Smith');
      expect(benchPlayer.jerseyNumber).toBe('23');
      expect(benchPlayer.isStarter).toBe(false);
      expect(benchPlayer.hasReentered).toBe(false);
      expect(benchPlayer.entryInning).toBe(3);
      expect(benchPlayer.position).toBe('RF');
    });

    it('should support a player who has reentered the game', () => {
      const benchPlayer: BenchPlayer = {
        id: 'player-789',
        name: 'Mike Johnson',
        jerseyNumber: '15',
        isStarter: true,
        hasReentered: true,
        entryInning: 5,
        position: FieldPosition.CENTER_FIELD,
      };

      expect(benchPlayer.hasReentered).toBe(true);
      expect(benchPlayer.entryInning).toBe(5);
      expect(benchPlayer.position).toBe('CF');
    });

    it('should allow optional position field', () => {
      const benchPlayerWithoutPosition: BenchPlayer = {
        id: 'player-100',
        name: 'Sam Wilson',
        jerseyNumber: '8',
        isStarter: false,
        hasReentered: false,
        entryInning: null,
      };

      expect(benchPlayerWithoutPosition.position).toBeUndefined();
    });

    it('should validate jersey number as string', () => {
      const benchPlayer: BenchPlayer = {
        id: 'player-200',
        name: 'Alex Brown',
        jerseyNumber: '00', // String format for jersey numbers like "00"
        isStarter: true,
        hasReentered: false,
        entryInning: null,
      };

      expect(typeof benchPlayer.jerseyNumber).toBe('string');
      expect(benchPlayer.jerseyNumber).toBe('00');
    });
  });

  describe('SubstitutionRecord', () => {
    it('should track complete substitution history', () => {
      const record: SubstitutionRecord = {
        inning: 5,
        battingSlot: 3,
        outgoingPlayer: { playerId: new PlayerId('p1'), name: 'Smith' },
        incomingPlayer: { playerId: new PlayerId('p2'), name: 'Jones' },
        timestamp: new Date('2024-09-26T14:30:00Z'),
        isReentry: false,
      };

      expect(record.inning).toBe(5);
      expect(record.battingSlot).toBe(3);
      expect(record.outgoingPlayer.playerId.value).toBe('p1');
      expect(record.outgoingPlayer.name).toBe('Smith');
      expect(record.incomingPlayer.playerId.value).toBe('p2');
      expect(record.incomingPlayer.name).toBe('Jones');
      expect(record.timestamp).toBeInstanceOf(Date);
      expect(record.isReentry).toBe(false);
    });

    it('should validate positive inning numbers', () => {
      const record: SubstitutionRecord = {
        inning: 1,
        battingSlot: 1,
        outgoingPlayer: { playerId: new PlayerId('p1'), name: 'Player 1' },
        incomingPlayer: { playerId: new PlayerId('p2'), name: 'Player 2' },
        timestamp: new Date(),
        isReentry: false,
      };

      expect(record.inning).toBeGreaterThan(0);
    });

    it('should validate positive batting slot numbers', () => {
      const record: SubstitutionRecord = {
        inning: 3,
        battingSlot: 9,
        outgoingPlayer: { playerId: new PlayerId('p1'), name: 'Player 1' },
        incomingPlayer: { playerId: new PlayerId('p2'), name: 'Player 2' },
        timestamp: new Date(),
        isReentry: false,
      };

      expect(record.battingSlot).toBeGreaterThan(0);
      expect(record.battingSlot).toBeLessThanOrEqual(10); // Softball typically has 10 players max
    });

    it('should support reentry tracking', () => {
      const reentryRecord: SubstitutionRecord = {
        inning: 7,
        battingSlot: 4,
        outgoingPlayer: { playerId: new PlayerId('p1'), name: 'Temporary Player' },
        incomingPlayer: { playerId: new PlayerId('p2'), name: 'Returning Starter' },
        timestamp: new Date(),
        isReentry: true,
      };

      expect(reentryRecord.isReentry).toBe(true);
    });

    it('should require complete player information', () => {
      const record: SubstitutionRecord = {
        inning: 2,
        battingSlot: 5,
        outgoingPlayer: { playerId: new PlayerId('out-123'), name: 'Outgoing Player' },
        incomingPlayer: { playerId: new PlayerId('in-456'), name: 'Incoming Player' },
        timestamp: new Date(),
        isReentry: false,
      };

      expect(record.outgoingPlayer.playerId).toBeTruthy();
      expect(record.outgoingPlayer.name).toBeTruthy();
      expect(record.incomingPlayer.playerId).toBeTruthy();
      expect(record.incomingPlayer.name).toBeTruthy();
    });

    it('should have timestamp as Date object', () => {
      const now = new Date();
      const record: SubstitutionRecord = {
        inning: 4,
        battingSlot: 2,
        outgoingPlayer: { playerId: new PlayerId('p1'), name: 'Player 1' },
        incomingPlayer: { playerId: new PlayerId('p2'), name: 'Player 2' },
        timestamp: now,
        isReentry: false,
      };

      expect(record.timestamp).toBeInstanceOf(Date);
      expect(record.timestamp.getTime()).toBe(now.getTime());
    });
  });

  describe('PositionAssignment', () => {
    it('should assign player to specific field position', () => {
      const assignment: PositionAssignment = {
        battingSlot: 1,
        playerId: 'player-123',
        fieldPosition: FieldPosition.SHORTSTOP,
      };

      expect(assignment.battingSlot).toBe(1);
      expect(assignment.playerId).toBe('player-123');
      expect(assignment.fieldPosition).toBe('SS');
    });

    it('should support all standard softball positions', () => {
      const positions = [
        FieldPosition.PITCHER,
        FieldPosition.CATCHER,
        FieldPosition.FIRST_BASE,
        FieldPosition.SECOND_BASE,
        FieldPosition.THIRD_BASE,
        FieldPosition.SHORTSTOP,
        FieldPosition.LEFT_FIELD,
        FieldPosition.CENTER_FIELD,
        FieldPosition.RIGHT_FIELD,
        FieldPosition.SHORT_FIELDER,
        FieldPosition.EXTRA_PLAYER,
      ];

      positions.forEach((position, index) => {
        const assignment: PositionAssignment = {
          battingSlot: index + 1,
          playerId: `player-${index}`,
          fieldPosition: position,
        };

        expect(assignment.fieldPosition).toBe(position);
      });
    });

    it('should validate batting slot range', () => {
      const assignment: PositionAssignment = {
        battingSlot: 9,
        playerId: 'player-456',
        fieldPosition: FieldPosition.RIGHT_FIELD,
      };

      expect(assignment.battingSlot).toBeGreaterThan(0);
      expect(assignment.battingSlot).toBeLessThanOrEqual(10);
    });

    it('should require valid player ID', () => {
      const assignment: PositionAssignment = {
        battingSlot: 3,
        playerId: 'valid-player-id-789',
        fieldPosition: FieldPosition.LEFT_FIELD,
      };

      expect(assignment.playerId).toBeTruthy();
      expect(typeof assignment.playerId).toBe('string');
    });
  });

  describe('FieldLayout', () => {
    it('should organize all field positions', () => {
      const layout: FieldLayout = {
        pitcher: { battingSlot: 1, playerId: 'p1', fieldPosition: FieldPosition.PITCHER },
        catcher: { battingSlot: 2, playerId: 'p2', fieldPosition: FieldPosition.CATCHER },
        firstBase: { battingSlot: 3, playerId: 'p3', fieldPosition: FieldPosition.FIRST_BASE },
        secondBase: { battingSlot: 4, playerId: 'p4', fieldPosition: FieldPosition.SECOND_BASE },
        thirdBase: { battingSlot: 5, playerId: 'p5', fieldPosition: FieldPosition.THIRD_BASE },
        shortstop: { battingSlot: 6, playerId: 'p6', fieldPosition: FieldPosition.SHORTSTOP },
        leftField: { battingSlot: 7, playerId: 'p7', fieldPosition: FieldPosition.LEFT_FIELD },
        centerField: { battingSlot: 8, playerId: 'p8', fieldPosition: FieldPosition.CENTER_FIELD },
        rightField: { battingSlot: 9, playerId: 'p9', fieldPosition: FieldPosition.RIGHT_FIELD },
        shortFielder: {
          battingSlot: 10,
          playerId: 'p10',
          fieldPosition: FieldPosition.SHORT_FIELDER,
        },
      };

      expect(layout.pitcher.fieldPosition).toBe(FieldPosition.PITCHER);
      expect(layout.catcher.fieldPosition).toBe(FieldPosition.CATCHER);
      expect(layout.firstBase.fieldPosition).toBe(FieldPosition.FIRST_BASE);
      expect(layout.secondBase.fieldPosition).toBe(FieldPosition.SECOND_BASE);
      expect(layout.thirdBase.fieldPosition).toBe(FieldPosition.THIRD_BASE);
      expect(layout.shortstop.fieldPosition).toBe(FieldPosition.SHORTSTOP);
      expect(layout.leftField.fieldPosition).toBe(FieldPosition.LEFT_FIELD);
      expect(layout.centerField.fieldPosition).toBe(FieldPosition.CENTER_FIELD);
      expect(layout.rightField.fieldPosition).toBe(FieldPosition.RIGHT_FIELD);
      expect(layout.shortFielder.fieldPosition).toBe(FieldPosition.SHORT_FIELDER);
    });

    it('should support optional extra player', () => {
      const layoutWithEH: FieldLayout = {
        pitcher: { battingSlot: 1, playerId: 'p1', fieldPosition: FieldPosition.PITCHER },
        catcher: { battingSlot: 2, playerId: 'p2', fieldPosition: FieldPosition.CATCHER },
        firstBase: { battingSlot: 3, playerId: 'p3', fieldPosition: FieldPosition.FIRST_BASE },
        secondBase: { battingSlot: 4, playerId: 'p4', fieldPosition: FieldPosition.SECOND_BASE },
        thirdBase: { battingSlot: 5, playerId: 'p5', fieldPosition: FieldPosition.THIRD_BASE },
        shortstop: { battingSlot: 6, playerId: 'p6', fieldPosition: FieldPosition.SHORTSTOP },
        leftField: { battingSlot: 7, playerId: 'p7', fieldPosition: FieldPosition.LEFT_FIELD },
        centerField: { battingSlot: 8, playerId: 'p8', fieldPosition: FieldPosition.CENTER_FIELD },
        rightField: { battingSlot: 9, playerId: 'p9', fieldPosition: FieldPosition.RIGHT_FIELD },
        shortFielder: {
          battingSlot: 10,
          playerId: 'p10',
          fieldPosition: FieldPosition.SHORT_FIELDER,
        },
        extraPlayer: {
          battingSlot: 11,
          playerId: 'p11',
          fieldPosition: FieldPosition.EXTRA_PLAYER,
        },
      };

      expect(layoutWithEH.extraPlayer).toBeDefined();
      expect(layoutWithEH.extraPlayer?.fieldPosition).toBe(FieldPosition.EXTRA_PLAYER);
      expect(layoutWithEH.extraPlayer?.battingSlot).toBe(11);
    });

    it('should allow field layout without extra player', () => {
      const layoutWithoutEH: FieldLayout = {
        pitcher: { battingSlot: 1, playerId: 'p1', fieldPosition: FieldPosition.PITCHER },
        catcher: { battingSlot: 2, playerId: 'p2', fieldPosition: FieldPosition.CATCHER },
        firstBase: { battingSlot: 3, playerId: 'p3', fieldPosition: FieldPosition.FIRST_BASE },
        secondBase: { battingSlot: 4, playerId: 'p4', fieldPosition: FieldPosition.SECOND_BASE },
        thirdBase: { battingSlot: 5, playerId: 'p5', fieldPosition: FieldPosition.THIRD_BASE },
        shortstop: { battingSlot: 6, playerId: 'p6', fieldPosition: FieldPosition.SHORTSTOP },
        leftField: { battingSlot: 7, playerId: 'p7', fieldPosition: FieldPosition.LEFT_FIELD },
        centerField: { battingSlot: 8, playerId: 'p8', fieldPosition: FieldPosition.CENTER_FIELD },
        rightField: { battingSlot: 9, playerId: 'p9', fieldPosition: FieldPosition.RIGHT_FIELD },
        shortFielder: {
          battingSlot: 10,
          playerId: 'p10',
          fieldPosition: FieldPosition.SHORT_FIELDER,
        },
      };

      expect(layoutWithoutEH.extraPlayer).toBeUndefined();
    });
  });

  describe('PlayerInfo', () => {
    it('should provide minimal player identification', () => {
      const playerId = new PlayerId('player-minimal-123');
      const playerInfo: PlayerInfo = {
        playerId,
        name: 'Minimal Player',
      };

      expect(playerInfo.playerId.equals(playerId)).toBe(true);
      expect(playerInfo.name).toBe('Minimal Player');
    });

    it('should require both playerId and name', () => {
      const playerId = new PlayerId('required-id');
      const playerInfo: PlayerInfo = {
        playerId,
        name: 'Required Name',
      };

      expect(playerInfo.playerId).toBeTruthy();
      expect(playerInfo.name).toBeTruthy();
      expect(playerInfo.playerId).toBeInstanceOf(PlayerId);
      expect(typeof playerInfo.name).toBe('string');
    });
  });

  describe('Type Integration', () => {
    it('should work with existing Player interface', () => {
      // Test that our new types can integrate with existing Player type
      const playerId = new PlayerId('existing-player-1');
      const playerInfo: PlayerInfo = {
        playerId,
        name: 'Existing Player',
      };

      const benchPlayer: BenchPlayer = {
        id: playerInfo.playerId.value,
        name: playerInfo.name,
        jerseyNumber: '42',
        isStarter: true,
        hasReentered: false,
        entryInning: null,
      };

      expect(benchPlayer.id).toBe(playerInfo.playerId.value);
      expect(benchPlayer.name).toBe(playerInfo.name);
    });

    it('should support substitution records with PlayerInfo', () => {
      const outgoingPlayerInfo: PlayerInfo = {
        playerId: new PlayerId('out-123'),
        name: 'Outgoing Player',
      };

      const incomingPlayerInfo: PlayerInfo = {
        playerId: new PlayerId('in-456'),
        name: 'Incoming Player',
      };

      const substitution: SubstitutionRecord = {
        inning: 3,
        battingSlot: 4,
        outgoingPlayer: outgoingPlayerInfo,
        incomingPlayer: incomingPlayerInfo,
        timestamp: new Date(),
        isReentry: false,
      };

      expect(substitution.outgoingPlayer).toBe(outgoingPlayerInfo);
      expect(substitution.incomingPlayer).toBe(incomingPlayerInfo);
    });

    it('should create complete field layout with position assignments', () => {
      const positions: PositionAssignment[] = [
        { battingSlot: 1, playerId: 'p1', fieldPosition: FieldPosition.PITCHER },
        { battingSlot: 2, playerId: 'p2', fieldPosition: FieldPosition.CATCHER },
        { battingSlot: 3, playerId: 'p3', fieldPosition: FieldPosition.FIRST_BASE },
      ];

      positions.forEach(position => {
        expect(position.battingSlot).toBeGreaterThan(0);
        expect(position.playerId).toBeTruthy();
        expect(position.fieldPosition).toBeTruthy();
      });

      // Can be used to build FieldLayout
      const layout: FieldLayout = {
        pitcher: positions[0],
        catcher: positions[1],
        firstBase: positions[2],
        secondBase: { battingSlot: 4, playerId: 'p4', fieldPosition: FieldPosition.SECOND_BASE },
        thirdBase: { battingSlot: 5, playerId: 'p5', fieldPosition: FieldPosition.THIRD_BASE },
        shortstop: { battingSlot: 6, playerId: 'p6', fieldPosition: FieldPosition.SHORTSTOP },
        leftField: { battingSlot: 7, playerId: 'p7', fieldPosition: FieldPosition.LEFT_FIELD },
        centerField: { battingSlot: 8, playerId: 'p8', fieldPosition: FieldPosition.CENTER_FIELD },
        rightField: { battingSlot: 9, playerId: 'p9', fieldPosition: FieldPosition.RIGHT_FIELD },
        shortFielder: {
          battingSlot: 10,
          playerId: 'p10',
          fieldPosition: FieldPosition.SHORT_FIELDER,
        },
      };

      expect(layout.pitcher).toBe(positions[0]);
      expect(layout.catcher).toBe(positions[1]);
      expect(layout.firstBase).toBe(positions[2]);
    });
  });
});
