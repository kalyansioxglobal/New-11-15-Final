/**
 * Load Status Transition Validation
 * 
 * Validates that load status transitions follow business rules.
 * Prevents invalid state changes (e.g., DELIVERED -> OPEN).
 */

export type LoadStatus = 
  | 'OPEN'
  | 'WORKING'
  | 'QUOTED'
  | 'AT_RISK'
  | 'COVERED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'LOST'
  | 'FELL_OFF'
  | 'DORMANT';

/**
 * Valid status transitions map
 * Key: current status, Value: array of valid next statuses
 */
const VALID_TRANSITIONS: Record<LoadStatus, LoadStatus[]> = {
  OPEN: ['WORKING', 'QUOTED', 'LOST', 'DORMANT'],
  WORKING: ['COVERED', 'AT_RISK', 'LOST', 'DORMANT', 'IN_TRANSIT'],
  QUOTED: ['WORKING', 'COVERED', 'LOST', 'OPEN'],
  AT_RISK: ['COVERED', 'LOST', 'WORKING'],
  COVERED: ['IN_TRANSIT', 'DELIVERED', 'LOST', 'FELL_OFF'],
  IN_TRANSIT: ['DELIVERED', 'LOST', 'FELL_OFF'],
  DELIVERED: [], // Terminal state - no transitions allowed
  LOST: [], // Terminal state - no transitions allowed
  FELL_OFF: ['COVERED', 'LOST', 'WORKING'],
  DORMANT: ['WORKING', 'OPEN'],
};

/**
 * Validates a load status transition
 * 
 * @param currentStatus - Current load status
 * @param newStatus - Proposed new status
 * @returns true if transition is valid, false otherwise
 */
export function validateLoadStatusTransition(
  currentStatus: LoadStatus | string,
  newStatus: LoadStatus | string
): boolean {
  // If statuses are the same, it's valid (no-op)
  if (currentStatus === newStatus) {
    return true;
  }

  // Check if current status is valid
  if (!(currentStatus in VALID_TRANSITIONS)) {
    return false;
  }

  // Check if new status is in the list of valid transitions
  const validNextStatuses = VALID_TRANSITIONS[currentStatus as LoadStatus];
  return validNextStatuses.includes(newStatus as LoadStatus);
}

/**
 * Gets the list of valid next statuses for a given current status
 * 
 * @param currentStatus - Current load status
 * @returns Array of valid next statuses
 */
export function getValidNextStatuses(currentStatus: LoadStatus | string): LoadStatus[] {
  if (!(currentStatus in VALID_TRANSITIONS)) {
    return [];
  }
  return VALID_TRANSITIONS[currentStatus as LoadStatus];
}

/**
 * Checks if a status is terminal (no transitions allowed)
 * 
 * @param status - Load status to check
 * @returns true if status is terminal, false otherwise
 */
export function isTerminalStatus(status: LoadStatus | string): boolean {
  return status === 'DELIVERED' || status === 'LOST';
}


