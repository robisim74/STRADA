import { Injectable } from "@angular/core";
import { MatStepper } from "@angular/material";
import { switchMap } from "rxjs/operators";

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

    public reset(): void {
        // UI.
        this.map.reset();
        // Stepper.
        this.stepper.reset();
        // App.
        this.simulation.reset();
        this.demand.reset();
        this.network.reset();
        this.weather.reset();
        this.location.reset();
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

    /**
     * Performs in sequence the following operations:
     * - Gets network
     * - Creates the graph
     * - Gets network data
     * - Associates data to the graph
     * - Corrects graph data
     * - Gets and updates weather data
     */
    networkSchedule(data: any, index: number, nextIndex: number): void {
        this.putOnHold('Getting the network');
        const stream = this.network.getNetwork().pipe(
            switchMap((response: any) => {
                this.putOnHold('Creating the graph');
                return this.network.createGraph(response);
            }),
            switchMap(() => {
                this.putOnHold('Getting network data');
                return this.network.getNetworkData();
            }),
            switchMap((response: any) => {
                this.putOnHold('Updating the graph');
                return this.network.updateGraph(response);
            }),
            switchMap(() => {
                this.putOnHold('Checking the data');
                return this.network.correctGraph();
            }),
            switchMap(() => {
                this.putOnHold('Getting weather data');
                return this.weather.getWeatherData(this.network.getTime());
            }),
            switchMap((response: any) => {
                return this.weather.updateWeatherData(response, this.network.getTime());
            })
        );

        stream.subscribe(
            () => { },
            (error: any) => {
                let message: string;
                switch (error) {
                    case 'getNetwork':
                        message = 'The request could not be processed. Check your Internet connection and try again';
                        break;
                    case 'createGraph':
                        message = 'Graph cannnot be created. Please, try with another area';
                        break;
                    case 'getNetworkData':
                        message = 'Network data cannot be retrieved. Past the quota limits traffic data become paid.' +
                            'This is an open source project: install your own version of it';
                        break;
                    case 'correctGraph':
                        message = 'Graph data is not available. Please, try with another area';
                        break;
                    case 'getWeatherData':
                        message = 'Weather data cannot be retrieved. Please, try at another time';
                        break;
                }
                this.putInError(message);
                this.reset();
            },
            () => {
                // Removes from waiting.
                this.removeFromWaiting();
                this.goOn(data, index, nextIndex);
                // Draws graph.
                this.map.drawGraph();
                // Sets map.
                const graph = this.network.getGraph();
                const odNodes = graph.getOdNodes();
                this.map.setCentroid(odNodes);
                this.map.setCenter(this.map.getCentroid());
                this.map.setZoom(17);
            }
        );
    }

    /**
     * Performs in sequence the following operations:
     * - Calcs shortest paths
     * - Calcs incidence matrix
     * - Calcs assignment matrix
     * - Gets and updates traffic data
     * - Calcs link flows
     * - Calcs O/D matrix
     */
    demandSchedule(data: any, index: number, nextIndex: number): void {
        const graph = this.network.getGraph();
        const odPairs = this.network.getOdPairs();

        this.putOnHold('Computing shortest paths');
        const stream = graph.calcShortestPaths(odPairs).pipe(
            switchMap(() => {
                return graph.calcIncidenceMatrix();
            }),
            switchMap(() => {
                return graph.calcAssignmentMatrix(odPairs);
            }),
            switchMap(() => {
                this.putOnHold('Getting traffic data');
                return this.network.getTrafficData();
            }),
            switchMap((response: any) => {
                return this.network.calcLinkFlows(response);
            }),
            switchMap(() => {
                this.putOnHold('Computing demand');
                return this.demand.calcOdMatrix();
            })
        );

        stream.subscribe(
            () => { },
            (error: any) => {
                let message: string;
                switch (error) {
                    case 'calcShortestPaths':
                        message = 'There are no routes. Please, try with another area';
                        break;
                    case 'getTrafficData':
                        message = 'Traffic data cannot be retrieved. Past the quota limits traffic data become paid.' +
                            'This is an open source project: install your own version of it';
                        break;
                    case 'calcOdMatrix':
                        message = 'The demand cannot be calculated. Please, try with another area';
                        break;
                }
                this.putInError(message);
                this.reset();
            },
            () => {
                // Removes from waiting.
                this.removeFromWaiting();
                this.goOn(data, index, nextIndex);
                // Builds paths.
                const paths = graph.getShortestPaths();
                this.map.buildPaths(paths);

                console.log(graph);
                console.log(paths);
                console.log(graph.getAssignmentMatrix());
                console.log(this.demand.getOdMatrix());
            }
        );
    }

}
