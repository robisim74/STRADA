import deepClone from 'mout/lang/deepClone';

import { Simulation } from "../simulation-state";
import { SimulationActions, SimulationActionTypes } from '../actions/simulation.actions';

/**
 * Simulation state management.
 */
export interface SimulationState {

    simulation: Simulation;
    end: boolean;
    periods: any;

}

export const initialSimulationState: SimulationState = {
    simulation: null,
    end: false,
    periods: null
};

/**
 * ngrx: simulation Reducer.
 */
export function simulationReducer(state: SimulationState = deepClone(initialSimulationState), action: SimulationActions): SimulationState {
    switch (action.type) {
        case SimulationActionTypes.SimulationChanged: {
            state.simulation = action.payload.simulation;
            return {
                ...state,
                simulation: deepClone(state.simulation)
            };
        }
        case SimulationActionTypes.SimulationEnded: {
            return {
                ...state,
                end: action.payload
            };
        }
        case SimulationActionTypes.PeriodsChanged: {
            state.periods = action.payload;
            return {
                ...state,
                periods: deepClone(state.periods)
            };
        }
        case SimulationActionTypes.Reset: {
            return deepClone(initialSimulationState);
        }
        default: {
            return state;
        }
    }
}

export const getSimulation: (state: SimulationState) => Simulation = (state: SimulationState) => state.simulation;

export const getEnd: (state: SimulationState) => boolean = (state: SimulationState) => state.end;

export const getPeriods: (state: SimulationState) => any = (state: SimulationState) => state.periods;
