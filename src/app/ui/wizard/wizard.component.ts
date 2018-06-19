import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { StepperSelectionEvent } from '@angular/cdk/stepper';

import { WizardService } from './wizard.service';

@Component({
    selector: 'ui-wizard',
    templateUrl: './wizard.component.html',
    styleUrls: ['./wizard.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class WizardComponent implements OnInit {

    wizardForm: FormGroup;

    get formSteps(): FormArray {
        return this.wizardForm.get('formSteps') as FormArray;
    }

    constructor(
        private formBuilder: FormBuilder,
        private wizard: WizardService
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

                }),
                this.formBuilder.group({

                }),
                this.formBuilder.group({

                }),
                this.formBuilder.group({

                })
            ])
        }, { updateOn: 'blur' });
    }

    /**
     * Updates current step and step data.
     * @param event SelectionChange stepper event.
     */
    stepClick(event: StepperSelectionEvent): void {
        const index: number = event.previouslySelectedIndex;
        const nextIndex: number = event.selectedIndex;
        this.wizard.goOn(
            this.wizardForm.get('formSteps').get([index]).value,
            index,
            nextIndex
        );
    }

    exit(): void {
        //
    }

}
