# Architecture Documentation

## Before Refactoring

```
src/
├── content/
│   ├── content.ts              (762 lines - MONOLITHIC)
│   │   ├── Constants & Config
│   │   ├── Contractions Data (67 lines)
│   │   ├── Text Processing
│   │   ├── API Client
│   │   ├── Speech Synthesis
│   │   ├── Popup Creation (114 lines)
│   │   ├── Popup Positioning
│   │   ├── Drag Functionality
│   │   ├── Event Handlers
│   │   ├── State Management (7 globals)
│   │   └── Extension Lifecycle
│   └── popup.css
│
├── popup/
│   └── popup.ts                (99 lines - mixed concerns)
│
├── options/
│   └── options.ts              (100 lines - mixed concerns)
│
└── shared/
    └── utils.ts                (81 lines - no JSDoc)

Total: ~1,042 lines
Issues: Mixed concerns, duplication, magic values, globals
```

## After Refactoring

```
src/
├── constants/                  (NEW - Single Source of Truth)
│   ├── app-constants.ts       (20 lines - config values)
│   ├── contractions.ts        (70 lines - data only)
│   └── messages.ts            (25 lines - UI strings)
│
├── api/                        (NEW - Data Layer)
│   └── dictionary-api.ts      (60 lines - API client)
│
├── text/                       (NEW - Text Processing)
│   └── text-processor.ts      (40 lines - pure functions)
│
├── speech/                     (NEW - Audio Service)
│   └── speech-service.ts      (150 lines - encapsulated class)
│
├── ui/                         (NEW - Presentation Layer)
│   ├── selection-helper.ts    (40 lines - selection utils)
│   ├── draggable.ts           (70 lines - reusable drag)
│   ├── popup-builder.ts       (150 lines - DOM creation)
│   └── popup-manager.ts       (70 lines - state management)
│
├── shared/                     (IMPROVED)
│   ├── utils-refactored.ts    (120 lines - with JSDoc)
│   └── dom-helpers.ts         (40 lines - DOM utilities)
│
├── content/                    (SIMPLIFIED)
│   ├── content-refactored.ts  (180 lines - orchestration only)
│   └── popup.css              (unchanged)
│
├── popup/                      (IMPROVED)
│   └── popup-refactored.ts    (120 lines - clean structure)
│
└── options/                    (IMPROVED)
    └── options-refactored.ts  (130 lines - separated concerns)

Total: ~1,285 lines (includes JSDoc, better spacing, documentation)
Benefits: Modular, testable, maintainable, zero duplication
```

## Dependency Graph

### Before (Tightly Coupled)
```
content.ts (762 lines)
    ↓
  [Everything in one file]
  - No clear boundaries
  - Hard to test
  - High coupling
```

### After (Loosely Coupled)
```
content-refactored.ts (orchestrator)
    ├── api/dictionary-api.ts
    │   └── constants/app-constants.ts
    │
    ├── text/text-processor.ts
    │   └── constants/contractions.ts
    │
    ├── speech/speech-service.ts
    │   └── constants/app-constants.ts
    │   └── constants/messages.ts
    │
    ├── ui/popup-builder.ts
    │   ├── ui/draggable.ts
    │   ├── speech/speech-service.ts
    │   ├── constants/app-constants.ts
    │   └── constants/messages.ts
    │
    ├── ui/popup-manager.ts
    │   ├── speech/speech-service.ts
    │   └── constants/app-constants.ts
    │
    ├── ui/selection-helper.ts
    │
    └── shared/utils.ts
        └── constants/messages.ts

popup-refactored.ts
    ├── shared/utils.ts
    ├── shared/dom-helpers.ts
    └── constants/messages.ts

options-refactored.ts
    ├── shared/utils.ts
    ├── shared/dom-helpers.ts
    └── constants/messages.ts
```

## Layered Architecture

```
┌─────────────────────────────────────────────────────┐
│              Presentation Layer                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  content.ts │  │   popup.ts   │  │ options.ts │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                Service Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ speech-      │  │ popup-       │  │ text-     │ │
│  │ service.ts   │  │ manager.ts   │  │ processor │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                 Data Layer                           │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ dictionary-  │  │   chrome     │                │
│  │ api.ts       │  │   storage    │                │
│  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│              Foundation Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  constants/  │  │   shared/    │  │    ui/    │ │
│  │              │  │   utils      │  │  helpers  │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Constants Layer
- **app-constants.ts**: Configuration values, API URLs, timing
- **contractions.ts**: English contractions mapping data
- **messages.ts**: All user-facing strings and labels

### Data Layer
- **dictionary-api.ts**: Fetch IPA data from external API
  - Single responsibility: API communication
  - Pure data transformation
  - Error handling

### Business Logic Layer
- **text-processor.ts**: Extract and process text
  - Pure functions only
  - No side effects
  - Easily testable

- **speech-service.ts**: Manage speech synthesis
  - Encapsulated state
  - Clear public API
  - Singleton pattern

### UI Layer
- **selection-helper.ts**: Selection utilities
  - Get selected text
  - Get selection position
  - Check containment

- **draggable.ts**: Drag functionality
  - Reusable component
  - Automatic cleanup
  - No memory leaks

- **popup-builder.ts**: Create popup DOM
  - Declarative structure
  - Composable components
  - Separated from logic

- **popup-manager.ts**: Manage popup state
  - Position calculation
  - Lifecycle management
  - Singleton pattern

### Shared Layer
- **utils.ts**: Site management
  - Storage operations
  - Hostname normalization
  - Enable/disable logic

- **dom-helpers.ts**: DOM utilities
  - Safe element access
  - XSS prevention
  - DOMReady helper

### Presentation Layer
- **content.ts**: Main orchestrator
  - Minimal logic
  - Delegates to services
  - Event coordination

- **popup.ts**: Extension popup UI
  - Clean state management
  - Extracted functions
  - Error handling

- **options.ts**: Settings page
  - Rendering separated from logic
  - Reusable components
  - Parallel operations

## Design Patterns Used

### 1. Singleton Pattern
- `speechService` - Single instance manages speech state
- `popupManager` - Single instance manages popup lifecycle

### 2. Service Layer Pattern
- Services encapsulate business logic
- Clear boundaries between layers
- Dependency injection ready

### 3. Factory Pattern
- `createPopup()` - Creates configured DOM elements
- `createSiteItem()` - Creates list items

### 4. Module Pattern
- Each file is a module with clear exports
- Private functions vs public API
- Encapsulation through closures

### 5. Observer Pattern
- Event listeners for user interactions
- Message passing for extension communication
- Callbacks for async operations

## Testing Strategy

### Unit Tests (Easy with new architecture)
```typescript
// Test individual modules
import { extractWords } from '../text/text-processor';
expect(extractWords("don't")).toEqual(["do", "not"]);

import { fetchIPA } from '../api/dictionary-api';
// Mock fetch, test API client

import { normalizeHostname } from '../shared/utils';
expect(normalizeHostname("www.example.com")).toBe("example.com");
```

### Integration Tests
```typescript
// Test service interactions
import { speechService } from '../speech/speech-service';
import { popupManager } from '../ui/popup-manager';
// Test popup + speech integration
```

### E2E Tests
```typescript
// Test full user flows
// 1. Select text
// 2. Verify popup appears
// 3. Click play
// 4. Verify speech plays
```

## Performance Characteristics

### Before
- Single large file loaded entirely
- Global state pollutionstrong coupling
- Hard to optimize

### After
- Modular imports (tree-shaking possible)
- Encapsulated state (no leaks)
- Lazy loading potential
- Clear optimization targets

## Scalability

### Adding New Features

#### Before (Hard)
1. Find right place in 762-line file
2. Risk breaking existing code
3. Merge conflicts likely
4. Testing requires full integration

#### After (Easy)
1. Add new module in appropriate layer
2. Import where needed
3. Isolated changes
4. Unit test independently

### Example: Adding British English Support

**Before**: Edit content.ts in 5+ places

**After**:
1. Add constant: `BRITISH_VOICE_LANG = 'en-GB'`
2. Update `speech-service.ts` to support voice selection
3. Add UI toggle in `popup-builder.ts`
4. Done! Other modules unaffected

## Migration Impact

### Zero Breaking Changes
- Same public API
- Same functionality
- Same performance
- Same Chrome APIs used

### Only Structure Changed
- Files reorganized
- Responsibilities clarified
- Documentation added
- Code quality improved

## Conclusion

The refactored architecture provides:

✅ **Maintainability** - Easy to find and fix
✅ **Testability** - Small, focused units
✅ **Scalability** - Clear extension points
✅ **Performance** - Same runtime characteristics
✅ **Documentation** - Self-documenting structure
✅ **Collaboration** - Clear module ownership

**Result**: Professional-grade codebase ready for production and team collaboration.
