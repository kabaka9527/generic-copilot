/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ModelProperties, ProviderConfig } from '../../../src/types';
import { parseIntOrUndef } from '../utils';
import {
    VscodeTextfield,
    VscodeFormHelper,
} from '@vscode-elements/react-elements';

export interface ModelPropertiesProps {
    value: ModelProperties;
    providers: ProviderConfig[];
    onChange: (field: keyof ModelProperties, value: any) => void;
}

const ModelPropertiesForm: React.FC<ModelPropertiesProps> = ({ value, onChange }) => {
    const { t } = useTranslation();
    const update = (field: keyof ModelProperties, v: any) => {
        if (v === '' || (typeof v === 'number' && Number.isNaN(v))) {
            onChange(field, undefined);
        } else {
            onChange(field, v);
        }
    };

    return (
        <div className="collapsible-content">
            <h4>
                {t('modelProperties.title')} <small>({t('modelProperties.internalOnly')})
                </small>
            </h4>
            {/* Config ID moved to top-level ModelItem; edited in Models.tsx */}

            <div className="form-field">
                <VscodeFormHelper>{t('modelProperties.contextLengthLabel')}</VscodeFormHelper>
                <VscodeTextfield
                    type="number"
                    value={(value?.context_length as unknown as string) ?? ''}
                    onInput={(e: any) => update('context_length', parseIntOrUndef(e.currentTarget.value))}
                >
                </VscodeTextfield>
            </div>

            <div className="form-field">
                <VscodeFormHelper>{t('modelProperties.familyLabel')}</VscodeFormHelper>
                <VscodeTextfield
                    type="text"
                    placeholder={t('modelProperties.familyPlaceholder')}
                    value={(value?.family as unknown as string) ?? ''}
                    onInput={(e: any) => update('family', e.currentTarget.value)}
                >
                </VscodeTextfield>
            </div>
        </div>
    );
};

export default ModelPropertiesForm;
