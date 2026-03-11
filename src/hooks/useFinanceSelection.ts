import { useCallback, useState } from 'react';

import { getSetting, setSetting } from '../utils/config.js';
import { checkApiKeyExists, saveApiKeyToEnv } from '../utils/env.js';
import {
  getFinanceProviderDef,
  getFinanceProviderDisplayName,
  isFinanceProviderId,
  type FinanceProviderId,
} from '../tools/finance/providers.js';

const SELECTION_STATES = ['provider_select', 'api_key_confirm', 'api_key_input'] as const;
type SelectionState = typeof SELECTION_STATES[number];
type AppState = 'idle' | SelectionState;
type PendingFinanceProvider = Exclude<FinanceProviderId, 'auto'>;

interface FinanceSelectionState {
  appState: AppState;
  pendingProvider: PendingFinanceProvider | null;
}

interface UseFinanceSelectionResult {
  selectionState: FinanceSelectionState;
  financeProvider: FinanceProviderId;
  startSelection: () => void;
  cancelSelection: () => void;
  handleProviderSelect: (provider: string | null) => void;
  handleApiKeyConfirm: (wantsToSet: boolean) => void;
  handleApiKeySubmit: (apiKey: string | null) => void;
  isInSelectionFlow: () => boolean;
  getPendingProviderName: () => string;
  getPendingProviderApiKeyName: () => string;
}

function normalizeStoredProvider(value: unknown): FinanceProviderId {
  return typeof value === 'string' && isFinanceProviderId(value) ? value : 'auto';
}

export function useFinanceSelection(
  onError?: (error: string) => void,
): UseFinanceSelectionResult {
  const [financeProvider, setFinanceProvider] = useState<FinanceProviderId>(() =>
    normalizeStoredProvider(getSetting('financeProvider', 'auto')),
  );
  const [appState, setAppState] = useState<AppState>('idle');
  const [pendingProvider, setPendingProvider] = useState<PendingFinanceProvider | null>(null);

  const resetPendingState = useCallback(() => {
    setPendingProvider(null);
    setAppState('idle');
  }, []);

  const completeSelection = useCallback((providerId: FinanceProviderId) => {
    setFinanceProvider(providerId);
    setSetting('financeProvider', providerId);
    resetPendingState();
  }, [resetPendingState]);

  const startSelection = useCallback(() => {
    setAppState('provider_select');
  }, []);

  const cancelSelection = useCallback(() => {
    resetPendingState();
  }, [resetPendingState]);

  const handleProviderSelect = useCallback((providerId: string | null) => {
    if (!providerId) {
      resetPendingState();
      return;
    }

    if (!isFinanceProviderId(providerId)) {
      onError?.(`Unknown finance provider: ${providerId}`);
      resetPendingState();
      return;
    }

    if (providerId === 'auto') {
      completeSelection(providerId);
      return;
    }

    setPendingProvider(providerId);

    if (checkApiKeyExists(getFinanceProviderDef(providerId).apiKeyEnvVar)) {
      completeSelection(providerId);
      return;
    }

    setAppState('api_key_confirm');
  }, [completeSelection, onError, resetPendingState]);

  const handleApiKeyConfirm = useCallback((wantsToSet: boolean) => {
    if (!pendingProvider) {
      resetPendingState();
      return;
    }

    if (wantsToSet) {
      setAppState('api_key_input');
      return;
    }

    const apiKeyName = getFinanceProviderDef(pendingProvider).apiKeyEnvVar;
    if (checkApiKeyExists(apiKeyName)) {
      completeSelection(pendingProvider);
      return;
    }

    onError?.(`Cannot use ${getFinanceProviderDisplayName(pendingProvider)} without ${apiKeyName}.`);
    resetPendingState();
  }, [completeSelection, onError, pendingProvider, resetPendingState]);

  const handleApiKeySubmit = useCallback((apiKey: string | null) => {
    if (!pendingProvider) {
      resetPendingState();
      return;
    }

    const apiKeyName = getFinanceProviderDef(pendingProvider).apiKeyEnvVar;
    const trimmedApiKey = apiKey?.trim();

    if (trimmedApiKey) {
      if (saveApiKeyToEnv(apiKeyName, trimmedApiKey)) {
        completeSelection(pendingProvider);
      } else {
        onError?.(`Failed to save ${apiKeyName}.`);
        resetPendingState();
      }
      return;
    }

    if (checkApiKeyExists(apiKeyName)) {
      completeSelection(pendingProvider);
      return;
    }

    onError?.(`${apiKeyName} not set. Finance provider unchanged.`);
    resetPendingState();
  }, [completeSelection, onError, pendingProvider, resetPendingState]);

  const isInSelectionFlow = useCallback(() => appState !== 'idle', [appState]);

  const getPendingProviderName = useCallback(() => {
    return pendingProvider ? getFinanceProviderDisplayName(pendingProvider) : '';
  }, [pendingProvider]);

  const getPendingProviderApiKeyName = useCallback(() => {
    return pendingProvider ? getFinanceProviderDef(pendingProvider).apiKeyEnvVar : '';
  }, [pendingProvider]);

  return {
    selectionState: {
      appState,
      pendingProvider,
    },
    financeProvider,
    startSelection,
    cancelSelection,
    handleProviderSelect,
    handleApiKeyConfirm,
    handleApiKeySubmit,
    isInSelectionFlow,
    getPendingProviderName,
    getPendingProviderApiKeyName,
  };
}
