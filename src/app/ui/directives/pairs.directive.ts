import { ValidatorFn, AbstractControl, ValidationErrors, FormArray } from "@angular/forms";

export function pairsValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const value = control.value as FormArray;

        let valid = false;
        if (value.length > 0) {
            if (value[value.length - 1].origin && value[value.length - 1].destination && value[value.length - 1].pathType) {
                valid = true;
            }
        }
        return !valid ? { pairs: true } : null;
    };
}
