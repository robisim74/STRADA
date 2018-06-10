import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';

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

    constructor(private formBuilder: FormBuilder) { }

    ngOnInit(): void {
        // Creates form model.
        this.wizardForm = this.formBuilder.group({
            formSteps: this.formBuilder.array([
                this.formBuilder.group({
                    address: [''],
                    center: [null, [Validators.required]]
                }),
                this.formBuilder.group({

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

    exit(): void {
        //
    }

}
