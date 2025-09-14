# User Personas & Research

> **Note**: This document defines the primary users for TW Softball PWA, their
> needs, pain points, and how our design decisions address them.

## Primary Persona: Sarah the Scorekeeper 📝

### Demographics

- **Age**: 35-50
- **Role**: Volunteer scorekeeper for adult softball league
- **Tech Comfort**: Moderate (uses smartphone daily, comfortable with apps)
- **Experience**: 2-3 years keeping score, knows baseball/softball rules well

### Context & Environment

- **Physical Setting**: Sitting/standing at field, often in direct sunlight
- **Device Usage**: Holding phone in one hand while managing scorebook
- **Interruptions**: Players asking about stats, coaches requesting information
- **Time Pressure**: Must record events quickly to keep up with game pace
- **Network**: Often poor or no connectivity at remote fields

### Goals & Motivations

1. **Accuracy First**: Record every play correctly without mistakes
2. **Speed**: Keep up with game pace, don't slow down the game
3. **Reliability**: Never lose data due to technical issues
4. **Recognition**: Be known as the "good scorekeeper" teams request

### Pain Points & Frustrations

#### Current Pain Points

- **Sun Glare**: Can't see phone screen in bright sunlight
- **Fat Finger Errors**: Accidentally tapping wrong buttons on small targets
- **Context Switching**: Looking between field, scorebook, and phone
- **Data Loss Anxiety**: Fear of losing game data if phone dies/crashes
- **Complexity**: Current scorekeeping apps are too complicated
- **Network Dependency**: Apps that require internet don't work at remote fields

#### Specific Frustrations

```
"I was in the 7th inning when my phone died and lost everything"
"The app crashed when I tried to undo a mistake"
"I can't see anything on my screen when the sun is behind me"
"It takes 5+ taps just to record a simple single"
"Why do I need internet to keep score?"
```

### User Behavior Patterns

- **Single-handed Operation**: Often holds scorebook in one hand, phone in other
- **Quick Glances**: Looks at phone briefly, then back to field
- **Muscle Memory**: Develops patterns for common actions
- **Error Correction**: Makes 2-3 mistakes per game that need undoing
- **Batch Updates**: Sometimes records multiple at-bats when busy

### Technology Profile

- **Device**: iPhone 12 or newer, Android flagship (last 3 years)
- **Apps Used**: Calculator, Weather, Messaging, Social Media
- **Comfort Level**: Can install apps, use settings, troubleshoot basic issues
- **Learning Style**: Prefers visual cues and consistent patterns

### Success Criteria for Sarah

- [ ] Can record any at-bat in <5 seconds
- [ ] Never loses data during a game
- [ ] Can fix mistakes easily with undo
- [ ] App works without internet connection
- [ ] Can see screen clearly in bright sunlight
- [ ] Touch targets are large enough for accurate tapping

---

## Secondary Persona: Coach Mike 👨‍🏫

### Demographics

- **Age**: 40-55
- **Role**: Assistant coach for competitive adult softball team
- **Tech Comfort**: Basic to moderate (smartphone, email, social media)
- **Experience**: 10+ years coaching, deep understanding of strategy

### Context & Environment

- **Physical Setting**: Dugout during games, clipboard and phone juggling
- **Usage Timing**: Between innings, during timeouts, post-game analysis
- **Mental State**: Strategic thinking, time pressure for decisions
- **Focus**: Player performance, matchup decisions, substitutions

### Goals & Motivations

1. **Strategic Advantage**: Use data to make better coaching decisions
2. **Player Development**: Track individual performance trends
3. **Quick Decisions**: Access stats quickly during game situations
4. **Team Management**: Coordinate substitutions and lineup changes

### Pain Points

- **Time Pressure**: Limited time between innings to make decisions
- **Data Overload**: Needs relevant stats quickly, not everything
- **Substitution Complexity**: Hard to track who can/can't re-enter game
- **Multi-tasking**: Managing players while trying to check stats

### User Behavior Patterns

- **Quick Lookups**: Needs specific player stats in <10 seconds
- **Delegation**: Often asks scorekeeper to make changes
- **Strategic Focus**: Cares about situational statistics
- **Team Communication**: Shares information with players immediately

### Success Criteria for Mike

- [ ] Can view player batting average in <3 taps
- [ ] Can make substitutions without consulting complex rules
- [ ] Can see who's available on bench at any time
- [ ] Gets alerts about re-entry eligibility
- [ ] Can focus on coaching while scorekeeper handles details

---

## Edge Case Persona: Jenny the Newcomer 🆕

### Demographics

- **Age**: 25-35
- **Role**: New team member volunteering to keep score
- **Tech Comfort**: High (digital native, uses complex apps daily)
- **Experience**: Knows basic baseball/softball but new to scorekeeping

### Context & Environment

- **Learning Phase**: First few games, needs guidance
- **Confidence**: Tech-savvy but unsure about softball rules
- **Support**: Relies on experienced players for rule clarifications
- **Pressure**: Doesn't want to mess up important games

### Goals & Motivations

1. **Learn Quickly**: Master scorekeeping basics in first few games
2. **Avoid Mistakes**: Don't embarrass herself or slow down game
3. **Build Confidence**: Become competent scorekeeper for team
4. **Contribute**: Help team while learning the sport better

### Pain Points

- **Rule Confusion**: Unsure when RBIs are awarded
- **Terminology**: Doesn't know all softball-specific terms
- **Pressure**: Experienced players expect accuracy
- **Overthinking**: Second-guesses every decision

### Success Criteria for Jenny

- [ ] App provides helpful hints and explanations
- [ ] Clear visual feedback confirms actions are correct
- [ ] Easy to undo mistakes without judgment
- [ ] Gradual complexity (can start simple, add features)
- [ ] Built-in glossary for softball terms

---

## Persona-Driven Design Decisions

### For Sarah (Primary User)

1. **Large Touch Targets** (48px minimum) → Prevents fat finger errors
2. **High Contrast Colors** → Readable in bright sunlight
3. **Offline-First Design** → Works at remote fields
4. **Single-Handed Operation** → Thumb-reachable critical actions
5. **Prominent Undo Button** → Easy error correction
6. **Minimal Taps** → Common actions in 1-3 taps maximum

### For Coach Mike (Secondary User)

1. **Quick Stats Access** → Player performance in 2-3 taps
2. **Substitution Wizard** → Guided process with eligibility checks
3. **Bench Overview** → Clear view of available players
4. **Delegation Friendly** → Scorekeeper can handle most tasks

### For Jenny (Edge Case)

1. **Progressive Disclosure** → Start simple, reveal complexity gradually
2. **Contextual Help** → Hints and explanations when needed
3. **Forgiving Interface** → Easy undo, clear confirmations
4. **Visual Feedback** → Clear indication of what actions accomplish

### Cross-Persona Requirements

1. **Consistent Patterns** → Same interaction model throughout
2. **Fast Performance** → Instant response to taps
3. **Reliable State** → Never lose progress
4. **Clear Hierarchy** → Most important actions most prominent
5. **Accessible Design** → Works for various visual/motor abilities

---

## User Research Validation

### Research Methods Used

1. **Informal Interviews** → 5 experienced scorekeepers
2. **Observation** → Watching current scorekeeping at 3 games
3. **Pain Point Analysis** → Common frustrations identified
4. **Technology Audit** → Current app usage patterns
5. **Competitive Analysis** → Existing scorekeeping solutions

### Key Insights

- **Speed vs Accuracy**: Users prioritize accuracy over speed, but need both
- **Interruption Handling**: Must work when attention is divided
- **Physical Constraints**: One-handed operation is critical
- **Environmental Challenges**: Sunlight glare is major usability barrier
- **Data Anxiety**: Fear of losing work is primary concern
- **Learning Curve**: Even simple apps need onboarding for domain-specific tasks

### Design Principles Derived

1. **Thumb-First Design** → All critical actions in thumb reach zone
2. **Confirmation Over Speed** → Better to confirm than have errors
3. **Visual Clarity** → High contrast, large text, clear icons
4. **Fault Tolerance** → Easy undo, auto-save, offline capability
5. **Progressive Enhancement** → Core functions work, nice-to-haves are bonus

---

## Persona Application in Features

| Feature              | Sarah's Need                | Mike's Need                  | Jenny's Need           |
| -------------------- | --------------------------- | ---------------------------- | ---------------------- |
| **At-Bat Recording** | Fast, accurate, one-handed  | Delegatable to scorekeeper   | Guided with hints      |
| **Undo/Redo**        | Prominent, visual preview   | Quick correction of mistakes | Forgiving, educational |
| **Base Display**     | Clear runner positions      | Strategic overview           | Visual understanding   |
| **Substitutions**    | Rule-compliant workflow     | Player availability focus    | Step-by-step guidance  |
| **Stats View**       | Complete game summary       | Key performance metrics      | Learning tool          |
| **Offline Support**  | Essential for remote fields | Nice to have                 | Reduces anxiety        |

This persona-driven approach ensures every design decision serves real user
needs rather than abstract requirements.
