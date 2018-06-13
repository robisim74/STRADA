import { ActionReducerMap, createFeatureSelector, createSelector, MemoizedSelector } from "@ngrx/store";

import * as fromWizard from './reducers/wizard.reducer';
import { Step } from "./wizard";

/**
 * User interface state management.
 */
export interface UiState {

    wizard: fromWizard.WizardState;

}

export const reducers: ActionReducerMap<UiState> = {
    wizard: fromWizard.wizardReducer
};

export const featureUiState: MemoizedSelector<object, UiState> = createFeatureSelector<UiState>('ui');

/**
 * Exports the wizard state.
 */
export const wizardState: MemoizedSelector<object, fromWizard.WizardState> = createSelector(
    featureUiState,
    (state: UiState) => state.wizard
);

/**
 * Exports the steps state.
 */
export const steps: MemoizedSelector<object, Step[]> = createSelector(
    wizardState,
    fromWizard.getSteps
);

/**
 * Exports the current step state.
 */
export const currentStep: MemoizedSelector<object, number> = createSelector(
    wizardState,
    fromWizard.getCurrentStep
);

/**
 * Exports the error state.
 */
export const error: MemoizedSelector<object, string> = createSelector(
    wizardState,
    fromWizard.getError
);

/**
 * Exports the pending state.
 */
export const pending: MemoizedSelector<object, boolean> = createSelector(
    wizardState,
    fromWizard.getPending
);
