import { Component, OnInit, ViewEncapsulation, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material';
import { StepperSelectionEvent } from '@angular/cdk/stepper';

import { WizardService } from './wizard.service';
import { SchedulerService } from './scheduler.service';
import { pairsValidator } from '../directives/pairs.directive';
import { uiConfig } from '../ui-config';

@Component({
    selector: 'ui-wizard',
    templateUrl: './wizard.component.html',
    styleUrls: ['./wizard.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class WizardComponent implements OnInit {

    @ViewChild('stepper') stepper: MatStepper;

    wizardForm: FormGroup;

    get formSteps(): FormArray {
        return this.wizardForm.get('formSteps') as FormArray;
    }

    constructor(
        private formBuilder: FormBuilder,
        private wizard: WizardService,
        private scheduler: SchedulerService
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
                    odPairs: this.formBuilder.array([]),
                    weatherConditions: this.formBuilder.group({
                        description: [null],
                        icon: [null],
                        visibility: [
                            null,
                            [Validators.required,
                            Validators.min(0),
                            Validators.max(uiConfig.visibility.max),
                            Validators.pattern('^[0-9]*$')]
                        ],
                        rainIntensity: [
                            null,
                            [Validators.required,
                            Validators.min(0),
                            Validators.max(uiConfig.rainIntensity.max),
                            Validators.pattern('^[0-9]*$')]
                        ],
                        snowIntensity: [
                            null,
                            [Validators.required,
                            Validators.min(0),
                            Validators.max(uiConfig.snowIntensity.max),
                            Validators.pattern('^[0-9]*$')]
                        ]
                    })
                }),
                this.formBuilder.group({
                    endSimulation: [false, [Validators.requiredTrue]]
                }),
                this.formBuilder.group({

                })
            ])
        }, { updateOn: 'blur' });

        this.wizard.stepper = this.stepper;
    }

    /**
     * Updates current step and step data.
     * @param event SelectionChange stepper event.
     */
    stepClick(event: StepperSelectionEvent): void {
        const index: number = event.previouslySelectedIndex;
        const nextIndex: number = event.selectedIndex;
        const data = this.wizardForm.get('formSteps').get([index]).value;

        if (nextIndex > index) {
            this.stepper.selected.completed = true;
            switch (nextIndex) {
                case 2:
                    this.scheduler.scheduleNetwork(data, index, nextIndex);
                    break;
                case 3:
                    this.scheduler.scheduleDemand(data, index, nextIndex);
                    break;
                case 4:
                    this.scheduler.scheduleSimulation(data, index, nextIndex);
                    break;
                default:
                    this.wizard.goOn(
                        data,
                        index,
                        nextIndex
                    );
            }
        }
    }

    exit(): void {
        //
    }

}
