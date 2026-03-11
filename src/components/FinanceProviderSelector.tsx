import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

import { colors } from '../theme.js';
import {
  FINANCE_PROVIDER_DEFS,
  getFinanceProviderDisplayName,
  type FinanceProviderId,
} from '../tools/finance/providers.js';

interface FinanceProviderSelectorProps {
  currentProvider?: FinanceProviderId;
  onSelect: (provider: FinanceProviderId | null) => void;
  onCancel?: () => void;
}

const PROVIDERS: readonly FinanceProviderId[] = [
  'auto',
  ...FINANCE_PROVIDER_DEFS.map((provider) => provider.id),
];

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return (index + length) % length;
}

export function FinanceProviderSelector({ currentProvider, onSelect, onCancel }: FinanceProviderSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const currentIndex = currentProvider ? PROVIDERS.indexOf(currentProvider) : -1;
    return currentIndex >= 0 ? currentIndex : 0;
  });

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => wrapIndex(prev - 1, PROVIDERS.length));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => wrapIndex(prev + 1, PROVIDERS.length));
    } else if (key.return) {
      onSelect(PROVIDERS[selectedIndex] ?? 'auto');
    } else if (key.escape) {
      onCancel?.();
      onSelect(null);
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={colors.primary} bold>
        Select finance provider
      </Text>
      <Text color={colors.muted}>
        Choose a specific finance API or keep Auto to use the first configured one.
      </Text>
      <Box marginTop={1} flexDirection="column">
        {PROVIDERS.map((providerId, index) => {
          const isSelected = index === selectedIndex;
          const isCurrent = currentProvider === providerId;
          const prefix = isSelected ? '> ' : '  ';
          const detail =
            providerId === 'auto'
              ? 'Configured provider priority'
              : FINANCE_PROVIDER_DEFS.find((provider) => provider.id === providerId)?.apiKeyEnvVar;

          return (
            <Text
              key={providerId}
              color={isSelected ? colors.primaryLight : colors.primary}
              bold={isSelected}
            >
              {prefix}
              {index + 1}. {getFinanceProviderDisplayName(providerId)}
              {detail ? ` (${detail})` : ''}
              {isCurrent ? ' ✓' : ''}
            </Text>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <Text color={colors.muted}>Enter to confirm · esc to go back</Text>
      </Box>
    </Box>
  );
}
