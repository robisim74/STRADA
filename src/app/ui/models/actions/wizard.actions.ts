import { Action } from '@ngrx/store';

import { Step } from '../wizard';

/**
 * ngrx: wizard Actions.
 */
export enum WizardActionTypes {

    StepChanged = '[Wizard] Step Changed',
    StepError = '[Wizard] Step Error',
    StepPending = '[Wizard] Step Pending',
    GoOn = '[Wizard] Go On',
    Reset = '[Wizard] Reset'

}

export class StepChanged implements Action {

    public readonly type: string = WizardActionTypes.StepChanged;

    constructor(public payload: { step: Step, index: number }) { }

}

export class StepError implements Action {

    public readonly type: string = WizardActionTypes.StepError;

    constructor(public payload: string) { }

}

export class StepPending implements Action {

    public readonly type: string = WizardActionTypes.StepPending;

    constructor(public payload: boolean) { }

}

export class GoOn implements Action {

    public readonly type: string = WizardActionTypes.GoOn;

    constructor(public payload: { step: Step, index: number, nextIndex: number }) { }

}

export class Reset implements Action {

    public readonly type: string = WizardActionTypes.Reset;

    constructor(public payload: any) { }

}

export type WizardActions = StepChanged | GoOn | StepError | StepPending | Reset;
