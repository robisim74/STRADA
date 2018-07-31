import { Injectable } from "@angular/core";
import { Observable, interval, Subscription } from "rxjs";
import { takeWhile } from "rxjs/operators";

import { Store, select } from '@ngrx/store';

import { SimulationService } from "./simulation.service";
import * as fromSimulation from './models/reducers';
import { SimulationActionTypes } from './models/actions/simulation.actions';
import { uiConfig } from "../ui/ui-config";

@Injectable() export class ClockService {

    /**
     * Simulated running time.
     */
    private simulatedTimePeriod = 0;

    /**
     * Simulated time interval.
     */
    private simulatedTimeInterval;

    /**
     * Simulation timer.
     */
    private interval: Observable<number>;

    private subscription: Subscription;

    private endSimulation = false;

    constructor(
        private store: Store<fromSimulation.SimulationState>,
        private simulation: SimulationService
    ) {
        this.store.pipe(select(fromSimulation.end)).subscribe((end: boolean) => {
            this.endSimulation = end;
        });
        this.simulatedTimeInterval = uiConfig.simulatedTimeInterval;
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { simulatedTimeInterval: this.simulatedTimeInterval, simulatedTimePeriod: this.simulatedTimePeriod }
        });
    }

    public reset(): void {
        this.simulatedTimePeriod = 0;
        this.simulatedTimeInterval = uiConfig.simulatedTimeInterval;
        this.interval = null;
        this.subscription = null;
        this.endSimulation = false;
    }

    /**
     * Starts simulation.
     */
    public start(): void {
        // Sets interval.
        this.interval = interval(this.simulatedTimeInterval);
        this.subscription = this.interval.pipe(
            takeWhile(() => !this.endSimulation)
        ).subscribe(() => {
            this.simulation.propagateFlows();
            // Updates simulation state.
            this.store.dispatch({
                type: SimulationActionTypes.PeriodsChanged,
                payload: { simulatedTimeInterval: this.simulatedTimeInterval, simulatedTimePeriod: this.simulatedTimePeriod }
            });
            this.simulation.updateTimePeriod();
            this.updateSimulatedTimePeriod();
        });
    }

    public pause(): void {
        this.subscription.unsubscribe();
    }

    public stop(): void {
        this.subscription.unsubscribe();
        this.simulation.resetFlows();
        this.reset();
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { simulatedTimeInterval: this.simulatedTimeInterval, simulatedTimePeriod: this.simulatedTimePeriod }
        });
    }

    /**
     * Performs one step.
     */
    public step(): void {
        this.simulation.propagateFlows();
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { simulatedTimeInterval: this.simulatedTimeInterval, simulatedTimePeriod: this.simulatedTimePeriod }
        });
        this.simulation.updateTimePeriod();
        this.updateSimulatedTimePeriod();
    }

    public slow(): void {
        if (this.subscription && !this.subscription.closed) {
            this.subscription.unsubscribe();
            this.simulatedTimeInterval += uiConfig.timeIntervalIncrement;
            this.start();
        } else {
            this.simulatedTimeInterval += uiConfig.timeIntervalIncrement;
        }
    }

    public quick(): void {
        if (this.simulatedTimeInterval - uiConfig.timeIntervalDecrement > this.simulation.processingTime) {
            if (this.subscription && !this.subscription.closed) {
                this.subscription.unsubscribe();
                this.simulatedTimeInterval -= uiConfig.timeIntervalDecrement;
                this.start();
            } else {
                this.simulatedTimeInterval -= uiConfig.timeIntervalDecrement;
            }
        }
    }

    private updateSimulatedTimePeriod(): void {
        this.simulatedTimePeriod += this.simulatedTimeInterval;
    }

}
