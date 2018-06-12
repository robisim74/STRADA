import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
    selector: 'wizard-simulation',
    templateUrl: './simulation.component.html',
    styleUrls: ['./simulation.component.scss']
})
export class SimulationComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    constructor() { }

    ngOnInit(): void {
        //
    }

}
