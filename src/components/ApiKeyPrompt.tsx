import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { colors } from '../theme.js';

interface ApiKeyConfirmProps {
  providerName: string;
  apiKeyUrl?: string;
  onConfirm: (wantsToSet: boolean) => void;
}

export function ApiKeyConfirm({ providerName, apiKeyUrl, onConfirm }: ApiKeyConfirmProps) {
  useInput((input, keyInfo) => {
    if (keyInfo.return) {
      onConfirm(true);
      return;
    }

    const normalizedInput = input.toLowerCase();
    if (normalizedInput === 'y') {
      onConfirm(true);
    } else if (normalizedInput === 'n') {
      onConfirm(false);
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={colors.primary} bold>
        Set API Key
      </Text>
      <Text>
        Would you like to set your {providerName} API key? <Text color={colors.muted}>(Y/n)</Text>
      </Text>
      {apiKeyUrl && (
        <Text color={colors.muted}>Get a key: {apiKeyUrl}</Text>
      )}
    </Box>
  );
}

interface ApiKeyInputProps {
  providerName: string;
  apiKeyName: string;
  apiKeyUrl?: string;
  onSubmit: (apiKey: string | null) => void;
}

export function ApiKeyInput({ providerName, apiKeyName, apiKeyUrl, onSubmit }: ApiKeyInputProps) {
  const [value, setValue] = useState('');

  useInput((input, key) => {
    if (key.return) {
      onSubmit(value.trim() || null);
    } else if (key.escape) {
      onSubmit(null);
    } else if (key.backspace || key.delete) {
      setValue((prev) => prev.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setValue((prev) => prev + input);
    }
  });

  // Mask the API key for display
  const maskedValue = value.length > 0 ? '*'.repeat(value.length) : '';

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={colors.primary} bold>
        Enter {providerName} API Key
      </Text>
      <Text color={colors.muted}>
        ({apiKeyName})
      </Text>
      {apiKeyUrl && (
        <Text color={colors.muted}>Get a key: {apiKeyUrl}</Text>
      )}
      <Box marginTop={1}>
        <Text color={colors.primary}>{'> '}</Text>
        <Text>{maskedValue}</Text>
        <Text color={colors.muted}>█</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={colors.muted}>Enter to confirm · Esc to cancel</Text>
      </Box>
    </Box>
  );
}

