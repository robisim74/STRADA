import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { BaseComponent } from '../../models/base.component';

@Component({
    selector: 'wizard-estimate-of-demand',
    templateUrl: './estimate-of-demand.component.html',
    styleUrls: ['./estimate-of-demand.component.scss']
})
export class EstimateOfDemandComponent extends BaseComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    constructor() {
        super();
    }

    ngOnInit(): void {
        this.valueChanges();
        this.receiveActions();
        this.sendActions();
    }

    valueChanges(): void {
        //
    }

    receiveActions(): void {
        //
    }

    sendActions(): void {
        //
    }

}
