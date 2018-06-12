import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
    selector: 'wizard-change-of-demand-and-weather',
    templateUrl: './change-of-demand-and-weather.component.html',
    styleUrls: ['./change-of-demand-and-weather.component.scss']
})
export class ChangeOfDemandAndWeatherComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    constructor() { }

    ngOnInit(): void {
        //
    }

}
