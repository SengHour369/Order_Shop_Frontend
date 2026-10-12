import { vi } from 'vitest';
import { conversationId } from './conversation-id';

describe('Conversation IDs on LAN HTTP', () => {
  it('generates distinct valid UUIDs when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) });
    try {
      const first = conversationId(); const second = conversationId();
      expect(first).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
      expect(second).not.toBe(first);
    } finally { vi.unstubAllGlobals(); }
  });
});
