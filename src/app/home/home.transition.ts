import { trigger, transition, animate, style, AnimationTriggerMetadata } from '@angular/animations';

export const HOME_TRANSITION: AnimationTriggerMetadata = trigger('homeTransition', [
    transition('void => *', [
        style({
            opacity: 0
        }),
        animate('500ms 0ms ease-in',
            style({
                opacity: 1
            })
        )
    ])
]);
