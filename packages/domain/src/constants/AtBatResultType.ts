export enum AtBatResultType {
  // Hits
  SINGLE = '1B',
  DOUBLE = '2B',
  TRIPLE = '3B',
  HOME_RUN = 'HR',

  // On base (not hits)
  WALK = 'BB',
  ERROR = 'E',
  FIELDERS_CHOICE = 'FC',

  // Outs
  STRIKEOUT = 'SO',
  GROUND_OUT = 'GO',
  FLY_OUT = 'FO',
  DOUBLE_PLAY = 'DP',
  TRIPLE_PLAY = 'TP',

  // Sacrifice
  SACRIFICE_FLY = 'SF',
}
