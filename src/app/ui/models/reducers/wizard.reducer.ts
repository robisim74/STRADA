import cloneDeep from 'clone-deep';

import { Step, STEPS } from "../wizard";
import { WizardActions, WizardActionTypes } from '../actions/wizard.actions';

/**
 * Wizard state management.
 */
export interface WizardState {

    steps: Step[];
    currentStep: number;
    error: string | null;
    pending: boolean;

}

export const initialWizardState: WizardState = {
    steps: STEPS,
    currentStep: 0,
    error: null,
    pending: false
};

/**
 * ngrx: wizard Reducer.
 */
export function wizardReducer(state: WizardState = cloneDeep(initialWizardState), action: WizardActions): WizardState {
    switch (action.type) {
        case WizardActionTypes.StepChanged: {
            // Updates the step at the provided index.
            state.steps[action.payload.index] = action.payload.step;
            return {
                ...state,
                steps: cloneDeep(state.steps),
                error: null,
                pending: false
            };
        }
        case WizardActionTypes.StepError: {
            return {
                ...state,
                error: action.payload,
                pending: false
            };
        }
        case WizardActionTypes.StepPending: {
            return {
                ...state,
                error: null,
                pending: true
            };
        }
        case WizardActionTypes.GoOn: {
            // Updates the step at the provided index.
            state.steps[action.payload.index] = action.payload.step;
            return {
                ...state,
                steps: cloneDeep(state.steps),
                currentStep: action.payload.nextIndex,
                error: null,
                pending: false
            };
        }
        case WizardActionTypes.Reset: {
            return {
                ...initialWizardState
            };
        }
        default: {
            return state;
        }
    }
}

export const getSteps: (state: WizardState) => Step[] = (state: WizardState) => state.steps;

export const getCurrentStep: (state: WizardState) => number = (state: WizardState) => state.currentStep;

export const getError: (state: WizardState) => string = (state: WizardState) => state.error;

export const getPending: (state: WizardState) => boolean = (state: WizardState) => state.pending;
