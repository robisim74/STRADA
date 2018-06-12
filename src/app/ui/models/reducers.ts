import { ActionReducerMap, createFeatureSelector, createSelector, MemoizedSelector } from "@ngrx/store";

import * as fromWizard from './reducers/wizard.reducer';
import { Step } from "./wizard";

/**
 * User interface state management.
 */
export interface State {

    wizard: fromWizard.State;

}

export const reducers: ActionReducerMap<State> = {
    wizard: fromWizard.wizardReducer
};

export const featureWizardState: MemoizedSelector<object, State> = createFeatureSelector<State>('wizard');

/**
 * Exports the wizard state.
 */
export const wizardState: MemoizedSelector<object, fromWizard.State> = createSelector(
    featureWizardState,
    (state: State) => state.wizard
);

/**
 * Exports the steps state.
 */
export const steps: MemoizedSelector<object, Step[]> = createSelector(
    wizardState,
    fromWizard.steps
);

/**
 * Exports the current step state.
 */
export const currentStep: MemoizedSelector<object, number> = createSelector(
    wizardState,
    fromWizard.currentStep
);

/**
 * Exports the error state.
 */
export const error: MemoizedSelector<object, string> = createSelector(
    wizardState,
    fromWizard.error
);

/**
 * Exports the pending state.
 */
export const pending: MemoizedSelector<object, boolean> = createSelector(
    wizardState,
    fromWizard.pending
);
