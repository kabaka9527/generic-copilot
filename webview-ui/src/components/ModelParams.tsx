/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react';
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
    const initialTemperatureText = useMemo(() => {
        const v = value?.temperature;
        return v === null || v === undefined ? '' : String(v);
    }, [value?.temperature]);
    const [temperatureText, setTemperatureText] = useState<string>(initialTemperatureText);

    useEffect(() => {
        setTemperatureText(initialTemperatureText);
    }, [initialTemperatureText]);

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
                    type="text"
                    inputMode="decimal"
                    value={temperatureText}
                    onInput={(e: any) => setTemperatureText(e.currentTarget.value)}
					onBlur={() => update('temperature', parseFloatOrNull((temperatureText ?? '').trim()))}
					onKeyDown={(e: any) => {
						if (e.key === 'Enter') {
							update('temperature', parseFloatOrNull((temperatureText ?? '').trim()));
						}
					}}
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
