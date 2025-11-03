/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import type { ModelParameters } from '../../../src/types';
import { tryParseJson, prettyJson, parseFloatOrNull, parseFloatOrUndef, parseIntOrUndef } from '../utils';
import {
    VscodeTextfield,
    VscodeTextarea,
    VscodeCheckbox,
    VscodeDivider,
    VscodeFormGroup,
    VscodeFormHelper,
} from '@vscode-elements/react-elements';

export interface ModelParamsProps {
    value: ModelParameters;
    onChange: (next: ModelParameters) => void;
}

const ModelParamsForm: React.FC<ModelParamsProps> = ({ value, onChange }) => {
    const update = (field: keyof ModelParameters | string, v: any) => {
        const next: any = { ...(value || ({} as ModelParameters)) };
        if (v === '' || (typeof v === 'number' && Number.isNaN(v))) {
            delete next[field];
        } else {
            next[field] = v;
        }
        onChange(next as ModelParameters);
    };

    return (
        <div className="collapsible-content">
            <h4>
                Model parameters <small>(sent to provider)</small>
            </h4>
            <div className="form-group">
                <em>
                    Model parameters are sent to the model provider in the request body. Use <code>extra</code> for
                    provider-specific unknown keys (raw JSON). Fields set to <code>null</code> will be omitted from the request
                    to allow provider defaults.
                </em>
            </div>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="number"
                    value={(value?.max_tokens as unknown as string) ?? ''}
                    onInput={(e: any) => update('max_tokens', parseIntOrUndef(e.currentTarget.value))}
                >
                    <span slot="label">Max Tokens</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="number"
                    value={(value?.max_completion_tokens as unknown as string) ?? ''}
                    onInput={(e: any) => update('max_completion_tokens', parseIntOrUndef(e.currentTarget.value))}
                >
                    <span slot="label">Max Completion Tokens</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="number"
                    step={0.1}
                    value={(value?.temperature as unknown as string) ?? ''}
                    onInput={(e: any) => update('temperature', parseFloatOrNull(e.currentTarget.value))}
                >
                    <span slot="label">Temperature (0-2)</span>
                </VscodeTextfield>
                <VscodeFormHelper>Range 0–2. Set null to omit from request.</VscodeFormHelper>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="number"
                    step={0.1}
                    value={(value?.top_p as unknown as string) ?? ''}
                    onInput={(e: any) => update('top_p', parseFloatOrNull(e.currentTarget.value))}
                >
                    <span slot="label">Top P (0-1)</span>
                </VscodeTextfield>
                <VscodeFormHelper>Range 0–1. Set null to omit from request.</VscodeFormHelper>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="number"
                    value={(value?.top_k as unknown as string) ?? ''}
                    onInput={(e: any) => update('top_k', parseIntOrUndef(e.currentTarget.value))}
                >
                    <span slot="label">Top K</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="number"
                    step={0.01}
                    value={(value?.min_p as unknown as string) ?? ''}
                    onInput={(e: any) => update('min_p', parseFloatOrUndef(e.currentTarget.value))}
                >
                    <span slot="label">Min P</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="number"
                    step={0.1}
                    value={(value?.frequency_penalty as unknown as string) ?? ''}
                    onInput={(e: any) => update('frequency_penalty', parseFloatOrUndef(e.currentTarget.value))}
                >
                    <span slot="label">Frequency Penalty</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="number"
                    step={0.1}
                    value={(value?.presence_penalty as unknown as string) ?? ''}
                    onInput={(e: any) => update('presence_penalty', parseFloatOrUndef(e.currentTarget.value))}
                >
                    <span slot="label">Presence Penalty</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="number"
                    step={0.1}
                    value={(value?.repetition_penalty as unknown as string) ?? ''}
                    onInput={(e: any) => update('repetition_penalty', parseFloatOrUndef(e.currentTarget.value))}
                >
                    <span slot="label">Repetition Penalty</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="number"
                    value={(value?.thinking_budget as unknown as string) ?? ''}
                    onInput={(e: any) => update('thinking_budget', parseIntOrUndef(e.currentTarget.value))}
                >
                    <span slot="label">Thinking Budget</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeDivider></VscodeDivider>

            <VscodeFormGroup>
                <VscodeTextarea
                    rows={3 as any}
                    placeholder='{"type":"enabled"}'
                    value={prettyJson(value?.thinking)}
                    onInput={(e: any) => update('thinking', tryParseJson(e.currentTarget.value))}
                >
                    <span slot="label">Thinking (JSON)</span>
                </VscodeTextarea>
                <VscodeFormHelper>Set to {"{"}"type":"enabled"{"}"} to enable</VscodeFormHelper>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeCheckbox
                    checked={!!value?.enable_thinking}
                    onInput={(e: any) => update('enable_thinking', (e.currentTarget as any).checked)}
                >
                    Enable thinking features for this model
                </VscodeCheckbox>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextarea
                    rows={3 as any}
                    placeholder='{"enabled":true,"effort":"high"}'
                    value={prettyJson(value?.reasoning)}
                    onInput={(e: any) => update('reasoning', tryParseJson(e.currentTarget.value))}
                >
                    <span slot="label">Reasoning (JSON)</span>
                </VscodeTextarea>
                <VscodeFormHelper>OpenAI-style reasoning: set enabled/effort or max_tokens</VscodeFormHelper>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextfield
                    type="text"
                    value={(value?.reasoning_effort as unknown as string) ?? ''}
                    onInput={(e: any) => update('reasoning_effort', e.currentTarget.value)}
                >
                    <span slot="label">Reasoning Effort</span>
                </VscodeTextfield>
            </VscodeFormGroup>

            <VscodeFormGroup>
                <VscodeTextarea
                    rows={4 as any}
                    placeholder='{"custom_param":"value"}'
                    value={prettyJson(value?.extra)}
                    onInput={(e: any) => update('extra', tryParseJson(e.currentTarget.value))}
                >
                    <span slot="label">Extra (JSON)</span>
                </VscodeTextarea>
                <VscodeFormHelper>Provider-specific parameters (JSON object)</VscodeFormHelper>
            </VscodeFormGroup>
        </div>
    );
};

export default ModelParamsForm;
