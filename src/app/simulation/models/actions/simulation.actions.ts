import { Action } from '@ngrx/store';

import { Simulation } from '../simulation-state';

/**
 * ngrx: simulation Actions.
 */
export enum SimulationActionTypes {

    SimulationChanged = '[Simulation] Simulation Changed',
    SimulationEnded = '[Simulation] Simulation Ended',
    PeriodsChanged = '[Simulation] Periods Changed',
    Reset = '[Simulation] Reset'

}

export class SimulationChanged implements Action {

    public readonly type: string = SimulationActionTypes.SimulationChanged;

    constructor(public payload: { simulation: Simulation }) { }

}

export class SimulationEnded implements Action {

    public readonly type: string = SimulationActionTypes.SimulationEnded;

    constructor(public payload: boolean) { }

}

export class PeriodsChanged implements Action {

    public readonly type: string = SimulationActionTypes.PeriodsChanged;

    constructor(public payload: any) { }

}

export class Reset implements Action {

    public readonly type: string = SimulationActionTypes.Reset;

    constructor(public payload: any) { }

}

export type SimulationActions = SimulationChanged | SimulationEnded | PeriodsChanged | Reset;
