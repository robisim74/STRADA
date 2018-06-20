import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { concat } from 'rxjs';

import { WizardService } from '../wizard.service';
import { NetworkService } from '../../../network/network.service';

@Component({
    selector: 'wizard-estimate-of-demand',
    templateUrl: './estimate-of-demand.component.html',
    styleUrls: ['./estimate-of-demand.component.scss']
})
export class EstimateOfDemandComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    constructor(
        private wizard: WizardService,
        private network: NetworkService
    ) { }

    /**
     * Performs in sequence the following operations:
     * - Creation of the graph
     * - Association of values to the graph
     */
    ngOnInit(): void {
        this.wizard.putOnHold();
        concat([
            this.network.getNetwork(),
            this.network.createGraph(),
            this.network.getTrafficData()
        ]).subscribe(
            () => { },
            (error: any) => { },
            () => {
                this.wizard.removeFromWaiting();
            }
        );
    }

}
