import cloneDeep from 'clone-deep';

import { Step, STEPS } from "../wizard";
import { WizardActions, WizardActionTypes } from '../actions/wizard.actions';

/**
 * Wizard state management.
 */
export interface State {

    steps: Step[];
    currentStep: number;
    error: string | null;
    pending: boolean;

}

export const initialState: State = {
    steps: STEPS,
    currentStep: 0,
    error: null,
    pending: false
};

/**
 * ngrx: wizard Reducer.
 */
export function wizardReducer(state: State = cloneDeep(initialState), action: WizardActions): State {
    switch (action.type) {
        case WizardActionTypes.StepChanged: {
            // Updates the step at the provided index.
            state.steps[action.payload.index] = action.payload.step;
            return {
                ...state,
                currentStep: action.payload.index,
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
        case WizardActionTypes.Reset: {
            return initialState;
        }
        default: {
            return state;
        }
    }
}

export const steps: (state: State) => Step[] = (state: State) => state.steps;

export const currentStep: (state: State) => number = (state: State) => state.currentStep;

export const error: (state: State) => string = (state: State) => state.error;

export const pending: (state: State) => boolean = (state: State) => state.pending;
