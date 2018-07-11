import { Component, OnInit, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { switchMap } from 'rxjs/operators';

import { Store, select } from '@ngrx/store';

import { WizardService } from '../wizard.service';
import { NetworkService } from '../../../network/network.service';
import { WeatherService } from '../../../network/weather/weather.service';
import * as fromUi from '../../models/reducers';

import { BaseComponent } from '../../models/base.component';

@Component({
    selector: 'wizard-estimate-of-demand',
    templateUrl: './estimate-of-demand.component.html',
    styleUrls: ['./estimate-of-demand.component.scss']
})
export class EstimateOfDemandComponent extends BaseComponent implements OnInit {

    @Input() formGroup: FormGroup;

    @Input() index: number;

    constructor(
        private store: Store<fromUi.UiState>,
        private wizard: WizardService,
        private network: NetworkService,
        private weather: WeatherService
    ) {
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
        this.subscriptions.push(this.store.pipe(select(fromUi.currentStep)).subscribe((currentStep: number) => {
            if (currentStep == this.index) {
                this.schedule();
            }
        }));
    }

    /**
     * Performs in sequence the following operations:
     * - Getting network data
     * - Creation of the graph
     * - Getting traffic data
     * - Association of values to the graph
     * - Getting and management of weather data
     */
    schedule(): void {
        this.wizard.putOnHold();

        const stream = this.network.getNetwork().pipe(
            switchMap((response: any) => {
                return this.network.createGraph(response);
            }),
            switchMap(() => {
                return this.network.getTrafficData();
            }),
            switchMap((response: any) => {
                return this.network.updateGraph(response);
            }),
            switchMap(() => {
                return this.weather.getWeatherData(this.network.getTime());
            }),
            switchMap((response: any) => {
                return this.weather.manageWeatherData(response);
            })
        );

        this.subscriptions.push(stream.subscribe(
            () => { },
            (error: any) => {
                let message: string;
                switch (error) {
                    case 'getNetwork':
                        message = 'The request could not be processed. Check your Internet connection and try again';
                        break;
                    case 'createGraph':
                        message = 'The graph can not be created. Try with another area';
                        break;
                    case 'getTrafficData':
                        message = 'Traffic data cannot be retrieved. ' +
                            'Past the quota limits traffic data become paid. ' +
                            'Please, try at another time or install your own version';
                        break;
                    case 'getWeatherData':
                        message = 'Weather data cannot be retrieved. You can still continue the simulation';
                        break;
                }
                this.wizard.putInError(message);
                this.wizard.reset();
            },
            () => {
                // Removes from waiting.
                this.wizard.removeFromWaiting();
            }
        ));
    }

}
