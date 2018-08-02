import { Injectable } from "@angular/core";
import { Observable, interval, Subscription } from "rxjs";
import { takeWhile } from "rxjs/operators";

import { Store, select } from '@ngrx/store';

import { SimulationService } from "./simulation.service";
import * as fromSimulation from './models/reducers';
import { SimulationActionTypes } from './models/actions/simulation.actions';
import { uiConfig } from "../ui/ui-config";

export enum Control {
    start = 'start',
    pause = 'pause',
    stop = 'stop',
    step = 'step',
    slow = 'slow',
    quick = 'quick'
}

@Injectable() export class ClockService {

    /**
     * Simulated running time.
     */
    private simulatedTimePeriod: number;

    /**
     * Simulated time interval.
     */
    private simulatedTimeInterval: number;

    /**
     * Simulation timer.
     */
    private interval: Observable<number>;

    /**
     * PropagateFlow processing time (ms).
     */
    public processingTime = 99;

    private endSimulation = false;

    private subscription: Subscription;

    constructor(
        private store: Store<fromSimulation.SimulationState>,
        private simulation: SimulationService
    ) {
        this.store.pipe(select(fromSimulation.end)).subscribe((end: boolean) => {
            this.endSimulation = end;
        });
        this.simulatedTimePeriod = 0;
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
        this.processingTime = 0;
        this.endSimulation = false;
        this.subscription = null;
    }

    public pressControl(control: Control): void {
        switch (control) {
            case Control.start:
                this.start();
                break;
            case Control.pause:
                this.pause();
                break;
            case Control.stop:
                this.stop();
                break;
            case Control.step:
                this.step();
                break;
            case Control.slow:
                this.slow();
                break;
            case Control.quick:
                this.quick();
                break;
        }
    }

    /**
     * Starts simulation.
     */
    public start(): void {
        if (!this.subscription || this.subscription.closed) {
            // Sets interval.
            this.interval = interval(this.simulatedTimeInterval);
            this.subscription = this.interval.pipe(
                takeWhile(() => !this.endSimulation)
            ).subscribe(() => {
                this.execute();
            });
        }
    }

    public pause(): void {
        if (this.subscription && !this.subscription.closed) {
            this.subscription.unsubscribe();
        }
    }

    public stop(): void {
        if (this.subscription && !this.subscription.closed) {
            this.subscription.unsubscribe();
        }
        this.simulation.resetFlows();
        this.reset();
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { simulatedTimeInterval: this.simulatedTimeInterval, simulatedTimePeriod: this.simulatedTimePeriod }
        });
        this.store.dispatch({
            type: SimulationActionTypes.SimulationEnded,
            payload: false
        });
    }

    /**
     * Performs one step.
     */
    public step(): void {
        if (this.subscription && !this.subscription.closed) {
            this.subscription.unsubscribe();
        }
        this.execute();
    }

    public slow(): void {
        if (this.subscription && !this.subscription.closed) {
            this.subscription.unsubscribe();
            this.simulatedTimeInterval += uiConfig.timeIntervalIncrement;
            this.start();
        } else {
            this.simulatedTimeInterval += uiConfig.timeIntervalIncrement;
        }
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { simulatedTimeInterval: this.simulatedTimeInterval, simulatedTimePeriod: this.simulatedTimePeriod }
        });
    }

    public quick(): void {
        if (this.simulatedTimeInterval - uiConfig.timeIntervalDecrement > this.processingTime) {
            if (this.subscription && !this.subscription.closed) {
                this.subscription.unsubscribe();
                this.simulatedTimeInterval -= uiConfig.timeIntervalDecrement;
                this.start();
            } else {
                this.simulatedTimeInterval -= uiConfig.timeIntervalDecrement;
            }
            // Updates simulation state.
            this.store.dispatch({
                type: SimulationActionTypes.PeriodsChanged,
                payload: { simulatedTimeInterval: this.simulatedTimeInterval, simulatedTimePeriod: this.simulatedTimePeriod }
            });
        }
    }

    private execute(): void {
        const startTime = Date.now();
        this.simulation.propagateFlows();
        const endTime = Date.now();
        // Updates processing time.
        this.processingTime = endTime - startTime;
        this.updateSimulatedTimePeriod();
        // Updates simulation state.
        this.store.dispatch({
            type: SimulationActionTypes.PeriodsChanged,
            payload: { simulatedTimeInterval: this.simulatedTimeInterval, simulatedTimePeriod: this.simulatedTimePeriod }
        });
    }

    private updateSimulatedTimePeriod(): void {
        this.simulatedTimePeriod += this.simulatedTimeInterval;
    }

}
