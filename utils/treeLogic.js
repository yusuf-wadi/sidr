/**
 * treeLogic.js
 * Determines the visual stage of the Sidr tree based on reading stats.
 *
 * Stages:
 *  - Seed        : initial state (0 pages)
 *  - Sprout      : >= 20 pages read
 *  - Young Tree  : >= 100 pages read
 *  - Full Bloom  : >= 3 Khatms completed
 *  - Ancient Tree: >= 10 Khatms completed
 */

export const TREE_STAGES = [
  {
    stage: 'seed',
    label: 'Seed',
    emoji: '🌱',
    description: 'Your journey begins with a single seed.',
    minPages: 0,
    minKhatms: 0,
  },
  {
    stage: 'sprout',
    label: 'Sprout',
    emoji: '🌿',
    description: 'Your seed has sprouted — keep going!',
    minPages: 20,
    minKhatms: 0,
  },
  {
    stage: 'youngTree',
    label: 'Young Tree',
    emoji: '🌳',
    description: 'A young tree stands tall with strong roots.',
    minPages: 100,
    minKhatms: 0,
  },
  {
    stage: 'fullBloom',
    label: 'Full Bloom',
    emoji: '🌸',
    description: 'Your tree blossoms — 3 completions celebrated!',
    minPages: 604,
    minKhatms: 3,
  },
  {
    stage: 'ancientTree',
    label: 'Ancient Tree',
    emoji: '🌲',
    description: 'An ancient, majestic tree of wisdom.',
    minPages: 604,
    minKhatms: 10,
  },
];

/**
 * Returns the current tree stage object based on total pages read and khatms.
 * @param {number} totalPages - Total pages read across all sessions.
 * @param {number} khatms - Number of full Quran completions (Khatms).
 * @returns {object} The matching TREE_STAGES entry.
 */
export function getTreeStage(totalPages, khatms) {
  let current = TREE_STAGES[0];
  for (const stage of TREE_STAGES) {
    if (totalPages >= stage.minPages && khatms >= stage.minKhatms) {
      current = stage;
    }
  }
  return current;
}

/**
 * Returns the progress (0–1) toward the next tree stage.
 * @param {number} totalPages
 * @param {number} khatms
 * @returns {number} A value between 0 and 1.
 */
export function getProgressToNextStage(totalPages, khatms) {
  const currentStage = getTreeStage(totalPages, khatms);
  const currentIndex = TREE_STAGES.findIndex((s) => s.stage === currentStage.stage);

  if (currentIndex === TREE_STAGES.length - 1) {
    return 1;
  }

  const next = TREE_STAGES[currentIndex + 1];
  const prevPages = currentStage.minPages;
  const nextPages = next.minPages;

  if (next.minKhatms > khatms) {
    const khatmsRange = next.minKhatms - currentStage.minKhatms;
    return Math.min((khatms - currentStage.minKhatms) / khatmsRange, 1);
  }

  if (nextPages === prevPages) {
    return 1;
  }

  return Math.min((totalPages - prevPages) / (nextPages - prevPages), 1);
}

/**
 * Calculates how many pages equal one Khatm (full Quran reading).
 * The standard Quran has 604 pages.
 */
export const QURAN_PAGES = 604;

/**
 * Returns the number of completed Khatms from a total page count.
 * @param {number} totalPages
 * @returns {number}
 */
export function getKhatmCount(totalPages) {
  return Math.floor(totalPages / QURAN_PAGES);
}
