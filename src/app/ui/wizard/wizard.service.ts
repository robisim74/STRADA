import { Injectable } from "@angular/core";
import { MatStepper } from "@angular/material";

import { Store, select } from '@ngrx/store';

import * as fromUi from '../models/reducers';
import { WizardActionTypes } from '../models/actions/wizard.actions';
import { WizardState } from "../models/reducers/wizard.reducer";

@Injectable() export class WizardService {

    public state: WizardState;

    public stepper: MatStepper;

    constructor(private store: Store<fromUi.UiState>) {
        this.store.pipe(select(fromUi.wizardState)).subscribe((state: WizardState) => {
            this.state = state;
        });
    }

    public reset(): void {
        // Stepper.
        this.stepper.reset();
        // UI state.
        this.store.dispatch({
            type: WizardActionTypes.Reset
        });
    }

    public updateStep(data: any, index: number): void {
        this.store.dispatch({
            type: WizardActionTypes.StepChanged,
            payload: { step: { data: data }, index: index }
        });
    }

    public updateMap(data: any): void {
        this.store.dispatch({
            type: WizardActionTypes.MapChanged,
            payload: { map: { data: data } }
        });
    }

    public putInError(error: string): void {
        this.store.dispatch({
            type: WizardActionTypes.StepError,
            payload: error
        });
    }

    public putOnHold(message?: string): void {
        this.store.dispatch({
            type: WizardActionTypes.StepPending,
            payload: message || true
        });
    }

    public removeFromWaiting(): void {
        this.store.dispatch({
            type: WizardActionTypes.StepPending,
            payload: false
        });
    }

    public goOn(data: any, index: number, nextIndex: number): void {
        this.store.dispatch({
            type: WizardActionTypes.GoOn,
            payload: { step: { data: data }, index: index, nextIndex: nextIndex }
        });
    }

}
