/**
 * External Service Mocks for Connectivity Tests
 * 
 * These mocks prevent actual API calls to SendGrid, Twilio, and OpenAI during tests.
 * They return predictable success responses for testing the system wiring.
 */

import { jest } from '@jest/globals';

export const mockSendGridSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);

export const mockTwilioMessagesCreate = jest.fn().mockResolvedValue({
  sid: 'SM_TEST_MESSAGE_SID',
  status: 'sent',
});

export const mockOpenAIChatCompletionsCreate = jest.fn().mockResolvedValue({
  id: 'chatcmpl-test',
  object: 'chat.completion',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Test AI response',
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30,
  },
});

export function setupExternalMocks() {
  jest.mock('@sendgrid/mail', () => ({
    setApiKey: jest.fn(),
    send: mockSendGridSend,
  }));

  jest.mock('twilio', () => {
    return jest.fn(() => ({
      messages: {
        create: mockTwilioMessagesCreate,
      },
    }));
  });

  jest.mock('openai', () => {
    return {
      default: jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: mockOpenAIChatCompletionsCreate,
          },
        },
      })),
    };
  });
}

export function resetExternalMocks() {
  mockSendGridSend.mockClear();
  mockTwilioMessagesCreate.mockClear();
  mockOpenAIChatCompletionsCreate.mockClear();
}

export function getMockCallCounts() {
  return {
    sendgrid: mockSendGridSend.mock.calls.length,
    twilio: mockTwilioMessagesCreate.mock.calls.length,
    openai: mockOpenAIChatCompletionsCreate.mock.calls.length,
  };
}
