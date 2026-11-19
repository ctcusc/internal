import "server-only";

// TODO: Temporary stub. CTC-45 (PR #34, darrens/slack-d1) owns this function and
// stores the reaction in D1. When rebasing onto it, take that version of this file.
export async function applySlackReactionEvent(event: unknown): Promise<void> {
  void event;
}
