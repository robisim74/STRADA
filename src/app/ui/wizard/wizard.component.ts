import { Component, OnInit, OnDestroy, ViewEncapsulation, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Store, select } from '@ngrx/store';

import { WizardService } from './wizard.service';
import { NetworkService } from '../../network/network.service';
import { WeatherService } from '../../network/weather/weather.service';
import { MapService } from '../map/map.service';
import * as fromUi from '../models/reducers';
import { pairsValidator } from '../directives/pairs.directive';

@Component({
    selector: 'ui-wizard',
    templateUrl: './wizard.component.html',
    styleUrls: ['./wizard.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class WizardComponent implements OnInit, OnDestroy {

    @ViewChild('stepper') stepper: MatStepper;

    wizardForm: FormGroup;

    get formSteps(): FormArray {
        return this.wizardForm.get('formSteps') as FormArray;
    }

    subscriptions: Subscription[] = [];

    constructor(
        private formBuilder: FormBuilder,
        private store: Store<fromUi.UiState>,
        private wizard: WizardService,
        private network: NetworkService,
        private weather: WeatherService,
        private map: MapService
    ) { }

    ngOnInit(): void {
        // Creates form model.
        this.wizardForm = this.formBuilder.group({
            formSteps: this.formBuilder.array([
                this.formBuilder.group({
                    address: [''],
                    center: [null, [Validators.required]]
                }),
                this.formBuilder.group({
                    bounds: [null, [Validators.required]],
                    time: [null]
                }),
                this.formBuilder.group({
                    odPairs: this.formBuilder.array([], pairsValidator())
                }),
                this.formBuilder.group({

                }),
                this.formBuilder.group({

                }),
                this.formBuilder.group({

                })
            ])
        }, { updateOn: 'blur' });

        this.wizard.stepper = this.stepper;
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription: Subscription) => {
            if (subscription) { subscription.unsubscribe(); }
        });
    }

    /**
     * Updates current step and step data.
     * @param event SelectionChange stepper event.
     */
    stepClick(event: StepperSelectionEvent): void {
        const index: number = event.previouslySelectedIndex;
        const nextIndex: number = event.selectedIndex;
        if (nextIndex > index) {
            switch (nextIndex) {
                case 2:
                    this.schedule();
                    break;

            }
            this.wizard.goOn(
                this.wizardForm.get('formSteps').get([index]).value,
                index,
                nextIndex
            );
        }
    }

    exit(): void {
        //
    }

    /**
     * Performs in sequence the following operations:
     * - Gets network
     * - Creates the graph
     * - Gets network data
     * - Associates data to the graph
     * - Gets and updates weather data
     */
    schedule(): void {
        this.wizard.putOnHold('Getting the network');
        const stream = this.network.getNetwork().pipe(
            switchMap((response: any) => {
                this.wizard.putOnHold('Creating the graph');
                return this.network.createGraph(response);
            }),
            switchMap(() => {
                this.wizard.putOnHold('Getting network data');
                return this.network.getNetworkData();
            }),
            switchMap((response: any) => {
                this.wizard.putOnHold('Updating the graph');
                return this.network.updateGraph(response);
            }),
            switchMap(() => {
                this.wizard.putOnHold('Cleaning the graph');
                return this.network.cleanGraph();
            }),
            switchMap(() => {
                this.wizard.putOnHold('Getting weather data');
                return this.weather.getWeatherData(this.network.getTime());
            }),
            switchMap((response: any) => {
                return this.weather.updateWeatherData(response, this.network.getTime());
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
                        message = 'Graph cannnot be created. Please, try with another area';
                        break;
                    case 'getNetworkData':
                        message = 'Network data cannot be retrieved. Past the quota limits traffic data become paid.' +
                            'This is an open source project: install your own version of it';
                        break;
                    case 'updateGraph':
                        message = 'Graph cannot be updated. Please, try with another area';
                        break;
                    case 'cleanGraph':
                        message = 'Graph data is not available. Please, try with another area';
                        break;
                    case 'getWeatherData':
                        message = 'Weather data cannot be retrieved. Please, try at another time';
                        break;
                }
                this.wizard.putInError(message);
                this.wizard.reset();
            },
            () => {
                // Removes from waiting.
                this.wizard.removeFromWaiting();
                // Draws graph.
                this.map.drawGraph();
                const graph = this.network.getGraph();
                const odNodes = graph.getOdNodes();
                this.map.setCentroid(odNodes);
                this.map.setCenter(this.map.getCentroid());
                this.map.setZoom(17);

                console.log(graph);
            }
        ));
    }

}
