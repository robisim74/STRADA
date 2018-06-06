import { Component, OnInit, AfterViewInit, ElementRef } from '@angular/core';

import * as anime from 'animejs';

import { HOME_TRANSITION } from './home.transition';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    animations: [HOME_TRANSITION]
})
export class HomeComponent implements OnInit, AfterViewInit {

    show = false;

    constructor(private elementRef: ElementRef) { }

    ngOnInit(): void {
        //
    }

    ngAfterViewInit(): void {
        const element: HTMLElement = this.elementRef.nativeElement.querySelector('.headline .letters');
        const text: string = element.innerText;
        const letters: string[] = text.split('');

        let wrappedText = '';
        for (const letter of letters) {
            wrappedText += `<span class="letter">${letter}</span>`;
        }

        element.innerHTML = wrappedText;

        // Anime.
        const basicTimeline = anime.timeline();
        basicTimeline
            .add({
                targets: '.headline .letter',
                scale: [0.3, 1],
                opacity: [0, 1],
                translateZ: 0,
                easing: 'linear',
                delay: (el, i) => {
                    return 70 * (i + 1);
                }
            }).add({
                targets: '.headline .line',
                scaleX: [0, 1],
                opacity: [0.5, 1],
                easing: 'linear',
                offset: '-=840',
                delay: (el, i, l) => {
                    return 70 * (l - i);
                },
                complete: (anim) => {
                    this.show = true;
                }
            });
    }

}
