/**
 * Calculate prize amount for a player based on their rank and match size
 * @param entryFee - Entry fee per player
 * @param playerCount - Total number of players in the match
 * @param rank - Player's rank (1 = first place, 2 = second, etc.)
 * @returns Prize amount in VND, or 0 if no prize for this rank
 */
export function calculatePrize(
  entryFee: number,
  playerCount: number,
  rank: number
): number {
  if (rank < 1 || rank > 8) {
    return 0;
  }

  // 2 players: Top 1 = entry_fee * 1.5
  if (playerCount === 2) {
    if (rank === 1) {
      return Math.floor(entryFee * 1.5);
    }
    return 0;
  }

  // 3 players: Top 1 = entry_fee * 1.5, Top 2 = entry_fee * 0.5
  if (playerCount === 3) {
    if (rank === 1) {
      return Math.floor(entryFee * 1.5);
    }
    if (rank === 2) {
      return Math.floor(entryFee * 0.5);
    }
    return 0;
  }

  // 4 players: Top 1 = entry_fee * 1.5, Top 2 = entry_fee * 1.3
  if (playerCount === 4) {
    if (rank === 1) {
      return Math.floor(entryFee * 1.5);
    }
    if (rank === 2) {
      return Math.floor(entryFee * 1.3);
    }
    return 0;
  }

  // 8 players: Top 1 = entry_fee * 2, Top 2 = entry_fee * 1.5, Top 3 = entry_fee * 1.3, Top 4 = entry_fee * 1
  if (playerCount === 8) {
    if (rank === 1) {
      return Math.floor(entryFee * 2);
    }
    if (rank === 2) {
      return Math.floor(entryFee * 1.5);
    }
    if (rank === 3) {
      return Math.floor(entryFee * 1.3);
    }
    if (rank === 4) {
      return Math.floor(entryFee * 1);
    }
    return 0;
  }

  // For other player counts, default to winner takes all (backward compatibility)
  if (rank === 1) {
    const totalPool = entryFee * playerCount;
    const serviceFee = Math.floor(totalPool * 0.1);
    return totalPool - serviceFee;
  }

  return 0;
}

/**
 * Get all prize recipients for a match based on placements
 * @param entryFee - Entry fee per player
 * @param playerCount - Total number of players
 * @param placements - Array of player placements with rank
 * @returns Array of prize recipients with userId and prize amount
 */
export interface PrizeRecipient {
  userId: string;
  rank: number;
  prizeAmount: number;
}

export function getPrizeRecipients(
  entryFee: number,
  playerCount: number,
  placements: Array<{ userId: string; rank: number | null }>
): PrizeRecipient[] {
  const recipients: PrizeRecipient[] = [];

  for (const placement of placements) {
    if (placement.rank === null || placement.rank < 1) {
      continue;
    }

    const prizeAmount = calculatePrize(entryFee, playerCount, placement.rank);
    if (prizeAmount > 0) {
      recipients.push({
        userId: placement.userId,
        rank: placement.rank,
        prizeAmount,
      });
    }
  }

  // Sort by rank (ascending)
  return recipients.sort((a, b) => a.rank - b.rank);
}
