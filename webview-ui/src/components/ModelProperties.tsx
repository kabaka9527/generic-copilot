/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import type { ModelProperties, ProviderConfig } from '../../../src/types';
import { prettyJson, tryParseJson, parseIntOrUndef } from '../utils';
import {
    VscodeTextfield,
    VscodeTextarea,
    VscodeCheckbox,
    VscodeSingleSelect,
    VscodeOption,
    VscodeFormGroup,
    VscodeFormHelper,
} from '@vscode-elements/react-elements';

export interface ModelPropertiesProps {
    value: ModelProperties;
    providers: ProviderConfig[];
    onChange: (next: ModelProperties) => void;
}

const ModelPropertiesForm: React.FC<ModelPropertiesProps> = ({ value, providers, onChange }) => {
    const update = (field: keyof ModelProperties, v: any) => {
        const next: any = { ...(value || ({} as ModelProperties)) };
        if (v === '' || (typeof v === 'number' && Number.isNaN(v))) {
            delete next[field];
        } else {
            next[field] = v;
        }
        onChange(next as ModelProperties);
    };

    const providerOptions = providers.map((p) => (
        <VscodeOption key={p.key} value={p.key}>
            {p.displayName || p.key}
        </VscodeOption>
    ));

    return (
        <div className="collapsible-content">
            <h4>
                Model properties <small>(internal — not sent to provider)</small>
            </h4>
            <div className="form-group">
                <em>
                    Model properties are internal metadata used by the extension and are NOT sent to the model provider.
                </em>
            </div>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="text"
                    placeholder="e.g., gpt-4, claude-3-opus"
                    value={(value?.id as unknown as string) ?? ''}
                    onInput={(e: any) => update('id', e.currentTarget.value)}
                >
                    <span slot="label">Model ID (required) *</span>
                </VscodeTextfield>
                <VscodeFormHelper style={{ color: 'var(--vscode-errorForeground)', display: value?.id ? 'none' : 'block' }}>
                    Model ID is required
                </VscodeFormHelper>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="text"
                    placeholder="Optional human-readable name"
                    value={(value?.displayName as unknown as string) ?? ''}
                    onInput={(e: any) => update('displayName', e.currentTarget.value)}
                >
                    <span slot="label">Display Name</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeSingleSelect
                    value={(value?.provider as unknown as string) ?? ''}
                    onInput={(e: any) => update('provider', e.currentTarget.value)}
                >
                    <span slot="label">Provider</span>
                    <VscodeOption value="" disabled>
                        Select a provider
                    </VscodeOption>
                    {providerOptions}
                </VscodeSingleSelect>
                <VscodeFormHelper>Select a provider to inherit baseUrl and defaults (optional)</VscodeFormHelper>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="text"
                    placeholder="e.g., openai, anthropic"
                    value={(value?.owned_by as unknown as string) ?? ''}
                    onInput={(e: any) => update('owned_by', e.currentTarget.value)}
                >
                    <span slot="label">Owned By</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="text"
                    placeholder="Optional: e.g., thinking, fast"
                    value={(value?.configId as unknown as string) ?? ''}
                    onInput={(e: any) => update('configId', e.currentTarget.value)}
                >
                    <span slot="label">Config ID</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="text"
                    placeholder="Leave empty to use provider base URL"
                    value={(value?.baseUrl as unknown as string) ?? ''}
                    onInput={(e: any) => update('baseUrl', e.currentTarget.value)}
                >
                    <span slot="label">Base URL (override)</span>
                </VscodeTextfield>
                <VscodeFormHelper>Override provider base URL for this model (optional)</VscodeFormHelper>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextarea
                    rows={3 as any}
                    placeholder='{"X-Custom-Header":"value"}'
                    value={prettyJson(value?.headers)}
                    onInput={(e: any) =>
                        update('headers', tryParseJson<Record<string, string>>(e.currentTarget.value))
                    }
                >
                    <span slot="label">Headers (JSON)</span>
                </VscodeTextarea>
                <VscodeFormHelper>Custom headers for this model (JSON object)</VscodeFormHelper>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextarea
                    rows={2 as any}
                    placeholder='{"input_modalities":["text","image_url"]}'
                    value={prettyJson(value?.architecture)}
                    onInput={(e: any) => update('architecture', tryParseJson(e.currentTarget.value))}
                >
                    <span slot="label">Architecture (JSON)</span>
                </VscodeTextarea>
                <VscodeFormHelper>Model capabilities metadata (JSON object)</VscodeFormHelper>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="number"
                    value={(value?.context_length as unknown as string) ?? ''}
                    onInput={(e: any) => update('context_length', parseIntOrUndef(e.currentTarget.value))}
                >
                    <span slot="label">Context Length</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeCheckbox
                    checked={!!value?.vision}
                    onInput={(e: any) => update('vision', (e.currentTarget as any).checked)}
                >
                    Vision Support
                </VscodeCheckbox>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="text"
                    placeholder="e.g., gpt-4, claude-3, gemini"
                    value={(value?.family as unknown as string) ?? ''}
                    onInput={(e: any) => update('family', e.currentTarget.value)}
                >
                    <span slot="label">Family</span>
                </VscodeTextfield>
            </VscodeFormGroup>
        </div>
    );
};

export default ModelPropertiesForm;
