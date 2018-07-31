import { Injectable } from "@angular/core";
import { Observable, interval, Subscription } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { Store, select } from '@ngrx/store';

import { SimulationService } from "./simulation.service";
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

    constructor(
        private simulation: SimulationService
    ) {
        this.simulatedTimeInterval = uiConfig.simulatedTimeInterval;
        this.updateSimulationState();
    }

    public reset(): void {
        this.simulatedTimePeriod = 0;
        this.simulatedTimeInterval = uiConfig.simulatedTimeInterval;
    }

    /**
     * Starts simulation.
     */
    public start(): void {
        // Sets interval.
        this.interval = interval(this.simulatedTimeInterval);
        this.subscription = this.interval.pipe(
            // takeUntil()
        ).subscribe(() => {
            this.simulation.propagateFlows();
            this.updateSimulationState();
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
        this.updateSimulationState();
    }

    /**
     * Performs one step.
     */
    public step(): void {
        this.simulation.propagateFlows();
        this.updateSimulationState();
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

    private updateSimulationState(): void {
        //
    }

    private updateSimulatedTimePeriod(): void {
        this.simulatedTimePeriod += this.simulatedTimeInterval;
    }

}
