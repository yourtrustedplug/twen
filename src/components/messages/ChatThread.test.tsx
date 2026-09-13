import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChatThread from './ChatThread';
import ConversationList from './ConversationList';
import type { Conversation, Message } from '@/types/unignored';

const conversation: Conversation = {
  id: 'c1',
  brand_id: 'b1',
  creator_id: 'cr1',
  brand_name: 'Acme',
  creator_name: 'Ada',
  campaign_id: null,
  created_at: '2026-09-13T12:00:00',
  last_message_at: '2026-09-13T13:01:00',
  kind: 'direct',
  twen_stage: null,
};

const messages: Message[] = [
  {
    id: 'm1',
    conversation_id: 'c1',
    sender_id: 'cr1',
    body: 'Hi, I can post this week.',
    created_at: '2026-09-13T13:00:00',
    from_twen: false,
  },
  {
    id: 'm2',
    conversation_id: 'c1',
    sender_id: 'b1',
    body: 'Great — send a draft first.',
    created_at: '2026-09-13T13:01:00',
    from_twen: false,
  },
];

describe('ChatThread', () => {
  it('renders iMessage-style bubbles and a composer', () => {
    render(
      <ChatThread
        name="Ada"
        messages={messages}
        userId="b1"
        draft=""
        sending={false}
        emptyHint="empty"
        onDraft={() => {}}
        onSend={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('Hi, I can post this week.')).toBeTruthy();
    expect(screen.getByText('Great — send a draft first.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Message')).toBeTruthy();
    expect(screen.getByLabelText('Send')).toBeTruthy();
  });

  it('hides the composer on the Twen notice thread', () => {
    render(
      <ChatThread
        name="Twen"
        official
        messages={messages}
        userId="b1"
        draft=""
        sending={false}
        emptyHint="empty"
        readOnly
        readOnlyHint={<p>This chat is from Twen.</p>}
        onDraft={() => {}}
        onSend={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.queryByPlaceholderText('Message')).toBeNull();
    expect(screen.getByText('This chat is from Twen.')).toBeTruthy();
  });
});

describe('ConversationList', () => {
  it('shows the last message preview', () => {
    render(
      <ConversationList
        conversations={[conversation]}
        activeId="c1"
        userId="b1"
        nameOf={() => 'Ada'}
        avatarOf={() => null}
        previewOf={() => ({ body: 'Great — send a draft first.', senderId: 'b1' })}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('You: Great — send a draft first.')).toBeTruthy();
  });
});
