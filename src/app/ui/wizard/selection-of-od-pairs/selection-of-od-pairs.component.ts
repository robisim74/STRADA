import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
    selector: 'wizard-selection-of-od-pairs',
    templateUrl: './selection-of-od-pairs.component.html',
    styleUrls: ['./selection-of-od-pairs.component.scss']
})
export class SelectionOfOdPairsComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    constructor() { }

    ngOnInit(): void {
        //
    }

}
