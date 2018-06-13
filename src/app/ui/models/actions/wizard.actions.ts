import { Action } from '@ngrx/store';

import { Step } from '../wizard';

/**
 * ngrx: wizard Actions.
 */
export enum WizardActionTypes {

    StepChanged = 'Step changed',
    CurrentStepChanged = 'Current step changed',
    StepError = 'Step error',
    StepPending = 'Step pending',
    Reset = 'Reset'

}

export class StepChanged implements Action {

    public readonly type: string = WizardActionTypes.StepChanged;

    constructor(public payload: { step: Step, index: number }) { }

}

export class CurrentStepChanged implements Action {

    public readonly type: string = WizardActionTypes.CurrentStepChanged;

    constructor(public payload: number) { }

}

export class StepError implements Action {

    public readonly type: string = WizardActionTypes.StepError;

    constructor(public payload: string) { }

}

export class StepPending implements Action {

    public readonly type: string = WizardActionTypes.StepPending;

    constructor(public payload: boolean) { }

}

export class Reset implements Action {

    public readonly type: string = WizardActionTypes.Reset;

    constructor(public payload: any) { }

}

export type WizardActions = StepChanged | CurrentStepChanged | StepError | StepPending | Reset;
