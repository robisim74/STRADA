import { Injectable } from "@angular/core";
import { MatStepper } from "@angular/material";

import { Store, select } from '@ngrx/store';

import { MapService } from "../map/map.service";
import { LocationService } from "../../location/location.service";
import { NetworkService } from "../../network/network.service";
import { WeatherService } from "../../network/weather/weather.service";
import { DemandService } from "../../demand/demand.service";
import { SimulationService } from "../../simulation/simulation.service";

import * as fromUi from '../models/reducers';
import { WizardActionTypes } from '../models/actions/wizard.actions';
import { WizardState } from "../models/reducers/wizard.reducer";

@Injectable() export class WizardService {

    public state: WizardState;

    public stepper: MatStepper;

    constructor(
        private store: Store<fromUi.UiState>,
        private map: MapService,
        private location: LocationService,
        private network: NetworkService,
        private weather: WeatherService,
        private demand: DemandService,
        private simulation: SimulationService
    ) {
        this.store.pipe(select(fromUi.wizardState)).subscribe((state: WizardState) => {
            this.state = state;
        });
    }

    public updateStep(data: any, index: number): void {
        this.store.dispatch({
            type: WizardActionTypes.StepChanged,
            payload: { step: { data: data }, index: index }
        });
    }

    public putInError(error: string): void {
        this.store.dispatch({
            type: WizardActionTypes.StepError,
            payload: error
        });
    }

    public putOnHold(): void {
        this.store.dispatch({
            type: WizardActionTypes.StepPending,
            payload: true
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

    public reset(): void {
        // App.
        this.location.reset();
        this.network.reset();
        this.weather.reset();
        this.demand.reset();
        this.simulation.reset();
        // UI.
        this.map.reset();
        // UI state.
        this.store.dispatch({
            type: WizardActionTypes.Reset
        });
        // Stepper.
        this.stepper.reset();
    }

}
