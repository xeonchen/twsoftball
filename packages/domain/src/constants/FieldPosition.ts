export enum FieldPosition {
  // Infield
  PITCHER = 'P',
  CATCHER = 'C',
  FIRST_BASE = '1B',
  SECOND_BASE = '2B',
  THIRD_BASE = '3B',
  SHORTSTOP = 'SS',

  // Outfield
  LEFT_FIELD = 'LF',
  CENTER_FIELD = 'CF',
  RIGHT_FIELD = 'RF',

  // Special positions
  SHORT_FIELDER = 'SF', // 10th fielder in slow-pitch softball
  EXTRA_PLAYER = 'EP', // Designated hitter who doesn't field
}
