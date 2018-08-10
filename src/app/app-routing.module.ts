import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

import { AppPreloadingStrategy } from './app-preloading-strategy';

import { HomeComponent } from './home/home.component';
import { AboutComponent } from './about/about.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { TermsComponent } from './terms/terms.component';

@NgModule({
    providers: [AppPreloadingStrategy],
    imports: [
        RouterModule.forRoot([
            { path: '', redirectTo: 'home', pathMatch: 'full' },
            { path: 'home', component: HomeComponent },
            { path: 'about', component: AboutComponent },
            {
                path: 'simulation',
                loadChildren: './ui/ui.module#UiModule',
                data: { preload: false }
            },
            { path: 'privacy', component: PrivacyComponent },
            { path: 'terms', component: TermsComponent },
            { path: '**', redirectTo: 'home' }
        ], { preloadingStrategy: AppPreloadingStrategy })
    ],
    exports: [RouterModule]
})
export class AppRoutingModule { }
