# Project Requirements & Memory

## Initial Request
- Create a Next.js project with TypeScript and Tailwind CSS
- Implement a wallet component with:
  - ETH/USD price display
  - Animated chart visualization
  - Prize pool and payout information
  - Bottom navigation
  - Yellow card design

## Swipe Animation - COMPLETED
- Add Bumble-style swipe animation to the main yellow card
- Card contains:
  - ETH/USD text
  - Price ($41,812.14)
  - Graph/chart
  - Next round info
  - Payout details (Down 1.5x, Up 2.5x)
- **Fixed elements (DO NOT move):**
  - Top icons (Avatar, Search, Bell)
  - Bottom navigation bar
- **Swipeable element:**
  - Only the yellow card should swipe right or left
- **Important constraints:**
  - Do NOT change the design
  - Do NOT make textual changes
  - Do NOT add any content
  - Only add swipe functionality

## Card Stack System - COMPLETED (v1)
- Implement a stack of cards (numbered 1 to n)
- When the current card is swiped away (right or left):
  - It fades/flies away in that direction
  - The card underneath (card 2, 3, 4, etc.) takes its place
  - This continues for multiple cards in sequence
- All cards have the same content
- Cards are stacked on top of each other
- Only the top card is swipeable

## Endless Cards + 2D Look - COMPLETED
- Make cards endless - keep generating new cards infinitely
- Remove 3D rising effect when swiping away cards
- Make the transition solid and 2D (sophisticated and smooth)
- Cards should appear flat, not scaled or translated vertically
- Keep the opacity for depth but remove scale/translateY effects

## Magnet Pull-Away Effect - COMPLETED
- Variable tempo/speed for card movement during swipe
- Card follows finger movement until halfway out of screen
- After halfway point: magnet effect pulls card away automatically
- Card should not be visible after it exits the 16:9 screen box
- Effect should be subtle and smooth, not harsh
- Project is designed for phone screen (vertical mobile view)

## Swipe Feedback Icons - COMPLETED (Bumble Style)
- Add visual feedback icons when swiping (like Bumble)
- **Right swipe:** Green circle with up arrow rises from right edge
- **Left swipe:** Red circle with down arrow rises from left edge
- Icons appear/rise at the same pace as the card is swiped
- Card only vanishes when icons are completely visible and entire body is out of screen edges
- After icons are fully visible, both card and icon vanish instantly
- Animation speed reduced by 50% (0.4s magnet pull, 0.6s spring-back)
- Icon opacity reduced to 60% maximum for subtlety

## Card Weight/Resistance - COMPLETED
- Cards feel too sensitive and light to touch
- Add weight/resistance to make them feel more substantial
- Small finger movements shouldn't move cards easily
- **Implementation:**
  - Drag coefficient of 0.5 (card moves at half speed of finger)
  - Adjusted threshold to 80px to match new drag behavior
  - Icons scale/fade based on new threshold

## Prevent Text Selection - COMPLETED
- Text was being selected during swipe gestures
- Added `select-none` class to prevent text selection
- Applied to both main container and card elements
- Users can now swipe smoothly without accidentally selecting text

---

# PHASE 2: Vertical Scrolling (Reels-Style)

## Vertical Market Scrolling - COMPLETED
- Add vertical scroll feature like Instagram/TikTok reels
- Scroll down to see different market cards (ETH/USD, BNB/USD, etc.)
- Each market card is a complete independent card with:
  - Its own token name (ETH, BNB, etc.)
  - Same exact design and functionality as Phase 1
  - Independent left/right swipe functionality
  - Own endless card stack
  - Same green/red swipe indicators
  - Same weight and animations
- **Markets implemented:**
  - ETH/USD
  - BNB/USD
- **Implementation:**
  - Created MarketCard component with marketName prop
  - WalletValue is now a vertical scroll container
  - Platform-aware navigation:
    - **Mobile devices**: Touch scrolling with momentum (TikTok/Reels style)
      - CSS scroll snap (`snap-y mandatory`, `snap-stop: always`)
      - Touch momentum scrolling (`WebkitOverflowScrolling: touch`)
      - Auto-snap to nearest card after scroll ends (150ms debounce)
      - Hidden scrollbars with `scrollbar-hide` utility
    - **Desktop/Laptop**: Navigation arrows
      - Cute up/down chevron buttons positioned outside 16:9 frame
      - Arrows appear only on desktop (width >= 768px or non-mobile user agent)
      - Up arrow shows when not on first market
      - Down arrow shows when not on last market
      - Smooth scroll animation on click
      - White circular buttons with hover effects
      - Positioned 60px above/below the card frame
  - Each market maintains independent state
  - Platform detection via user agent and window width

## Responsive Design - COMPLETED
- Fixed layout issues on all devices
- Container now fills entire viewport (100vh/100vw)
- Prevents content cropping on mobile devices
- Scales properly on desktop/laptop
- **Mobile (< 768px):**
  - Smaller text sizes (text-3xl instead of text-5xl)
  - Reduced padding and spacing
  - Smaller icons and buttons
  - Container width: max-w-md (448px)
  - Optimized for phone screens
- **Tablet/Desktop (>= 768px):**
  - Larger text sizes
  - More padding and spacing
  - Full-size icons
  - Container width: max-w-xl (576px) - 1.29x wider than mobile
  - More comfortable viewing on laptop screens
- **Viewport configuration:**
  - Fixed html/body to prevent scrolling issues
  - Proper viewport meta tags (width=device-width, initial-scale=1)
  - User scaling disabled for app-like experience
  - Viewport-fit: cover for full-screen
- **Mobile Browser Chrome Fix (JavaScript + CSS):**
  - Created `useViewportHeight` hook using `window.visualViewport`
  - Listens to resize and scroll events to track real-time viewport changes
  - Updates height dynamically when Chrome address bar shows/hides
  - Responds to orientation changes
  - Falls back to `window.innerHeight` if visualViewport not available
  - **Safe area insets implementation:**
    - Header: `calc(1rem + env(safe-area-inset-top, 0px))`
    - Bottom nav: `calc(1rem + env(safe-area-inset-bottom, 0px))`
    - Spacers adjusted to account for safe areas
    - Works with iPhone notches and Android gesture bars
  - Prevents cropping on all modern phones with browser chrome

## Fixed UI Layer - COMPLETED
- Header and bottom navigation moved to top-level container
- **Architecture:**
  - Header (avatar, search, bell) now in WalletValue component
  - Bottom navigation now in WalletValue component
  - Both have z-index: 50 (above all cards which are z-10-15)
  - Cards no longer contain header/nav elements
- **Behavior:**
  - Header and nav remain fixed during card swipes
  - Cards slide underneath the fixed UI elements
  - Proper pointer-events handling (pointer-events-none on container, pointer-events-auto on buttons)
  - Safe area insets maintained at container level
- **Result:**
  - Professional app-like experience
  - UI elements never move during interactions
  - Clean separation of fixed vs swipeable content

## Card Spacing & Canvas Color - COMPLETED
- Reduced yellow card size to create spacing/distance between cards
- Content inside cards remains the same size
- **Implementation:**
  - Changed cards from `inset-0` to `inset-4 sm:inset-6` (1rem mobile, 1.5rem desktop)
  - Creates visual spacing around each card in the stack
- Changed canvas background color from gray-900 to #27262c (dark charcoal)
- Creates better visual separation between stacked cards
- More sophisticated layered appearance

## Header Alignment with Card Content - COMPLETED
- Aligned top bar (avatar, search, bell) with in-card content
- Header contained within yellow card boundaries while staying topmost layer (z-50)
- **Implementation:**
  - Fixed horizontal positioning: `left: 2rem, right: 2rem` (consistent across all devices)
  - Fixed vertical positioning: `top: calc(2rem + env(safe-area-inset-top, 0px))` (consistent across all devices)
  - Matches card content area: inset (1rem) + padding (1rem) = 2rem from viewport edges
  - Avatar aligns with "ETH/USD" text horizontally
  - Bell icon aligns with card content right edge
  - Header starts below card top edge, properly contained within card
  - No responsive scaling - same spacing on all devices
- Maintains safe area insets for notches/status bars

## Custom Font Implementation - COMPLETED
- Applied Bungee-Regular.ttf font to entire application
- **Implementation:**
  - Moved font file to `app/fonts/Bungee-Regular.ttf`
  - Used Next.js `localFont` API to load custom font
  - Created CSS variable `--font-bungee`
  - Applied to body element in globals.css
  - All text across the app now uses Bungee font

---

# PHASE 3: Commit Popup System

## Commit Popup Implementation - COMPLETED
- After every successful swipe (left or right), a popup appears
- Follows same yellow card design language as the app
- Asks user to commit an amount before continuing
- **Design:**
  - Yellow card (yellow-400 background) with rounded corners
  - Direction indicator (green circle with ↑ for UP, red circle with ↓ for DOWN)
  - Title: "Commit Amount"
  - Subtitle: "Betting UP/DOWN"
  - Amount input field with yellow-500 background
  - Black confirm button with yellow text
  - Disabled state for empty amount
- **Behavior:**
  - Triggered after card exits screen (400ms after swipe threshold)
  - Popup is topmost layer (z-index: 100)
  - Full-screen overlay with backdrop blur
  - Blocks all interactions until amount is committed and confirmed
  - Vertical scrolling disabled while popup is active
  - Popup dismisses on confirm button click
  - User can then scroll to next market
- **Implementation:**
  - Component: `components/commit-popup.tsx`
  - Props: `direction` ("up" | "down"), `onConfirm` callback
  - MarketCard triggers `onSwipeComplete` callback with direction
  - WalletValue manages popup state and displays CommitPopup
  - Console logs committed amount and direction

---

# PHASE 4: Profile Page

## Profile Page Implementation - COMPLETED
- New profile section accessible from bottom navigation
- Follows same design language with inverted color scheme
- **Design:**
  - Background color: #27262c (dark charcoal)
  - Font: Bungee-Regular (same as app)
  - Text color: Yellow (#fbbf24 / yellow-400)
  - Clean, minimal layout
- **Content:**
  - Page title: "Profile" in large yellow text
  - Connected wallet address display in format: 0x1...78
  - Disconnect wallet button (yellow background, black text)
  - White background card component showing "Total $ Earned"
  - Amount display in large black text
- **Navigation:**
  - Leftmost button (Wallet2 icon) in bottom nav opens profile
  - Button highlights yellow when on profile page
  - Markets button (TrendingUp icon) returns to markets view
  - Button highlights yellow when on markets page
  - Bottom navigation persists across all pages
- **Implementation:**
  - Component: `components/profile.tsx`
  - State management in WalletValue for page switching
  - Conditional rendering based on currentPage state
  - Safe area insets for top and bottom spacing
  - Responsive padding and text sizes

## Swipe Sound Effect - COMPLETED
- Added audio feedback for card swipes with volume amplification
- **Implementation:**
  - Sound file: `public/sounds/game-start.mp3` (game-start-317318.mp3)
  - Plays every time user swipes left or right
  - Audio initialized in useEffect on component mount with preload
  - Sound plays when swipe threshold is reached (magnetized state)
  - Resets to beginning before each play (currentTime = 0)
  - Error handling for audio play failures with retry mechanism
- **Volume Amplification (200% boost):**
  - Web Audio API context with GainNode
  - Base volume set to 1.0 (max browser volume)
  - GainNode.gain.value = 2.0 for 200% amplification
  - MediaElementAudioSourceNode connects audio to gain node
  - Gain node connects to audio context destination
- **Mobile-Specific Fixes:**
  - Audio unlocking for iOS Safari (requires user interaction)
  - First touch/click unlocks audio context
  - Audio context resume on interaction (iOS requirement)
  - Preload set to 'auto' for better mobile performance
  - Retry logic with 100ms delay for failed playback attempts
  - Promise-based play() with proper error handling
  - AudioContext resume check before each play
- **Behavior:**
  - Plays simultaneously with card animation at 2x volume
  - Works for both up (right swipe) and down (left swipe) bets
  - Web Audio API for volume control beyond browser limits

## Bottom Navigation Icon Size Increase - COMPLETED
- Doubled the size of all bottom navigation icons
- Spread icons apart proportionately for better spacing
- **Changes:**
  - Icon sizes increased from `w-4 h-4 sm:w-5 sm:h-5` to `w-8 h-8 sm:w-10 sm:h-10` (2x size)
  - Button padding increased from `p-1.5 sm:p-2` to `p-3 sm:p-4` (proportional)
  - Container spacing changed from `gap-2 sm:gap-3` to `justify-between` (evenly distributed)
  - Container padding increased: `p-2 sm:p-3` → `p-3 sm:p-4` with `px-6 sm:px-8`
  - Bottom navigation spacer: 5.5rem in MarketCard and Profile
  - Ensures yellow card content stops before middle of navbar
  - No content leakage from bottom corners below white navbar
- **Result:**
  - Larger, more touch-friendly navigation icons
  - Better visual hierarchy
  - More breathing room between icons
  - Improved mobile usability
  - Clean content cutoff above navigation bar

## Bottom Navigation Design Update - COMPLETED
- Removed floating design, updated to match yellow card width
- Extended navigation bar with rounded top corners only
- **Changes:**
  - Position: `left-1/2 -translate-x-1/2 bottom-0` (centered)
  - Width constrained: `w-full max-w-md md:max-w-xl` (matches yellow card container)
  - Removed `rounded-full`, added `rounded-t-3xl` (top corners only)
  - Top corners maintain same roundness (3xl = 1.5rem radius)
  - Bottom corners are square (no rounding)
  - Padding bottom includes safe area insets
  - Navigation width never exceeds yellow card width (448px mobile, 576px desktop)
- **Result:**
  - More stable, grounded navigation bar
  - Width perfectly matches yellow card container
  - Top rounded corners for visual appeal
  - Centered alignment with content
  - Responsive sizing (mobile: 448px, desktop: 576px max)

## Prize Pool & Payout Visual Emphasis - COMPLETED
- Made key data points larger and more attention-grabbing
- Improved visual hierarchy in the yellow info box
- **Changes:**
  - **Prize Pool Amount**: Increased from text-[10px]/text-xs to text-2xl/text-3xl (bold)
  - **Payout Multipliers (1.5x, 2.5x)**: Increased from text-sm/text-base to text-3xl/text-4xl (bold)
  - Reorganized layout for better readability:
    - Prize pool section separated from payouts
    - "NEXT ROUND" and "PRIZE POOL" as smaller labels
    - "147 CELO" as large, bold focal point
  - **Payout sections**:
    - Down section: Left-aligned
    - Up section: Right-aligned for visual balance
    - "Down"/"Up" as smaller labels
    - Multipliers (1.5x/2.5x) as large, bold numbers with color coding:
      - Down (1.5x): #ed4b9e (pink/magenta)
      - Up (2.5x): #2e8656 (darker green)
    - "payout" as small supporting text
  - Increased spacing and padding for breathing room
  - Gap between Down/Up columns increased from gap-3/gap-4 to gap-4/gap-6
- **Result:**
  - Prize pool and payout multipliers immediately draw attention
  - Clear visual hierarchy guides user's eye to important data
  - More scannable and readable at a glance
  - Maintains same yellow-on-yellow design language

## Bottom Navigation Custom SVG Icons - COMPLETED
- Replaced Lucide React icons with custom SVG icons
- **Icon order (left to right):**
  1. User Square (Profile) - `user-square-stroke-rounded.svg`
  2. Video Console (Markets) - `video-console-stroke-rounded.svg`
  3. Transaction History - `transaction-history-stroke-rounded.svg`
  4. Brain 02 (AI) - `brain-02-stroke-rounded.svg`
- **Implementation:**
  - SVG files copied to `public/icons/` directory
  - Using Next.js Image component for optimized loading
  - Icons maintain same size: `w-8 h-8 sm:w-10 sm:h-10`
  - CSS filters applied for color management:
    - Active state (yellow background): Black icon (`filter:brightness(0)`)
    - Inactive state: Gray icon (complex filter for gray-600 equivalent)
  - All SVGs use `currentColor` for stroke, allowing filter-based coloring
- **Result:**
  - Custom, professional icon set
  - Balanced sizes matching original design
  - Proper color states (black on yellow, gray otherwise)
  - Optimized SVG loading via Next.js Image

## BobaSoda Logo Replacement - COMPLETED
- Replaced GIF with BobaSoda transparent logo in top left corner
- **Implementation:**
  - Logo file: `BobaSoda full logo black transparent bg.png` → `public/bobasoda-logo.png`
  - Using Next.js Image component
  - Size: `h-10 sm:h-12` with `w-auto` (maintains aspect ratio)
  - Dimensions: 150x50 base size (1.25x larger than initial)
  - Removed `rounded-full` class (logo is rectangular)
  - Same positioning aligned with other content
- **Result:**
  - Professional BobaSoda logo in top left
  - Transparent background blends with yellow cards
  - Properly sized at 1.25x scale for better visibility
  - Aspect ratio preserved with auto width

## Top Navigation Bar - COMPLETED
- Created top navbar matching bottom navbar design (inverted)
- UI elements (logo, search, bell) placed on top of white navbar
- **Design:**
  - White background (`bg-white`)
  - Rounded bottom corners only (`rounded-b-3xl`)
  - Same padding structure as bottom nav
  - Anchored to top: `top-0`
  - Width: `inset-x-4` (matches card margins)
  - Z-index: 40 (below UI elements at z-50)
- **UI Elements Layer:**
  - Logo GIF (left)
  - Search and Bell icons (right)
  - Z-index: 50 (above navbar)
  - Changed icon colors to gray-600 (on white background)
  - Hover effect: gray-100 background
  - Positioned at `top: calc(1rem + env(safe-area-inset-top))`
- **Spacer Adjustments:**
  - MarketCard header spacer: 3rem → 5.5rem
  - Profile header spacer: 1rem → 4rem
  - Ensures content doesn't overlap with top navbar
- **Result:**
  - Professional top navbar mirroring bottom design
  - Inverted appearance (rounded bottom vs rounded top)
  - Clean, symmetrical layout
  - UI elements properly layered on navbar

---

# PHASE 5: Round Timer System

## Timer Overlay on Prize Pool Box - COMPLETED
- Added visual timer overlay to create sense of urgency
- **Round System:**
  - Total round duration: 2 minutes (120 seconds)
  - Swipe window: First 40 seconds (swiping allowed)
  - Blocked period: Last 80 seconds (swiping blocked)
  - Timer is global across all token markets
- **Visual Implementation:**
  - Transparent black overlay on prize pool/next round info box
  - Opacity: 0.15 (15%) - mid-level opacity
  - Animates from left to right over 2 minutes
  - Uses width percentage (0% to 100%)
  - Smooth animation with 50ms update interval
  - Overlay positioned absolutely with `overflow-hidden` container
- **Shake Effect (Urgency Amplifier):**
  - Activates from 1:00 to 1:40 (60-100 seconds)
  - Timer progress: 50% to 83.33%
  - Entire prize pool box shakes continuously
  - CSS keyframe animation: horizontal shake (±2px)
  - Animation duration: 0.5s infinite loop
  - Creates heightened sense of urgency as round closing approaches
- **Technical Details:**
  - State: `timerProgress` tracks percentage (0-100)
  - Timer updates every 50ms for smooth visual progress
  - Auto-resets when reaching 100% for continuous rounds
  - Overlay uses `pointer-events-none` to not block interaction
  - Content layered above overlay with `relative z-10`
  - Conditional `animate-shake` class applied during shake period
- **Result:**
  - Visible timer progress without blocking content readability
  - Creates urgency as overlay fills the box
  - Shake effect intensifies urgency during critical period
  - Text remains fully readable through transparent overlay
  - Smooth, continuous animation

## Swipe Blocking After 100 Seconds - COMPLETED
- Blocks all swiping after 100 seconds (1:40) until round resets
- Shows subtle warning overlay when swiping is disabled
- **Implementation:**
  - Block condition: `isSwipeBlocked = timerProgress >= 83.33%`
  - Prevents `handleDragStart` from initiating drag
  - Prevents `handleDragMove` from processing movement
  - Cursor changes to `not-allowed` on blocked cards
- **Warning Overlay:**
  - Centered overlay with backdrop blur
  - Semi-transparent black background (60% opacity)
  - Yellow text: "Round Closed"
  - White subtext: "Wait for next round"
  - z-index: 20 (above cards, below popup)
  - `pointer-events-none` to not block interaction
- **User Experience:**
  - Clear visual feedback that swiping is disabled
  - Subtle, non-intrusive warning message
  - Cursor changes reinforce blocked state
  - Auto-clears when timer resets to 0%
- **Result:**
  - Swiping completely disabled after 1:40
  - Users clearly understand they must wait
  - Clean transition to next round
  - Maintains engagement with timer visibility

## One Swipe Per Token Per Round - COMPLETED
- Users can only swipe once per token per round
- After swiping a token, that specific token is locked until next round
- Other tokens remain swipeable (e.g., swipe ETH, can still swipe BNB)
- **Implementation:**
  - `swipedMarkets` Set in WalletValue tracks which markets have been swiped
  - Passed to MarketCard as `hasSwipedThisRound` prop
  - `onSwipeComplete` callback updated to include marketName parameter
  - When swipe completes, marketName added to swipedMarkets Set
  - `isSwipeBlocked` now checks: `timerProgress >= 83.33 || hasSwipedThisRound`
  - Timer reset callback clears all swipe tracking for new round
- **User Feedback:**
  - Warning overlay shows context-aware messages:
    - "Already Swiped" / "One swipe per round" - when user has swiped this token
    - "Round Closed" / "Wait for next round" - when timer expired
  - Cursor shows `not-allowed` on blocked cards
  - Drag handlers prevent interaction when blocked
- **Round Lifecycle:**
  - Round starts (0:00): All tokens swipeable, swipedMarkets = empty
  - User swipes ETH: ETH added to swipedMarkets, ETH now blocked
  - User can still swipe BNB (different token)
  - Timer hits 1:40 (100s): All remaining tokens blocked by time
  - Timer hits 2:00: Reset occurs, swipedMarkets cleared, all tokens swipeable again
- **Result:**
  - One swipe per token per round enforced
  - Clear visual feedback for blocked state
  - Smooth reset for new rounds
  - Independent tracking per token

## Technical Implementation Notes
- Using Next.js 16, React 19, TypeScript, Tailwind CSS
- Custom font: Bungee-Regular.ttf (via Next.js localFont)
- Lucide React for icons
- Component: `components/wallet-value.tsx`
- Phase 1: Single ETH/USD market with swipe functionality
- Phase 2: Multiple markets with vertical scrolling
- Phase 2.5: Responsive design for all devices
- Phase 2.6: Fixed UI layer architecture
- Phase 2.7: Card spacing and canvas styling
- Phase 2.8: Custom typography with Bungee font

---

# PHASE 6: URL Routing System

## Next.js App Router Implementation - COMPLETED
- Implemented proper URL routing for all navigation items
- Each navigation button now changes the URL path
- **Route Structure:**
  - `/` - Profile page (onboarding/home)
  - `/profile` - Profile page
  - `/markets` - Markets page with swipeable cards
  - `/history` - Transaction history (placeholder)
  - `/ai` - AI assistant (placeholder)
- **Implementation:**
  - Created separate route pages in `app/` directory for each navigation item
  - Created `components/bottom-nav.tsx` - shared navigation component
  - Created `components/markets.tsx` - markets view with all swipe functionality
  - Created `components/profile-page.tsx` - profile view wrapper
  - Uses Next.js `useRouter` for navigation
  - Uses `usePathname` to track active route
  - Active route highlighted in yellow on bottom nav
- **Components:**
  - `app/page.tsx` - Profile (default/home route)
  - `app/profile/page.tsx` - Profile route
  - `app/markets/page.tsx` - Markets route
  - `app/history/page.tsx` - History route (placeholder)
  - `app/ai/page.tsx` - AI route (placeholder)
- **Result:**
  - Clean URL routing (localhost:3003/markets, localhost:3003/profile, etc.)
  - Browser back/forward buttons work correctly
  - Active navigation state persists across page refreshes
  - Shareable URLs for each section

---

# PHASE 7: Privy Wallet Integration

## Privy Embedded Wallet Setup - COMPLETED
- Integrated Privy for email-based wallet creation
- Configured for Celo Alfajores testnet
- **User Flow:**
  1. User taps "Connect Wallet" button on Profile page
  2. Privy popup opens asking for email
  3. User enters email address
  4. Privy creates embedded wallet automatically
  5. Wallet address displayed on Profile page (0x1...78 format)
  6. User can disconnect wallet anytime
- **Dependencies Installed:**
  - `@privy-io/react-auth` - Privy authentication SDK
  - `viem` - Ethereum library with chain definitions
  - Installed 312 new packages (total: 680 packages)
- **Network Configuration:**
  - **Network**: Celo Alfajores Testnet
  - **Chain ID**: 44787
  - **RPC URL**: https://alfajores-forno.celo-testnet.org
  - **Currency**: CELO
  - **Block Explorer**: https://explorer.celo.org/alfajores
  - Uses `celoAlfajores` chain from `viem/chains`
- **Privy Configuration:**
  - App ID: Configured via environment variable `NEXT_PUBLIC_PRIVY_APP_ID`
  - Login method: Email only (`loginMethods: ["email"]`)
  - Theme: Dark mode (`theme: "dark"`)
  - Accent color: Yellow (#F59E0B / yellow-400) to match app theme
  - Embedded wallets: Auto-create on login (`createOnLogin: "users-without-wallets"`)
  - Default chain: Celo Alfajores
  - Supported chains: [Celo Alfajores]
- **Implementation:**
  - **Provider Setup** (`components/providers.tsx`):
    - Wraps entire app with `PrivyProvider`
    - Configured in `app/layout.tsx`
    - Handles Privy initialization globally
  - **Profile Page Integration** (`components/profile-page.tsx`):
    - Uses `usePrivy` hook for auth state and login/logout
    - Uses `useWallets` hook to access embedded wallet
    - Extracts wallet address from Privy embedded wallet
    - Passes auth state to Profile component
    - Shows loading state while Privy initializes
  - **Profile Component Updates** (`components/profile.tsx`):
    - Accepts `isConnected` and `walletAddress` props
    - Conditionally renders Connect button (disconnected) or wallet info (connected)
    - Connect button triggers Privy login modal
    - Disconnect button triggers Privy logout
    - Wallet address formatted as 0x1...78
  - **Environment Variables**:
    - `.env.example` created with `NEXT_PUBLIC_PRIVY_APP_ID` template
    - `.gitignore` already configured to ignore `.env*.local`
    - User needs to create `.env.local` with actual Privy App ID
- **Setup Instructions for User:**
  1. Go to https://dashboard.privy.io/ and create account
  2. Create new Privy app
  3. Copy App ID from dashboard
  4. Create `.env.local` file in project root
  5. Add: `NEXT_PUBLIC_PRIVY_APP_ID=your-app-id-here`
  6. Restart development server
- **Features:**
  - Email-based authentication (passwordless)
  - Embedded wallet created automatically on first login
  - Wallet lives on Celo Alfajores testnet
  - No MetaMask or external wallet required
  - User-friendly onboarding flow
  - Persistent authentication across sessions
- **Important Notes:**
  - NO contract integration (as per requirements)
  - NO hardcoded contract addresses
  - ONLY wallet connection functionality
  - Frontend-only implementation
  - Contract interactions to be added separately by user
- **Result:**
  - Fully functional wallet connection via Privy
  - Email-based onboarding for non-crypto users
  - Embedded wallets on Celo Alfajores testnet
  - Clean, yellow-themed authentication UI
  - Ready for future smart contract integration

## Wallet Balance Display - COMPLETED
- Added real-time wallet balance fetching from Celo Alfajores
- Profile page now shows complete wallet information
- **Display Elements:**
  1. **Wallet Address**: Format "0xxx...xy" (4 chars...2 chars)
  2. **Wallet Balance**: Shows CELO balance with 4 decimal places
  3. **Send Button**: Yellow button for sending funds (handler to be implemented)
  4. **Disconnect Button**: Outlined yellow button to disconnect wallet
- **Implementation:**
  - Uses viem's `createPublicClient` to connect to Celo Alfajores RPC
  - Fetches balance using `publicClient.getBalance()`
  - Converts from Wei to CELO using `formatEther()`
  - Loading state shows "..." while fetching balance
  - Balance auto-fetches when wallet connects
  - Error handling with fallback to "0.00"
- **UI Design:**
  - Wallet address and balance sections with yellow text
  - Two-button layout: Send (filled yellow) and Disconnect (outlined yellow)
  - Send button: `bg-yellow-400` with black text, hover: `bg-yellow-500`
  - Disconnect button: Transparent with yellow border, hover fills yellow
  - Both buttons flex equally in a row with gap
  - Maintains consistent spacing with other profile elements
- **Technical Details:**
  - Balance fetched in `profile-page.tsx` using viem public client
  - Balance passed to Profile component as prop
  - Send button emits event via `onSend` callback
  - User handles actual send logic separately (no hardcoded contract logic)
- **Result:**
  - Complete wallet information display
  - Real-time balance from Celo Alfajores testnet
  - Professional two-button action layout
  - Ready for user to implement send functionality
  - Clean separation of concerns (UI vs logic)
