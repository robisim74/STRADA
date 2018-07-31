import { ActionReducerMap, createFeatureSelector, createSelector, MemoizedSelector } from "@ngrx/store";

import * as fromSimulation from './reducers/simulation.reducer';
import { Simulation } from "./simulation-state";

/**
 * Simulation state management.
 */
export interface SimulationState {

    simulation: fromSimulation.SimulationState;

}

export const reducers: ActionReducerMap<SimulationState> = {
    simulation: fromSimulation.simulationReducer
};

export const featureSimulationState: MemoizedSelector<object, SimulationState> = createFeatureSelector<SimulationState>('simulation');

/**
 * Exports the simulation state.
 */
export const simulationState: MemoizedSelector<object, fromSimulation.SimulationState> = createSelector(
    featureSimulationState,
    (state: SimulationState) => state.simulation
);

export const simulation: MemoizedSelector<object, Simulation> = createSelector(
    simulationState,
    fromSimulation.getSimulation
);

/**
 * Exports the end state.
 */
export const end: MemoizedSelector<object, boolean> = createSelector(
    simulationState,
    fromSimulation.getEnd
);

/**
 * Exports the periods state.
 */
export const periods: MemoizedSelector<object, any> = createSelector(
    simulationState,
    fromSimulation.getPeriods
);
