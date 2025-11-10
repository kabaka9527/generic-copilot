/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import type { ModelParameters } from '../../../src/types';
import { tryParseJson, prettyJson, parseFloatOrNull } from '../utils';
import {
    VscodeTextfield,
    VscodeTextarea,
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




            <div className="form-field">
                <VscodeFormHelper>Temperature (0-2)</VscodeFormHelper>
                <VscodeTextfield
                    type="number"
                    step={0.1}
                    value={(value?.temperature as unknown as string) ?? ''}
                    onInput={(e: any) => update('temperature', parseFloatOrNull(e.currentTarget.value))}
                >
                </VscodeTextfield>
                <VscodeFormHelper>Range 0–2. Set null to omit from request.</VscodeFormHelper>
            </div>



            <div className="form-field">
                <VscodeFormHelper>Custom Params (JSON)</VscodeFormHelper>
                <VscodeTextarea
                    rows={4 as any}
                    placeholder='{"custom_param":"value"}'
                    value={prettyJson(value?.extra)}
                    onInput={(e: any) => update('extra', tryParseJson(e.currentTarget.value))}
                >
                </VscodeTextarea>
                <VscodeFormHelper>Provider-specific parameters (JSON object)</VscodeFormHelper>
            </div>
        </div>
    );
};

export default ModelParamsForm;
