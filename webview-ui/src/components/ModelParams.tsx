/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
                {t('modelParams.title')} <small>({t('modelParams.sentToProvider')})
                </small>
            </h4>




            <div className="form-field">
                <VscodeFormHelper>{t('modelParams.temperatureLabel')}</VscodeFormHelper>
                <VscodeTextfield
                    type="number"
                    step={0.1}
                    value={(value?.temperature as unknown as string) ?? ''}
                    onInput={(e: any) => update('temperature', parseFloatOrNull(e.currentTarget.value))}
                >
                </VscodeTextfield>
                <VscodeFormHelper>{t('modelParams.temperatureDescription')}</VscodeFormHelper>
            </div>



            <div className="form-field">
                <VscodeFormHelper>{t('modelParams.customParamsLabel')}</VscodeFormHelper>
                <VscodeTextarea
                    rows={4 as any}
                    placeholder={t('modelParams.customParamsPlaceholder')}
                    value={prettyJson(value?.extra)}
                    onInput={(e: any) => update('extra', tryParseJson(e.currentTarget.value))}
                >
                </VscodeTextarea>
                <VscodeFormHelper>{t('modelParams.customParamsDescription')}</VscodeFormHelper>
            </div>
        </div>
    );
};

export default ModelParamsForm;
