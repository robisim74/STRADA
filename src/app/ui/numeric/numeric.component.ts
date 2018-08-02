import { Component, OnInit } from '@angular/core';

import { Store, select } from '@ngrx/store';

import * as fromSimulation from '../../simulation/models/reducers';
import { Simulation, NumericalSimulation } from '../../simulation/models/simulation-state';

import { BaseComponent } from '../models/base.component';

@Component({
    selector: 'ui-numeric',
    templateUrl: './numeric.component.html',
    styleUrls: ['./numeric.component.scss']
})
export class NumericComponent extends BaseComponent implements OnInit {

    data: NumericalSimulation[] = [];

    displayedColumns: string[] = ['edge', 'wayName', 'trafficVolume', 'trafficCount'];

    constructor(
        private store: Store<fromSimulation.SimulationState>
    ) {
        super();
    }

    ngOnInit(): void {
        this.receiveActions();
        this.sendActions();
    }

    valueChanges(): void {
        //
    }

    receiveActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromSimulation.simulation)).subscribe((simulation: Simulation) => {
            if (simulation && simulation.data) {
                this.data = simulation.data;
            }
        }));
    }

    sendActions(): void {
        //
    }

}
