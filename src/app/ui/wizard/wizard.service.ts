import { Injectable } from "@angular/core";

import { Store, select } from '@ngrx/store';

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

    constructor(
        private store: Store<fromUi.UiState>,
        private location: LocationService,
        private network: NetworkService,
        private weather: WeatherService,
        private demand: DemandService,
        private simulation: SimulationService
    ) {
        this.store.pipe(select(fromUi.wizardState)).subscribe((state: WizardState) => {
            this.state = state;
            // TODO Remove
            console.log(state);
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
        this.location.reset();
        this.network.reset();
        this.weather.reset();
        this.demand.reset();
        this.simulation.reset();
        this.store.dispatch({
            type: WizardActionTypes.Reset
        });
    }

}
