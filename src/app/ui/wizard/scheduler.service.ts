import { Injectable } from "@angular/core";
import { switchMap } from "rxjs/operators";

import { WizardService } from "./wizard.service";
import { MapService } from "../map/map.service";
import { LocationService } from "../../location/location.service";
import { NetworkService } from "../../network/network.service";
import { WeatherService } from "../../network/weather/weather.service";
import { DemandService } from "../../demand/demand.service";
import { SimulationService } from "../../simulation/simulation.service";

@Injectable() export class SchedulerService {

    constructor(
        private wizard: WizardService,
        private map: MapService,
        private location: LocationService,
        private network: NetworkService,
        private weather: WeatherService,
        private demand: DemandService,
        private simulation: SimulationService
    ) { }

    /**
     * Resets the whole application.
     */
    public reset(): void {
        setTimeout(() => {
            // Wizard.
            this.wizard.reset();
            // Services.
            this.map.reset();
            this.location.reset();
            this.network.reset();
            this.weather.reset();
            this.demand.reset();
            this.simulation.reset();
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
     * - Updates map
     */
    scheduleNetwork(data: any, index: number, nextIndex: number): void {
        this.wizard.putOnHold('Getting the network');
        const stream = this.network.getNetwork().pipe(
            switchMap((response: any) => {
                this.wizard.putOnHold('Creating the graph');
                return this.network.createGraph(response);
            }),
            switchMap(() => {
                this.wizard.putOnHold('Getting network data');
                return this.network.getNetworkData();
            }),
            switchMap((response: any) => {
                this.wizard.putOnHold('Updating the graph');
                return this.network.updateGraph(response);
            }),
            switchMap(() => {
                this.wizard.putOnHold('Checking the data');
                return this.network.correctGraph();
            }),
            switchMap(() => {
                this.wizard.putOnHold('Getting weather data');
                return this.weather.getWeatherData(this.network.getTime());
            }),
            switchMap((response: any) => {
                return this.weather.updateWeatherData(response, this.network.getTime());
            }),
            switchMap(() => {
                this.wizard.putOnHold('Updating map');
                return this.map.updateMap();
            })
        );

        stream.subscribe(
            () => { },
            (error: any) => {
                let message: string;
                switch (error) {
                    case 'getNetwork':
                        message = 'Network cannot be retrieved. Check your Internet connection and try again';
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
                    default:
                        message = 'Unexpected error';
                }
                this.wizard.putInError(message);
                this.reset();
            },
            () => {
                // Removes from waiting.
                this.wizard.removeFromWaiting();
                this.wizard.goOn(data, index, nextIndex);
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
     * - Draws the polyline for each shortest path
     */
    scheduleDemand(data: any, index: number, nextIndex: number): void {
        const graph = this.network.getGraph();
        const odPairs = this.network.getOdPairs();

        this.wizard.putOnHold('Computing shortest paths');
        const stream = graph.calcShortestPaths(odPairs).pipe(
            switchMap(() => {
                return graph.calcIncidenceMatrix();
            }),
            switchMap(() => {
                return graph.calcAssignmentMatrix(odPairs);
            }),
            switchMap(() => {
                this.wizard.putOnHold('Getting traffic data');
                return this.network.getTrafficData();
            }),
            switchMap((response: any) => {
                return this.network.calcLinkFlows(response);
            }),
            switchMap(() => {
                this.wizard.putOnHold('Computing demand');
                return this.demand.calcOdMatrix();
            }),
            switchMap(() => {
                this.wizard.putOnHold('Drawing paths');
                return this.map.drawPaths();
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
                    default:
                        message = 'Unexpected error';
                }
                this.wizard.putInError(message);
                this.reset();
            },
            () => {
                // Removes from waiting.
                this.wizard.removeFromWaiting();
                this.wizard.goOn(data, index, nextIndex);
            }
        );
    }

    /**
     * Performs in sequence the following operations:
     * - Calcs capacity for each edge.
     */
    scheduleSimulation(data: any, index: number, nextIndex: number): void {
        const graph = this.network.getGraph();
        const factors = this.weather.getFactors();

        this.wizard.putOnHold('Computing capacities');
        const stream = graph.calcCapacities(factors[0]).pipe();

        stream.subscribe(
            () => { },
            (error: any) => {
                let message: string;
                switch (error) {
                    default:
                        message = 'Unexpected error';
                }
                this.wizard.putInError(message);
                this.reset();
            },
            () => {
                // Removes from waiting.
                this.wizard.removeFromWaiting();
                this.wizard.goOn(data, index, nextIndex);
            }
        );
    }

}
