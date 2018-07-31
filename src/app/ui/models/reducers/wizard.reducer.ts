import deepClone from 'mout/lang/deepClone';

import { Step, STEPS, Map, Simulation } from "../wizard";
import { WizardActions, WizardActionTypes } from '../actions/wizard.actions';

/**
 * Wizard state management.
 */
export interface WizardState {

    steps: Step[];
    map: Map;
    simulation: Simulation;
    currentStep: number;
    error: string | null;
    pending: string | boolean;

}

export const initialWizardState: WizardState = {
    steps: STEPS,
    map: null,
    simulation: null,
    currentStep: 0,
    error: null,
    pending: false
};

/**
 * ngrx: wizard Reducer.
 */
export function wizardReducer(state: WizardState = deepClone(initialWizardState), action: WizardActions): WizardState {
    switch (action.type) {
        case WizardActionTypes.StepChanged: {
            // Updates the step at the provided index.
            state.steps[action.payload.index] = action.payload.step;
            return {
                ...state,
                steps: deepClone(state.steps),
                error: null,
                pending: false
            };
        }
        case WizardActionTypes.MapChanged: {
            state.map = action.payload.map;
            return {
                ...state,
                map: deepClone(state.map),
                error: null,
                pending: false
            };
        }
        case WizardActionTypes.SimulationChanged: {
            state.simulation = action.payload.simulation;
            return {
                ...state,
                simulation: deepClone(state.simulation),
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
                pending: action.payload
            };
        }
        case WizardActionTypes.GoOn: {
            // Updates the step at the provided index.
            state.steps[action.payload.index] = action.payload.step;
            return {
                ...state,
                steps: deepClone(state.steps),
                currentStep: action.payload.nextIndex
            };
        }
        case WizardActionTypes.Reset: {
            return deepClone(initialWizardState);
        }
        default: {
            return state;
        }
    }
}

export const getSteps: (state: WizardState) => Step[] = (state: WizardState) => state.steps;

export const getMap: (state: WizardState) => Map = (state: WizardState) => state.map;

export const getSimulation: (state: WizardState) => Simulation = (state: WizardState) => state.simulation;

export const getCurrentStep: (state: WizardState) => number = (state: WizardState) => state.currentStep;

export const getError: (state: WizardState) => string = (state: WizardState) => state.error;

export const getPending: (state: WizardState) => string | boolean = (state: WizardState) => state.pending;
