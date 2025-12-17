/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProviderConfig } from '../../../src/types';
import { prettyJson, tryParseJson, } from '../utils';
import {
  VscodeTextfield,
  VscodeTextarea,
  VscodeButton,
  VscodeDivider,
  VscodeFormHelper,
  VscodeCollapsible,
  VscodeSingleSelect,
  VscodeOption,
} from '@vscode-elements/react-elements';

export interface ProvidersProps {
  providers: ProviderConfig[];
  onChange: (providers: ProviderConfig[]) => void;
	onIflowOAuth: (provider: ProviderConfig) => void;
  onIflowClearAuth: (provider: ProviderConfig) => void;
	iflowStatus?: Record<string, { loggedIn: boolean; expire?: string; lastRefresh?: string; email?: string }>;
}

const vercelTypes: ProviderConfig['vercelType'][] = ['openai-compatible', 'openai', 'openrouter', 'google', 'claude-code', 'deepseek', 'iflow'];

const ProviderItem: React.FC<{
  provider: ProviderConfig;
  index: number;
  onUpdate: (next: ProviderConfig) => void;
  onRemove: () => void;
  onIflowOAuth: (provider: ProviderConfig) => void;
  onIflowClearAuth: (provider: ProviderConfig) => void;
  iflowStatus?: Record<string, { loggedIn: boolean; expire?: string; lastRefresh?: string; email?: string }>;
}> = ({ provider, index, onUpdate, onRemove, onIflowOAuth, onIflowClearAuth, iflowStatus }) => {
  const { t } = useTranslation();
	const status = provider.vercelType === 'iflow' && provider.id ? iflowStatus?.[provider.id] : undefined;
	const loggedIn = Boolean(status?.loggedIn);
  const expireMs = status?.expire ? new Date(status.expire).getTime() : NaN;
  const lastRefreshMs = status?.lastRefresh ? new Date(status.lastRefresh).getTime() : NaN;
  const expireAtText = (() => {
    if (!Number.isFinite(expireMs)) return '';
    return new Date(expireMs).toLocaleString();
  })();
  const lastRefreshText = (() => {
    if (!Number.isFinite(lastRefreshMs)) return '';
    return new Date(lastRefreshMs).toLocaleString();
  })();
  const formatDuration = (ms: number): string => {
    if (!Number.isFinite(ms)) return '';
    if (ms <= 0) return t('providers.iflowExpired');
    const totalMinutes = Math.floor(ms / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
    const minutes = totalMinutes - days * 60 * 24 - hours * 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}${t('providers.iflowDays')}`);
    if (hours > 0 || days > 0) parts.push(`${hours}${t('providers.iflowHours')}`);
    parts.push(`${minutes}${t('providers.iflowMinutes')}`);
    return parts.join(' ');
  };
  const validityText = (() => {
    if (!Number.isFinite(expireMs) || !Number.isFinite(lastRefreshMs)) return '';
    return formatDuration(expireMs - lastRefreshMs);
  })();
  const remainingText = (() => {
    if (!Number.isFinite(expireMs)) return '';
    return formatDuration(expireMs - Date.now());
  })();
  const updateField = (field: 'id' | 'displayName' | 'baseUrl' | 'vercelType', value: string) => {
    const next: ProviderConfig = { ...provider };
    const v = value === '' ? '' : value;
    if (field === 'id') { next.id = v; }
    if (field === 'displayName') { next.displayName = v || undefined; }
    if (field === 'baseUrl') { next.baseUrl = v; }
    if (field === 'vercelType') { next.vercelType = v as ProviderConfig['vercelType']; }
    onUpdate(next);
  };

  const updateHeaders = (text: string) => {
    const parsed = tryParseJson<Record<string, string>>(text);
    if (parsed === undefined) {
      const next = { ...provider };
      delete next.headers;
      onUpdate(next);
    } else if (typeof parsed === 'string') {
      // keep raw string by storing nothing and letting textarea show text
      // No-op to avoid data loss; we can't store string in headers typed as Record
      onUpdate({ ...provider, headers: provider.headers });
    } else {
      onUpdate({ ...provider, headers: parsed });
    }
  };

  const updateProviderSpecificOptions = (text: string) => {
    const parsed = tryParseJson<Record<string, unknown>>(text);
    if (parsed === undefined) {
      const next = { ...provider };
      delete next.providerSpecificOptions;
      onUpdate(next);
    } else if (typeof parsed === 'string') {
      // keep raw string by storing nothing and letting textarea show text
      // No-op to avoid data loss; we can't store string in providerSpecificOptions typed as Record
      onUpdate({ ...provider, providerSpecificOptions: provider.providerSpecificOptions });
    } else {
      onUpdate({ ...provider, providerSpecificOptions: parsed });
    }
  };

  return (
    <div className="item">
      <VscodeCollapsible heading={`${t('providers.provider')} ${index + 1}${provider.displayName ? ` – ${provider.displayName}` : ''}`} alwaysShowHeaderActions>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
      {provider.vercelType === 'iflow' && (
        <VscodeButton onClick={() => onIflowOAuth(provider)} secondary>
          {t('providers.iflowOAuth')}
        </VscodeButton>
      )}
      {provider.vercelType === 'iflow' && (
        <VscodeButton onClick={() => onIflowClearAuth(provider)} secondary>
          {t('providers.iflowClearAuth')}
        </VscodeButton>
      )}
      <VscodeButton onClick={onRemove} secondary>
        {t('common.delete')}
      </VscodeButton>
    </div>
        <div className="form-field">
          <VscodeFormHelper>{t('providers.id')}</VscodeFormHelper>
          <VscodeTextfield
            type="text"
            value={(provider.id as unknown as string) ?? ''}
            placeholder={t('providers.idPlaceholder')}
            onInput={(e: any) => updateField('id', e.currentTarget.value)}
          >
          </VscodeTextfield>
          <VscodeFormHelper style={{ color: 'var(--vscode-errorForeground)', display: provider.id ? 'none' : 'block' }}>
            {t('providers.idRequired')}
          </VscodeFormHelper>
        </div>

    {provider.vercelType === 'iflow' && (
      <div className="form-field">
        <VscodeFormHelper>{t('providers.iflowOAuthStatus')}</VscodeFormHelper>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            aria-label={loggedIn ? t('providers.iflowLoggedIn') : t('providers.iflowLoggedOut')}
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: loggedIn ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-descriptionForeground)',
            }}
          />
          <span style={{ color: 'var(--vscode-foreground)' }}>
            {loggedIn ? t('providers.iflowLoggedIn') : t('providers.iflowLoggedOut')}
          </span>
        </div>
        <VscodeFormHelper>
          {t('providers.iflowExpiresAt')}: {expireAtText || t('providers.iflowExpireUnknown')}
        </VscodeFormHelper>
        <VscodeFormHelper>
          {t('providers.iflowValidity')}: {validityText || t('providers.iflowExpireUnknown')}
        </VscodeFormHelper>
        <VscodeFormHelper>
          {t('providers.iflowRemaining')}: {remainingText || t('providers.iflowExpireUnknown')}
        </VscodeFormHelper>
        <VscodeFormHelper>
          {t('providers.iflowLastRefresh')}: {lastRefreshText || t('providers.iflowExpireUnknown')}
        </VscodeFormHelper>
      </div>
    )}

        <div className="form-field">
          <VscodeFormHelper>{t('providers.vercelTypeLabel')}</VscodeFormHelper>
          <VscodeSingleSelect
            value={provider.vercelType ?? ''}
            onChange={(e: any) => updateField('vercelType', e.currentTarget.value)}
          >
            <VscodeOption value="" disabled>{t('providers.vercelTypePlaceholder')}</VscodeOption>
            {vercelTypes.map((t) => (
              <VscodeOption key={t} value={t}>{t}</VscodeOption>
            ))}
          </VscodeSingleSelect>
          <VscodeFormHelper style={{ color: 'var(--vscode-errorForeground)', display: provider.vercelType ? 'none' : 'block' }}>
            {t('providers.vercelTypeRequired')}
          </VscodeFormHelper>
        </div>

        <div className="form-field">
          <VscodeFormHelper>{t('providers.displayName')}</VscodeFormHelper>
          <VscodeTextfield
            type="text"
            value={(provider.displayName as unknown as string) ?? ''}
            onInput={(e: any) => updateField('displayName', e.currentTarget.value)}
          >
          </VscodeTextfield>
        </div>

        <div className="form-field">
          <VscodeFormHelper>{t('providers.baseUrl')}</VscodeFormHelper>
          <VscodeTextfield
            type="text"
            value={(provider.baseUrl as unknown as string) ?? ''}
            placeholder={t('providers.baseUrlPlaceholder')}
            onInput={(e: any) => updateField('baseUrl', e.currentTarget.value)}
          >
          </VscodeTextfield>
        </div>

        <div className="form-field">
          <VscodeFormHelper>{t('providers.headers')}</VscodeFormHelper>
          <VscodeTextarea
            rows={3 as any}
            placeholder={t('providers.headersPlaceholder')}
            value={prettyJson(provider.headers)}
            onInput={(e: any) => updateHeaders(e.currentTarget.value)}
          >
          </VscodeTextarea>
          <VscodeFormHelper>{t('providers.headersDescription')}</VscodeFormHelper>
        </div>

        <div className="form-field">
          <VscodeFormHelper>{t('providers.providerSpecificOptions')}</VscodeFormHelper>
          <VscodeTextarea
            rows={3 as any}
            placeholder={t('providers.providerSpecificOptionsPlaceholder')}
            value={prettyJson(provider.providerSpecificOptions)}
            onInput={(e: any) => updateProviderSpecificOptions(e.currentTarget.value)}
          >
          </VscodeTextarea>
          <VscodeFormHelper>{t('providers.providerSpecificOptionsDescription')}</VscodeFormHelper>
        </div>

      </VscodeCollapsible>
      <VscodeDivider></VscodeDivider>
    </div>

  );
};

export const Providers: React.FC<ProvidersProps> = ({ providers, onChange, onIflowOAuth, onIflowClearAuth, iflowStatus }) => {
  const { t } = useTranslation();
  const addProvider = (type: ProviderConfig['vercelType'] = 'openai-compatible') => {
    let next: ProviderConfig;
    switch (type) {
      case 'iflow':
        next = {
          id: 'iflow',
          baseUrl: 'https://apis.iflow.cn/v1',
          displayName: 'iFlow',
          vercelType: 'iflow'
        } as ProviderConfig;
        break;
      default:
        next = {
          id: '',
          baseUrl: '',
          displayName: '',
          vercelType: type
        } as ProviderConfig;
    }
    onChange([...(providers ?? []), next]);
  };

  const updateAt = (i: number, nextItem: ProviderConfig) => {
    const next = providers.slice();
    next[i] = nextItem;
    onChange(next);
  };

  const removeAt = (i: number) => {
    const next = providers.slice();
    next.splice(i, 1);
    onChange(next);
  };

  if (!providers || providers.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <VscodeButton onClick={() => addProvider('openai-compatible')} secondary>
            + OpenAI-Compatible
          </VscodeButton>
          <VscodeButton onClick={() => addProvider('openai')} secondary>
            + OpenAI
          </VscodeButton>
          <VscodeButton onClick={() => addProvider('openrouter')} secondary>
            + OpenRouter
          </VscodeButton>
          <VscodeButton onClick={() => addProvider('google')} secondary>
            + Google
          </VscodeButton>
          <VscodeButton onClick={() => addProvider('iflow')} secondary>
            + iFlow
          </VscodeButton>
          <VscodeButton onClick={() => addProvider('deepseek')} secondary>
            + DeepSeek
          </VscodeButton>
          <VscodeButton onClick={() => addProvider('claude-code')} secondary>
            + Claude Code
          </VscodeButton>
        </div>
        <div className="empty-state">{t('providers.empty')}</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <VscodeButton onClick={() => addProvider('openai-compatible')} secondary>
          + OpenAI-Compatible
        </VscodeButton>
        <VscodeButton onClick={() => addProvider('openai')} secondary>
          + OpenAI
        </VscodeButton>
        <VscodeButton onClick={() => addProvider('openrouter')} secondary>
          + OpenRouter
        </VscodeButton>
        <VscodeButton onClick={() => addProvider('google')} secondary>
          + Google
        </VscodeButton>
        <VscodeButton onClick={() => addProvider('iflow')} secondary>
          + iFlow
        </VscodeButton>
        <VscodeButton onClick={() => addProvider('deepseek')} secondary>
          + DeepSeek
        </VscodeButton>
        <VscodeButton onClick={() => addProvider('claude-code')} secondary>
          + Claude Code
        </VscodeButton>
      </div>
      <div className="item-list">
        {providers.map((p, i) => (
          <ProviderItem
            key={i}
            provider={p}
            index={i}
            onUpdate={(np) => updateAt(i, np)}
            onRemove={() => removeAt(i)}
			onIflowOAuth={onIflowOAuth}
			onIflowClearAuth={onIflowClearAuth}
			iflowStatus={iflowStatus}
          />
        ))}
      </div>
    </div>
  );
};

export default Providers;
