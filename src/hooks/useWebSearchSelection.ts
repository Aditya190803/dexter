import { useCallback, useState } from 'react';

import { getSetting, setSetting } from '../utils/config.js';
import { checkApiKeyExists, saveApiKeyToEnv } from '../utils/env.js';
import {
  getWebSearchProviderDef,
  getWebSearchProviderDisplayName,
  isWebSearchProviderId,
  type WebSearchProviderId,
} from '../tools/search/providers.js';

const SELECTION_STATES = ['provider_select', 'api_key_confirm', 'api_key_input'] as const;
type SelectionState = typeof SELECTION_STATES[number];
type AppState = 'idle' | SelectionState;
type PendingWebSearchProvider = Exclude<WebSearchProviderId, 'auto'>;

interface WebSearchSelectionState {
  appState: AppState;
  pendingProvider: PendingWebSearchProvider | null;
}

interface UseWebSearchSelectionResult {
  selectionState: WebSearchSelectionState;
  webSearchProvider: WebSearchProviderId;
  startSelection: () => void;
  cancelSelection: () => void;
  handleProviderSelect: (provider: string | null) => void;
  handleApiKeyConfirm: (wantsToSet: boolean) => void;
  handleApiKeySubmit: (apiKey: string | null) => void;
  isInSelectionFlow: () => boolean;
  getPendingProviderName: () => string;
  getPendingProviderApiKeyName: () => string;
}

function normalizeStoredProvider(value: unknown): WebSearchProviderId {
  return typeof value === 'string' && isWebSearchProviderId(value) ? value : 'auto';
}

export function useWebSearchSelection(
  onError?: (error: string) => void,
): UseWebSearchSelectionResult {
  const [webSearchProvider, setWebSearchProvider] = useState<WebSearchProviderId>(() =>
    normalizeStoredProvider(getSetting('webSearchProvider', 'auto')),
  );
  const [appState, setAppState] = useState<AppState>('idle');
  const [pendingProvider, setPendingProvider] = useState<PendingWebSearchProvider | null>(null);

  const resetPendingState = useCallback(() => {
    setPendingProvider(null);
    setAppState('idle');
  }, []);

  const completeSelection = useCallback((providerId: WebSearchProviderId) => {
    setWebSearchProvider(providerId);
    setSetting('webSearchProvider', providerId);
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

    if (!isWebSearchProviderId(providerId)) {
      onError?.(`Unknown web search provider: ${providerId}`);
      resetPendingState();
      return;
    }

    if (providerId === 'auto') {
      completeSelection(providerId);
      return;
    }

    setPendingProvider(providerId);

    if (checkApiKeyExists(getWebSearchProviderDef(providerId).apiKeyEnvVar)) {
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

    const apiKeyName = getWebSearchProviderDef(pendingProvider).apiKeyEnvVar;
    if (checkApiKeyExists(apiKeyName)) {
      completeSelection(pendingProvider);
      return;
    }

    onError?.(`Cannot use ${getWebSearchProviderDisplayName(pendingProvider)} without ${apiKeyName}.`);
    resetPendingState();
  }, [completeSelection, onError, pendingProvider, resetPendingState]);

  const handleApiKeySubmit = useCallback((apiKey: string | null) => {
    if (!pendingProvider) {
      resetPendingState();
      return;
    }

    const apiKeyName = getWebSearchProviderDef(pendingProvider).apiKeyEnvVar;
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

    onError?.(`${apiKeyName} not set. Web search provider unchanged.`);
    resetPendingState();
  }, [completeSelection, onError, pendingProvider, resetPendingState]);

  const isInSelectionFlow = useCallback(() => appState !== 'idle', [appState]);

  const getPendingProviderName = useCallback(() => {
    return pendingProvider ? getWebSearchProviderDisplayName(pendingProvider) : '';
  }, [pendingProvider]);

  const getPendingProviderApiKeyName = useCallback(() => {
    return pendingProvider ? getWebSearchProviderDef(pendingProvider).apiKeyEnvVar : '';
  }, [pendingProvider]);

  return {
    selectionState: {
      appState,
      pendingProvider,
    },
    webSearchProvider,
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
