# Live Odds Comparison

A real-time odds comparison dashboard built with Next.js 15, Prisma, PostgreSQL, and TanStack Table/Virtual.

## Setup Steps

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Configure your PostgreSQL database URL in `.env`

4. Run the development server:
   ```
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Technical Approach

### Table Implementation

- Used **TanStack Table** for the core table functionality
- Implemented **TanStack Virtual** for column virtualization to handle large data sets (200+ bookmakers)
- Built a responsive design that adjusts column widths and text sizes for mobile devices
- Real-time data updates through polling with optimized re-renders

### Optimizations

- Data matrix transformation: Converted flat API data into an optimized row/column matrix structure
- Memoization of expensive calculations with React useMemo
- Implemented column virtualization to render only visible columns
- Smart reference handling to track previous values for visual change indicators
- Tailwind CSS for efficient styling

## Challenges and Solutions

### Avoiding Flickering During Updates

- **Challenge**: Table flickering during data updates, especially when odds change
- **Solution**:
  - Used a reference to previous data (prevRef) to track state changes
  - Implemented smooth transitions between value changes
  - Only re-rendered components that actually changed values
  - Used background color transitions with appropriate duration
  - Spacer cell was critical componetn of virtualizationi strategy, to main proper layout when scrolling horizontally, preventing layout jumps

### Sticky Columns Implementation

- **Challenge**: Maintaining a fixed "Runner" column while horizontally scrolling through hundreds of bookmakers
- **Solution**:
  - CSS position:sticky combined with z-index layering for header and first column
  - Implemented virtualization only for the scrollable columns, keeping the Runner column separate
  - Maintained consistent styling during scroll by matching background colors
- **Unexpected Issue**: @tanstack/react-virtual was quietly pruning the first (runner) column from the DOM whenever scrolling far enough to the right, which made the sticky column disappear
- **Fix**: Completely removed the runner column from the virtualized list and rendered it separately as a real DOM element, then only virtualized the remaining columns

### Performance with Large Datasets

- **Challenge**: Handling 4000+ odds entries (20 runners × 200 bookmakers) with real-time updates
- **Solution**:
  - Used column virtualization to reduce DOM size
  - Implemented efficient data structures for lookups
  - Cached and memoized calculations where possible
  - Used responsive design to adjust for different screen sizes
