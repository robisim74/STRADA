import { Component, OnInit, Input } from '@angular/core';
import { FormGroup, FormBuilder, FormArray, AbstractControl, Validators } from '@angular/forms';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { NetworkService } from '../../../network/network.service';
import { WeatherService } from '../../../network/weather/weather.service';
import { DemandService } from '../../../demand/demand.service';
import * as fromUi from '../../models/reducers';
import { Step } from '../../models/wizard';
import { OdPairShowing } from '../../../network/graph';
import { WeatherDescription, WeatherConditions } from '../../../network/weather/weather';
import { EnumValues } from '../../utils';
import { uiConfig } from '../../ui-config';

import { BaseComponent } from '../../models/base.component';

@Component({
    selector: 'wizard-change-of-conditions',
    templateUrl: './change-of-conditions.component.html',
    styleUrls: ['./change-of-conditions.component.scss']
})
export class ChangeOfConditionsComponent extends BaseComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    descriptions: WeatherDescription[] = [];

    get odPairs(): FormArray {
        return this.formGroup.get('odPairs') as FormArray;
    }

    constructor(
        private formBuilder: FormBuilder,
        private store: Store<fromUi.UiState>,
        private wizard: WizardService,
        private network: NetworkService,
        private weather: WeatherService,
        private demand: DemandService
    ) {
        super();

        this.descriptions = EnumValues.getValues(WeatherDescription);
    }

    ngOnInit(): void {
        this.valueChanges();
        this.receiveActions();
        this.sendActions();
    }

    valueChanges(): void {
        // Updates demand service data on value changes.
        this.subscriptions.push(this.formGroup.get('odPairs').valueChanges.subscribe(
            (odPairs: OdPairShowing[]) => {
                const demand = odPairs.map((pair: OdPairShowing) => {
                    return pair.demand;
                });
                this.demand.changeDemand(demand);
            }
        ));
        // Updates weather service data on value changes.
        this.subscriptions.push(this.formGroup.get('weatherConditions').valueChanges.subscribe(
            (weatherConditions: WeatherConditions) => {
                const index = this.descriptions.findIndex(description => description == weatherConditions.description);
                if (index != -1) {
                    const icon = uiConfig.weatherIcons[index];
                    weatherConditions.icon = icon;
                }
                this.weather.changeWeather(weatherConditions);
            }
        ));
    }

    receiveActions(): void {
        this.subscriptions.push(this.store.pipe(select(fromUi.currentStep)).subscribe((currentStep: number) => {
            const odPairsControl = this.formGroup.get('odPairs') as FormArray;
            const weatherConditionsControl = this.formGroup.get('weatherConditions');
            switch (currentStep) {
                case 0:
                    // Resets control.
                    if (odPairsControl.length > 0) {
                        for (let i = odPairsControl.length - 1; i >= 0; i--) {
                            odPairsControl.removeAt(i);
                        }
                    }
                    break;
                case this.index:
                    const odPairs = this.network.getOdPairs();
                    const demand = this.demand.getOdMatrix();
                    for (let i = 0; i < odPairs.length; i++) {
                        odPairsControl.push(this.buildOdPair(odPairs[i], demand[i]));
                    }
                    const weatherConditions = this.weather.getWeatherConditions();
                    weatherConditionsControl.patchValue(weatherConditions, { emitEvent: false });
                    break;
            }
        }));
    }

    sendActions(): void {
        //
    }

    toggleValue(pair: AbstractControl): void {
        const value: boolean = pair.value.showPaths;
        pair.get('showPaths').setValue(!value);
        // Updates step state.
        this.wizard.updateStep(this.formGroup.value, this.index);
    }

    getVisibility(pair: AbstractControl): string {
        return pair.value.showPaths ? 'visibility' : 'visibility_off';
    }

    buildOdPair(odPair, demand): FormGroup {
        return this.formBuilder.group({
            origin: odPair.origin,
            destination: odPair.destination,
            pathType: odPair.pathType,
            demand: [
                { value: demand, disabled: demand == null },
                [Validators.required, Validators.min(0), Validators.max(uiConfig.maxDemand), Validators.pattern('^[0-9]*$')]
            ],
            showPaths: false
        });
    }

}
