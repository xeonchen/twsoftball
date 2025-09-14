# Screen Wireframes

> **Note**: This document contains detailed wireframes for all TW Softball PWA
> screens, optimized for mobile-first design with 48px minimum touch targets.

## Design Constraints

### Mobile-First Specifications

- **Primary Screen**: 375x667px (iPhone SE) minimum
- **Touch Targets**: 48x48px minimum (WCAG 2.1 AA)
- **Thumb Zone**: Critical actions within 120px of bottom
- **One-Handed**: All primary actions thumb-reachable
- **High Contrast**: Readable in bright sunlight

### Visual Hierarchy

1. **Score/Status** - Always visible, largest text
2. **Current Action** - Primary focus area
3. **Secondary Info** - Supporting context
4. **Navigation** - Minimal, contextual

---

## Screen 1: Home / Game List 📱

```
┌─────────────────────────┐
│ ⚡ TW Softball      ⚙️   │ <- Header (60px)
├─────────────────────────┤
│                         │
│ ┌─────────────────────┐ │ <- Active Game Card
│ │ 🟢 LIVE GAME        │ │    (if game in progress)
│ │ Warriors vs Eagles  │ │
│ │ 7-4 • Top 6th       │ │
│ │ ┌─────────────────┐ │ │
│ │ │ RESUME GAME     │ │ │ <- Primary CTA (48px)
│ │ └─────────────────┘ │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │    START NEW GAME   │ │ <- Large CTA (60px)
│ └─────────────────────┘ │
│                         │
│ Recent Games:           │ <- Section header
│                         │
│ ┌─────────────────────┐ │
│ │ Warriors 12-5 Eagles│ │ <- Game history cards
│ │ March 15, 2025      │ │    (48px touch target)
│ │ ● Completed         │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Tigers 8-7 Warriors │ │
│ │ March 8, 2025       │ │
│ │ ● Completed         │ │
│ └─────────────────────┘ │
│                         │
│ [More games...]         │
│                         │ <- Thumb zone starts here
│                         │
└─────────────────────────┘
```

### Key Elements:

- **Status Indicator**: Green dot for active game
- **Quick Resume**: Immediate access to active game
- **Large CTA**: "Start New Game" prominent and accessible
- **Game History**: Recent games with clear status
- **Minimal Navigation**: Settings icon only

### Interaction Patterns:

- Tap "Resume Game" → Go to Game Recording screen
- Tap "Start New Game" → Go to Game Setup wizard
- Tap game history → Go to Game Stats screen
- Tap settings → Go to Settings screen

---

## Screen 2: Game Setup Wizard - Step 1 (Teams) 🏁

```
┌─────────────────────────┐
│ ← New Game        1/3   │ <- Progress indicator
├─────────────────────────┤
│                         │
│ Team Names              │ <- Section header
│                         │
│ ┌─────────────────────┐ │
│ │ Away Team           │ │ <- Input labels
│ │ Eagles            ↑ │ │    (clear, large)
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Home Team           │ │
│ │ Warriors          ↑ │ │
│ └─────────────────────┘ │
│                         │
│ Which is your team?     │ <- Clear question
│                         │
│ ┌─────────┬────────────┐│
│ │ ○ Eagles│ ● Warriors ││ <- Radio buttons (large)
│ └─────────┴────────────┘│
│                         │
│                         │
│                         │
│                         │
│                         │
│                         │
│ ┌─────────────────────┐ │
│ │     CONTINUE        │ │ <- Primary CTA (thumb zone)
│ └─────────────────────┘ │ <- 48px height
└─────────────────────────┘
```

### Key Elements:

- **Progress Indicator**: Shows step 1 of 3
- **Back Button**: Clear exit path
- **Large Input Fields**: Easy typing on mobile
- **Radio Selection**: Visual selection of "our team"
- **Validation**: Continue button enabled only when valid

### Validation Rules:

- Both team names required (non-empty)
- Team names must be different
- Must select "our team"

---

## Screen 3: Game Setup Wizard - Step 2 (Lineup) ⚾

### Portrait Layout (375px width - Mobile Optimized)

```
┌─────────────────────────┐
│ ← Lineup Setup    2/3   │
├─────────────────────────┤
│ Warriors Starting:      │ <- Team name + player count
│ ┌─────────────────────┐ │
│ │ Players: 9▼ │📋 Load│ │ <- Count selector + cache
│ └─────────────────────┘ │    Previous Lineup button
├─────────────────────────┤
│ ┌─────────┬───────────┐ │ <- Tab-based navigation
│ │●BATTING │ AVAILABLE │ │    for narrow screens
│ │ ORDER   │           │ │
│ └─────────┴───────────┘ │
├─────────────────────────┤ <- Swipeable content area
│ ┌─────────────────────┐ │
│ │ 1. #8 Mike Chen     │ │ <- Full-width player cards
│ │    SS            [▼]│ │    with inline position edit
│ │ ────────────────────│ │    Drag handle on left
│ │ 🟰 ●●●●●●●●●●●●●●●● │ │ <- Drag indicator
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 2. [DROP ZONE]      │ │ <- Empty slot
│ │    Drag player here │ │
│ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │ │ <- Dashed border
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 3. #5 Lisa Park     │ │
│ │    CF            [▼]│ │
│ │ ────────────────────│ │
│ │ 🟰 ●●●●●●●●●●●●●●●● │ │
│ └─────────────────────┘ │
│ [... more slots ...]    │
├─────────────────────────┤
│ Position Check:         │ <- Position coverage
│ P●C●1B●2B●3B●SS●LF○CF●RF│    (horizontal on mobile)
├─────────────────────────┤
│ ┌──────────┬──────────┐ │
│ │ ← BACK   │CONTINUE →│ │ <- Navigation (48px)
│ └──────────┴──────────┘ │
└─────────────────────────┘
```

### Landscape Layout (667px width - Tablet Optimized)

```
┌───────────────────────────────────────────────────────────────────┐
│ ← Lineup Setup 2/3     │ Warriors │ Players: 9▼ │ 📋 Load Previous│
├───────────────────────────────────────────────────────────────────┤
│ BATTING ORDER            │ AVAILABLE PLAYERS       │              │
├──────────────────────────┼─────────────────────────┼──────────────┤
│ ┌──────────────────────┐ │ ┌─────────┐ ┌─────────┐ │ Position     │
│ │ 1. #8 Mike Chen      │ │ │ #12     │ │ #23     │ │ Coverage:    │
│ │    SS             [▼]│ │ │ Sara    │ │ Dave    │ │              │
│ └──────────────────────┘ │ │ RF   +  │ │ 3B   +  │ │ P ● C ●      │
│ ┌──────────────────────┐ │ └─────────┘ └─────────┘ │ 1B● 2B●      │
│ │ 2. [DROP ZONE]       │ │ ┌─────────┐ ┌─────────┐ │ 3B● SS●      │
│ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │ │ │ #19     │ │ #22     │ │ LF○ CF●      │
│ └──────────────────────┘ │ │ Amy     │ │ Alex    │ │ RF●          │
│ ┌──────────────────────┐ │ │ LF   +  │ │ OF   +  │ │              │
│ │ 3. #5 Lisa Park      │ │ └─────────┘ └─────────┘ │              │
│ │    CF             [▼]│ │                         │              │
│ └──────────────────────┘ │ [More players below...] │              │
│ [... 6 more slots ...]   │                         │              │
├──────────────────────────┼─────────────────────────┼──────────────┤
│ ┌──────────┬───────────┐ │                         │              │
│ │ ← BACK   │CONTINUE → │ │                         │              │
│ └──────────┴───────────┘ │                         │              │
└───────────────────────────────────────────────────────────────────┘
```

### Key Elements:

- **Player Count Selector**: Choose 9-12+ starting players
- **Two-Column Layout**: Batting order slots vs available players
- **Drag-and-Drop**: Primary interaction for lineup building
- **Load Previous**: Quick access to cached lineup
- **Inline Position Edit**: Dropdown without modal
- **Position Coverage**: Visual indicators for field positions
- **Smart Validation**: Real-time position conflict detection

### Interaction Patterns:

**Drag Behaviors:**

- Drag from Available → Empty slot: Assigns to batting order
- Drag from Available → Occupied slot: Swaps positions
- Drag within Batting Order: Reorders players
- Drag from Batting Order → Available: Removes from lineup

**Alternative Actions:**

- Tap "+" on available player → Assigns to next empty slot
- Tap position dropdown on placed player → Change position inline
- Long-press player card → Shows quick actions menu

### Visual Feedback:

```
┌─────────────────────────┐ <- During drag operation
│ BATTING ORDER │AVAILABLE│
├────────────────┬────────┤
│ ┌─┄─┄─┄─┄─┄─┐  │ ┌────┐ │ <- Drop zones highlight
│ │ 1. [DROP] │  │ │#12 │ │    with dashed borders
│ │    HERE   │  │ │Sara│ │
│ └─┄─┄─┄─┄─┄─┘  │ └────┘ │
│ ┌────────────┐ │        │
│ │2. #8 Mike  │ │ 🤏     │ <- Dragging indicator
│ │   SS       │ │ #5 Lisa│    shows what's moving
│ └────────────┘ │   CF   │
└─────────────────────────┘
```

---

## Screen 4: Game Setup Wizard - Step 3 (Confirm) ✅

```
┌─────────────────────────┐
│ ← Review Setup    3/3   │
├─────────────────────────┤
│ Game Summary            │
│                         │
│ Eagles @ Warriors       │ <- Matchup (large text)
│ March 15, 2025 • 7:00PM │ <- Game details
│                         │
│ Warriors Lineup:        │ <- Our team lineup
│ 1. #12 Sarah Johnson RF │
│ 2. #8 Mike Chen SS      │
│ 3. #5 Lisa Park CF      │
│ 4. #23 Dave Wilson 3B   │
│ 5. #7 Kim Lee C         │
│ 6. #15 Tom Garcia 1B    │
│ 7. #19 Amy Wu LF        │
│ 8. #11 Jose Rodriguez 2B│
│ 9. #9 Beth Cooper P     │
│ 10. #22 Alex Kim RF     │
│ 11. #14 Sam Taylor EP   │ <- Extra Player
│                         │
│ ⚠️ Make sure this is    │ <- Warning message
│    correct - you can    │
│    make substitutions   │
│    during the game      │
│                         │
│ ┌──────────┬──────────┐ │
│ │ ← BACK   │START GAME│ │ <- Final actions (48px)
│ └──────────┴──────────┘ │
└─────────────────────────┘
```

### Key Elements:

- **Complete Review**: All setup details visible
- **Warning Message**: Sets expectations about changes
- **Final Confirmation**: "Start Game" commits to beginning
- **Back Option**: Can still edit if needed

### Validation Before Start:

- Minimum 9 players required
- All positions filled
- No duplicate jersey numbers
- No duplicate players

---

## Screen 5: Game Recording (Main Interface) ⚾️

```
┌─────────────────────────┐ <- FIXED HEADER AREA
│ HOME 3 - 2 AWAY    ⚙️   │ <- Always visible score
├─────────────────────────┤
│ Top 3rd │ 2 Outs ↶ ↷    │ <- Game status + undo/redo
├─────────────────────────┤
│         ◇ 2B            │ <- Base display
│    3B ◆   ◆ 1B          │    ◆ = runner on base
│         ◇ H             │    ◇ = empty base
├─────────────────────────┤
│ Now Batting:            │ <- Current batter section
│ #12 Sarah Johnson       │    (large, prominent)
│ 4th │ RF │ 1-2 today    │
│                         │
│ Next: #8 Mike Chen (SS) │ <- Next batter preview
├═════════════════════════┤ <- SCROLLABLE ACTIONS AREA
│ ┌─────────────────────┐ │
│ │      SINGLE         │ │ <- Most common first
│ └─────────────────────┘ │    (60px height)
│ ┌─────────┬───────────┐ │ ║
│ │   OUT   │   WALK    │ │ ║ Scroll
│ └─────────┴───────────┘ │ ║ Area
│ ┌─────────┬───────────┐ │ ║ (all actions
│ │ DOUBLE  │  TRIPLE   │ │ ║ visible)
│ └─────────┴───────────┘ │ ║
│ ┌─────────┬───────────┐ │ ║
│ │HOME RUN │ STRIKEOUT │ │ ║
│ └─────────┴───────────┘ │ ║
│ ┌─────────┬───────────┐ │ ║
│ │GROUND O │  FLY OUT  │ │ ║
│ └─────────┴───────────┘ │ ║
│ ┌─────────┬───────────┐ │ ║
│ │ ERROR   │FIELD CHO  │ │ ║
│ └─────────┴───────────┘ │ ║
│ ┌─────────┬───────────┐ │ ║
│ │ SAC FLY │DOUBLE PLAY│ │ ║
│ └─────────┴───────────┘ │ ▼
│ ┌─────────────────────┐ │
│ │   TRIPLE PLAY       │ │ <- Less common at bottom
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Thumb Zone Optimization:

```
┌─────────────────────────┐
│ (Fixed Info Zone)       │ <- 0-240px: Always visible info
│ Score • Bases • Batter  │    Never scrolls
│                         │
├═════════════════════════┤ <- 240px: Scroll boundary
│ ┌─────────────────────┐ │ <- 240-340px: Primary actions
│ │      SINGLE         │ │    (thumb zone sweet spot)
│ └─────────────────────┘ │
│      OUT    │   WALK    │ <- 340-440px: Secondary actions
├─────────────┼───────────┤    (still reachable)
│    DOUBLE   │  TRIPLE   │ <- 440-540px: Less common
│ [Scroll for more...]    │    (scroll down for access)
└─────────────────────────┘ <- 600px+: Rare actions below
```

### Scrolling Behavior:

- **Momentum scrolling** with snap-to-button alignment
- **Most common actions** always visible (Single, Out, Walk)
- **Contextual ordering** based on game situation
- **Quick access** via swipe gestures for power users
- **Visual feedback** shows scrollable area with subtle gradient

### Button Priority Order:

1. **Always Visible**: Single, Out, Walk (80% of all plays)
2. **Scroll Zone**: Double, Triple, Home Run, Strikeout
3. **Deep Scroll**: Error, Fielder's Choice, Sacrifice plays
4. **Rare Plays**: Double Play, Triple Play, specialized situations

### Orientation Strategy for Game Recording:

**Portrait Mode (Preferred):**

- **One-handed operation**: All actions within thumb reach
- **Fixed header**: Score and game state always visible
- **Vertical scrolling**: Natural gesture for accessing more actions
- **Large touch targets**: 60px primary buttons for easy tapping
- **Thumb zone optimization**: Most common actions at 300-500px height

**Landscape Mode (Fallback):**

```
┌──────────────────────────────────────────────────────────────┐
│ HOME 3-2 AWAY  │ Top 3rd │ 2 Outs │ Next: Mike Chen    ⚙️    │ <- Compact header
├──────────────────────────────────────────────────────────────┤
│      ◇ 2B  │ Now Batting: #12 Sarah Johnson │  ●●●●●●●●●●●●  │
│ 3B ◆   ◆ 1B│ 4th │ RF │ 1-2 today           │  Action Scrl   │ <- Side layout
│      ◇ H   │                                │  ┌─────┬────┐  │
│            │                                │  │SING │OUT │  │
│            │                                │  │LE   │    │  │
│            │                                │  ├─────┼────┤  │
│            │                                │  │WALK │2B  │  │
│            │                                │  ├─────┼────┤  │
│            │                                │  │HR   │3B  │  │
│            │                                │  └─────┴────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Key Landscape Adaptations:**

- **Horizontal layout**: Base diagram, batter info, and actions side-by-side
- **Compact buttons**: 4 actions per row instead of 2
- **Shorter header**: More space for action buttons
- **Two-handed operation**: Acceptable since most users rotate intentionally

**When Users Switch Orientation:**

- **State preservation**: Current batter, count, and runners maintained
- **Focus restoration**: Previously selected button remains highlighted
- **Layout transition**: 300ms smooth animation between orientations
- **No data loss**: All game state persists through rotation

---

## Screen 6: Runner Adjustment Modal 🏃‍♂️

```
┌─────────────────────────┐
│ Adjust Runner Positions │ <- Modal header
├─────────────────────────┤
│ After: SINGLE by #12    │ <- Context
│ Sarah Johnson           │
├─────────────────────────┤
│ Batter (#12):           │ <- Batter advancement
│ ┌─────────────────────┐ │    (usually not adjustable)
│ │ ▼ Goes to 1st Base  │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ Runner on 1st (#8):     │ <- Each runner gets section
│ ┌─────────────────────┐ │
│ │ ▼ Advances to 2nd   │ │ <- Dropdown selector
│ │   ○ Stays at 1st    │ │    (shows all options)
│ │   ● Advances to 2nd │ │
│ │   ○ Advances to 3rd │ │
│ │   ○ Scores          │ │
│ │   ○ Out at 2nd      │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ Preview Result:         │ <- Outcome preview
│ • Batter safe at 1st    │
│ • Runner advances to 2nd│
│ • No runs scored        │
│ • 0 RBI awarded         │
├─────────────────────────┤
│ ┌──────────┬──────────┐ │
│ │  CANCEL  │ CONFIRM  │ │ <- Action buttons (48px)
│ └──────────┴──────────┘ │
└─────────────────────────┘
```

### Key Elements:

- **Clear Context**: What play triggered this
- **Per-Runner Control**: Individual adjustment for each
- **Dropdown Interface**: All advancement options visible
- **Live Preview**: Shows result of adjustments
- **Confirmation Required**: Prevents accidental changes

### Dropdown Options (Per Runner):

- **Stay at current base**
- **Advance 1 base** (default)
- **Advance 2 bases**
- **Advance 3 bases / Score**
- **Out at [next base]**

---

## Screen 7: Substitution Interface 🔄

```
┌─────────────────────────┐
│ ← Player Substitution   │
├─────────────────────────┤
│ Current Lineup:         │ <- Active players section
│                         │
│ ┌─────────────────────┐ │
│ │ 1. #12 Sarah Johnson│ │ <- Each lineup slot
│ │    RF • Batting     │ │    (tap to substitute)
│ │    [SUBSTITUTE]     │ │ <- Action button (48px)
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 2. #8 Mike Chen     │ │
│ │    SS • On Base     │ │ <- Status indicators
│ │    [SUBSTITUTE]     │ │
│ └─────────────────────┘ │
│ [Continue for all...]   │
│                         │
│ Available Players:      │ <- Bench section
│                         │
│ ┌─────────────────────┐ │
│ │ #22 Alex Kim        │ │ <- Bench players
│ │ OF • Available      │ │    (ready to sub in)
│ │ [SELECT]            │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ #14 Sam Taylor      │ │
│ │ IF • Available      │ │
│ │ [SELECT]            │ │
│ └─────────────────────┘ │
│                         │
│ Recent Substitutions:   │ <- History section
│ #19 Amy Wu → #22 Alex   │    (shows who was subbed)
│ Inning 4 • Can re-enter │ <- Re-entry eligibility
└─────────────────────────┘
```

### Substitution Flow:

1. **Select Player Out**: Tap [SUBSTITUTE] on active player
2. **Select Player In**: Tap [SELECT] on bench player
3. **Position Assignment**: Choose field position
4. **Rule Validation**: App checks eligibility
5. **Confirmation**: Preview and confirm change

### Substitution Modal:

```
┌─────────────────────────┐
│ Substitute Player       │
├─────────────────────────┤
│ Out: #12 Sarah Johnson  │ <- Players involved
│ In:  #22 Alex Kim       │
│                         │
│ Batting Position: 4th   │ <- Slot in order
│                         │
│ Field Position:         │ <- Position assignment
│ ┌─────────────────────┐ │
│ │ Right Field       ▼ │ │ <- Dropdown
│ └─────────────────────┘ │
│                         │
│ ✅ Alex Kim eligible    │ <- Rule checking
│ ✅ Sarah can re-enter   │
│                         │
│ ┌──────────┬──────────┐ │
│ │  CANCEL  │SUBSTITUTE│ │
│ └──────────┴──────────┘ │
└─────────────────────────┘
```

---

## Screen 8: Game Statistics View 📊

```
┌─────────────────────────┐
│ ← Game Stats            │
├─────────────────────────┤
│ Warriors 7 - Eagles 4   │ <- Final/current score
│ Top 6th • 2 Outs        │ <- Game status
│                         │
│ ┌─────────┬───────────┐ │
│ │ BATTING │ FIELDING  │ │ <- Tab selection
│ └─────────┴───────────┘ │
│                         │
│ Player Stats:           │ <- Individual stats
│                         │
│ ┌─────────────────────┐ │
│ │ #12 Sarah Johnson   │ │ <- Player card
│ │ 2-3, 2 RBI, 1 R     │ │    (expandable for details)
│ │ .667 AVG            │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ #8 Mike Chen        │ │
│ │ 1-2, 0 RBI, 1 R     │ │
│ │ .500 AVG            │ │
│ └─────────────────────┘ │
│ [Continue for all...]   │
│                         │
│ Team Totals:            │ <- Team statistics
│ Hits: 12 • Runs: 7      │
│ RBIs: 6 • LOB: 8        │
│                         │
│ ┌─────────────────────┐ │
│ │      SHARE STATS    │ │ <- Share functionality
│ └─────────────────────┘ │
└─────────────────────────┘
```

### Player Detail Modal:

```
┌─────────────────────────┐
│ #12 Sarah Johnson Stats │
├─────────────────────────┤
│ At-Bat Results:         │
│ Inning 1: Single        │ <- Complete AB history
│ Inning 3: Walk          │
│ Inning 5: RBI Double    │
│                         │
│ Game Totals:            │
│ At-Bats: 3              │
│ Hits: 2                 │
│ RBI: 2                  │
│ Runs: 1                 │
│ Average: .667           │
│                         │
│ Position: RF            │
│ Fielding: 0 errors      │
│                         │
│ ┌─────────────────────┐ │
│ │       CLOSE         │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

## Screen 9: Settings & Configuration ⚙️

```
┌─────────────────────────┐
│ ← Settings              │
├─────────────────────────┤
│                         │
│ Game Settings           │ <- Section headers
│                         │
│ ┌─────────────────────┐ │
│ │ Mercy Rule          │ │ <- Toggle switches
│ │ 15 runs after 5th   │ │    (48px touch targets)
│ │              ●━━━○  │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Auto-advance runners│ │
│ │ Smart defaults      │ │
│ │              ●━━━○  │ │
│ └─────────────────────┘ │
│                         │
│ Display Settings        │
│                         │
│ ┌─────────────────────┐ │
│ │ High contrast mode  │ │
│ │ Better sunlight     │ │
│ │              ○━━━●  │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Large touch targets │ │
│ │ Accessibility       │ │
│ │              ●━━━○  │ │
│ └─────────────────────┘ │
│                         │
│ Data & Sync             │
│                         │
│ ┌─────────────────────┐ │
│ │ Export Game Data    │ │ <- Action buttons
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Sync Status         │ │
│ │ Last: 2 min ago ✅  │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

## Responsive Design Strategy 📱↔️📋

### Orientation-Adaptive Layouts

The TW Softball PWA uses responsive design principles to optimize user
experience across different device orientations while maintaining consistency
and usability.

#### Design Breakpoints:

- **Portrait Mobile**: 375px width (iPhone SE baseline)
- **Landscape Tablet**: 667px+ width (rotated phones, small tablets)
- **Large Landscape**: 900px+ width (tablets, desktop)

#### Screen-Specific Strategies:

**Screen 3 (Lineup Setup) - Dual Mode:**

```css
/* Portrait: Tab-based interface */
@media (orientation: portrait) and (max-width: 520px) {
  .lineup-container {
    display: flex;
    flex-direction: column;
  }
  .player-sections {
    display: none; /* Hide non-active tabs */
  }
  .player-sections.active {
    display: block;
  }
}

/* Landscape: Side-by-side columns */
@media (orientation: landscape) or (min-width: 521px) {
  .lineup-container {
    display: grid;
    grid-template-columns: 1fr 1fr 200px;
    gap: 16px;
  }
  .position-coverage {
    grid-column: 3;
  }
}
```

**Screen 5 (Game Recording) - Portrait Optimized:**

```css
/* Always optimized for portrait/one-handed use */
.game-recording {
  max-width: 400px;
  margin: 0 auto;
}

/* Landscape fallback */
@media (orientation: landscape) {
  .fixed-header {
    height: 120px; /* Shorter header */
  }
  .action-buttons {
    grid-template-columns: repeat(4, 1fr);
    /* More buttons per row */
  }
}
```

### Interaction Adaptations:

#### Drag-and-Drop Responsive Behavior:

**Portrait Mode (375px):**

- **Tab-based workflow**: Drag from "Available" tab to "Batting Order" tab
- **Auto-scroll**: Dragging near screen edges triggers content scroll
- **Large drop zones**: Full-width target areas for easier dropping
- **Visual feedback**: Floating drag indicator shows destination tab

**Landscape Mode (667px+):**

- **Direct drag**: Between visible columns without tab switching
- **Parallel scrolling**: Both columns scroll independently
- **Multiple drop targets**: Visible slots and swap opportunities
- **Spatial awareness**: Users see full context while dragging

#### Touch Target Scaling:

```css
/* Base touch targets */
.touch-target {
  min-height: 48px;
  min-width: 48px;
}

/* Portrait: Larger targets for thumb reach */
@media (orientation: portrait) {
  .primary-action {
    min-height: 60px;
  }
  .drag-handle {
    width: 60px; /* Easier to grab */
  }
}

/* Landscape: More compact for precision */
@media (orientation: landscape) {
  .player-card {
    padding: 8px;
    margin: 4px;
  }
}
```

### Transition Behavior:

**Orientation Change Handling:**

- **State preservation**: Current lineup state maintained during rotation
- **Smooth transitions**: 300ms animation between layouts
- **Focus management**: Restore focus to equivalent element
- **Error prevention**: Block orientation during drag operations

**Performance Optimizations:**

- **Layout caching**: Pre-calculate both orientations
- **Lazy loading**: Load orientation-specific assets on demand
- **Memory management**: Clean up unused layout components

### User Experience Guidelines:

#### When to Support Both Orientations:

✅ **Lineup Management** (Screen 3) - Benefits from extra space ✅ **Statistics
View** (Screen 8) - Charts and tables work well ✅ **Settings** (Screen 9) -
Simple forms adapt easily

#### When to Prefer Portrait:

🎯 **Game Recording** (Screen 5) - One-handed operation critical 🎯 **Game Setup
Wizard** (Screens 2, 4) - Sequential flow works better 🎯 **Modal dialogs** -
Focused interactions

#### Responsive Testing Strategy:

- **Primary**: Test in portrait on 375px width device
- **Secondary**: Verify landscape functionality on 667px+ width
- **Edge cases**: Test orientation change during interactions
- **Accessibility**: Ensure screen readers work in both modes

This responsive approach ensures optimal usability regardless of how coaches
prefer to hold their devices while maintaining the core user experience
principles.

---

## Global Navigation Patterns 🧭

### Primary Navigation (During Game):

- **Back Button**: Always present, context-aware
- **Settings**: Gear icon in header
- **Home**: Long-press back button
- **Emergency Exit**: Hold back + settings (3 seconds)

### Modal Navigation:

- **Overlay Pattern**: Darken background, focus on modal
- **Clear Actions**: Cancel vs Confirm always present
- **Escape Hatches**: Tap outside to cancel (where safe)

### Drag-and-Drop Interaction Patterns

#### Visual Feedback System:

```
Drag State Visual Indicators:
┌──────────────────────────┐
│ 🤏 Dragging #12 Sarah    │ <- Floating drag indicator
│    RF → Batting Order    │    Shows what's moving + destination
├──────────────────────────┤
│ ┌─┄─┄─┄─┄─┄─┄─┄─┄─┄─┐.   │ <- Drop zones highlight
│ │ 3. [DROP HERE]    │.   │    with dashed borders
│ └─┄─┄─┄─┄─┄─┄─┄─┄─┄─┘.   │
│ ┌───────────────────────┐│ <- Valid targets get green
│ │ 4. ✓ Can Drop Here    ││    background, invalid are
│ └───────────────────────┘│    red/disabled
│ ┌───────────────────────┐│
│ │ 5.❌ Position Conflict││ <- Visual validation
│ └───────────────────────┘│
└──────────────────────────┘
```

#### Touch Gestures and Behaviors:

**Drag Initiation:**

- **Long Press** (300ms): Activates drag mode, shows visual feedback
- **Immediate Lift**: Cancels drag, returns to original position
- **Drag Threshold**: 10px movement required to start drag
- **Orientation Lock**: Prevents device rotation during drag operations

**During Drag (Portrait Mode):**

- **Tab Switching**: Dragging near tab headers switches between sections
- **Auto-Scroll**: Vertical scrolling within active tab area
- **Visual Breadcrumbs**: Floating indicator shows source → destination tab
- **Haptic Feedback**: Light tap when entering valid drop zones
- **Edge Navigation**: Drag to screen edges to switch tabs

**During Drag (Landscape Mode):**

- **Column Awareness**: Visual connection between source and target columns
- **Parallel Scrolling**: Independent scroll for batting order and available
  players
- **Multiple Targets**: Highlight all valid drop zones simultaneously
- **Spatial Feedback**: Drop shadows show where item will land
- **Cross-Column Dragging**: Smooth animation across column boundaries

**Drop Actions:**

- **Valid Drop**: Smooth animation to final position with orientation-specific
  easing
- **Invalid Drop**: Spring-back animation to origin (faster in portrait)
- **Swap Operation**: Both items animate to new positions
- **Position Change**: Updates validation indicators immediately
- **Cross-Tab Drop**: (Portrait) Automatic tab switching with confirmation

#### Accessibility Considerations:

- **Screen Reader**: Announces drag state and drop targets
- **Keyboard Navigation**: Arrow keys for drag-and-drop alternative
- **High Contrast**: Drop zones visible in all display modes
- **Large Touch Targets**: Minimum 48px for all draggable elements

#### Fallback Mechanisms:

For users who prefer or need alternatives to drag-and-drop:

**Tap-to-Move Mode:**

1. Tap player card → Shows action menu
2. Select "Move to Position X" → Direct assignment
3. Select "Swap with Player Y" → Position exchange
4. Select "Remove from Lineup" → Return to bench

**Voice Control:**

- "Move Sarah Johnson to third position"
- "Swap positions two and five"
- "Remove player from lineup"

**Undo System:**

- Every drag action creates undo checkpoint
- Shake gesture for quick undo (with confirmation)
- Visual undo button with action preview

### Browser Navigation Protection:

```javascript
// Prevent accidental navigation during active game
if (gameInProgress) {
  window.addEventListener('beforeunload', e => {
    e.preventDefault();
    e.returnValue = 'Game in progress. Sure you want to leave?';
  });

  window.addEventListener('popstate', e => {
    // Push state back, show in-app warning
    history.pushState(null, '', location.href);
    showNavigationWarning();
  });
}
```

### Accessibility Features:

- **48px minimum touch targets** (WCAG 2.1 AA)
- **High contrast mode** for sunlight readability
- **Screen reader support** for all interactive elements
- **Keyboard navigation** for all functions
- **Focus indicators** clearly visible

### Performance Considerations:

- **Instant feedback** on all taps (<50ms)
- **Skeleton screens** during loading
- **Optimistic updates** for offline actions
- **Progressive loading** for large datasets

### Data Persistence & Caching Strategy

#### Lineup Caching System:

```javascript
// Cached lineup data structure
interface CachedLineup {
  teamName: string;
  lastUsed: Date;
  players: Array<{
    id: string;
    name: string;
    jersey: string;
    battingOrder: number;
    fieldPosition: FieldPosition;
    isStarter: boolean;
  }>;
  gameSettings: {
    playerCount: number;
    ruleVariant: string;
  };
}
```

**Storage Implementation:**

- **Primary**: IndexedDB for offline-first capabilities
- **Fallback**: localStorage with 5MB quota management
- **Cloud Sync**: Optional backup to prevent data loss

**Caching Behavior:**

- **Auto-save**: Every lineup change saves immediately
- **Multiple Lineups**: Store last 5 lineups per team
- **Smart Suggestions**: Rank by usage frequency and recency
- **Conflict Resolution**: Prefer local changes, offer merge options

#### Cache Management:

**Load Previous Lineup Flow:**

1. User taps "📋 Load Previous" button
2. Show cached lineups sorted by recency
3. Preview lineup with player availability check
4. One-tap import with automatic position validation
5. Handle missing players gracefully (mark unavailable)

**Smart Defaults:**

- **Player Positions**: Remember each player's preferred positions
- **Batting Order**: Suggest based on historical performance
- **Substitution Patterns**: Cache common sub combinations

#### Data Validation & Migration:

**Validation Rules:**

- Verify player IDs exist in current roster
- Check position assignments are valid
- Ensure batting order sequence is complete
- Validate jersey number uniqueness

**Migration Strategy:**

- **Version Detection**: Schema version tracking
- **Graceful Degradation**: Handle missing fields
- **Data Recovery**: Attempt to reconstruct from partial data
- **User Notification**: Inform of any data issues or losses

#### Privacy & Storage Limits:

- **Local Only**: Sensitive lineup data never leaves device by default
- **Quota Management**: Auto-cleanup old cache when approaching limits
- **Export Options**: Allow users to backup/restore lineup data
- **Clear Cache**: Settings option to reset all cached lineups

This caching system ensures coaches can quickly set up games using proven
lineups while maintaining data integrity and user privacy.
