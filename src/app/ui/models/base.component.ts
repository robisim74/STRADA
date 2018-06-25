import { OnInit, OnDestroy } from "@angular/core";
import { Subscription } from "rxjs";

/**
 * Abstract class inherited from UI components.
 */
export abstract class BaseComponent implements OnInit, OnDestroy {

    subscriptions: Subscription[] = [];

    abstract ngOnInit(): void;

    ngOnDestroy(): void {
        this.subscriptions.forEach((subscription: Subscription) => {
            if (subscription) { subscription.unsubscribe(); }
        });
    }

    /**
     * Subscribes to the form changes.
     */
    abstract valueChanges(): void;

    /**
     * Subscribes to the actions sent by other components.
     */
    abstract receiveActions(): void;

    /**
     * Subscribes to the actions sent to other components.
     */
    abstract sendActions(): void;

}
