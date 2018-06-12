import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
    selector: 'wizard-selection-of-the-area',
    templateUrl: './selection-of-the-area.component.html',
    styleUrls: ['./selection-of-the-area.component.scss']
})
export class SelectionOfTheAreaComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    constructor() { }

    ngOnInit(): void {
        //
    }

}
