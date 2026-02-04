# Architectural Decision Records (ADR)

## [ADR-001] Algorithm Choice: Guillotine Bin Packing (Strip-Enhanced)
- **Status**: Accepted
- **Context**: Need a balance between material efficiency and cutting simplicity for manual table saw operations.
- **Decision**: Use a Strip-based approach as the baseline, with an "Enhanced" mode that uses Free Rectangles (Guillotine cut preserved) for smaller pieces.
- **Consequences**: Ensures all cuts are straight lines through the board, making it physically possible to cut on a table saw.

## [ADR-002] Multi-Bin Strategy: Pure Sequential
- **Status**: Under Review
- **Context**: Current implementation processes bins one by one.
- **Problem**: Leftover items in Bin N+1 might have fit in Bin N if a different layout was chosen or if backfilling was more aggressive.
- **Decision**: Re-evaluate if a "Global Optimization" or "Best Fit Decreasing" across multiple bins is feasible without blowing up complexity.
