import { Action } from '@ngrx/store';

import { Step, Map } from '../wizard';

/**
 * ngrx: wizard Actions.
 */
export enum WizardActionTypes {

    StepChanged = '[Wizard] Step Changed',
    MapChanged = '[Wizard] Map Changed',
    StepError = '[Wizard] Step Error',
    StepPending = '[Wizard] Step Pending',
    GoOn = '[Wizard] Go On',
    Reset = '[Wizard] Reset'

}

export class StepChanged implements Action {

    public readonly type: string = WizardActionTypes.StepChanged;

    constructor(public payload: { step: Step, index: number }) { }

}

export class MapChanged implements Action {

    public readonly type: string = WizardActionTypes.MapChanged;

    constructor(public payload: { map: Map }) { }

}

export class StepError implements Action {

    public readonly type: string = WizardActionTypes.StepError;

    constructor(public payload: string) { }

}

export class StepPending implements Action {

    public readonly type: string = WizardActionTypes.StepPending;

    constructor(public payload: string | boolean) { }

}

export class GoOn implements Action {

    public readonly type: string = WizardActionTypes.GoOn;

    constructor(public payload: { step: Step, index: number, nextIndex: number }) { }

}

export class Reset implements Action {

    public readonly type: string = WizardActionTypes.Reset;

    constructor(public payload: any) { }

}

export type WizardActions = StepChanged | MapChanged | StepError | StepPending | GoOn | Reset;
