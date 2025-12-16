/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ModelItem, ProviderConfig, ModelProperties, ModelParameters } from '../../../src/types';
import ModelPropertiesForm from './ModelProperties';
import ModelParamsForm from './ModelParams';
import {
    VscodeButton,
    VscodeTabs,
    VscodeTabHeader,
    VscodeDivider,
    VscodeTabPanel,
    VscodeCollapsible,
    VscodeFormHelper,
    VscodeTextfield,
    VscodeSingleSelect,
    VscodeOption,
    VscodeCheckbox,
} from '@vscode-elements/react-elements';

export interface ModelsProps {
    providers: ProviderConfig[];
    models: ModelItem[];
    onChange: (models: ModelItem[]) => void;
}

const ModelItemCard: React.FC<{
    value: ModelItem;
    index: number;
    providers: ProviderConfig[];
    onUpdate: (next: ModelItem) => void;
    onRemove: () => void;
}> = ({ value, index, providers, onUpdate, onRemove }) => {
    const { t } = useTranslation();
    const updateField = (field: keyof ModelItem | keyof ModelProperties, v: any) => {
        const next: any = { ...value };
        if (['id', 'slug', 'displayName', 'provider', 'use_for_autocomplete', 'retries'].includes(field as string)) {
            if (v === '' || v === undefined) {
                delete next[field];
            } else {
                next[field] = v;
            }
        } else {
            const nextProps = { ...value.model_properties };
            if (v === undefined) {
                delete nextProps[field as keyof ModelProperties];
            } else {
                nextProps[field as keyof ModelProperties] = v;
            }
            next.model_properties = nextProps;
        }
        onUpdate(next as ModelItem);
    };
    const updateParams = (p: ModelParameters) => onUpdate({ ...value, model_parameters: p });
    const props: ModelProperties = {
        ...value.model_properties,
    } as any;

    return (
        <div className="item">
            <VscodeCollapsible heading={`${t('models.model')} ${index + 1}${value?.id ? ` – ${value.id}` : ''}`} alwaysShowHeaderActions>
                <VscodeButton onClick={onRemove} secondary slot="actions">
                    {t('common.delete')}
                </VscodeButton>
                <VscodeTabs>
                    <VscodeTabHeader slot="header">{t('models.properties')}</VscodeTabHeader>
                    <VscodeTabHeader slot="header">{t('models.parameters')}</VscodeTabHeader>
                    <VscodeTabPanel>
                        <div className="collapsible-content">
                            <div className="form-field">
                                <VscodeFormHelper>{t('models.idLabel')}</VscodeFormHelper>
                                <VscodeTextfield
                                    type="text"
                                    placeholder={t('models.idPlaceholder')}
                                    value={value?.id ?? ''}
                                    onInput={(e: any) => updateField('id', e.currentTarget.value)}
                                >
                                </VscodeTextfield>
                                <VscodeFormHelper style={{ color: 'var(--vscode-errorForeground)', display: value?.id ? 'none' : 'block' }}>
                                    {t('models.idRequired')}
                                </VscodeFormHelper>
                            </div>
                            <div className="form-field">
                                <VscodeFormHelper>{t('models.slugLabel')}</VscodeFormHelper>
                                <VscodeTextfield
                                    type="text"
                                    placeholder={t('models.slugPlaceholder')}
                                    value={value?.slug ?? ''}
                                    onInput={(e: any) => updateField('slug', e.currentTarget.value)}
                                >
                                </VscodeTextfield>
                                <VscodeFormHelper style={{ color: 'var(--vscode-errorForeground)', display: value?.slug ? 'none' : 'block' }}>
                                    {t('models.slugRequired')}
                                </VscodeFormHelper>
                            </div>
                            <div className="form-field">
                                <VscodeFormHelper>{t('models.displayName')}</VscodeFormHelper>
                                <VscodeTextfield
                                    type="text"
                                    placeholder={t('models.displayNamePlaceholder')}
                                    value={value?.displayName ?? ''}
                                    onInput={(e: any) => updateField('displayName', e.currentTarget.value)}
                                >
                                </VscodeTextfield>
                            </div>

                            <div className="form-field">
                                <VscodeFormHelper>{t('models.provider')}</VscodeFormHelper>
                                <VscodeSingleSelect
                                    value={value?.provider || ''}
                                    onChange={(e: any) => updateField('provider', e.currentTarget.value)}
                                >
                                    <VscodeOption value="" disabled>
                                        {t('models.providerPlaceholder')}
                                    </VscodeOption>
                                    {providers.map((p) => (
                                        <VscodeOption key={p.id} value={p.id}>
                                            {p.displayName || p.id }
                                        </VscodeOption>
                                    ))}
                                </VscodeSingleSelect>
                                <VscodeFormHelper>{t('models.providerDescription')}</VscodeFormHelper>
                            </div>
                            <div className="form-field">
                                <VscodeCheckbox
                                    checked={value?.use_for_autocomplete ?? false}
                                    onChange={(e: any) => updateField('use_for_autocomplete', e.currentTarget.checked)}
                                >
                                    {t('models.useForAutocomplete')}
                                </VscodeCheckbox>
                                <VscodeFormHelper>{t('models.useForAutocompleteDescription')}</VscodeFormHelper>
                            </div>
                            <div className="form-field">
                                <VscodeFormHelper>{t('models.retries')}</VscodeFormHelper>
                                <VscodeTextfield
                                    type="text"
                                    placeholder={t('models.retriesPlaceholder')}
                                    value={value?.retries?.toString() ?? ''}
                                    onInput={(e: any) => {
                                        const val = e.currentTarget.value;
                                        updateField('retries', val === '' ? undefined : Number(val));
                                    }}
                                >
                                </VscodeTextfield>
                                <VscodeFormHelper>{t('models.retriesDescription')}</VscodeFormHelper>
                            </div>
                            <VscodeDivider></VscodeDivider>
                            <ModelPropertiesForm value={props} providers={providers} onChange={updateField} />
                        </div>
                    </VscodeTabPanel>
                    <VscodeTabPanel>
                        <ModelParamsForm value={value.model_parameters} onChange={updateParams} />
                    </VscodeTabPanel>
                </VscodeTabs>
            </VscodeCollapsible>
            <VscodeDivider></VscodeDivider>
        </div>
    );
};


export const Models: React.FC<ModelsProps> = ({ providers, models, onChange }) => {
    const { t } = useTranslation();
    const addModel = () => {
        const base: ModelItem = { id: '', slug: '', provider: '', model_properties: {}, model_parameters: {} };
        onChange([...(models ?? []), base]);
    };

    const updateAt = (i: number, nextItem: ModelItem) => {
        const next = models.slice();
        next[i] = nextItem;
        onChange(next);
    };

    const removeAt = (i: number) => {
        const next = models.slice();
        next.splice(i, 1);
        onChange(next);
    };

    if (!models || models.length === 0) {
        return (
            <div>
                <VscodeButton onClick={addModel} style={{ marginTop: '12px', marginBottom: '12px' }}>+ {t('models.add')}</VscodeButton>
                <div className="empty-state">{t('models.empty')}</div>
            </div>
        );
    }

    return (
        <div>
            <VscodeButton onClick={addModel} secondary style={{ marginTop: '12px', marginBottom: '12px' }}>
                + {t('models.add')}
            </VscodeButton>
            <div className="item-list">
                {models.map((m, i) => (
                    <ModelItemCard
                        key={i}
                        value={m}
                        index={i}
                        providers={providers}
                        onUpdate={(nm) => updateAt(i, nm)}
                        onRemove={() => removeAt(i)}
                    />
                ))}
            </div>
        </div>
    );
};

export default Models;
